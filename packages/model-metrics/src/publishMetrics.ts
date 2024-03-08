import type { CeramicApi } from '@ceramicnetwork/common'
import { Networks } from '@ceramicnetwork/common'
import { StreamID } from '@ceramicnetwork/streamid'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import { Composite } from '@composedb/devtools'

import { metricSchema } from './simpleNodeMetrics.js'


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

    private static readonly NETWORK_MODEL_MAP: Record<Networks, StreamID> = {
        [Networks.MAINNET] : StreamID.fromString('kjzl6hvfrbw6c6z82vn6tfx92nogxf0rukcibdxigity7xe69rptwmz0mb2itdv'),
        [Networks.TESTNET_CLAY] : StreamID.fromString('kjzl6hvfrbw6c6z82vn6tfx92nogxf0rukcibdxigity7xe69rptwmz0mb2itdv'),
        [Networks.DEV_UNSTABLE] : StreamID.fromString('kjzl6hvfrbw6c6z82vn6tfx92nogxf0rukcibdxigity7xe69rptwmz0mb2itdv'),
        [Networks.LOCAL] : null,
        [Networks.INMEMORY] : null
    };

    // Throws an error if network does not have an associated metric model
    constructor(ceramic: CeramicApi, network: string) {
        this.ceramic = ceramic;
        const networkEnum = network as Networks;
        this.modelId = MetricPublisher.NETWORK_MODEL_MAP[networkEnum];
        if (! this.modelId) {
           throw new Error(`No metric model available for network ${network}`)
        }
    }

    public async publishMetric(data: PeriodicMetricEventV1): Promise<any> {
        const result = await ModelInstanceDocument.create(this.ceramic, data, { model: this.modelId });
        return result;
    }
}
