/* Model metrics accumulate and publish on a timer to ceramic */

import type { CeramicApi } from '@ceramicnetwork/common'
import { publishMetric, CeramicNode, PeriodicMetricEventV1 } from './publishMetrics.js'

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


class _ModelMetrics {
  protected ceramicApi: CeramicApi | undefined
  protected ceramicNode: CeramicNode | undefined
  protected metrics: Record<string, number>;
  protected sampleRecentErrors: string[]
  protected logger: any
  private publishIntervalId: NodeJS.Timeout | null = null;
  private publishIntervalMS: number | null = null;

  private static instance: _ModelMetrics

  private constructor(interval: number = DEFAULT_PUBLISH_INTERVAL_MS) {
      this.publishIntervalMS = interval
      this.metrics = {};
      this.sampleRecentErrors = [];
      this.logger = null
  }

  public static getInstance(): _ModelMetrics {
    if (!_ModelMetrics.instance) {
      _ModelMetrics.instance = new _ModelMetrics()
    }
    return _ModelMetrics.instance
  }


  /* Set up the publisher at run time, with an authenticated ceramic node */
  start(
    ceramic: CeramicApi,
    ceramic_version: string = '',
    ipfs_version: string = '',
    node_id: string = '',
    node_name: string = '',
    node_auth_did: string = '',
    node_ip_address: string = '',
    node_peer_id: string = '',
    logger: any = null
  ) {

    this.ceramicApi = ceramic

    this.ceramicNode = {
       id: node_id,
       name: node_name,
       nodeAuthDID: node_auth_did,
       IPAddress: node_ip_address,
       PeerID: node_peer_id,
       ceramicVersion: ceramic_version,
       ipfsVersion: ipfs_version
    }

    this.startPublishing()

    // accept a logger from the caller
    this.logger = logger
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
      this.metrics[name] = value
  }

  recordError(error: string) {
      this.count(Counter.RECENT_ERRORS, 1) 
      if (this.sampleRecentErrors.length >= ERROR_SAMPLE_SIZE) {
          return
      }
      this.sampleRecentErrors.push(error.substring(0, ERROR_MAX_LENGTH));
  }

  getMetrics(): PeriodicMetricEventV1 {
      const record: PeriodicMetricEventV1 = {
          ts: new Date(),
          name: 'ExampleMetricEvent',
          ceramicNode: this.ceramicNode,
          totalPinnedStreams: this.metrics[Observable.TOTAL_PINNED_STREAMS] || 0,
          totalIndexedModels: this.metrics[Observable.TOTAL_INDEXED_MODELS] || 0,
          currentPendingRequests: this.metrics[Observable.CURRENT_PENDING_REQUESTS] || 0,
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
  }
  
  async publish() {
      const result = await publishMetric(this.ceramicApi!, this.getMetrics());
      return result.id
  }

  startPublishing(): void {
    if (! this.publishIntervalMS) {
        this.log_err("Please set a non-zero interval for publishing model metrics")
        return
    }
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId); // Clear existing interval if it's already running
    }

    this.publishIntervalId = setInterval(async () => {
        try {
            await this.publish(); // Call the async function and wait for it to resolve
            this.resetMetrics();
        } catch (error) {
            this.log_err("Error in publishing metrics: " + error);
            // Optionally handle the error, e.g., by logging it or taking corrective action
        }
    }, this.publishIntervalMS);

  }

  stopPublishing(): void {
    if (this.publishIntervalId) {
      clearInterval(this.publishIntervalId);
      this.publishIntervalId = null;
    }
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

export const ModelMetrics = _ModelMetrics.getInstance()
