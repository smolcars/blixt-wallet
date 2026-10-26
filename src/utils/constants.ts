import { Platform, StatusBar } from "react-native";
import { DocumentDirectoryPath } from "react-native-fs";

import { Chain } from "./build";
import { LndLogLevel } from "../state/Settings";
import { chainSelect } from "./chain-select";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { zoomed } from "./scale";

export const TLV_RECORD_NAME = 128101;
export const TLV_KEYSEND = 5482373484;
export const TLV_WHATSAT_MESSAGE = 34349334;
export const TLV_SATOGRAM = 6789998212;

export const GITHUB_REPO_URL = "https://github.com/hsjoberg/blixt-wallet";
export const HAMPUS_EMAIL = "mailto:hampus.sjoberg💩protonmail.com".replace("💩", "@");
export const TELEGRAM = "https://t.me/blixtwallet";
export const FAQ = "https://blixtwallet.github.io/faq";

export const PLATFORM = Platform.OS;
const runtimeGlobals = globalThis as Record<string, unknown>;
export const IS_ELECTROBUN =
  PLATFORM === "web" &&
  (runtimeGlobals.IS_ELECTROBUN === true || typeof runtimeGlobals.__electrobun !== "undefined");
export const BLIXT_WEB_DEMO =
  runtimeGlobals.BLIXT_WEB_DEMO === true || runtimeGlobals.BLIXT_WEB_DEMO === "true";

export const MATH_PAD_NATIVE_ID = "MATH_PAD";

export const DEFAULT_NEUTRINO_NODE = chainSelect({
  mainnet: [
    "node.blixtwallet.com",
    "btcd.lnolymp.us",
    "uswest.blixtwallet.com",
    "europe.blixtwallet.com",
    "asia.blixtwallet.com",
    "btcd-mainnet.lightning.computer",
  ],
  testnet: ["testnet.blixtwallet.com"],
  regtest: [],
  signet: ["45.79.52.207:38333"],
});
export const DEFAULT_INVOICE_EXPIRY = 3600;
export const DEFAULT_MAX_LN_FEE_PERCENTAGE = 2;
export const DEFAULT_LND_LOG_LEVEL: LndLogLevel = "info";
export const DEFAULT_PATHFINDING_ALGORITHM = "apriori";

export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID = "common";
export const ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME = "Common notifications";

export const DEFAULT_DUNDER_SERVER = chainSelect({
  mainnet: "https://dunder.blixtwallet.com",
  testnet: "https://testnetdunder.blixtwallet.com",
  regtest: "http://192.168.1.111:8080",
  signet: "135.181.215.237:38333",
});

export const DEFAULT_SPEEDLOADER_SERVER = chainSelect({
  mainnet: "https://primer.blixtwallet.com",
  testnet: "",
  regtest: "",
  signet: "",
});

export const DEFAULT_LIGHTNINGBOX_SERVER = chainSelect({
  mainnet: "https://blixtwallet.com/lightning-box",
  testnet: "",
  regtest: "",
  signet: "",
});
export const DEFAULT_LIGHTNINGBOX_LNURLPDESC = "Thanks for the sats! ⚡️";

export const HEADER_MIN_HEIGHT =
  Platform.select({
    android: (StatusBar.currentHeight ?? 0) + 53,
    ios: getStatusBarHeight(true) + 53,
    macos: 53,
  }) ?? 53;

export const HEADER_MAX_HEIGHT =
  (Platform.select({
    android: 195,
    ios: 195,
    web: 195 - 32,
    macos: 175,
  }) ?? 195) / (zoomed ? 0.85 : 1);

export const BLIXT_NODE_PUBKEY =
  Chain === "mainnet"
    ? "0230a5bca558e6741460c13dd34e636da28e52afd91cf93db87ed1b0392a7466eb"
    : "036b7130b27a23d6fe1d55c1d3bed9e6da5a17090588b0834e8200e0d50ee6886a";

export const TOR_SETTINGS = {
  socksPort: 9056,
  dataDir: `${DocumentDirectoryPath}/tor_data`,
  timeoutMs: 30000,
};
