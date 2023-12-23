import type { CeramicApi } from '@ceramicnetwork/common'
import { Composite } from '@composedb/devtools'

import { metricSchema } from './simpleNodeMetrics.js'

declare global {
  const ceramic: CeramicApi
}

async function createComposite() {
  try {
    const composite = await Composite.create({ ceramic, schema: metricSchema });
    console.log(composite);
    debugger;
    return composite;
  } catch (error) {
    console.error('Error creating composite:', error);
  }
}

// Call the async function
createComposite();
