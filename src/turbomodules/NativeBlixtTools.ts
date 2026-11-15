import type { CodegenTypes, TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type BuildChain = "mainnet" | "testnet" | "regtest" | "signet";

export interface Spec extends TurboModule {
  getFlavor(): string;
  getDebug(): boolean;
  getVersionCode(): number;
  getBuildType(): string;
  getApplicationId(): string;
  getVersionName(): string;
  getAppleTeamId(): string;
  getChain(): BuildChain;
  writeConfig(config: string): Promise<string>;
  generateSecureRandomAsBase64(length: number): Promise<string>;
  log(level: "v" | "d" | "i" | "w" | "e", tag: string, message: string): void;
  saveLogs(): Promise<string>;
  copyLndLog(): Promise<boolean>;
  copySpeedloaderLog(): Promise<boolean>;
  tailLog(numberOfLines: number): Promise<string>;
  observeLndLogFile(): Promise<boolean>;
  tailSpeedloaderLog(numberOfLines: number): Promise<string>;
  saveChannelsBackup(base64Backups: string): Promise<boolean>;
  saveChannelBackupFile(): Promise<boolean>;
  getTorEnabled(): Promise<boolean>;
  DEBUG_deleteSpeedloaderLastrunFile(): Promise<boolean>;
  DEBUG_deleteSpeedloaderDgraphDirectory(): Promise<boolean>;
  DEBUG_deleteNeutrinoFiles(): Promise<boolean>;
  getInternalFiles(): Promise<{ [filePath: string]: number }>;
  getCacheDir(): Promise<string>;
  getFilesDir(): Promise<string>;
  getAppFolderPath(): Promise<string>;
  saveChannelDbFile(): Promise<boolean>;
  importChannelDbFile(channelDbPath: string): Promise<boolean>;
  getIntentStringData(): Promise<string | null>;
  getIntentNfcData(): Promise<string | null>;
  DEBUG_deleteWallet(): Promise<boolean>;
  DEBUG_deleteDatafolder(): Promise<boolean>;
  restartApp(): void;
  checkICloudEnabled(): Promise<boolean>;
  checkApplicationSupportExists(): Promise<boolean>;
  createIOSApplicationSupportAndLndDirectories(): Promise<boolean>;
  excludeLndICloudBackup(): Promise<boolean>;
  setPersistentModeEnabled(enabled: boolean): void;
  macosOpenFileDialog(): Promise<string | null>;
  readonly onLndLog: CodegenTypes.EventEmitter<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("BlixtTools");
