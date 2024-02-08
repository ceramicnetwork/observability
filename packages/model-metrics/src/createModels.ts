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

export async function createMetricComposite(ceramic: CeramicApi): Promise<Composite> {
  const composite: Composite = await Composite.create({ ceramic, schema: metricSchema });
  console.log(composite);
  return composite;
}

