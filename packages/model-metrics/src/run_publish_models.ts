/*
 * Script to create the metrics models - node operators do not need to run this
 * 
 */

import { CeramicClient } from "@ceramicnetwork/http-client"
import { createMetricComposite} from './createModels.js'
import { Composite } from '@composedb/devtools'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { DID } from 'dids'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'
import {readFileSync} from 'fs'
import { publishMetric } from './publishMetrics.js'

const CERAMIC_URL = process.env.CERAMIC_URL;
const ceramic = new CeramicClient(CERAMIC_URL);

const authenticate = async () => {
  const seed = readFileSync("./admin_seed.txt", 'utf8').trim();
  const key = fromString(seed, "base16");
  const did = new DID({
    resolver: getResolver(),
    provider: new Ed25519Provider(key),
  });
  await did.authenticate();
  ceramic.did = did;
  return did
};

(async () => {
  const did = await authenticate();

  const data = {
    ts: new Date(),
    name: 'Hello Metrics World',
    recentErrors: 2
  }

  // Publish a model document
  const result = await publishMetric(ceramic, data);

})();

