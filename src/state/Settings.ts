import { Action, Thunk, action, thunk } from "easy-peasy";
import {
  BLIXT_NODE_PUBKEY,
  DEFAULT_INVOICE_EXPIRY,
  DEFAULT_LIGHTNINGBOX_LNURLPDESC,
  DEFAULT_LIGHTNINGBOX_SERVER,
  DEFAULT_LND_LOG_LEVEL,
  DEFAULT_MAX_LN_FEE_PERCENTAGE,
  DEFAULT_PATHFINDING_ALGORITHM,
  DEFAULT_SPEEDLOADER_SERVER,
  PLATFORM,
} from "../utils/constants";
import {
  StorageItem,
  getItem,
  getItemObject,
  getLndCompactDb,
  getPersistentServicesEnabled,
  getRescanWallet,
  removeItem,
  setItem,
  setItemObject,
  setLndCompactDb,
  setRescanWallet,
} from "../storage/app";

import { Chain } from "../utils/build";
import { defaultOnchainFeeServer, normalizeOnchainFeeServer } from "../utils/onchain-fees";
import { BitcoinUnits, IBitcoinUnits } from "../utils/bitcoin-units";
import { IFiatRates } from "./Fiat";
import { IStoreModel } from "./index";
import { MapStyle } from "../utils/google-maps";
import { i18n } from "../i18n/i18n";
import logger from "./../utils/log";
import { languages } from "../i18n/i18n.constants";

const log = logger("Settings");

export const OnchainExplorer = {
  mempool: `https://mempool.space/${Chain === "testnet" ? "testnet/" : ""}tx/`,
  blockstream: `https://blockstream.info/${Chain === "testnet" ? "testnet/" : ""}tx/`,
  oxt: `https://oxt.me/transaction/`,
  blockchair: "https://blockchair.com/bitcoin/transaction/",
};

export type LndLogLevel = "trace" | "debug" | "info" | "warn" | "error" | "critical";

export type routerrpcEstimator = "apriori" | "bimodal";

export interface ISettingsModel {
  initialize: Thunk<ISettingsModel>;

  changeBitcoinUnit: Thunk<ISettingsModel, keyof IBitcoinUnits>;
  changeFiatUnit: Thunk<ISettingsModel, keyof IFiatRates>;
  changeName: Thunk<ISettingsModel, string | null>;
  changeLanguage: Thunk<ISettingsModel, string>;
  changeAutopilotEnabled: Thunk<ISettingsModel, boolean>;
  changeAutopilotNodePubkey: Thunk<ISettingsModel, string>;
  changePushNotificationsEnabled: Thunk<ISettingsModel, boolean>;
  changeClipboardInvoiceCheckEnabled: Thunk<ISettingsModel, boolean>;
  changeScheduledSyncEnabled: Thunk<ISettingsModel, boolean>;
  changeScheduledGossipSyncEnabled: Thunk<ISettingsModel, boolean>;
  changeDebugShowStartupInfo: Thunk<ISettingsModel, boolean>;
  changeUseLegacyHeaderGradient: Thunk<ISettingsModel, boolean>;
  changeGoogleDriveBackupEnabled: Thunk<ISettingsModel, boolean>;
  changePreferFiat: Thunk<ISettingsModel, boolean>;
  changeTransactionGeolocationEnabled: Thunk<ISettingsModel, boolean>;
  changeTransactionGeolocationMapStyle: Thunk<ISettingsModel, keyof typeof MapStyle>;
  changeOnchainFeeServer: Thunk<ISettingsModel, string>;
  changeOnchainExplorer: Thunk<ISettingsModel, keyof typeof OnchainExplorer | string>;
  changeMultiPathPaymentsEnabled: Thunk<ISettingsModel, boolean>;
  changeTorEnabled: Thunk<ISettingsModel, boolean>;
  changeHideExpiredInvoices: Thunk<ISettingsModel, boolean>;
  changeScreenTransitionsEnabled: Thunk<ISettingsModel, boolean>;
  changeICloudBackupEnabled: Thunk<ISettingsModel, boolean>;
  changeLndChainBackend: Thunk<ISettingsModel, string>;
  changeNeutrinoPeers: Thunk<ISettingsModel, string[]>;
  changeZeroConfPeers: Thunk<ISettingsModel, string[]>;
  changeBitcoindRpcHost: Thunk<ISettingsModel, string>;
  changeBitcoindRpcUser: Thunk<ISettingsModel, string>;
  changeBitcoindRpcPassword: Thunk<ISettingsModel, string>;
  changeBitcoindPubRawBlock: Thunk<ISettingsModel, string>;
  changeBitcoindPubRawTx: Thunk<ISettingsModel, string>;
  changeDunderServer: Thunk<ISettingsModel, string>;
  changeRequireGraphSync: Thunk<ISettingsModel, boolean>;
  changeDunderEnabled: Thunk<ISettingsModel, boolean>;
  changeLndNoGraphCache: Thunk<ISettingsModel, boolean>;
  changeInvoiceExpiry: Thunk<ISettingsModel, number>;
  changeRescanWallet: Thunk<ISettingsModel, boolean>;
  changeStrictGraphPruningEnabled: Thunk<ISettingsModel, boolean, any, IStoreModel>;
  changeLndPathfindingAlgorithm: Thunk<ISettingsModel, routerrpcEstimator, any, IStoreModel>;
  changeMaxLNFeePercentage: Thunk<ISettingsModel, number>;
  changeLndLogLevel: Thunk<ISettingsModel, LndLogLevel>;
  changeLndCompactDb: Thunk<ISettingsModel, boolean>;
  changeEnforceSpeedloaderOnStartup: Thunk<ISettingsModel, boolean>;
  changePersistentServicesEnabled: Thunk<ISettingsModel, boolean, any, IStoreModel>;
  changePersistentServicesWarningShown: Thunk<ISettingsModel, boolean, any, IStoreModel>;
  changeCustomInvoicePreimageEnabled: Thunk<ISettingsModel, boolean>;
  changeSpeedloaderServer: Thunk<ISettingsModel, string>;
  changeLightningBoxServer: Thunk<ISettingsModel, string>;
  changeLightningBoxAddress: Thunk<ISettingsModel, string>;
  changeLightningBoxLnurlPayDesc: Thunk<ISettingsModel, string>;
  changeHideAmountsEnabled: Thunk<ISettingsModel, boolean>;
  changeRandomizeSettingsOnStartup: Thunk<ISettingsModel, boolean>;

  setBitcoinUnit: Action<ISettingsModel, keyof IBitcoinUnits>;
  setFiatUnit: Action<ISettingsModel, keyof IFiatRates>;
  setName: Action<ISettingsModel, string | null>;
  setLanguage: Action<ISettingsModel, string>;
  setAutopilotEnabled: Action<ISettingsModel, boolean>;
  setAutopilotNodePubkey: Action<ISettingsModel, string>;
  setPushNotificationsEnabled: Action<ISettingsModel, boolean>;
  setClipboardInvoiceCheckInvoicesEnabled: Action<ISettingsModel, boolean>;
  setScheduledSyncEnabled: Action<ISettingsModel, boolean>;
  setScheduledGossipSyncEnabled: Action<ISettingsModel, boolean>;
  setDebugShowStartupInfo: Action<ISettingsModel, boolean>;
  setUseLegacyHeaderGradient: Action<ISettingsModel, boolean>;
  setGoogleDriveBackupEnabled: Action<ISettingsModel, boolean>;
  setPreferFiat: Action<ISettingsModel, boolean>;
  setTransactionGeolocationEnabled: Action<ISettingsModel, boolean>;
  setTransactionGeolocationMapStyle: Action<ISettingsModel, keyof typeof MapStyle>;
  setOnchainFeeServer: Action<ISettingsModel, string>;
  setOnchainExplorer: Action<ISettingsModel, keyof typeof OnchainExplorer | string>;
  setMultiPathPaymentsEnabled: Action<ISettingsModel, boolean>;
  setTorEnabled: Action<ISettingsModel, boolean>;
  setHideExpiredInvoices: Action<ISettingsModel, boolean>;
  setScreenTransitionsEnabled: Action<ISettingsModel, boolean>;
  setICloudBackupEnabled: Action<ISettingsModel, boolean>;
  setLndChainBackend: Action<ISettingsModel, string>;
  setNeutrinoPeers: Action<ISettingsModel, string[]>;
  setZeroConfPeers: Action<ISettingsModel, string[]>;
  setBitcoindRpcHost: Action<ISettingsModel, string>;
  setBitcoindRpcUser: Action<ISettingsModel, string>;
  setBitcoindRpcPassword: Action<ISettingsModel, string>;
  setBitcoindPubRawBlock: Action<ISettingsModel, string>;
  setBitcoindPubRawTx: Action<ISettingsModel, string>;
  setDunderServer: Action<ISettingsModel, string>;
  setRequireGraphSync: Action<ISettingsModel, boolean>;
  setDunderEnabled: Action<ISettingsModel, boolean>;
  setLndNoGraphCache: Action<ISettingsModel, boolean>;
  setInvoiceExpiry: Action<ISettingsModel, number>;
  setRescanWallet: Action<ISettingsModel, boolean>;
  setStrictGraphPruningEnabled: Action<ISettingsModel, boolean>;
  setLndPathfindingAlgorithm: Action<ISettingsModel, routerrpcEstimator>;
  setMaxLNFeePercentage: Action<ISettingsModel, number>;
  setLndLogLevel: Action<ISettingsModel, LndLogLevel>;
  setLndCompactDb: Action<ISettingsModel, boolean>;
  setEnforceSpeedloaderOnStartup: Action<ISettingsModel, boolean>;
  setPersistentServicesEnabled: Action<ISettingsModel, boolean>;
  setPersistentServicesWarningShown: Action<ISettingsModel, boolean>;
  setCustomInvoicePreimageEnabled: Action<ISettingsModel, boolean>;
  setSpeedloaderServer: Action<ISettingsModel, string>;
  setLightningBoxServer: Action<ISettingsModel, string>;
  setLightningBoxAddress: Action<ISettingsModel, string>;
  SetLightningBoxLnurlPayDesc: Action<ISettingsModel, string>;
  setHideAmountsEnabled: Action<ISettingsModel, boolean>;
  setRandomizeSettingsOnStartup: Action<ISettingsModel, boolean>;

  bitcoinUnit: keyof IBitcoinUnits;
  fiatUnit: keyof IFiatRates;
  name: string | null;
  language: string;
  autopilotEnabled: boolean;
  autopilotNodePubkey: string;
  pushNotificationsEnabled: boolean;
  clipboardInvoiceCheckEnabled: boolean;
  scheduledSyncEnabled: boolean;
  scheduledGossipSyncEnabled: boolean;
  debugShowStartupInfo: boolean;
  useLegacyHeaderGradient: boolean;
  googleDriveBackupEnabled: boolean;
  preferFiat: boolean;
  transactionGeolocationEnabled: boolean;
  transactionGeolocationMapStyle: keyof typeof MapStyle;
  onchainFeeServer: string;
  onchainExplorer: keyof typeof OnchainExplorer | string;
  multiPathPaymentsEnabled: boolean;
  torEnabled: boolean;
  hideExpiredInvoices: boolean;
  screenTransitionsEnabled: boolean;
  iCloudBackupEnabled: boolean;
  lndChainBackend: string;
  neutrinoPeers: string[];
  bitcoindRpcHost: string;
  bitcoindRpcUser: string;
  bitcoindRpcPassword: string;
  bitcoindPubRawBlock: string;
  bitcoindPubRawTx: string;
  dunderServer: string;
  requireGraphSync: boolean;
  dunderEnabled: boolean;
  lndNoGraphCache: boolean;
  invoiceExpiry: number;
  rescanWallet: boolean;
  strictGraphPruningEnabled: boolean;
  lndPathfindingAlgorithm: routerrpcEstimator;
  maxLNFeePercentage: number;
  lndLogLevel: LndLogLevel;
  lndCompactDb: boolean;
  zeroConfPeers: string[];
  enforceSpeedloaderOnStartup: boolean;
  persistentServicesEnabled: boolean;
  persistentServicesWarningShown: boolean;
  customInvoicePreimageEnabled: boolean;
  speedloaderServer: string;
  lightningBoxServer: string;
  lightningBoxAddress: string;
  lightningBoxLnurlPayDesc: string;
  hideAmountsEnabled: boolean;
  randomizeSettingsOnStartup: boolean;

  randomize: Thunk<ISettingsModel, void, any, IStoreModel>;
}

export const settings: ISettingsModel = {
  initialize: thunk(async (actions) => {
    log.d("Initializing");
    const randomizeSettingsOnStartup =
      (await getItemObject(StorageItem.randomizeSettingsOnStartup)) ?? false;
    if (randomizeSettingsOnStartup) {
      actions.setRandomizeSettingsOnStartup(randomizeSettingsOnStartup);
      actions.randomize();
      return;
    }
    actions.setRandomizeSettingsOnStartup(randomizeSettingsOnStartup);

    actions.setBitcoinUnit((await getItemObject(StorageItem.bitcoinUnit)) || "bitcoin");
    actions.setFiatUnit((await getItemObject(StorageItem.fiatUnit)) || "USD");
    actions.setName((await getItemObject(StorageItem.name)) || null);
    actions.setLanguage((await getItemObject(StorageItem.language)) || "en");
    actions.setAutopilotEnabled((await getItemObject(StorageItem.autopilotEnabled)) ?? true);
    actions.setAutopilotNodePubkey(
      (await getItemObject(StorageItem.autopilotNodePubkey)) || BLIXT_NODE_PUBKEY,
    );
    actions.setPushNotificationsEnabled(
      await getItemObject(StorageItem.pushNotificationsEnabled || false),
    );
    actions.setClipboardInvoiceCheckInvoicesEnabled(
      await getItemObject(StorageItem.clipboardInvoiceCheck || false),
    );
    actions.setScheduledSyncEnabled(
      (await getItemObject(StorageItem.scheduledSyncEnabled)) || false,
    );
    actions.setScheduledGossipSyncEnabled(
      (await getItemObject(StorageItem.scheduledGossipSyncEnabled)) ?? true,
    );
    actions.setDebugShowStartupInfo(
      (await getItemObject(StorageItem.debugShowStartupInfo)) || false,
    );
    actions.setUseLegacyHeaderGradient(
      (await getItemObject(StorageItem.useLegacyHeaderGradient)) || false,
    );
    actions.setGoogleDriveBackupEnabled(
      (await getItemObject(StorageItem.googleDriveBackupEnabled)) || false,
    );
    actions.setPreferFiat((await getItemObject(StorageItem.preferFiat)) || false);
    actions.setTransactionGeolocationEnabled(
      (await getItemObject(StorageItem.transactionGeolocationEnabled)) || false,
    );
    actions.setTransactionGeolocationMapStyle(
      ((await getItem(StorageItem.transactionGeolocationMapStyle)) as keyof typeof MapStyle) ||
        "darkMode",
    );
    actions.setOnchainExplorer((await getItem(StorageItem.onchainExplorer)) ?? "mempool");
    actions.setOnchainFeeServer(
      (await getItem(StorageItem.onchainFeeServer)) ?? defaultOnchainFeeServer(Chain),
    );
    actions.setMultiPathPaymentsEnabled(
      await getItemObject(StorageItem.multiPathPaymentsEnabled || false),
    );
    actions.setTorEnabled((await getItemObject(StorageItem.torEnabled)) || false);
    actions.setHideExpiredInvoices((await getItemObject(StorageItem.hideExpiredInvoices)) || false);
    actions.setScreenTransitionsEnabled(
      (await getItemObject(StorageItem.screenTransitionsEnabled)) ?? true,
    );
    actions.setICloudBackupEnabled(await getItemObject(StorageItem.iCloudBackupEnabled ?? false));
    actions.setLndChainBackend((await getItem(StorageItem.lndChainBackend)) ?? "");
    actions.setNeutrinoPeers((await getItemObject(StorageItem.neutrinoPeers)) ?? []);
    actions.setZeroConfPeers(
      (await getItemObject(StorageItem.zeroConfPeers)) ?? [BLIXT_NODE_PUBKEY],
    );
    actions.setBitcoindRpcHost((await getItem(StorageItem.bitcoindRpcHost)) ?? "");
    actions.setBitcoindRpcUser((await getItem(StorageItem.bitcoindRpcUser)) ?? "");
    actions.setBitcoindRpcPassword((await getItem(StorageItem.bitcoindRpcPass)) ?? "");
    actions.setBitcoindPubRawBlock((await getItem(StorageItem.bitcoindPubRawBlock)) ?? "");
    actions.setBitcoindPubRawTx((await getItem(StorageItem.bitcoindPubRawTx)) ?? "");
    actions.setDunderServer((await getItem(StorageItem.dunderServer)) ?? "");
    actions.setRequireGraphSync((await getItemObject(StorageItem.requireGraphSync)) ?? true);
    actions.setDunderEnabled((await getItemObject(StorageItem.dunderEnabled)) ?? true);
    actions.setLndNoGraphCache((await getItemObject(StorageItem.lndNoGraphCache)) ?? false);
    actions.setInvoiceExpiry(
      (await getItemObject(StorageItem.invoiceExpiry)) ?? DEFAULT_INVOICE_EXPIRY,
    );
    actions.setRescanWallet(await getRescanWallet());
    actions.setStrictGraphPruningEnabled(
      (await getItemObject(StorageItem.strictGraphPruningEnabled)) ?? false,
    );
    actions.setLndPathfindingAlgorithm(
      ((await getItem(StorageItem.lndPathfindingAlgorithm)) ??
        DEFAULT_PATHFINDING_ALGORITHM) as routerrpcEstimator,
    );
    actions.setMaxLNFeePercentage((await getItemObject(StorageItem.maxLNFeePercentage)) ?? 2);
    actions.setLndLogLevel(((await getItem(StorageItem.lndLogLevel)) ?? "info") as LndLogLevel);
    actions.setLndCompactDb(await getLndCompactDb());
    actions.setEnforceSpeedloaderOnStartup(
      await getItemObject(StorageItem.enforceSpeedloaderOnStartup || false),
    );
    actions.setPersistentServicesEnabled(await getPersistentServicesEnabled());
    actions.setPersistentServicesWarningShown(
      (await getItemObject(StorageItem.persistentServicesWarningShown)) ?? false,
    );
    actions.setCustomInvoicePreimageEnabled(
      (await getItemObject(StorageItem.customInvoicePreimageEnabled)) ?? false,
    );
    actions.setSpeedloaderServer(
      (await getItem(StorageItem.speedloaderServer)) ?? DEFAULT_SPEEDLOADER_SERVER,
    );
    actions.setLightningBoxServer(
      (await getItem(StorageItem.lightningBoxServer)) ?? DEFAULT_LIGHTNINGBOX_SERVER,
    );
    actions.setLightningBoxAddress((await getItem(StorageItem.lightningBoxAddress)) ?? "");
    actions.SetLightningBoxLnurlPayDesc(
      (await getItem(StorageItem.lightningBoxLnurlPayDesc)) ?? DEFAULT_LIGHTNINGBOX_LNURLPDESC,
    );
    actions.setHideAmountsEnabled((await getItemObject(StorageItem.hideAmountsEnabled)) ?? false);

    log.d("Done");
  }),

  changeBitcoinUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.bitcoinUnit, payload);
    actions.setBitcoinUnit(payload);
  }),

  changeFiatUnit: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.fiatUnit, payload);
    actions.setFiatUnit(payload);
  }),

  changeName: thunk(async (actions, payload) => {
    if (payload && payload.length === 0) {
      payload = null;
    }
    await setItemObject(StorageItem.name, payload);
    actions.setName(payload);
  }),

  changeLanguage: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.language, payload);
    await i18n.changeLanguage(payload);
    actions.setLanguage(payload);
  }),

  changeAutopilotEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.autopilotEnabled, payload);
    actions.setAutopilotEnabled(payload);
  }),

  changeAutopilotNodePubkey: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.autopilotNodePubkey, payload);
    actions.setAutopilotNodePubkey(payload);
  }),

  changePushNotificationsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.pushNotificationsEnabled, payload);
    actions.setPushNotificationsEnabled(payload);
  }),

  changeClipboardInvoiceCheckEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.clipboardInvoiceCheck, payload);
    actions.setClipboardInvoiceCheckInvoicesEnabled(payload);
  }),

  changeScheduledSyncEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.scheduledSyncEnabled, payload);
    actions.setScheduledSyncEnabled(payload);
  }),

  changeScheduledGossipSyncEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.scheduledGossipSyncEnabled, payload);
    actions.setScheduledGossipSyncEnabled(payload);
  }),

  changeDebugShowStartupInfo: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.debugShowStartupInfo, payload);
    actions.setDebugShowStartupInfo(payload);
  }),

  changeUseLegacyHeaderGradient: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.useLegacyHeaderGradient, payload);
    actions.setUseLegacyHeaderGradient(payload);
  }),

  changeGoogleDriveBackupEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.googleDriveBackupEnabled, payload);
    actions.setGoogleDriveBackupEnabled(payload);
  }),

  changePreferFiat: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.preferFiat, payload);
    actions.setPreferFiat(payload);
  }),

  changeTransactionGeolocationEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.transactionGeolocationEnabled, payload);
    actions.setTransactionGeolocationEnabled(payload);
  }),

  changeTransactionGeolocationMapStyle: thunk(async (actions, payload) => {
    await setItem(StorageItem.transactionGeolocationMapStyle, payload);
    actions.setTransactionGeolocationMapStyle(payload);
  }),

  changeOnchainFeeServer: thunk(async (actions, payload) => {
    const server = payload.trim()
      ? normalizeOnchainFeeServer(payload, PLATFORM)
      : defaultOnchainFeeServer(Chain);
    await setItem(StorageItem.onchainFeeServer, server);
    actions.setOnchainFeeServer(server);
  }),

  changeOnchainExplorer: thunk(async (actions, payload) => {
    await setItem(StorageItem.onchainExplorer, payload);
    actions.setOnchainExplorer(payload);
  }),

  changeMultiPathPaymentsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.multiPathPaymentsEnabled, payload);
    actions.setMultiPathPaymentsEnabled(payload);
  }),

  changeTorEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.torEnabled, payload);
    actions.setTorEnabled(payload);
  }),

  changeHideExpiredInvoices: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.hideExpiredInvoices, payload);
    actions.setHideExpiredInvoices(payload);
  }),

  changeScreenTransitionsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.screenTransitionsEnabled, payload);
    actions.setScreenTransitionsEnabled(payload);
  }),

  changeICloudBackupEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.iCloudBackupEnabled, payload);
    actions.setICloudBackupEnabled(payload);
  }),

  changeLndChainBackend: thunk(async (actions, payload) => {
    await setItem(StorageItem.lndChainBackend, payload);
    actions.setLndChainBackend(payload);
  }),

  changeNeutrinoPeers: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.neutrinoPeers, payload);
    actions.setNeutrinoPeers(payload);
  }),

  changeZeroConfPeers: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.zeroConfPeers, payload);
    actions.setZeroConfPeers(payload);
  }),

  changeBitcoindRpcHost: thunk(async (actions, payload) => {
    await setItem(StorageItem.bitcoindRpcHost, payload);
    actions.setBitcoindRpcHost(payload);
  }),

  changeBitcoindRpcUser: thunk(async (actions, payload) => {
    await setItem(StorageItem.bitcoindRpcUser, payload);
    actions.setBitcoindRpcUser(payload);
  }),

  changeBitcoindRpcPassword: thunk(async (actions, payload) => {
    await setItem(StorageItem.bitcoindRpcPass, payload);
    actions.setBitcoindRpcPassword(payload);
  }),

  changeBitcoindPubRawBlock: thunk(async (actions, payload) => {
    await setItem(StorageItem.bitcoindPubRawBlock, payload);
    actions.setBitcoindPubRawBlock(payload);
  }),

  changeBitcoindPubRawTx: thunk(async (actions, payload) => {
    await setItem(StorageItem.bitcoindPubRawTx, payload);
    actions.setBitcoindPubRawTx(payload);
  }),

  changeDunderServer: thunk(async (actions, payload) => {
    await setItem(StorageItem.dunderServer, payload);
    actions.setDunderServer(payload);
  }),

  changeRequireGraphSync: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.requireGraphSync, payload);
    actions.setRequireGraphSync(payload);
  }),

  changeDunderEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.dunderEnabled, payload);
    actions.setDunderEnabled(payload);
  }),

  changeLndNoGraphCache: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.lndNoGraphCache, payload);
    actions.setLndNoGraphCache(payload);
  }),

  changeInvoiceExpiry: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.invoiceExpiry, payload);
    actions.setInvoiceExpiry(payload);
  }),

  changeRescanWallet: thunk(async (actions, payload) => {
    await setRescanWallet(payload);
    actions.setRescanWallet(payload);
  }),

  changeStrictGraphPruningEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.strictGraphPruningEnabled, payload);
    actions.setStrictGraphPruningEnabled(payload);
  }),

  changeLndPathfindingAlgorithm: thunk(async (actions, payload) => {
    await setItem(StorageItem.lndPathfindingAlgorithm, payload);
    actions.setLndPathfindingAlgorithm(payload);
  }),

  changeMaxLNFeePercentage: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.maxLNFeePercentage, payload);
    actions.setMaxLNFeePercentage(payload);
  }),

  changeLndLogLevel: thunk(async (actions, payload) => {
    await setItem(StorageItem.lndLogLevel, payload);
    actions.setLndLogLevel(payload);
  }),

  changeLndCompactDb: thunk(async (actions, payload) => {
    await setLndCompactDb(payload);
    actions.setLndCompactDb(payload);
  }),

  changeEnforceSpeedloaderOnStartup: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.enforceSpeedloaderOnStartup, payload);
    actions.setEnforceSpeedloaderOnStartup(payload);
  }),

  changePersistentServicesEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.persistentServicesEnabled, payload);
    actions.setPersistentServicesEnabled(payload);
  }),

  changePersistentServicesWarningShown: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.persistentServicesWarningShown, payload);
    actions.setPersistentServicesWarningShown(payload);
  }),

  changeCustomInvoicePreimageEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.customInvoicePreimageEnabled, payload);
    actions.setCustomInvoicePreimageEnabled(payload);
  }),

  changeSpeedloaderServer: thunk(async (actions, payload) => {
    await setItem(StorageItem.speedloaderServer, payload);
    actions.setSpeedloaderServer(payload);
  }),

  changeLightningBoxServer: thunk(async (actions, payload) => {
    await setItem(StorageItem.lightningBoxServer, payload);
    actions.setLightningBoxServer(payload);
  }),

  changeLightningBoxAddress: thunk(async (actions, payload) => {
    await setItem(StorageItem.lightningBoxAddress, payload);
    actions.setLightningBoxAddress(payload);
  }),

  changeLightningBoxLnurlPayDesc: thunk(async (actions, payload) => {
    await setItem(StorageItem.lightningBoxLnurlPayDesc, payload);
    actions.SetLightningBoxLnurlPayDesc(payload);
  }),

  changeHideAmountsEnabled: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.hideAmountsEnabled, payload);
    actions.setHideAmountsEnabled(payload);
  }),

  changeRandomizeSettingsOnStartup: thunk(async (actions, payload) => {
    await setItemObject<boolean>(StorageItem.randomizeSettingsOnStartup, payload);
    actions.setRandomizeSettingsOnStartup(payload);
  }),

  setBitcoinUnit: action((state, payload) => {
    state.bitcoinUnit = payload;
  }),
  setFiatUnit: action((state, payload) => {
    state.fiatUnit = payload;
  }),
  setName: action((state, payload) => {
    state.name = payload;
  }),
  setLanguage: action((state, payload) => {
    state.language = payload;
  }),
  setAutopilotEnabled: action((state, payload) => {
    state.autopilotEnabled = payload;
  }),
  setAutopilotNodePubkey: action((state, payload) => {
    state.autopilotNodePubkey = payload;
  }),
  setPushNotificationsEnabled: action((state, payload) => {
    state.pushNotificationsEnabled = payload;
  }),
  setClipboardInvoiceCheckInvoicesEnabled: action((state, payload) => {
    state.clipboardInvoiceCheckEnabled = payload;
  }),
  setScheduledSyncEnabled: action((state, payload) => {
    state.scheduledSyncEnabled = payload;
  }),
  setScheduledGossipSyncEnabled: action((state, payload) => {
    state.scheduledGossipSyncEnabled = payload;
  }),
  setDebugShowStartupInfo: action((state, payload) => {
    state.debugShowStartupInfo = payload;
  }),
  setUseLegacyHeaderGradient: action((state, payload) => {
    state.useLegacyHeaderGradient = payload;
  }),
  setGoogleDriveBackupEnabled: action((state, payload) => {
    state.googleDriveBackupEnabled = payload;
  }),
  setPreferFiat: action((state, payload) => {
    state.preferFiat = payload;
  }),
  setTransactionGeolocationEnabled: action((state, payload) => {
    state.transactionGeolocationEnabled = payload;
  }),
  setTransactionGeolocationMapStyle: action((state, payload) => {
    state.transactionGeolocationMapStyle = payload;
  }),
  setOnchainFeeServer: action((state, payload) => {
    state.onchainFeeServer = payload;
  }),
  setOnchainExplorer: action((state, payload) => {
    state.onchainExplorer = payload;
  }),
  setMultiPathPaymentsEnabled: action((state, payload) => {
    state.multiPathPaymentsEnabled = payload;
  }),
  setTorEnabled: action((state, payload) => {
    state.torEnabled = payload;
  }),
  setHideExpiredInvoices: action((state, payload) => {
    state.hideExpiredInvoices = payload;
  }),
  setScreenTransitionsEnabled: action((state, payload) => {
    state.screenTransitionsEnabled = payload;
  }),
  setICloudBackupEnabled: action((state, payload) => {
    state.iCloudBackupEnabled = payload;
  }),
  setLndChainBackend: action((state, payload) => {
    state.lndChainBackend = payload;
  }),
  setNeutrinoPeers: action((state, payload) => {
    state.neutrinoPeers = payload;
  }),
  setZeroConfPeers: action((state, payload) => {
    state.zeroConfPeers = payload;
  }),
  setBitcoindRpcHost: action((state, payload) => {
    state.bitcoindRpcHost = payload;
  }),
  setBitcoindRpcUser: action((state, payload) => {
    state.bitcoindRpcUser = payload;
  }),
  setBitcoindRpcPassword: action((state, payload) => {
    state.bitcoindRpcPassword = payload;
  }),
  setBitcoindPubRawBlock: action((state, payload) => {
    state.bitcoindPubRawBlock = payload;
  }),
  setBitcoindPubRawTx: action((state, payload) => {
    state.bitcoindPubRawTx = payload;
  }),
  setDunderServer: action((state, payload) => {
    state.dunderServer = payload;
  }),
  setRequireGraphSync: action((state, payload) => {
    state.requireGraphSync = payload;
  }),
  setDunderEnabled: action((state, payload) => {
    state.dunderEnabled = payload;
  }),
  setLndNoGraphCache: action((state, payload) => {
    state.lndNoGraphCache = payload;
  }),
  setInvoiceExpiry: action((state, payload) => {
    state.invoiceExpiry = payload;
  }),
  setRescanWallet: action((state, payload) => {
    state.rescanWallet = payload;
  }),
  setStrictGraphPruningEnabled: action((state, payload) => {
    state.strictGraphPruningEnabled = payload;
  }),
  setLndPathfindingAlgorithm: action((state, payload) => {
    state.lndPathfindingAlgorithm = payload;
  }),
  setMaxLNFeePercentage: action((state, payload) => {
    state.maxLNFeePercentage = payload;
  }),
  setLndLogLevel: action((state, payload) => {
    state.lndLogLevel = payload;
  }),
  setLndCompactDb: action((state, payload) => {
    state.lndCompactDb = payload;
  }),
  setEnforceSpeedloaderOnStartup: action((state, payload) => {
    state.enforceSpeedloaderOnStartup = payload;
  }),
  setPersistentServicesEnabled: action((state, payload) => {
    state.persistentServicesEnabled = payload;
  }),
  setPersistentServicesWarningShown: action((state, payload) => {
    state.persistentServicesWarningShown = payload;
  }),
  setCustomInvoicePreimageEnabled: action((state, payload) => {
    state.customInvoicePreimageEnabled = payload;
  }),
  setSpeedloaderServer: action((state, payload) => {
    state.speedloaderServer = payload;
  }),
  setLightningBoxServer: action((state, payload) => {
    state.lightningBoxServer = payload;
  }),
  setLightningBoxAddress: action((state, payload) => {
    state.lightningBoxAddress = payload;
  }),
  SetLightningBoxLnurlPayDesc: action((state, payload) => {
    state.lightningBoxLnurlPayDesc = payload;
  }),
  setHideAmountsEnabled: action((state, payload) => {
    state.hideAmountsEnabled = payload;
  }),

  setRandomizeSettingsOnStartup: action((state, payload) => {
    state.randomizeSettingsOnStartup = payload;
  }),

  bitcoinUnit: "bitcoin",
  fiatUnit: "USD",
  name: null,
  language: "en",
  autopilotEnabled: true,
  autopilotNodePubkey: BLIXT_NODE_PUBKEY,
  pushNotificationsEnabled: false,
  clipboardInvoiceCheckEnabled: false,
  scheduledSyncEnabled: false,
  scheduledGossipSyncEnabled: true,
  debugShowStartupInfo: false,
  useLegacyHeaderGradient: false,
  googleDriveBackupEnabled: false,
  preferFiat: false,
  transactionGeolocationEnabled: false,
  transactionGeolocationMapStyle: "darkMode",
  onchainExplorer: "mempool",
  onchainFeeServer: defaultOnchainFeeServer(Chain),
  multiPathPaymentsEnabled: false,
  torEnabled: false,
  hideExpiredInvoices: false,
  screenTransitionsEnabled: true,
  iCloudBackupEnabled: false,
  lndChainBackend: "",
  neutrinoPeers: [],
  zeroConfPeers: [],
  bitcoindRpcHost: "",
  bitcoindRpcUser: "",
  bitcoindRpcPassword: "",
  bitcoindPubRawBlock: "",
  bitcoindPubRawTx: "",
  dunderServer: "",
  requireGraphSync: false,
  dunderEnabled: true,
  lndNoGraphCache: false,
  invoiceExpiry: DEFAULT_INVOICE_EXPIRY,
  rescanWallet: false,
  strictGraphPruningEnabled: false,
  lndPathfindingAlgorithm: DEFAULT_PATHFINDING_ALGORITHM,
  maxLNFeePercentage: DEFAULT_MAX_LN_FEE_PERCENTAGE,
  lndLogLevel: DEFAULT_LND_LOG_LEVEL,
  lndCompactDb: false,
  enforceSpeedloaderOnStartup: false,
  persistentServicesEnabled: false,
  persistentServicesWarningShown: false,
  customInvoicePreimageEnabled: false,
  speedloaderServer: DEFAULT_SPEEDLOADER_SERVER,
  lightningBoxServer: DEFAULT_LIGHTNINGBOX_SERVER,
  lightningBoxAddress: "",
  lightningBoxLnurlPayDesc: DEFAULT_LIGHTNINGBOX_LNURLPDESC,
  hideAmountsEnabled: false,
  randomizeSettingsOnStartup: false,

  randomize: thunk((state, _, { getStoreState, dispatch }) => {
    const bitcoinUnits = Object.keys(BitcoinUnits);
    state.setBitcoinUnit(getRandomFromArray(bitcoinUnits));

    const fiatUnits = Object.keys(getStoreState().fiat.fiatRates);
    state.setFiatUnit(getRandomFromArray(fiatUnits));

    state.setName(getRandomFromArray(funnyNames));

    const language = getRandomFromArray(Object.keys(languages));
    state.setLanguage(getRandomFromArray(language));
    i18n.changeLanguage(language);

    const autopilotEnabled = rand(0, 1) === 1;
    state.setAutopilotEnabled(autopilotEnabled);
    state.setAutopilotNodePubkey(BLIXT_NODE_PUBKEY);

    state.setPushNotificationsEnabled(rand(0, 1) === 1);
    state.setClipboardInvoiceCheckInvoicesEnabled(rand(0, 1) === 1);
    // state.scheduledSyncEnabled;
    // state.scheduledGossipSyncEnabled;
    state.setDebugShowStartupInfo(rand(0, 1) === 1);
    // state.googleDriveBackupEnabled;
    state.setPreferFiat(rand(0, 1) === 1);
    // state.transactionGeolocationEnabled;
    // state.transactionGeolocationMapStyle;
    const onchainExplorers = Object.keys(OnchainExplorer);
    state.setOnchainExplorer(getRandomFromArray(onchainExplorers));
    state.setMultiPathPaymentsEnabled(rand(0, 1) === 1);
    // state.torEnabled;
    state.setHideExpiredInvoices(rand(0, 1) === 1);
    state.setScreenTransitionsEnabled(rand(0, 1) === 1);
    // state.iCloudBackupEnabled;
    // state.lndChainBackend;
    // state.neutrinoPeers;
    // state.bitcoindRpcHost;
    // state.bitcoindRpcUser;
    // state.bitcoindRpcPassword;
    // state.bitcoindPubRawBlock;
    // state.bitcoindPubRawTx;
    // state.dunderServer;
    state.setRequireGraphSync(rand(0, 1) === 1);
    state.setDunderEnabled(rand(0, 1) === 1);
    // state.lndNoGraphCache;
    state.setInvoiceExpiry(rand(0, 1000)); // TODO
    // state.rescanWallet;
    // state.strictGraphPruningEnabled;
    // state.lndPathfindingAlgorithm;
    state.setMaxLNFeePercentage(rand(0, 100) / 10);
    // state.lndLogLevel;
    // state.lndCompactDb;
    // state.zeroConfPeers;
    // state.enforceSpeedloaderOnStartup;
    // state.persistentServicesEnabled;
    // state.persistentServicesWarningShown;
    // state.customInvoicePreimageEnabled;
    state.setCustomInvoicePreimageEnabled(rand(0, 1) === 1);
    // state.speedloaderServer;
    // state.lightningBoxServer;
    // state.lightningBoxAddress;
    state.SetLightningBoxLnurlPayDesc(generateGarbageText());
    state.setHideAmountsEnabled(rand(0, 1) === 1);
  }),
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromArray(arr: any[]) {
  return arr[rand(0, arr.length - 1)];
}

function generateGarbageText(): string {
  // Add any weird characters you want to this string
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~`!@#$%^&*()_-+={[}]|\\:;"<,>.?/⊙△ΩβφÇ';
  const length = Math.floor(Math.random() * 20) + 4; // This will give a random number between 4 and 16

  return [...Array(length)]
    .map(() => characters[Math.floor(Math.random() * characters.length)])
    .join("");
}

const funnyNames = [
  "Binky",
  "Fido",
  "Peaches",
  "Puddles",
  "Snickers",
  "Wiggles",
  "Twinkle",
  "Pickles",
  "Muffin",
  "Giggles",
  "Bubbles",
  "Ziggy",
  "Noodle",
  "Doodle",
  "Pookie",
  "Fluffy",
  "Sprinkles",
  "Jingles",
  "Boogie",
  "Winky",
  "Tootsie",
  "Fuzzy",
  "Spunky",
  "Goober",
  "Snuggles",
  "Scrappy",
  "Puddin'",
  "Biscuit",
  "Doogie",
  "Waffle",
  "Zippy",
  "Jolly",
  "Sassy",
  "Rascal",
  "Boppy",
  "Cuddles",
  "Dinky",
  "Fiddle",
  "Gadget",
  "Hopper",
  "Jester",
  "Kiki",
  "Lollipop",
  "Mimi",
  "Nibbles",
  "Oreo",
  "Peppy",
  "Quirky",
  "Roo",
  "Sprout",
];
