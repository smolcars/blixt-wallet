#import "../macos/biometrics/native/BlixtBiometricsController.h"

@interface FakeContext : LAContext
@property BOOL available;
@property LAPolicy checkedPolicy;
@property LAPolicy evaluatedPolicy;
@property BOOL invalidated;
@property NSInteger failure;
@property(copy) void (^reply)(BOOL, NSError *);
@end
@implementation FakeContext
- (BOOL)canEvaluatePolicy:(LAPolicy)policy error:(NSError **)error {
  self.checkedPolicy = policy;
  if (policy == LAPolicyDeviceOwnerAuthentication) return YES;
  assert(policy == LAPolicyDeviceOwnerAuthenticationWithBiometrics);
  if (!self.available && error) *error = [NSError errorWithDomain:LAErrorDomain code:self.failure userInfo:nil];
  return self.available;
}
- (void)evaluatePolicy:(LAPolicy)policy localizedReason:(NSString *)reason reply:(void (^)(BOOL, NSError *))reply {
  assert(policy == self.checkedPolicy);
  self.evaluatedPolicy = policy;
  assert(reason.length > 0);
  assert(self.touchIDAuthenticationAllowableReuseDuration == 0);
  self.reply = reply;
}
- (void)invalidate { self.invalidated = YES; }
@end

static void drain(void) {
  [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.03]];
}
int main(void) { @autoreleasepool {
  __block FakeContext *latest;
  __block NSInteger failure = 0;
  BlixtBiometricsController *controller = [[BlixtBiometricsController alloc] initWithContextFactory:^{
    latest = [FakeContext new]; latest.available = failure == 0; latest.failure = failure; return latest;
  }];
  NSError *error;
  assert([controller isAvailable:&error]); assert(latest.invalidated);
  assert(latest.checkedPolicy == LAPolicyDeviceOwnerAuthenticationWithBiometrics);
  for (NSNumber *code in @[@(LAErrorBiometryNotEnrolled), @(LAErrorBiometryNotAvailable), @(LAErrorBiometryLockout)]) {
    failure = code.integerValue;
    assert(![controller isAvailable:&error]); assert(error.code == failure);
    __block BOOL rejected = NO;
    [controller authenticate:@"Test" fallbackEnabled:NO completion:^(BOOL success, NSError *err) {
      assert(!success && err.code == failure); rejected = YES;
    }];
    assert(rejected && latest.invalidated && latest.reply == nil);
    // Password remains usable even if Touch ID is unavailable or locked out.
    __block BOOL authenticated = NO;
    [controller authenticate:@"Test" fallbackEnabled:YES completion:^(BOOL success, NSError *err) {
      assert(success && !err); authenticated = YES;
    }];
    assert(latest.evaluatedPolicy == LAPolicyDeviceOwnerAuthentication);
    latest.reply(YES, nil); drain(); assert(authenticated);

  }
  failure = 0;
  __block int calls = 0;
  [controller authenticate:@"Test" fallbackEnabled:NO completion:^(BOOL success, NSError *err) {
    calls++; assert(!success && err.code == LAErrorAppCancel);
  }];
  FakeContext *cancelled = latest;
  assert(cancelled.evaluatedPolicy == LAPolicyDeviceOwnerAuthenticationWithBiometrics);
  assert([cancelled.localizedFallbackTitle isEqualToString:@""]);
  [controller cancel]; assert(calls == 1 && cancelled.invalidated);
  cancelled.reply(YES, nil); drain(); assert(calls == 1);
  [controller authenticate:@"" fallbackEnabled:YES completion:^(BOOL success, NSError *err) {
    calls++; assert(!success && err.code == LAErrorAppCancel);
  }];
  FakeContext *replaced = latest;
  [controller authenticate:@"Test" fallbackEnabled:YES completion:^(BOOL success, NSError *err) {
    calls++; assert(success && !err);
  }];
  assert(calls == 2 && replaced.invalidated);
  replaced.reply(YES, nil); drain(); assert(calls == 2);
  latest.reply(YES, nil); drain(); assert(calls == 3 && latest.invalidated);
  latest.reply(YES, nil); drain(); assert(calls == 3);
  for (NSNumber *code in @[@(LAErrorUserCancel), @(LAErrorUserFallback), @(LAErrorSystemCancel), @(LAErrorAuthenticationFailed)]) {
    [controller authenticate:@"Test" fallbackEnabled:YES completion:^(BOOL success, NSError *err) {
      calls++; assert(!success && err.code == code.integerValue);
    }];
    latest.reply(NO, [NSError errorWithDomain:LAErrorDomain code:code.integerValue userInfo:nil]); drain();
  }
  assert(calls == 7);
  puts("PASS: biometric policy, errors, cancellation, replacement, stale and duplicate replies");
} }
