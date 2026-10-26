import type { CodegenTypes } from "react-native";
import { electrobunNativeBlixtTools } from "../../electrobun/src/shims/native-blixt-tools";

import type { BuildChain, Spec } from "./NativeBlixtTools";

const chain = ((globalThis as Record<string, unknown>).CHAIN ?? "mainnet") as BuildChain;
const debug = Boolean((globalThis as Record<string, unknown>).DEBUG ?? false);
const flavor = String((globalThis as Record<string, unknown>).FLAVOR ?? "fakelnd");
const applicationId = String(
  (globalThis as Record<string, unknown>).APPLICATION_ID ?? "com.blixtwallet.electrobun",
);
const versionName = String((globalThis as Record<string, unknown>).VERSION_NAME ?? "0.9.0-web");
const versionCode = Number((globalThis as Record<string, unknown>).VERSION_CODE ?? 0);
const buildType = String((globalThis as Record<string, unknown>).BUILD_TYPE ?? "debug");
const unsupportedElectrobunChannelDbOperation = async (..._args: unknown[]): Promise<never> => {
  throw new Error("channel.db import/export is not supported on Electrobun yet");
};

const NativeBlixtToolsElectrobun: Spec = {
  getFlavor: () => flavor,
  getDebug: () => debug,
  getVersionCode: () => versionCode,
  getBuildType: () => buildType,
  getApplicationId: () => applicationId,
  getVersionName: () => versionName,
  getAppleTeamId: () => "",
  getChain: () => chain,

  writeConfig: async (config) => {
    return await electrobunNativeBlixtTools.writeConfig(config);
  },
  generateSecureRandomAsBase64: async (length) => {
    const randomFromBridge = await electrobunNativeBlixtTools.generateSecureRandomAsBase64(length);
    if (typeof randomFromBridge === "string" && randomFromBridge.length > 0) {
      return randomFromBridge;
    }

    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return btoa(String.fromCharCode(...data));
  },
  log: (level, tag, message) => {
    void electrobunNativeBlixtTools.log(level, tag, message);
  },
  saveLogs: async () => "",
  copyLndLog: async () => false,
  copySpeedloaderLog: async () => false,
  tailLog: async (numberOfLines) => await electrobunNativeBlixtTools.tailLog(numberOfLines),
  observeLndLogFile: async () => await electrobunNativeBlixtTools.observeLndLogFile(),
  tailSpeedloaderLog: async (numberOfLines) =>
    await electrobunNativeBlixtTools.tailSpeedloaderLog(numberOfLines),
  saveChannelsBackup: async () => false,
  saveChannelBackupFile: async () => false,
  getTorEnabled: async () => false,
  DEBUG_deleteSpeedloaderLastrunFile: async () =>
    await electrobunNativeBlixtTools.DEBUG_deleteSpeedloaderLastrunFile(),
  DEBUG_deleteSpeedloaderDgraphDirectory: async () =>
    await electrobunNativeBlixtTools.DEBUG_deleteSpeedloaderDgraphDirectory(),
  DEBUG_deleteNeutrinoFiles: async () => true,
  getInternalFiles: async () => ({}),
  getCacheDir: async () => await electrobunNativeBlixtTools.getCacheDir(),
  getFilesDir: async () => await electrobunNativeBlixtTools.getFilesDir(),
  getAppFolderPath: async () => await electrobunNativeBlixtTools.getAppFolderPath(),
  saveChannelDbFile: unsupportedElectrobunChannelDbOperation,
  importChannelDbFile: unsupportedElectrobunChannelDbOperation,
  getIntentStringData: async () => null,
  getIntentNfcData: async () => null,
  DEBUG_deleteWallet: async () => true,
  DEBUG_deleteDatafolder: async () => true,
  restartApp: () => {
    void electrobunNativeBlixtTools.restartApp();
  },
  checkICloudEnabled: async () => false,
  checkApplicationSupportExists: async () => true,
  createIOSApplicationSupportAndLndDirectories: async () => true,
  excludeLndICloudBackup: async () => true,
  setPersistentModeEnabled: (_enabled: boolean) => {},
  macosOpenFileDialog: async () => null,
  onLndLog: electrobunNativeBlixtTools.onLndLog as CodegenTypes.EventEmitter<string>,
};

export default NativeBlixtToolsElectrobun;
