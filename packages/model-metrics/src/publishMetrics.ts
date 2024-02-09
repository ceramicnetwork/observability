import { Composite } from '@composedb/devtools'
import { StreamID } from '@ceramicnetwork/streamid'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import { metricSchema } from './simpleNodeMetrics.js'

// period exporter generic add not here

import type { CeramicApi } from '@ceramicnetwork/common'
// look for model instance document create stream 
// avoid using composeclient to avoid circular

// https://github.com/ceramicstudio/js-composedb/blob/961278c7cae533dcdbd7376f6c823f4cce6bdba2/packages/runtime/src/loader.ts#L118C3-L122C7

const MET_MODEL=StreamID.fromString('kjzl6hvfrbw6cal05ygekxn047ab4arqfolyjlixsaj6us8yt4th95kse424dm3')

export interface CeramicNode {
    id: string;
    name: string;
    nodeAuthDID?: string;
    IPAddress?: string;
    PeerID?: string;
    ceramicVersion?: string;
    ipfsVersion?: string;
}

export interface PeriodicMetricEventV1 {
    ts: Date;

    name: string;
    ceramicNode?: CeramicNode;

    lookbackWindowMS?: number;

    totalPinnedStreams?: number;
    totalIndexedModels?: number;
    currentPendingRequests?: number;

    recentCompletedRequests?: number;
    recentErrors?: number;

    sampleRecentErrors?: string[];
}

export async function publishMetric(ceramic: CeramicApi, data: PeriodicMetricEventV1) {

     const result = await ModelInstanceDocument.create(ceramic, data, { model: MET_MODEL}) 

     console.log(result)
     return result
}
