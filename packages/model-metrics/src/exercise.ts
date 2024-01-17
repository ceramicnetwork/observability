import { CeramicClient } from "@ceramicnetwork/http-client";
import { createMetricComposite} from './createModels.js'

// Not used in production - the ceramic object would be passed 
const CERAMIC_URL = process.env.CERAMIC_URL;
const ceramic = new CeramicClient(CERAMIC_URL);
/*
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
//const did = await authenticate()
//compose.setDID(did)
*/

// Call the async function
createMetricComposite(ceramic);
