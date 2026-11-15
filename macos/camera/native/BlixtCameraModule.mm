#import "BlixtCameraModule.h"
#import "BlixtCameraDevices.h"

@implementation BlixtCameraModule
RCT_EXPORT_MODULE(NativeBlixtCamera)

+ (BOOL)requiresMainQueueSetup { return NO; }

- (void)requestPermission:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
    resolve(@(granted));
  }];
}

- (void)getDevices:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  NSMutableArray *devices = [NSMutableArray new];
  for (AVCaptureDevice *device in BlixtCameraDevices()) {
    [devices addObject:@{@"id": device.uniqueID, @"name": device.localizedName}];
  }
  resolve(devices);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeBlixtCameraSpecJSI>(params);
}
@end
