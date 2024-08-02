/* Service metrics need to push to a collector rather than expose
   metrics on an exporter */

import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'

import { BasicTracerProvider, TraceIdRatioBasedSampler,
  ParentBasedSampler, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { Resource } from '@opentelemetry/resources'
import { trace, type ObservableResult, type TimeInput } from '@opentelemetry/api'

import { Utils } from './utils.js'

export const UNKNOWN_CALLER = 'Unknown'

export const CONCURRENCY_LIMIT = 1
export const TRACE_CONCURRENCY_LIMIT = 1
export const DEFAULT_TRACE_SAMPLE_RATIO = 0.1
export const DEFAULT_EXPORT_INTERVAL_MS = 60000 // one minute, is otlp default
export const DEFAULT_EXPORT_TIMEOUT_MS = 30000  // 30 sec timeout, the otlp default

interface Endable {
  end(endTime?: TimeInput): void;
}

interface Timeable {
  createdAt?: Date;
  updatedAt?: Date;
  timestamp?: Number | Date;
}

class NullSpan implements Endable {
  // if we start using other span methods, add null methods here

  // Returns the flag whether this span will be recorded.
  // @ts-ignore
  end(endTime?: TimeInput) {
    return false
  }
}

export enum SinceField {
  CREATED_AT = 0,
  UPDATED_AT = 1,
  TIMESTAMP = 2
}

export class TimeableMetric {
  protected cnt: number
  protected totTime: number
  protected maxTime: number
  protected since: SinceField
  protected name: string | null = null;
  private publishIntervalId: NodeJS.Timeout | null = null;
  private publishIntervalMS: number | null = null;

  constructor(since: SinceField, name?: string, interval?: number) {
    this.cnt = 0
    this.totTime = 0
    this.maxTime = 0
    this.since = since
    // for backwards compatibility name may be specified at the time of publish stats
    if (name) {
        this.name = name
    }
    if (interval) {
        this.publishIntervalMS = interval
    }
  }

  public reset() {
    this.cnt = 0
    this.totTime = 0
    this.maxTime = 0
  }


  public recordAll(tasks: Timeable[]) {
    for (const task of tasks) {
      this.record(task)
    }
  }

  public record(task: Timeable) {

    this.cnt += 1
    let timeElapsed = 0
    if (this.since === SinceField.CREATED_AT) {
      timeElapsed = Date.now() - task.createdAt.getTime()
    } else if (this.since === SinceField.TIMESTAMP) {
      timeElapsed = Date.now() - Number(task.timestamp)
    } else { // UpdatedAt
      timeElapsed = Date.now() - task.updatedAt.getTime()
    }
    this.totTime += timeElapsed
    if (timeElapsed > this.maxTime) {
      this.maxTime = timeElapsed
    }
  }

  private getMeanTime(): number {
    return this.totTime / this.cnt
  }

  /**
  * Publishes the accumulated statistics.
  * This method can be invoked manually or automatically at set intervals.
  * It publishes the total count, mean time, and maximum time for the given metric,
  * over the period since the last publish.
  *
  * @param {string} name - The name of the metric to publish statistics for.
  */
  public publishStats(name?: string): void {
    if (! name) {
        name = this.name
    }
    ServiceMetrics.count(name + '_total', this.cnt)
    ServiceMetrics.observe(name + '_mean', this.getMeanTime())
    ServiceMetrics.observe(name + '_max', this.maxTime)
    this.reset()
  }

  startPublishingStats(): void {
    if ((! this.name) || (! this.publishIntervalMS)) {
        ServiceMetrics.log_err("Please set name and interval on initialization of your TimeableMetric")
        return
    }
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId); // Clear existing interval if it's already running
    }

    this.publishIntervalId = setInterval(() => {
      this.publishStats(this.name);
    }, this.publishIntervalMS);
  }

  stopPublishingStats(): void {
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId);
      this.publishIntervalId = null;
    }
  }

}

// Even though we have type number, it seems strings can get thru
function enforceNumeric(param: any): number {
    if (typeof param === 'number') {
        return param;
    } else if (typeof param === 'string') {
        return parseInt(param)
    } else {
        throw new Error(`Invalid parameter type for ${param}, should be number`)
    }
}


class _ServiceMetrics {
  protected caller
  protected readonly counters
  protected readonly gauges
  protected readonly histograms
  protected readonly observations
  protected meter
  protected meterProvider
  protected tracer
  protected logger
  protected append_total_to_counters
  protected instanceId

  private static instance: _ServiceMetrics

  private constructor() {
    this.caller = ''
    this.counters = {}
    this.gauges = {}
    this.observations = {}
    this.histograms = {}
    this.meter = null
    this.meterProvider = null
    this.tracer = null
    this.logger = null
    this.append_total_to_counters = true
    this.instanceId = ''
  }

  public static getInstance(): _ServiceMetrics {
    if (!_ServiceMetrics.instance) {
      _ServiceMetrics.instance = new _ServiceMetrics()
    }
    return _ServiceMetrics.instance
  }

  /* Set up the exporter at run time, after we have read the configuration */
  start(
    collectorHost = '',
    caller: string = UNKNOWN_CALLER,
    sample_ratio: number = DEFAULT_TRACE_SAMPLE_RATIO,
    logger: any = null,
    append_total_to_counters: boolean = true,
    prometheusExportPort: number = 0,
    exportIntervalMillis: number = DEFAULT_EXPORT_INTERVAL_MS,
    exportTimeoutMillis: number = DEFAULT_EXPORT_TIMEOUT_MS
  ) {
    this.caller = caller

    // ensure numerics
    prometheusExportPort = enforceNumeric(prometheusExportPort)
    exportIntervalMillis = enforceNumeric(exportIntervalMillis)
    exportTimeoutMillis = enforceNumeric(exportTimeoutMillis)

    this.meterProvider = new MeterProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: caller,
      }),
    })
    if (!collectorHost && prometheusExportPort <= 0) {
      // If no collector URL  or prometheusExportPort then the functions will be no-ops
      return
    }
    if (prometheusExportPort > 0) {
      const promExporter = new PrometheusExporter({ port: prometheusExportPort });
      this.meterProvider.addMetricReader(promExporter);
    }


    if (collectorHost) {

      // Check for invalid intervals
      if (exportIntervalMillis < exportTimeoutMillis || exportIntervalMillis === 0) {
        throw new Error(`Invalid export and timeout intervals ${exportIntervalMillis} and ${exportTimeoutMillis}. ` +
                        `Export interval must be greater than timeout interval and nonzero.`);
      }

      const collectorURL = `http://${collectorHost}:4318/v1/metrics`
      const traceCollectorURL = `http://${collectorHost}:4318/v1/traces`

      const metricExporter = new OTLPMetricExporter({
        url: collectorURL,
        concurrencyLimit: CONCURRENCY_LIMIT,
      })


      this.meterProvider.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: exportIntervalMillis,
          exportTimeoutMillis: exportTimeoutMillis
        })
      )

      // now set up trace exporter
      const traceExporter = new OTLPTraceExporter({
        url: traceCollectorURL,
        concurrencyLimit: TRACE_CONCURRENCY_LIMIT,
      })

      //reference: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base
      const traceProvider = new BasicTracerProvider({
        sampler: new ParentBasedSampler({
          // sample_ratio represents the percentage of traces which should
          // be sampled.
          root: new TraceIdRatioBasedSampler(sample_ratio),
        }),
      })

      traceProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter))
      traceProvider.register()

      // set up a tracer for the caller
      this.tracer = trace.getTracer(caller)
    }

    // Meter for calling application
    this.meter = this.meterProvider.getMeter(caller)

    // accept a logger from the caller
    this.logger = logger

    // behavior about counter naming to be backward-compatible
    this.append_total_to_counters = append_total_to_counters

    // set the shutdown behavior to flush metrics on exit
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  
    return Boolean(this.meter)    
  }

  /*
   * Shutdown gracefully exporting all final metrics
   *
   */
  async shutdown() {
    if (this.meterProvider) {
      await this.meterProvider.shutdown()
    }
  }

  /*
   * Set an instance identifier for all metrics going forward
   */
  setInstanceIdentifier(instanceId: string) {
    this.instanceId = instanceId
  }

  /*
   * adjust metric parameters to include instanceIdentifier, if any
   */
  adjustParams(params?: any) {

    // if we have an instance identifier, include it
    if (this.instanceId) {
       if (! params) {
          return({'instanceId': this.instanceId})
       }
       params['instanceId'] = this.instanceId
    }
    return params
  }

  // could have subclasses or specific functions with set params, but we want to
  // easily and quickly change what is recorded, there are no code dependencies on it

  startSpan(name: string, params?: any): Endable {
    if (!this.tracer) {
      return new NullSpan()
    }

    try {
      const span = this.tracer.startSpan(name)
      for (const key in params) {
        span.setAttribute(key, params[key])
      }
      return span
    } catch (e) {
      this.logger.warn(`Error starting span ${name}: ${e}`)
      return new NullSpan()
    }
  }

  count(name: string, value: number, params?: any) {
    // If not initialized, just return

    if (!this.meter) {
      return
    }

    const finalParams = this.adjustParams(params)

    // Create this counter if we have not already
    if (!(name in this.counters)) {
      const full_name = this.append_total_to_counters ?
        `${this.caller}_${name}_total` : `${this.caller}_${name}`
      this.counters[name] = this.meter.createCounter(full_name)
    }
    // Add to the count
    if (finalParams) {
      this.counters[name].add(value, finalParams)
    } else {
      this.counters[name].add(value)
    }
  }


  observe(name: string, value: number, params?: any) {
    // If not initialized, just return
    if (!this.meter) {
      return
    }

    // Create this ObservableGauge if we have not already
    if (!(name in this.gauges)) {
      this.gauges[name] = this.meter.createObservableGauge(`${this.caller}:${name}`)
      this.observations[name] = []
      this.gauges[name].addCallback((observableResult: ObservableResult) => {
        for (const [value, params] of this.observations[name]) {
          observableResult.observe(value, params)
        }
        this.observations[name] = []
      })
    }

    const finalParams = this.adjustParams(params)

    // Record the observed value; it will be set in the callback when metrics are recorded
    this.observations[name].push([value, finalParams])
  }


  record(name: string, value: number, params?: any) {
    // If not initialized, just return
    if (!this.meter) {
      return
    }
    // Create this Histogram if we have not already
    if (!(name in this.histograms)) {
      this.histograms[name] = this.meter.createHistogram(`${this.caller}:${name}`)
    }

    const finalParams = this.adjustParams(params)

    // Record the observed value
    if (params) {
      this.histograms[name].record(value, finalParams)
    } else {
      this.histograms[name].record(value)
    }
  }

  recordAverage(name: string, arr: number[]) {
    // if array is empty, just return
    if (arr.length <= 0) {
      return
    }
    this.record(name, Utils.averageArray(arr))
  }

  recordObjectFields(prefix: string, obj: object): void {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === "number") {
        this.record(prefix + '_' + String(key), value)
      }
    })
  }

  recordRatio(name: string, numer: number, denom: number, digits = 2): void {

    if (denom == 0) {
      this.log_warn(`Attempt to record ratio w zero denominator: ${name}`)
      return
    }
    this.record(name, numer / denom)
  }

  log_info(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.info(message)
    } catch { }
  }

  log_warn(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.warn(message)
    } catch { }
  }

  log_err(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.err(message)
    } catch { }
  }
}

export const ServiceMetrics = _ServiceMetrics.getInstance()
