/* Model metrics accumulate and publish on a timer to ceramic */

import type { CeramicApi } from '@ceramicnetwork/common'
import { MetricPublisher, CeramicNode, PeriodicMetricEventV1 } from './publishMetrics.js'

export const DEFAULT_PUBLISH_INTERVAL_MS = 60000 // one minute

// here we have multiple brittle dependencies on the PeriodMetricEventV1 model

export enum Counter {
    RECENT_COMPLETED_REQUESTS = 'recentCompletedRequests',
    RECENT_ERRORS = 'recentErrors'
}

export enum Observable {
    TOTAL_PINNED_STREAMS = 'totalPinnedStreams',
    TOTAL_INDEXED_MODELS = 'totalIndexedModels',
    CURRENT_PENDING_REQUESTS = 'currentPendingRequests'
}

const ERROR_MAX_LENGTH = 512
const ERROR_SAMPLE_SIZE = 8

interface StartOptions {
  ceramic: CeramicApi;
  network: string;
  nodeId: string;
  intervalMS?: number;
  ceramicVersion?: string;
  ipfsVersion?: string;
  nodeName?: string;
  nodeAuthDID?: string;
  nodeIPAddr?: string;
  nodePeerId?: string;
  logger?: any;
}

interface TaskWithTimestamp {
  timestamp: number;
  [key: string]: any; // This allows for any number of additional fields of any type
}

class _ModelMetrics {
  protected publisher: MetricPublisher | undefined
  protected ceramicNode: CeramicNode | undefined
  protected metrics: Record<string, number>;
  protected sampleRecentErrors: string[]
  protected totalAnchorCount: number
  protected totalAnchorAge: number
  protected maxAnchorAge: number
  protected logger: any
  private publishIntervalId: NodeJS.Timeout | null = null;
  private publishIntervalMS: number | null = null;

  private static instance: _ModelMetrics

  private constructor() {
      this.metrics = {};
      this.sampleRecentErrors = [];
      this.totalAnchorCount = 0;
      this.totalAnchorAge = 0;
      this.maxAnchorAge = 0;
      this.logger = null
  }

  public static getInstance(): _ModelMetrics {
    if (!_ModelMetrics.instance) {
      _ModelMetrics.instance = new _ModelMetrics()
    }
    return _ModelMetrics.instance
  }


  /* Set up the publisher at run time, with an authenticated ceramic node */
  start( options: StartOptions ) {

    const {
      ceramic,
      network,
      intervalMS = DEFAULT_PUBLISH_INTERVAL_MS,
      ceramicVersion = '',
      ipfsVersion = '',
      nodeId = '',
      nodeName = '',
      nodeAuthDID = '',
      nodeIPAddr = '',
      nodePeerId = '',
      logger = null
    } = options;

    this.logger = logger

    try {
      this.publisher = new MetricPublisher(ceramic, network)
    } catch (error) {
      this.publisher = null
      this.logErr(`Unable to start publishing metrics: ${error.message}`)
      return
    }

    this.publishIntervalMS = intervalMS

    this.ceramicNode = {
       id: nodeId || nodePeerId,
       name: nodeName,
       nodeAuthDID: nodeAuthDID,
       IPAddress: nodeIPAddr,
       PeerID: nodePeerId,
       ceramicVersion: ceramicVersion,
       ipfsVersion: ipfsVersion
    }

    this.startPublishing()
  }


  /*
   * During the observation interval, counts can be incremented for 
   *
   *    recentCompletedRequests
   *    recentErrors
   *
   * This may happen more than once during the observation interval and should be additive
   */
  count(name: Counter, value: number) {
      if (!this.publisher) { return; }

      if (!this.metrics[name]) {
          this.metrics[name] = 0;
      }
      this.metrics[name] += value;
  }

  /*
   * During the observation interval, values may be observed for
   *
   *    totalPinnedStreams
   *    totalIndexedModels
   *    currentPendingRequests
   *
   * Generally these would be observed once at the start of the interval; if additional
   * observations are made they will replace previous numbers as only one will be reported per interval
   */
  observe(name: Observable, value: number) {
      if (!this.publisher) { return; }

      this.metrics[name] = value
  }

  /* specific function to record errors, which will keep a count and sample of errors */
  recordError(error: string) {
      if (!this.publisher) { return; }

      this.count(Counter.RECENT_ERRORS, 1) 
      if (this.sampleRecentErrors.length >= ERROR_SAMPLE_SIZE) {
          return
      }
      this.sampleRecentErrors.push(error.substring(0, ERROR_MAX_LENGTH));
  }

  /* Specific function to record an Anchor Request age from a request entry
     This will update the mean and max calculated on publish */
  recordAnchorRequestAgeMS(task: TaskWithTimestamp) {
      if (!this.publisher) { return; }

      const age = Date.now() - task.timestamp

      this.totalAnchorAge += age
      this.totalAnchorCount += 1
      if (age > this.maxAnchorAge) {
         this.maxAnchorAge = age
      }
  }

  getMeanAnchorRequestAgeMS() {
      if (this.totalAnchorCount > 0) {
         return Math.round(this.totalAnchorAge / this.totalAnchorCount)
      } else {
         return 0
      }
  }

  getMetrics(): PeriodicMetricEventV1 {
      const datestr = new Date().toISOString()
      const record: PeriodicMetricEventV1 = {
          ts: datestr, //new Date(),
          ceramicNode: this.ceramicNode,
          totalPinnedStreams: this.metrics[Observable.TOTAL_PINNED_STREAMS] || 0,
          totalIndexedModels: this.metrics[Observable.TOTAL_INDEXED_MODELS] || 0,
          currentPendingRequests: this.metrics[Observable.CURRENT_PENDING_REQUESTS] || 0,
          meanAnchorRequestAgeMS: this.getMeanAnchorRequestAgeMS(),
          maxAnchorRequestAgeMS: this.maxAnchorAge,
          recentCompletedRequests: this.metrics[Counter.RECENT_COMPLETED_REQUESTS] || 0,
          recentErrors: this.metrics[Counter.RECENT_ERRORS] || 0,
          sampleRecentErrors: this.sampleRecentErrors
      };
      return record;
  }

  /*
   * On publish, the counts are reset to 0
  */
  resetMetrics(): void {
      this.metrics = {};
      this.sampleRecentErrors = [];
      this.totalAnchorAge = 0;
      this.totalAnchorCount = 0;
      this.maxAnchorAge = 0;
  }
  
  async publish() {
      const result = await this.publisher.publishMetric(this.getMetrics());
      return result.id
  }

  startPublishing(): void {
    if (! this.publishIntervalMS) {
        this.logErr("Please set a non-zero interval for publishing model metrics")
        return
    }
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId); // Clear existing interval if it's already running
    }

    let isPublishing = false; // Flag to indicate if publish is currently running

    this.publishIntervalId = setInterval(async () => {
        // skip if we are already trying to publish
        if (isPublishing) return;
        isPublishing = true;

        try {
            await this.publish();
            this.resetMetrics();
        } catch (error) {
            this.logErr("Error in publishing metrics: " + error);
        } finally {
            isPublishing = false;
        }
    }, this.publishIntervalMS);

  }

  async stopPublishing(flush = false): Promise<void> {
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId);
      this.publishIntervalId = null;
      if (flush) {
        try {
            await this.publish();
            this.resetMetrics();
        } catch (error) {
            this.logErr("Error in publishing metrics: " + error);
        }
      }
    }
  }

  logInfo(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.info(message)
    } catch { }
  }

  logWarn(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.warn(message)
    } catch { }
  }

  logErr(message: string): void {
    if (!this.logger) {
      return
    }
    try {
      this.logger.err(message)
    } catch { }
  }
}

export const ModelMetrics = _ModelMetrics.getInstance()
