import type { CeramicApi } from "@ceramicnetwork/common";
import { Networks } from "@ceramicnetwork/common";
import { StreamID } from "@ceramicnetwork/streamid";
import { ModelInstanceDocument } from "@ceramicnetwork/stream-model-instance";
import { NETWORK_MODEL_MAP } from "./constants.js";

export interface CeramicNode {
  id: string;
  name?: string;
  nodeAuthDID?: string;
  IPAddress?: string;
  PeerID?: string;
  ceramicVersion?: string;
  ipfsVersion?: string;
}

export interface PeriodicMetricEventV1 {
  ts: string;

  ceramicNode: CeramicNode;

  lookbackWindowMS?: number;

  totalPinnedStreams?: number;
  totalIndexedModels?: number;
  currentPendingRequests?: number;

  meanAnchorRequestAgeMS?: number;
  maxAnchorRequestAgeMS?: number;
  recentCompletedRequests?: number;
  recentErrors?: number;

  sampleRecentErrors?: string[];
}

export class MetricPublisher {
  private ceramic: CeramicApi;
  private modelId: StreamID;

  // Throws an error if network does not have an associated metric model
  constructor(ceramic: CeramicApi, network: string) {
    this.ceramic = ceramic;
    const networkEnum = network as Networks;
    this.modelId = NETWORK_MODEL_MAP[networkEnum];
    if (!this.modelId) {
      throw new Error(`No metric model available for network ${network}`);
    }
  }

  public async publishMetric(data: PeriodicMetricEventV1): Promise<any> {
    const result = await ModelInstanceDocument.create(this.ceramic, data, {
      model: this.modelId,
    });
    return result;
  }
}
