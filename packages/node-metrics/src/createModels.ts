import { Composite } from '@composedb/devtools'
import { ComposeClient} from '@composedb/client'
import { CeramicClient } from "@ceramicnetwork/http-client";

import { metricSchema } from './simpleNodeMetrics.js'


import type { CeramicApi } from '@ceramicnetwork/common'

export async function createMetricComposite(ceramic: CeramicApi): Promise<Composite> {
  console.log("Creating composite from");
  console.log(metricSchema);
  const composite: Composite = await Composite.create({ ceramic, schema: metricSchema });
  console.log(composite);
  return composite;
}

