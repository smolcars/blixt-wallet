#import "BlixtBiometricsController.h"

@implementation BlixtBiometricsController {
  LAContext *(^_factory)(void);
  LAContext *_context;
  void (^_completion)(BOOL, NSError *);
}

- (instancetype)init {
  return [self initWithContextFactory:^{ return [LAContext new]; }];
}

- (instancetype)initWithContextFactory:(LAContext *(^)(void))factory {
  if ((self = [super init])) _factory = [factory copy];
  return self;
}

- (BOOL)isAvailable:(NSError **)error {
  LAContext *context = _factory();
  BOOL available = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:error];
  [context invalidate];
  return available;
}

- (void)cancel {
  LAContext *context = _context;
  void (^completion)(BOOL, NSError *) = _completion;
  _context = nil;
  _completion = nil;
  [context invalidate];
  if (completion) completion(NO, [NSError errorWithDomain:LAErrorDomain code:LAErrorAppCancel
    userInfo:@{NSLocalizedDescriptionKey: @"Authentication cancelled."}]);
}

- (void)authenticate:(NSString *)reason fallbackEnabled:(BOOL)fallbackEnabled
          completion:(void (^)(BOOL, NSError *))completion {
  [self cancel];
  LAContext *context = _factory();
  // Do not reuse a previous Touch ID match.
  context.touchIDAuthenticationAllowableReuseDuration = 0;
  if (!fallbackEnabled) context.localizedFallbackTitle = @"";
  // Owner authentication lets macOS handle the account-password fallback itself.
  LAPolicy policy = fallbackEnabled ? LAPolicyDeviceOwnerAuthentication
                                   : LAPolicyDeviceOwnerAuthenticationWithBiometrics;
  NSError *error = nil;
  if (![context canEvaluatePolicy:policy error:&error]) {
    [context invalidate];
    completion(NO, error);
    return;
  }
  _context = context;
  _completion = [completion copy];
  __weak BlixtBiometricsController *weakSelf = self;
  [context evaluatePolicy:policy
         localizedReason:reason.length ? reason : @"Unlock Blixt Wallet"
                   reply:^(BOOL success, NSError *error) {
    dispatch_async(dispatch_get_main_queue(), ^{
      BlixtBiometricsController *self = weakSelf;
      if (!self || self->_context != context) return;
      void (^callback)(BOOL, NSError *) = self->_completion;
      self->_completion = nil;
      self->_context = nil;
      [context invalidate];
      callback(success && !error, error);
    });
  }];
}

- (void)dealloc { [_context invalidate]; }
@end
