import { CeramicClient } from "@ceramicnetwork/http-client"
import { createMetricComposite} from './createModels.js'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { DID } from 'dids'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'
import {readFileSync} from 'fs'

// Not used in production - the ceramic object would be passed 
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

// Immediately invoked function expression to use async/await
(async () => {
  const did = await authenticate();
  //compose.setDID(did);

  // Call the async function
  createMetricComposite(ceramic);
})();

