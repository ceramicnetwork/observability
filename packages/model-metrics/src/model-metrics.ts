/* Model metrics accumulate and publish on a timer to ceramic */

export const DEFAULT_EXPORT_INTERVAL_MS = 60000 // one minute

interface CeramicNode {
    id: string;
    name: string;
    nodeAuthDID?: string;
    IPAddress?: string;
    PeerID?: string;
    ceramicVersion?: string;
    ipfsVersion?: string;
}

interface PeriodicMetricEventV1 {
    ts: Date;

    name: string;
    ceramicNode?: CeramicNode;

    lookbackWindowMS?: number;

    totalPinnedStreams?: number;
    totalIndexedModels?: number;
    currentPendingRequests?: number;
    recentCompletedRequests?: number;

    recentErrors?: string[];
}


class MetricsAccumulator {
    private metrics: Record<string, number>;
    private recentErrors: string[];
    private ceramicNode: CeramicNode;

    constructor(ceramicNode: CeramicNode) {
        this.metrics = {};
        this.recentErrors = [];
        this.ceramicNode = ceramicNode;
    }

    count(name: string) {
        if (!this.metrics[name]) {
            this.metrics[name] = 0;
        }
        this.metrics[name]++;
    }

    recordError(error: string) {
        if (this.recentErrors.length >= 1024) {
            // Assuming you want to limit the size of errors array to 1024
            this.recentErrors.shift(); // Remove the oldest error
        }
        this.recentErrors.push(error);
    }

    getMetrics(): PeriodicMetricEventV1 {
        const record: PeriodicMetricEventV1 = {
            ts: new Date(),
            name: 'ExampleMetricEvent',
            ceramicNode: this.ceramicNode,
            ceramicVersion: '1.0.0',
            ipfsVersion: '1.0.0',
            totalPinnedStreams: this.metrics['totalPinnedStreams'] || 0,
            totalIndexedModels: this.metrics['totalIndexedModels'] || 0,
            currentPendingRequests: this.metrics['currentPendingRequests'] || 0,
            recentCompletedRequests: this.metrics['recentCompletedRequests'] || 0,
            recentErrors: this.recentErrors
        };

        return record;
    }

    resetMetrics() {
        this.metrics = {};
        this.recentErrors = [];
    }
}


class _ModelMetrics {
  protected node_id
  protected node_name
  protected node_auth_did
  protected node_ip_address
  protected node_peer_id
  protected readonly counters
  protected logger

  private static instance: _ModelMetrics

  private constructor() {
    this.counters = {}
    this.logger = null
  }

  public static getInstance(): _ModelMetrics {
    if (!_ModelMetrics.instance) {
      _ModelMetrics.instance = new _ModelMetrics()
    }
    return _ModelMetrics.instance
  }

  /* Set up the exporter at run time, after we have read the configuration */
  start(
    node_id: string = '',
    node_name: string = '',
    node_auth_did: string = '',
    node_ip_address: string = '',
    node_peer_id: string = ''
    publishIntervalMillis: number = DEFAULT_PUBLISH_INTERVAL_MS,
    logger: any = null
  ) {

    this.accumulator = new MetricsAccumulator( {
         id: node_id,
         name: node_name,
         nodeAuthDID: node_auth_did,
         IPAddress: node_ip_address,
         PeerID: node_peer_id
    }) 

    this.publishInterval = publishIntervalMillis
    this.startPublishing()

    // accept a logger from the caller
    this.logger = logger
  }

  count(name: string, value: number, params?: any) {
    // If not initialized, just return

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
