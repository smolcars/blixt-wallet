#import <LocalAuthentication/LocalAuthentication.h>

// All operations and completion callbacks run on the main queue.
@interface BlixtBiometricsController : NSObject
- (instancetype)initWithContextFactory:(LAContext *(^)(void))factory;
- (BOOL)isAvailable:(NSError **)error;
- (void)authenticate:(NSString *)reason fallbackEnabled:(BOOL)fallbackEnabled
          completion:(void (^)(BOOL success, NSError *error))completion;
- (void)cancel;
@end
