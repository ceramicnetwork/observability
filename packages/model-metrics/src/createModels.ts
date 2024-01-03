import { Composite } from '@composedb/devtools'
import { ComposeClient} from '@composedb/client'
import { CeramicClient } from "@ceramicnetwork/http-client";

import { metricSchema } from './simpleNodeMetrics.js'


import type { CeramicApi } from '@ceramicnetwork/common'
/*
declare global {
  const ceramic: CeramicApi
}
*/

export async function createMetricComposite(ceramic: CeramicApi) {
  try {
    const composite = await Composite.create({ ceramic, schema: metricSchema });
    console.log(composite);
    debugger;
    return composite;
  } catch (error) {
    console.error('Error creating composite:', error);
  }
}

