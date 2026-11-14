#import "BlixtBiometricsModule.h"
#import "BlixtBiometricsController.h"

static NSString *BlixtBiometricError(NSError *error) {
  if (![error.domain isEqualToString:LAErrorDomain]) return @"AuthenticationFailed";
  switch (error.code) {
    case LAErrorUserCancel:
    case LAErrorAppCancel: return @"UserCancel";
    case LAErrorUserFallback: return @"UserFallback";
    case LAErrorSystemCancel: return @"SystemCancel";
    case LAErrorBiometryNotAvailable: return @"FingerprintScannerNotAvailable";
    case LAErrorBiometryNotEnrolled: return @"FingerprintScannerNotEnrolled";
    case LAErrorBiometryLockout: return @"DeviceLockedPermanent";
    default: return @"AuthenticationFailed";
  }
}

@implementation BlixtBiometricsModule {
  BlixtBiometricsController *_controller;
}
RCT_EXPORT_MODULE(NativeBlixtBiometrics)
+ (BOOL)requiresMainQueueSetup { return NO; }
- (instancetype)init {
  if ((self = [super init])) _controller = [BlixtBiometricsController new];
  return self;
}
- (void)isSensorAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSError *error = nil;
    if ([self->_controller isAvailable:&error]) resolve(@"Touch ID");
    else reject(BlixtBiometricError(error), error.localizedDescription ?: @"Touch ID is unavailable.", error);
  });
}
- (void)authenticate:(NSString *)reason fallbackEnabled:(BOOL)fallbackEnabled
             resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self->_controller authenticate:reason fallbackEnabled:fallbackEnabled completion:^(BOOL success, NSError *error) {
      if (success) resolve(@YES);
      else reject(BlixtBiometricError(error), error.localizedDescription ?: @"Touch ID authentication failed.", error);
    }];
  });
}
- (void)cancel {
  BlixtBiometricsController *controller = _controller;
  dispatch_async(dispatch_get_main_queue(), ^{ [controller cancel]; });
}
- (void)invalidate { [self cancel]; }
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeBlixtBiometricsSpecJSI>(params);
}
@end
