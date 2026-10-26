#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BlixtTools, NSObject)

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getFlavor)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getDebug)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getVersionCode)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getBuildType)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getApplicationId)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getVersionName)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getAppleTeamId)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(getChain)

RCT_EXTERN_METHOD(
  writeConfig: (NSString *)config
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  generateSecureRandomAsBase64: (double)length
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  log: (NSString *)level
  tag: (NSString *)tag
  message: (NSString *)message
)

RCT_EXTERN_METHOD(
  saveLogs: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  copyLndLog: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  copySpeedloaderLog: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  tailLog: (double)numberOfLines
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  observeLndLogFile: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  tailSpeedloaderLog: (double)numberOfLines
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  saveChannelsBackup: (NSString *)base64Backups
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  saveChannelBackupFile: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getTorEnabled: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  DEBUG_deleteSpeedloaderLastrunFile: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  DEBUG_deleteSpeedloaderDgraphDirectory: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  DEBUG_deleteNeutrinoFiles: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getInternalFiles: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getCacheDir: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getFilesDir: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getAppFolderPath: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  saveChannelDbFile: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  importChannelDbFile: (NSString *)channelDbPath
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getIntentStringData: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getIntentNfcData: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  DEBUG_deleteWallet: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  DEBUG_deleteDatafolder: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(restartApp)

RCT_EXTERN_METHOD(
  checkICloudEnabled: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  checkApplicationSupportExists: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  createIOSApplicationSupportAndLndDirectories: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  excludeLndICloudBackup: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  macosOpenFileDialog: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(setPersistentModeEnabled: (BOOL)enabled)

@end
