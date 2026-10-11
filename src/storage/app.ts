import {
  BLIXT_NODE_PUBKEY,
  DEFAULT_DUNDER_SERVER,
  DEFAULT_INVOICE_EXPIRY,
  DEFAULT_LIGHTNINGBOX_LNURLPDESC,
  DEFAULT_LIGHTNINGBOX_SERVER,
  DEFAULT_LND_LOG_LEVEL,
  DEFAULT_MAX_LN_FEE_PERCENTAGE,
  DEFAULT_NEUTRINO_NODE,
  DEFAULT_PATHFINDING_ALGORITHM,
  DEFAULT_SPEEDLOADER_SERVER,
  PLATFORM,
} from "../utils/constants";
import { Chain, Debug, VersionCode } from "../utils/build";
import { defaultOnchainFeeServer } from "../utils/onchain-fees";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { IBitcoinUnits } from "../utils/bitcoin-units";
import { IFiatRates } from "../state/Fiat";
import { LndChainBackend } from "../state/Lightning";
import { LoginMethods } from "../state/Security";
import { MapStyle } from "../utils/google-maps";
import { appMigration } from "../migration/app-migration";

const APP_VERSION = appMigration.length - 1;

// const enums not supported in Babel 7...
export enum StorageItem {
  app = "app",
  brickDeviceAndExportChannelDb = "brickDeviceAndExportChannelDb", // This is used to copy the channel.db file when lnd is down
  bricked = "bricked", // This is used when channel.db migration is commenced
  importChannelDbOnStartup = "importChannelDbOnStartup",
  appVersion = "appVersion",
  appBuild = "appBuild",
  databaseCreated = "databaseCreated",
  walletCreated = "walletCreated",
  firstSync = "firstSync",
  timeSinceLastSync = "timeSinceLastSync",
  lightningBalance = "lightningBalance",
  loginMethods = "loginMethods",
  seedStored = "seedStored",
  bitcoinUnit = "bitcoinUnit",
  fiatUnit = "fiatUnit",
  name = "name",
  language = "language",
  walletPassword = "walletPassword",
  autopilotEnabled = "autopilotEnabled",
  autopilotNodePubkey = "autopilotNodePubkey",
  pushNotificationsEnabled = "pushNotificationsEnabled",
  clipboardInvoiceCheck = "clipboardInvoiceCheck",
  scheduledSyncEnabled = "scheduledSyncEnabled",
  scheduledGossipSyncEnabled = "scheduledGossipSyncEnabled",
  lastScheduledSync = "lastScheduledSync",
  lastScheduledSyncAttempt = "lastScheduledSyncAttempt",
  debugShowStartupInfo = "debugShowStartupInfo",
  useLegacyHeaderGradient = "useLegacyHeaderGradient",
  googleDriveBackupEnabled = "googleDriveBackupEnabled",
  preferFiat = "preferFiat",
  transactionGeolocationEnabled = "transactionGeolocationEnabled",
  transactionGeolocationMapStyle = "transactionGeolocationMapStyle",
  onchainExplorer = "onchainExplorer",
  onchainFeeServer = "onchainFeeServer",
  multiPathPaymentsEnabled = "multiPathPaymentsEnabled",
  onboardingState = "onboardingState",
  torEnabled = "torEnabled",
  hideExpiredInvoices = "hideExpiredInvoices",
  lastGoogleDriveBackup = "lastGoogleDriveBackup",
  screenTransitionsEnabled = "screenTransitionsEnabled",
  iCloudBackupEnabled = "iCloudBackupEnabled",
  lastICloudBackup = "lastICloudBackup",
  lndChainBackend = "lndChainBackend",
  neutrinoPeers = "neutrinoPeers",
  neutrinoFeeUrl = "neutrinoFeeUrl",
  bitcoindRpcHost = "bitcoindRpcHost",
  bitcoindRpcUser = "bitcoindRpcUser",
  bitcoindRpcPass = "bitcoindRpcPass",
  bitcoindPubRawBlock = "bitcoindPubRawBlock",
  bitcoindPubRawTx = "bitcoindPubRawTx",
  dunderServer = "dunderServer",
  requireGraphSync = "requireGraphSync",
  dunderEnabled = "dunderEnabled",
  lndNoGraphCache = "lndNoGraphCache",
  invoiceExpiry = "invoiceExpiry", // in seconds
  rescanWallet = "rescanWallet",
  strictGraphPruningEnabled = "strictGraphPruningEnabled",
  lndPathfindingAlgorithm = "lndPathfindingAlgorithm",
  maxLNFeePercentage = "maxLNFeePercentage",
  lndLogLevel = "lndLogLevel",
  lndCompactDb = "lndCompactDb",
  zeroConfPeers = "zeroConfPeers",
  enforceSpeedloaderOnStartup = "enforceSpeedloaderOnStartup",
  persistentServicesEnabled = "persistentServicesEnabled",
  persistentServicesWarningShown = "persistentServicesWarningShown",
  customInvoicePreimageEnabled = "customInvoicePreimageEnabled",
  speedloaderServer = "speedloaderServer",
  lightningBoxServer = "lightningBoxServer",
  lightningBoxAddress = "lightningBoxAddress",
  lightningBoxLnurlPayDesc = "lightningBoxLnurlPayDesc",
  hideAmountsEnabled = "hideAmountsEnabled",
  randomizeSettingsOnStartup = "randomizeSettingsOnStartup",
}

export interface IImportChannelDbOnStartup {
  channelDbPath: string;
  seed: string[];
  passphrase: string;
}

export const setItem = async (key: StorageItem, value: string) =>
  await AsyncStorage.setItem(key, value);
export const setItemObject = async <T>(key: StorageItem, value: T) =>
  await AsyncStorage.setItem(key, JSON.stringify(value));
export const getItem = async (key: StorageItem) => await AsyncStorage.getItem(key);
export const getItemObject = async <T = any>(key: StorageItem): Promise<T> =>
  JSON.parse((await AsyncStorage.getItem(key)) || "null");
export const removeItem = async (key: StorageItem) => await AsyncStorage.removeItem(key);
export const getAppVersion = async (): Promise<number> => {
  return (await getItemObject(StorageItem.appVersion)) || 0;
};
export const getAppBuild = async (): Promise<number> => {
  return (await getItemObject(StorageItem.appBuild)) || 0;
};
export const setAppVersion = async (version: number): Promise<void> => {
  return await setItemObject(StorageItem.appVersion, version);
};
export const setAppBuild = async (version: number): Promise<void> => {
  return await setItemObject(StorageItem.appBuild, version);
};
export const getWalletCreated = async (): Promise<boolean> => {
  return (await getItemObject(StorageItem.walletCreated)) || false;
};
export const getRescanWallet = async (): Promise<boolean> => {
  return (await getItemObject(StorageItem.rescanWallet)) || false;
};
export const getLndCompactDb = async (): Promise<boolean> => {
  return (await getItemObject(StorageItem.lndCompactDb)) || false;
};
export const setRescanWallet = async (rescan: boolean): Promise<void> => {
  return await setItemObject<boolean>(StorageItem.rescanWallet, rescan);
};
export const setLndCompactDb = async (rescan: boolean): Promise<void> => {
  return await setItemObject<boolean>(StorageItem.lndCompactDb, rescan);
};
export const setBrickDeviceAndExportChannelDb = async (brick: boolean): Promise<void> => {
  return await setItemObject<boolean>(StorageItem.brickDeviceAndExportChannelDb, brick);
};
export const getBrickDeviceAndExportChannelDb = async (): Promise<boolean> => {
  return await getItemObject<boolean>(StorageItem.brickDeviceAndExportChannelDb);
};
export const brickInstance = async (): Promise<void> => {
  return await setItemObject<boolean>(StorageItem.bricked, true);
};
export const isInstanceBricked = async (): Promise<boolean> => {
  return await getItemObject<boolean>(StorageItem.bricked);
};
export const setImportChannelDbOnStartup = async (
  value: IImportChannelDbOnStartup | null,
): Promise<void> => {
  return await setItemObject<IImportChannelDbOnStartup>(
    StorageItem.importChannelDbOnStartup,
    value!,
  );
};
export const getImportChannelDbOnStartup = async (): Promise<IImportChannelDbOnStartup> => {
  return await getItemObject<IImportChannelDbOnStartup>(StorageItem.importChannelDbOnStartup);
};
export const removeImportChannelDbOnStartupKvItem = async (): Promise<void> => {
  return removeItem(StorageItem.importChannelDbOnStartup);
};

export const clearApp = async () => {
  // TODO use AsyncStorage.clear?
  await Promise.all([
    removeItem(StorageItem.app),
    removeItem(StorageItem.brickDeviceAndExportChannelDb),
    removeItem(StorageItem.bricked),
    removeItem(StorageItem.importChannelDbOnStartup),
    removeItem(StorageItem.appVersion),
    removeItem(StorageItem.appBuild),
    removeItem(StorageItem.walletCreated),
    removeItem(StorageItem.firstSync),
    removeItem(StorageItem.timeSinceLastSync),
    removeItem(StorageItem.lightningBalance),
    removeItem(StorageItem.loginMethods),
    removeItem(StorageItem.seedStored),
    removeItem(StorageItem.bitcoinUnit),
    removeItem(StorageItem.fiatUnit),
    removeItem(StorageItem.name),
    removeItem(StorageItem.language),
    removeItem(StorageItem.walletPassword),
    removeItem(StorageItem.autopilotEnabled),
    removeItem(StorageItem.autopilotNodePubkey),
    removeItem(StorageItem.pushNotificationsEnabled),
    removeItem(StorageItem.clipboardInvoiceCheck),
    removeItem(StorageItem.scheduledSyncEnabled),
    removeItem(StorageItem.lastScheduledSync),
    removeItem(StorageItem.lastScheduledSyncAttempt),
    removeItem(StorageItem.scheduledGossipSyncEnabled),
    removeItem(StorageItem.debugShowStartupInfo),
    removeItem(StorageItem.useLegacyHeaderGradient),
    removeItem(StorageItem.googleDriveBackupEnabled),
    removeItem(StorageItem.preferFiat),
    removeItem(StorageItem.transactionGeolocationEnabled),
    removeItem(StorageItem.transactionGeolocationMapStyle),
    removeItem(StorageItem.onchainExplorer),
    removeItem(StorageItem.onchainFeeServer),
    removeItem(StorageItem.multiPathPaymentsEnabled),
    removeItem(StorageItem.onboardingState),
    removeItem(StorageItem.torEnabled),
    removeItem(StorageItem.hideExpiredInvoices),
    removeItem(StorageItem.lastGoogleDriveBackup),
    removeItem(StorageItem.screenTransitionsEnabled),
    removeItem(StorageItem.iCloudBackupEnabled),
    removeItem(StorageItem.lastICloudBackup),
    removeItem(StorageItem.lndChainBackend),
    removeItem(StorageItem.neutrinoPeers),
    removeItem(StorageItem.zeroConfPeers),
    removeItem(StorageItem.neutrinoFeeUrl),
    removeItem(StorageItem.bitcoindRpcHost),
    removeItem(StorageItem.bitcoindRpcUser),
    removeItem(StorageItem.bitcoindRpcPass),
    removeItem(StorageItem.bitcoindPubRawBlock),
    removeItem(StorageItem.bitcoindPubRawTx),
    removeItem(StorageItem.dunderServer),
    removeItem(StorageItem.requireGraphSync),
    removeItem(StorageItem.dunderEnabled),
    removeItem(StorageItem.lndNoGraphCache),
    removeItem(StorageItem.invoiceExpiry),
    removeItem(StorageItem.rescanWallet),
    removeItem(StorageItem.strictGraphPruningEnabled),
    removeItem(StorageItem.lndPathfindingAlgorithm),
    removeItem(StorageItem.maxLNFeePercentage),
    removeItem(StorageItem.lndLogLevel),
    removeItem(StorageItem.lndCompactDb),
    removeItem(StorageItem.enforceSpeedloaderOnStartup),
    removeItem(StorageItem.persistentServicesEnabled),
    removeItem(StorageItem.persistentServicesWarningShown),
    removeItem(StorageItem.speedloaderServer),
    removeItem(StorageItem.lightningBoxServer),
    removeItem(StorageItem.lightningBoxAddress),
    removeItem(StorageItem.lightningBoxLnurlPayDesc),
    removeItem(StorageItem.hideAmountsEnabled),
    removeItem(StorageItem.randomizeSettingsOnStartup),
  ]);
};

export const setupApp = async () => {
  let lndChainBackend: LndChainBackend = "neutrino";
  let neutrinoPeers: string[] = [];
  let neutrinoFeeUrl = "";
  if (Chain === "mainnet" || Chain === "testnet") {
    lndChainBackend = "neutrino";
    neutrinoPeers = DEFAULT_NEUTRINO_NODE;
    neutrinoFeeUrl = "https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json";
  }

  let bitcoindRpcHost = "";
  let bitcoindRpcUser = "";
  let bitcoindRpcPass = "";
  let bitcoindPubRawBlock = "";
  let bitcoindPubRawTx = "";
  if (Chain === "regtest") {
    // neutrinoPeers.push("127.0.0.1:19444");
    // lndChainBackend = "bitcoindWithZmq";
    // bitcoindRpcHost = "192.168.1.113:18443";
    // bitcoindRpcUser = "polaruser";
    // bitcoindRpcPass = "polarpass";
    // bitcoindPubRawBlock = "192.168.1.113:28334";
    // bitcoindPubRawTx = "192.168.1.113:29335";
  }

  await Promise.all([
    setItemObject<boolean>(StorageItem.app, true),
    setItemObject<boolean>(StorageItem.brickDeviceAndExportChannelDb, false),
    setItemObject<boolean>(StorageItem.bricked, false),
    setItemObject<IImportChannelDbOnStartup | null>(StorageItem.importChannelDbOnStartup, null),
    setItemObject<number>(StorageItem.appVersion, APP_VERSION),
    setItemObject<number>(StorageItem.appBuild, VersionCode),
    setItemObject<boolean>(StorageItem.walletCreated, false),
    setItemObject<boolean>(StorageItem.firstSync, true),
    setItemObject<number>(StorageItem.timeSinceLastSync, 0),
    setItemObject<string>(StorageItem.lightningBalance, "0"),
    setItemObject<LoginMethods[]>(StorageItem.loginMethods, []),
    setItemObject<boolean>(StorageItem.seedStored, false), // !
    setItemObject<keyof IBitcoinUnits>(StorageItem.bitcoinUnit, "bip177"),
    setItemObject<keyof IFiatRates>(StorageItem.fiatUnit, "USD"),
    setItemObject<string>(StorageItem.language, "en"),
    // walletPassword
    setItemObject<boolean>(StorageItem.autopilotEnabled, true),
    setItemObject<string>(StorageItem.autopilotNodePubkey, BLIXT_NODE_PUBKEY),
    setItemObject<boolean>(StorageItem.pushNotificationsEnabled, true),
    setItemObject<boolean>(StorageItem.clipboardInvoiceCheck, PLATFORM === "ios" ? false : true),
    setItemObject<boolean>(StorageItem.scheduledSyncEnabled, false),
    setItemObject<number>(StorageItem.lastScheduledSync, 0),
    setItemObject<number>(StorageItem.lastScheduledSyncAttempt, 0),
    setItemObject<boolean>(StorageItem.debugShowStartupInfo, Debug),
    setItemObject<boolean>(StorageItem.useLegacyHeaderGradient, false),
    setItemObject<boolean>(StorageItem.googleDriveBackupEnabled, false),
    setItemObject<boolean>(StorageItem.preferFiat, false),
    setItemObject<boolean>(StorageItem.transactionGeolocationEnabled, false),
    setItem(
      StorageItem.transactionGeolocationMapStyle,
      "darkMode" satisfies keyof typeof MapStyle,
    ),
    setItem(StorageItem.onchainExplorer, "mempool"),
    setItem(StorageItem.onchainFeeServer, defaultOnchainFeeServer(Chain)),
    setItemObject<boolean>(StorageItem.multiPathPaymentsEnabled, true),
    setItem(StorageItem.onboardingState, "SEND_ONCHAIN"),
    setItemObject<boolean>(StorageItem.torEnabled, false),
    setItemObject<boolean>(StorageItem.hideExpiredInvoices, true),
    setItemObject<number>(StorageItem.lastGoogleDriveBackup, new Date().getTime()),
    setItemObject<boolean>(StorageItem.screenTransitionsEnabled, true),
    setItemObject<boolean>(StorageItem.iCloudBackupEnabled, false),
    setItemObject<number>(StorageItem.lastICloudBackup, new Date().getTime()),
    setItem(StorageItem.lndChainBackend, lndChainBackend),
    setItemObject<string[]>(StorageItem.neutrinoPeers, neutrinoPeers),
    setItem(StorageItem.neutrinoFeeUrl, neutrinoFeeUrl),
    setItem(StorageItem.bitcoindRpcHost, bitcoindRpcHost),
    setItem(StorageItem.bitcoindRpcUser, bitcoindRpcUser),
    setItem(StorageItem.bitcoindRpcPass, bitcoindRpcPass),
    setItem(StorageItem.bitcoindPubRawBlock, bitcoindPubRawBlock),
    setItem(StorageItem.bitcoindPubRawTx, bitcoindPubRawTx),
    setItem(StorageItem.dunderServer, DEFAULT_DUNDER_SERVER),
    setItemObject<boolean>(StorageItem.requireGraphSync, true),
    setItemObject<boolean>(StorageItem.dunderEnabled, true),
    setItemObject<boolean>(StorageItem.lndNoGraphCache, false),
    setItemObject<number>(StorageItem.invoiceExpiry, DEFAULT_INVOICE_EXPIRY),
    setItemObject<boolean>(StorageItem.rescanWallet, false),
    setItemObject<boolean>(StorageItem.strictGraphPruningEnabled, false),
    setItem(StorageItem.lndPathfindingAlgorithm, DEFAULT_PATHFINDING_ALGORITHM),
    setItemObject<number>(StorageItem.maxLNFeePercentage, DEFAULT_MAX_LN_FEE_PERCENTAGE),
    setItem(StorageItem.lndLogLevel, DEFAULT_LND_LOG_LEVEL),
    setItemObject<boolean>(StorageItem.lndCompactDb, false),
    setItemObject<boolean>(StorageItem.enforceSpeedloaderOnStartup, false),
    setItemObject<boolean>(StorageItem.scheduledGossipSyncEnabled, true),
    setItemObject<boolean>(StorageItem.persistentServicesEnabled, false),
    setItemObject<boolean>(StorageItem.persistentServicesWarningShown, false),
    setItemObject<string[]>(StorageItem.zeroConfPeers, [BLIXT_NODE_PUBKEY]),
    setItemObject<boolean>(StorageItem.customInvoicePreimageEnabled, false),
    setItem(StorageItem.speedloaderServer, DEFAULT_SPEEDLOADER_SERVER),
    setItem(StorageItem.lightningBoxServer, DEFAULT_LIGHTNINGBOX_SERVER),
    // setItem(StorageItem.lightningBoxAddress, ""),
    setItem(StorageItem.lightningBoxLnurlPayDesc, DEFAULT_LIGHTNINGBOX_LNURLPDESC),
    setItemObject<boolean>(StorageItem.hideAmountsEnabled, false),
    setItemObject<boolean>(StorageItem.randomizeSettingsOnStartup, false),
  ]);
};
