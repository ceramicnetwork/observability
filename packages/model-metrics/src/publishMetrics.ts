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

export async function publishMetric(ceramic: CeramicApi, data: Record<string, unknown>) {

     const result = await ModelInstanceDocument.create(ceramic, data, { model: MET_MODEL}) 

     console.log(result)
     return result
}
