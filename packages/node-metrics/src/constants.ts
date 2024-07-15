import { Networks } from "@ceramicnetwork/common";
import { StreamID } from "@ceramicnetwork/streamid";

export const NETWORK_MODEL_MAP: Record<Networks, StreamID> = {
    [Networks.MAINNET]: StreamID.fromString(
        "kjzl6hvfrbw6cb9pd0bl7zmm28h3qszh56ccpn50vsmrl7clroy4fvln00z7q6q",
    ),
    [Networks.TESTNET_CLAY]: StreamID.fromString(
        "kjzl6hvfrbw6cb9pd0bl7zmm28h3qszh56ccpn50vsmrl7clroy4fvln00z7q6q",
    ),
    [Networks.DEV_UNSTABLE]: StreamID.fromString(
        "kjzl6hvfrbw6cb9pd0bl7zmm28h3qszh56ccpn50vsmrl7clroy4fvln00z7q6q",
    ),
    [Networks.LOCAL]: null,
    [Networks.INMEMORY]: null,
};