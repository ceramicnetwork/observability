/*
 * Script to create the metrics models - node operators do not need to run this
 * 
 */

import { CeramicClient } from "@ceramicnetwork/http-client"
import { createMetricComposite} from './createModels.js'
import { Composite } from '@composedb/devtools'
import {
  readEncodedComposite,
  writeEncodedComposite,
  writeEncodedCompositeRuntime,
} from "@composedb/devtools-node";
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { DID } from 'dids'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'
import {readFileSync} from 'fs'

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

  // Create the composites and models
  const metricComposite: Composite = await createMetricComposite(ceramic);

  await writeEncodedComposite(metricComposite, "./src/__generated__/definition.json");
  await writeEncodedCompositeRuntime(
    ceramic,
    "./src/__generated__/definition.json",
    "./src/__generated__/definition.js"
  );

  const deployComposite = await readEncodedComposite(
    ceramic,
    "./src/__generated__/definition.json"
  );

  await deployComposite.startIndexingOn(ceramic);

  // 
})();

