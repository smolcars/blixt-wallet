#import <Foundation/Foundation.h>
@class RCTRootViewFactory;
@interface BlixtLndShutdown : NSObject
+ (BOOL)shouldWait;
+ (void)stopReact:(RCTRootViewFactory *)factory completion:(void (^)(void))completion;
+ (void)shutdownWithCompletion:(void (^)(void))completion;
@end
