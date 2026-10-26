import * as base64 from "base64-js";
import { startTorForLnd } from "../utils/tor";

import { Action, Thunk, action, thunk } from "easy-peasy";
import { AlertButton } from "react-native";

import {
  BLIXT_WEB_DEMO,
  DEFAULT_PATHFINDING_ALGORITHM,
  DEFAULT_SPEEDLOADER_SERVER,
  IS_ELECTROBUN,
  PLATFORM,
  TOR_SETTINGS,
} from "../utils/constants";
import { Chain, Flavor, VersionCode } from "../utils/build";
import { IBlixtLsp, blixtLsp } from "./BlixtLsp";
import { IChannelModel, channel } from "./Channel";
import {
  IChannelAcceptanceManagerModel,
  channelAcceptanceManager,
} from "./ChannelAcceptanceManager";
import { IClipboardManagerModel, clipboardManager } from "./ClipboardManager";
import { IContactsModel, contacts } from "./Contacts";
import { ILightningBoxModel, lightningBox } from "./LightningBox";
import { IDeeplinkManager, deeplinkManager } from "./DeeplinkManager";
import { IFiatModel, fiat } from "./Fiat";
import { IGoogleDriveBackupModel, googleDriveBackup } from "./GoogleDriveBackup";
import { IGoogleModel, google } from "./Google";
import { IICloudBackupModel, iCloudBackup } from "./ICloudBackup";
import { IAutopilotModel, autopilot } from "./Autopilot";
import { ILNUrlModel, lnUrl } from "./LNURL";
import { ILightNameModel, lightName } from "./LightName";
import { ILightningModel, LndChainBackend, lightning } from "./Lightning";
import { INotificationManagerModel, notificationManager } from "./NotificationManager";
import { IOnChainModel, onChain } from "./OnChain";
import { IReceiveModel, receive } from "./Receive";
import { IScheduledSyncModel, scheduledSync } from "./ScheduledSync";
import { ISecurityModel, security } from "./Security";
import { ISendModel, send } from "./Send";
import { ISettingsModel, settings } from "./Settings";
import { ITransactionModel, transaction } from "./Transaction";
import { IWebLNModel, webln } from "./WebLN";
import {
  IImportChannelDbOnStartup,
  StorageItem,
  brickInstance,
  clearApp,
  getAppBuild,
  getAppVersion,
  getBrickDeviceAndExportChannelDb,
  getImportChannelDbOnStartup,
  getItem as getItemAsyncStorage,
  getItemObject as getItemObjectAsyncStorage,
  getLndCompactDb,
  getPersistentServicesEnabled,
  getRescanWallet,
  getWalletCreated,
  setAppBuild,
  setAppVersion,
  setBrickDeviceAndExportChannelDb,
  setImportChannelDbOnStartup,
  setItem,
  setItemObject,
  setLndCompactDb,
  setRescanWallet,
  setupApp,
} from "../storage/app";
import {
  deleteDatabase,
  dropTables,
  openDatabase,
  setupInitialSchema,
} from "../storage/database/sqlite";
import { getWalletPassword, setWalletPassword } from "../storage/keystore";

import { Alert } from "../utils/alert";
import {
  createIOSApplicationSupportAndLndDirectories,
  excludeLndICloudBackup,
  generateSecureRandomAsBase64,
  writeConfig,
} from "../lndmobile/index";
import { Database } from "react-native-turbo-sqlite";
import SetupBlixtDemo from "../utils/setup-demo";
import { appMigration } from "../migration/app-migration";
import { clearTransactions } from "../storage/database/transaction";
import logger from "./../utils/log";
import { stringToUint8Array, timeout, toast } from "../utils";

import {
  genSeed,
  getState as getLndState,
  initWallet,
  start as startLndTurbo,
  subscribeState,
  unlockWallet,
} from "react-native-turbo-lnd";
import { WalletState } from "react-native-turbo-lnd/protos/lightning_pb";

import NativeBlixtTools from "../turbomodules/NativeBlixtTools";
import Speedloader from "../turbomodules/NativeSpeedloader";
import NativeLndmobileTools from "../turbomodules/NativeLndmobileTools";

const log = logger("Store");

type OnboardingState = "SEND_ONCHAIN" | "DO_BACKUP" | "DONE";

export interface ICreateWalletPayload {
  restore?: {
    restoreWallet: boolean;
    channelsBackup?: string;
    aezeedPassphrase?: string;
  };
  init?: {
    aezeedPassphrase?: string;
  };
}

export interface IStoreModel {
  setupDemo: Thunk<IStoreModel, { changeDb: boolean }, any, IStoreModel>;
  openDb: Thunk<IStoreModel, undefined, any, {}, Promise<Database>>;
  initializeApp: Thunk<IStoreModel, void, any, IStoreModel>;
  checkAppVersionMigration: Thunk<IStoreModel, void, any, IStoreModel>;
  clearApp: Thunk<IStoreModel>;
  clearTransactions: Thunk<IStoreModel>;
  resetDb: Thunk<IStoreModel>;
  setDb: Action<IStoreModel, Database>;
  setAppReady: Action<IStoreModel, boolean>;
  setWalletCreated: Action<IStoreModel, boolean>;
  setHoldOnboarding: Action<IStoreModel, boolean>;
  setWalletSeed: Action<IStoreModel, string[] | undefined>;
  setAppVersion: Action<IStoreModel, number>;
  setAppBuild: Action<IStoreModel, number>;
  setOnboardingState: Action<IStoreModel, OnboardingState>;
  setTorEnabled: Action<IStoreModel, boolean>;
  setTorLoading: Action<IStoreModel, boolean>;
  setSpeedloaderLoading: Action<IStoreModel, boolean>;
  setSpeedloaderCancelVisible: Action<IStoreModel, boolean>;
  setImportChannelDbOnStartup: Action<IStoreModel, IImportChannelDbOnStartup>;

  generateSeed: Thunk<IStoreModel, string | undefined, any>;
  writeConfig: Thunk<IStoreModel, void, any, IStoreModel>;
  unlockWallet: Thunk<ILightningModel, void, any>;
  createWallet: Thunk<IStoreModel, ICreateWalletPayload | undefined, any, IStoreModel>;
  changeOnboardingState: Thunk<IStoreModel, OnboardingState>;

  db?: Database;
  appReady: boolean;
  walletCreated: boolean;
  holdOnboarding: boolean;
  torLoading: boolean;
  speedloaderLoading: boolean;
  speedloaderCancelVisible: boolean;
  torEnabled: boolean;

  lightning: ILightningModel;
  transaction: ITransactionModel;
  channel: IChannelModel;
  send: ISendModel;
  receive: IReceiveModel;
  onChain: IOnChainModel;
  fiat: IFiatModel;
  security: ISecurityModel;
  settings: ISettingsModel;
  autopilot: IAutopilotModel;
  clipboardManager: IClipboardManagerModel;
  scheduledSync: IScheduledSyncModel;
  lnUrl: ILNUrlModel;
  google: IGoogleModel;
  googleDriveBackup: IGoogleDriveBackupModel;
  webln: IWebLNModel;
  deeplinkManager: IDeeplinkManager;
  notificationManager: INotificationManagerModel;
  lightName: ILightNameModel;
  iCloudBackup: IICloudBackupModel;
  blixtLsp: IBlixtLsp;
  contacts: IContactsModel;
  lightningBox: ILightningBoxModel;
  channelAcceptanceManager: IChannelAcceptanceManagerModel;

  walletSeed?: string[];
  appVersion: number;
  appBuild: number;
  onboardingState: OnboardingState;
  importChannelDbOnStartup: IImportChannelDbOnStartup | null;

  cancelSpeedloader: Thunk<IStoreModel>;
}

export const model: IStoreModel = {
  setupDemo: thunk(async (_, payload, { getState, dispatch }) => {
    const db = getState().db;
    await SetupBlixtDemo(db, dispatch, payload.changeDb);
  }),

  openDb: thunk(async (actions) => {
    const db = await openDatabase();
    actions.setDb(db);
    return db;
  }),

  initializeApp: thunk(async (actions, _, { getState, dispatch }) => {
    log.d("getState().appReady: " + getState().appReady);
    if (getState().appReady) {
      log.d("App already initialized");
      return;
    }
    log.v("initializeApp()");

    const brickDeviceAndExportChannelDb = await getBrickDeviceAndExportChannelDb();
    if (brickDeviceAndExportChannelDb) {
      await NativeBlixtTools.saveChannelDbFile();
      await brickInstance();
      await setBrickDeviceAndExportChannelDb(false);
      Alert.alert(
        "",
        "This Blixt wallet instance is now stopped and disabled.\nUse your channel.db file to restore on another device.\nTake extreme caution and do not restore on more than one device.",
        [
          {
            text: "OK",
            onPress() {
              if (PLATFORM === "android") {
                NativeBlixtTools.restartApp();
              }
            },
          },
        ],
      );
      return;
    }

    const importChannelDbOnStartup = await getImportChannelDbOnStartup();
    if (importChannelDbOnStartup) {
      actions.setImportChannelDbOnStartup(importChannelDbOnStartup);
      const path = importChannelDbOnStartup.channelDbPath.replace(/^file:\/\//, "");
      toast("Beginning channel db import procedure", undefined, "warning");
      log.i("Beginning channel db import procedure", [path]);
      await NativeBlixtTools.importChannelDbFile(path);
      toast("Successfully imported channel.db");
    }

    const db = await actions.openDb();
    const firstStartup = !(await getItemObjectAsyncStorage(StorageItem.app));
    if (firstStartup) {
      log.i("Initializing app for the first time");
      if (PLATFORM === "ios" || PLATFORM === "macos") {
        log.i("Creating Application Support and lnd directories");
        await createIOSApplicationSupportAndLndDirectories();
        await excludeLndICloudBackup();
      }
      await setupApp();
      if (Chain === "regtest") {
        // await setupRegtest(
        //   await getItemAsyncStorage(StorageItem.bitcoindRpcHost) ?? "",
        //   await getItemAsyncStorage(StorageItem.bitcoindPubRawBlock) ?? "",
        //   await getItemAsyncStorage(StorageItem.bitcoindPubRawTx) ?? "",
        //   dispatch.settings.changeBitcoindRpcHost,
        //   dispatch.settings.changeBitcoindPubRawBlock,
        //   dispatch.settings.changeBitcoindPubRawTx,
        // );
        if (PLATFORM === "macos") {
          // Keep first launch non-interactive; configure the local Regtest node
          // in Settings once the initial desktop UI is available.
          await dispatch.settings.changeNeutrinoPeers(["127.0.0.1:18444"]);
        } else {
          await setupRegtest2(dispatch.settings.changeNeutrinoPeers);
        }
      }
      log.i("Initializing db for the first time");
      try {
        await setupInitialSchema(db);
      } catch (error: any) {
        throw new Error("Error creating DB: " + error.message);
      }
      log.i("Writing lnd.conf");
      await actions.writeConfig();
      if (PLATFORM === "web" && BLIXT_WEB_DEMO && Flavor === "fakelnd") {
        log.i("web demo initializing");
        await dispatch.setupDemo({ changeDb: true });
        await dispatch.generateSeed();
        await dispatch.createWallet();
      }
    }
    actions.setAppVersion(await getAppVersion());
    actions.setAppBuild(await getAppBuild());
    await actions.checkAppVersionMigration();

    actions.setOnboardingState(
      ((await getItemAsyncStorage(StorageItem.onboardingState)) as OnboardingState) ?? "DO_BACKUP",
    );
    actions.setWalletCreated(await getWalletCreated());

    const debugShowStartupInfo =
      (await getItemObjectAsyncStorage<boolean>(StorageItem.debugShowStartupInfo)) ?? false;
    const start = new Date();

    try {
      let torEnabled = (await getItemObjectAsyncStorage<boolean>(StorageItem.torEnabled)) ?? false;
      actions.setTorEnabled(torEnabled);
      let args = "";

      if (torEnabled) {
        try {
          actions.setTorLoading(true);

          args = await startTorForLnd({
            dataDirectory: TOR_SETTINGS.dataDir,
            socksPort: TOR_SETTINGS.socksPort,
            bootstrapTimeoutMs: TOR_SETTINGS.timeoutMs,
          });

          debugShowStartupInfo &&
            toast("Tor initialized " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
        } catch (e: any) {
          args = `--nolisten `;

          const restartText = "Restart app and try again with Tor";
          const continueText = "Continue without Tor";

          const buttons: AlertButton[] = [
            {
              text: continueText,
            },
          ];
          if (PLATFORM === "android") {
            buttons.unshift({
              text: restartText,
            });
          }

          const result = await Alert.promiseAlert(
            "",
            "Tor failed to start.\nThe following error was returned:\n\n" + e.message,
            buttons,
          );

          if (result.text === restartText) {
            NativeBlixtTools.restartApp();
            return;
          } else {
            actions.setTorEnabled(false);
            torEnabled = false;
            actions.setTorLoading(false);
          }
        }
      } else {
        args = `--nolisten `;
      }

      const persistentServicesEnabled = await getPersistentServicesEnabled();
      let persistentServicesWarningShown =
        (await getItemObjectAsyncStorage<boolean>(StorageItem.persistentServicesWarningShown)) ??
        false;
      if (PLATFORM === "android" && persistentServicesEnabled && !persistentServicesWarningShown) {
        await setItemObject(StorageItem.persistentServicesWarningShown, true);
      }
      const gossipSyncEnabled =
        (await getItemObjectAsyncStorage<boolean>(StorageItem.scheduledGossipSyncEnabled)) ?? false;
      const enforceSpeedloaderOnStartup =
        (await getItemObjectAsyncStorage<boolean>(StorageItem.enforceSpeedloaderOnStartup)) ??
        false;
      const speedloaderServer =
        (await getItemAsyncStorage(StorageItem.speedloaderServer)) ?? DEFAULT_SPEEDLOADER_SERVER;
      let gossipStatus: unknown = null;

      let status = await NativeLndmobileTools.getStatus();
      log.i("status", [status]);
      if (status === 1) {
        log.i("status === 1, waiting for 9.6 seconds and check again");
        await timeout(9600);
        status = await NativeLndmobileTools.getStatus();
        log.i("status", [status]);
      }

      log.i("gossipSyncEnabled", [gossipSyncEnabled]);
      log.i("persistentServicesEnabled", [persistentServicesEnabled]);
      if (status === 0) {
        if (gossipSyncEnabled && Chain === "mainnet") {
          actions.setSpeedloaderCancelVisible(false);

          // Show the "Syncing Lightning Network" text after 3s
          const speedloaderTextTimer = setTimeout(() => {
            actions.setSpeedloaderLoading(true);
          }, 3000);

          // Show the speedloader cancel button after 10s
          const cancelSpeedloaderButtonTimer = setTimeout(() => {
            actions.setSpeedloaderCancelVisible(true);
          }, 15000);

          if (enforceSpeedloaderOnStartup) {
            log.d("Clearing speedloader files");
            try {
              await NativeBlixtTools.DEBUG_deleteSpeedloaderLastrunFile();
              await NativeBlixtTools.DEBUG_deleteSpeedloaderDgraphDirectory();
            } catch (error) {
              log.e("Gossip files deletion failed", [error]);
            }
          }
          try {
            gossipStatus = await Speedloader.gossipSync(
              speedloaderServer,
              await NativeBlixtTools.getCacheDir(),
              await NativeBlixtTools.getFilesDir(),
            );
            debugShowStartupInfo &&
              toast(
                "Gossip sync done " + (new Date().getTime() - start.getTime()) / 1000 + "s",
                1000,
              );
          } catch (e: any) {
            if (e.message === "Gossip sync cancelled by user") {
              log.i("Gossip sync cancelled by user");
            } else {
              log.e("GossipSync exception!", [e]);
            }
          }
          clearTimeout(speedloaderTextTimer);
          clearTimeout(cancelSpeedloaderButtonTimer);
          actions.setSpeedloaderLoading(false);
          actions.setSpeedloaderCancelVisible(false);
        }

        log.i("Starting lnd, gossipStatus", [gossipStatus]);
        try {
          if (await getRescanWallet()) {
            log.d("Rescanning wallet");
            args += "--reset-wallet-transactions ";
            await setRescanWallet(false);
          }
          if (await getLndCompactDb()) {
            log.d("Compacting lnd databases");
            args += "--db.bolt.auto-compact --db.bolt.auto-compact-min-age=0 ";
            await setLndCompactDb(false);
          }

          let appFolderPath: string;
          if (PLATFORM === "android") {
            appFolderPath = await NativeBlixtTools.getFilesDir();
          } else {
            appFolderPath = (await NativeBlixtTools.getAppFolderPath())
              .replace("file://", "")
              .replace(/%20/g, " ");
            appFolderPath += "lnd/";
          }
          args += `--lnddir=${appFolderPath}`;
          log.i("args", [args]);
          log.d("startLnd", [await startLndTurbo(args)]);
        } catch (e: any) {
          if (e.message.includes("lnd already started")) {
            toast("lnd already started", 3000, "warning");
          } else {
            throw new Error("Failed to start lnd: " + e.message);
          }
        }
      } else {
        toast("lnd already started (getStatus check)", 3000, "warning");
      }
    } catch (e) {
      log.e("Exception when trying to initialize LndMobile and start lnd", [e]);
      throw e;
    }

    log.d("Starting up stores");
    dispatch.fiat.getRate();
    await dispatch.settings.initialize();
    await dispatch.security.initialize();
    await dispatch.transaction.getTransactions();
    await dispatch.contacts.getContacts();
    await dispatch.channel.setupCachedBalance();
    if (PLATFORM === "android") {
      await dispatch.google.initialize();
    }
    log.d("Done starting up stores");

    const onWalletState = async (state: { state: WalletState }) => {
      try {
        if (state.state === WalletState.NON_EXISTING) {
          log.d("Got WalletState.NON_EXISTING");

          // Continue channel db import restore
          if (importChannelDbOnStartup) {
            log.i("Continuing restoration with channel import");
            actions.setWalletSeed(importChannelDbOnStartup.seed);
            await actions.createWallet({
              restore: {
                restoreWallet: true,
                aezeedPassphrase: importChannelDbOnStartup.passphrase,
              },
            });

            await Promise.all([
              actions.settings.changeAutopilotEnabled(false),
              actions.scheduledSync.setSyncEnabled(true), // TODO test
              actions.settings.changeScheduledSyncEnabled(true),
              actions.changeOnboardingState("DONE"),
            ]);

            setImportChannelDbOnStartup(null);
          }
        } else if (state.state === WalletState.LOCKED) {
          log.d("Got WalletState.LOCKED");
          // TurboLnd's mocks always return LOCKED and never NON_EXISTING,
          // as there's no wallet persistence. Simply ignore.
          if (PLATFORM === "web" && Flavor === "fakelnd") {
            const [walletCreated, walletPassword] = await Promise.all([
              getWalletCreated(),
              getWalletPassword(),
            ]);

            if (!walletCreated && !walletPassword) {
              log.w("Ignoring fakelnd LOCKED state before wallet creation on web");
              return;
            }
          }
          log.d("Wallet locked, unlocking wallet");
          debugShowStartupInfo &&
            toast("locked: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          await dispatch.unlockWallet();
        } else if (state.state === WalletState.UNLOCKED) {
          log.d("Got WalletState.UNLOCKED");
          debugShowStartupInfo &&
            toast("unlocked: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
        } else if (state.state === WalletState.RPC_ACTIVE) {
          debugShowStartupInfo &&
            toast(
              "RPC server active: " + (new Date().getTime() - start.getTime()) / 1000 + "s",
              1000,
            );
          log.d("Got WalletState.RPC_ACTIVE");
          await dispatch.lightning.initialize({ start });
        } else if (state.state === WalletState.SERVER_ACTIVE) {
          debugShowStartupInfo &&
            toast("Service active: " + (new Date().getTime() - start.getTime()) / 1000 + "s", 1000);
          log.d("Got WalletState.SERVER_ACTIVE");

          // We'll enter this branch of code if the react-native frontend desyncs with lnd,
          // for example if the JS runtime restarts while lnd keeps running.
          if (!getState().lightning.rpcReady) {
            await dispatch.lightning.initialize({ start });
          }
        } else {
          log.d("Got unknown WalletState", [state.state]);
        }
      } catch (error: any) {
        toast(error.message, undefined, "danger");
      }
    };

    subscribeState(
      {},
      async (state) => {
        await onWalletState(state);
      },
      (error) => {
        toast("subscribeState: " + error, undefined, "danger");
      },
    );

    actions.setAppReady(true);
    log.d("App initialized");
    return true;
  }),

  cancelSpeedloader: thunk(async (actions) => {
    try {
      log.d("Cancelling speedloader gossipsync");
      await Speedloader.cancelGossipSync();
      actions.setSpeedloaderLoading(false);
      actions.setSpeedloaderCancelVisible(false);
    } catch (e) {
      log.e("Error cancelling speedloader", [e]);
    }
  }),

  checkAppVersionMigration: thunk(async (actions, _2, { getState }) => {
    const db = getState().db;
    if (!db) {
      throw new Error("Version migration check failed, db not available");
    }

    const appVersion = await getAppVersion();
    if (appVersion < appMigration.length - 1) {
      log.i(`Beginning App Version migration from ${appVersion} to ${appMigration.length - 1}`);
      for (let i = appVersion + 1; i < appMigration.length; i++) {
        log.i(`Migrating to ${i}`);
        await appMigration[i].beforeLnd(db, i);
      }
      await setAppVersion(appMigration.length - 1);
    }
    actions.setAppVersion(appVersion);

    const appBuild = await getAppBuild();
    if (appBuild < VersionCode) {
      log.i("Found new app build");
      log.i("Writing config");
      await actions.writeConfig();
      await setAppBuild(VersionCode);
    }
  }),

  clearApp: thunk(async () => {
    await clearApp();
    await deleteDatabase();
  }),

  clearTransactions: thunk(async (_, _2, { getState }) => {
    await clearTransactions(getState().db!);
  }),

  resetDb: thunk(async (_, _2, { getState }) => {
    const { db } = getState();
    if (db) {
      try {
        await dropTables(db);
      } catch (e) {}
      await setupInitialSchema(db);
    }
  }),

  generateSeed: thunk(async (actions, passphrase) => {
    const seed = await genSeed({
      aezeedPassphrase: passphrase ? stringToUint8Array(passphrase) : undefined,
    });
    actions.setWalletSeed(seed.cipherSeedMnemonic);
  }),

  setWalletSeed: action((state, payload) => {
    state.walletSeed = payload;
  }),

  writeConfig: thunk(async (_, _2) => {
    // TURBOTODO(hsjoberg)

    const lndChainBackend = (await getItemAsyncStorage(
      StorageItem.lndChainBackend,
    )) as LndChainBackend;
    const node = Chain;
    const neutrinoPeers = await getItemObjectAsyncStorage<string[]>(StorageItem.neutrinoPeers);
    const neutrinoFeeUrl = (await getItemAsyncStorage(StorageItem.neutrinoFeeUrl)) || null;
    const bitcoindRpcHost = (await getItemAsyncStorage(StorageItem.bitcoindRpcHost)) || null;
    const bitcoindRpcUser = (await getItemAsyncStorage(StorageItem.bitcoindRpcUser)) || null;
    const bitcoindRpcPass = (await getItemAsyncStorage(StorageItem.bitcoindRpcPass)) || null;
    const bitcoindPubRawBlock =
      (await getItemAsyncStorage(StorageItem.bitcoindPubRawBlock)) || null;
    const bitcoindPubRawTx = (await getItemAsyncStorage(StorageItem.bitcoindPubRawTx)) || null;
    const lndNoGraphCache = (await getItemAsyncStorage(StorageItem.lndNoGraphCache)) || "0";
    const strictGraphPruningEnabled =
      (await getItemAsyncStorage(StorageItem.strictGraphPruningEnabled)) || "0";
    const lndPathfindingAlgorithm =
      (await getItemAsyncStorage(StorageItem.lndPathfindingAlgorithm)) ||
      DEFAULT_PATHFINDING_ALGORITHM;
    const lndLogLevel = (await getItemAsyncStorage(StorageItem.lndLogLevel)) || "info";

    const nodeBackend = lndChainBackend === "neutrino" ? "neutrino" : "bitcoind";

    let neutrinoPeerConfig = "";
    if (nodeBackend === "neutrino") {
      // If there is only 1 peer, use `neutrino.connect`, otherwise `neutrino.addpeer`
      if (neutrinoPeers.length === 1) {
        neutrinoPeerConfig = `neutrino.connect=${neutrinoPeers[0]}`;
      } else {
        neutrinoPeerConfig = neutrinoPeers.map((peer) => `neutrino.addpeer=${peer}`).join("\n");
      }
    }

    const config = `
[Application Options]
debuglevel=${lndLogLevel}
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1
tlsdisableautofill=1
maxpendingchannels=1000
max-commit-fee-rate-anchors=300

[db]
db.no-graph-cache=${lndNoGraphCache.toString()}

[Routing]
routing.assumechanvalid=1
routing.strictgraphpruning=${strictGraphPruningEnabled.toString()}

[Bitcoin]
bitcoin.active=1
bitcoin.${node}=1
bitcoin.node=${nodeBackend}
bitcoin.defaultchanconfs=1

[fee]
${neutrinoFeeUrl ? `fee.url=${neutrinoFeeUrl}` : ""}

${
  lndChainBackend === "neutrino"
    ? `
[Neutrino]
${neutrinoPeerConfig}
neutrino.broadcasttimeout=11s
neutrino.persistfilters=true
`
    : ""
}

${
  lndChainBackend === "bitcoindWithZmq"
    ? `
[Bitcoind]
bitcoind.rpchost=${bitcoindRpcHost}
bitcoind.rpcuser=${bitcoindRpcUser}
bitcoind.rpcpass=${bitcoindRpcPass}
bitcoind.zmqpubrawblock=${bitcoindPubRawBlock}
bitcoind.zmqpubrawtx=${bitcoindPubRawTx}
`
    : ""
}

${
  lndChainBackend === "bitcoindWithRpcPolling"
    ? `
[Bitcoind]
bitcoind.rpchost=${bitcoindRpcHost}
bitcoind.rpcuser=${bitcoindRpcUser}
bitcoind.rpcpass=${bitcoindRpcPass}
bitcoind.rpcpolling=true
`
    : ""
}

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:${Chain === "testnet" || Chain === "mainnet" ? "1.00" : "1.00"}
autopilot.heuristic=preferential:${Chain === "testnet" || Chain === "mainnet" ? "0.00" : "0.00"}

[protocol]
protocol.wumbo-channels=true
protocol.zero-conf=true
protocol.option-scid-alias=true
protocol.simple-taproot-chans=true

[routerrpc]
routerrpc.estimator=${lndPathfindingAlgorithm}
`;
    await writeConfig(config);
  }),

  unlockWallet: thunk(async (_, _2) => {
    const password = await getWalletPassword();
    if (!password) {
      throw new Error("Cannot find wallet password");
    }
    await unlockWallet({
      walletPassword: stringToUint8Array(password),
    });
  }),

  createWallet: thunk(async (actions, payload, { getState, dispatch }) => {
    const seed = getState().walletSeed;
    if (!seed) {
      return;
    }
    const randomBase64 = await generateSecureRandomAsBase64(32);

    await setItem(StorageItem.walletPassword, randomBase64);
    await setWalletPassword(randomBase64);

    const wallet = payload?.restore
      ? await initWallet({
          cipherSeedMnemonic: seed,
          walletPassword: stringToUint8Array(randomBase64),
          recoveryWindow: 500,
          // TURBOTODO: test if this works
          channelBackups: payload.restore.channelsBackup
            ? {
                multiChanBackup: {
                  multiChanBackup: base64.toByteArray(payload.restore.channelsBackup),
                },
              }
            : undefined,
          aezeedPassphrase: payload.restore.aezeedPassphrase
            ? stringToUint8Array(payload.restore.aezeedPassphrase)
            : undefined,
        })
      : await initWallet({
          cipherSeedMnemonic: seed,
          walletPassword: stringToUint8Array(randomBase64),
          aezeedPassphrase: payload?.init?.aezeedPassphrase
            ? stringToUint8Array(payload?.init?.aezeedPassphrase)
            : undefined,
        });

    await setItemObject(StorageItem.walletCreated, true);
    actions.setWalletCreated(true);
    await dispatch.security.storeSeed(seed);
    actions.setWalletSeed(undefined);
    return wallet;
  }),

  changeOnboardingState: thunk(async (actions, payload) => {
    await setItem(StorageItem.onboardingState, payload);
    actions.setOnboardingState(payload);
  }),

  setWalletCreated: action((state, payload) => {
    state.walletCreated = payload;
  }),
  setHoldOnboarding: action((state, payload) => {
    state.holdOnboarding = payload;
  }),
  setDb: action((state, db) => {
    state.db = db;
  }),
  setAppReady: action((state, value) => {
    state.appReady = value;
  }),
  setAppVersion: action((state, value) => {
    state.appVersion = value;
  }),
  setAppBuild: action((state, value) => {
    state.appBuild = value;
  }),
  setOnboardingState: action((state, value) => {
    state.onboardingState = value;
  }),
  setTorEnabled: action((state, value) => {
    state.torEnabled = value;
  }),
  setTorLoading: action((state, value) => {
    state.torLoading = value;
  }),
  setSpeedloaderLoading: action((state, payload) => {
    state.speedloaderLoading = payload;
  }),
  setSpeedloaderCancelVisible: action((state, payload) => {
    state.speedloaderCancelVisible = payload;
  }),
  setImportChannelDbOnStartup: action((state, value) => {
    state.importChannelDbOnStartup = value;
  }),

  appReady: false,
  walletCreated: false,
  holdOnboarding: false,
  appVersion: 0,
  appBuild: 0,
  onboardingState: "SEND_ONCHAIN",
  importChannelDbOnStartup: null,
  torEnabled: false,
  torLoading: false,
  speedloaderLoading: false,
  speedloaderCancelVisible: false,

  lightning,
  transaction,
  channel,
  send,
  receive,
  onChain,
  autopilot,
  fiat,
  security,
  settings,
  clipboardManager,
  scheduledSync,
  lnUrl,
  google,
  googleDriveBackup,
  webln,
  deeplinkManager,
  notificationManager,
  lightName,
  iCloudBackup,
  blixtLsp,
  contacts,
  channelAcceptanceManager,
  lightningBox,
};

export default model;

function setupRegtest(
  bitcoindRpcHost: string,
  bitcoindPubRawBlock: string,
  bitcoindPubRawTx: string,
  changeBitcoindRpcHost: any,
  changeBitcoindPubRawBlock: any,
  changeBitcoindPubRawTx: any,
) {
  return new Promise((resolve, reject) => {
    Alert.prompt(
      "Set bitcoind RPC host",
      "",
      async (text) => {
        if (text) {
          await changeBitcoindRpcHost(text);
        }

        Alert.prompt(
          "Set bitcoind ZMQ Raw block host",
          "",
          async (text) => {
            if (text) {
              await changeBitcoindPubRawBlock(text);
            }

            Alert.prompt(
              "Set bitcoind ZMQ Raw Tx host",
              "",
              async (text) => {
                if (text) {
                  await changeBitcoindPubRawTx(text);
                }
                resolve(void 0);
              },
              "plain-text",
              bitcoindPubRawTx ?? "",
            );
          },
          "plain-text",
          bitcoindPubRawBlock ?? "",
        );
      },
      "plain-text",
      bitcoindRpcHost ?? "",
    );
  });
}

function setupRegtest2(changeNeutrinoPeers: any) {
  return new Promise((resolve, reject) => {
    Alert.prompt(
      "Set neutrino peer",
      "",
      async (text) => {
        if (text) {
          await changeNeutrinoPeers([text]);
          resolve(void 0);
        }
      },
      "plain-text",
    );
  });
}
