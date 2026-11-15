#import "BlixtLndShutdown.h"
#import <React/RCTBridgeModule.h>
#include "macos/Lndmobile.xcframework/macos-arm64_x86_64/Headers/liblnd.h"
#include <atomic>
#import <React-RCTAppDelegate/RCTRootViewFactory.h>
#import <ReactCommon/RCTHost.h>

static std::atomic_bool rpcReady{false};
static void stopped(void *, const char *data, int) { if (data) lndFree((void *)data); }
static void stopFailed(void *, const char *error) {
  NSLog(@"LND shutdown request failed: %s", error ?: "unknown error");
  if (error) lndFree((void *)error);
}

@interface BlixtLndShutdown () <RCTBridgeModule>
@end
@implementation BlixtLndShutdown
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return NO; }
RCT_EXPORT_METHOD(setRpcReady:(BOOL)ready) { rpcReady.store(ready); }
+ (void)stopReact:(RCTRootViewFactory *)factory completion:(void (^)(void))completion {
  if (factory.reactHost) {
    [factory.reactHost invalidateWithCompletion:^{
      NSLog(@"React runtime stopped; allowing app termination.");
      completion();
    }];
  } else {
    dispatch_async(dispatch_get_main_queue(), completion);
  }
}
+ (BOOL)shouldWait { return rpcReady.load() && getStatus() != 0; }
+ (void)shutdownWithCompletion:(void (^)(void))completion {
  // Independent of React's lifetime. Only status 0 establishes completion;
  // the StopDaemon RPC callback merely acknowledges the request.
  dispatch_queue_t queue = dispatch_queue_create("org.blixtwallet.shutdown", DISPATCH_QUEUE_SERIAL);
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    CCallback callback = { stopped, stopFailed, 0, 0 };
    stopDaemon(nullptr, 0, callback);
  });
  dispatch_source_t timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, queue);
  uint64_t deadline = clock_gettime_nsec_np(CLOCK_UPTIME_RAW) + 15ULL * NSEC_PER_SEC;
  dispatch_source_set_timer(timer, DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC, 10 * NSEC_PER_MSEC);
  dispatch_source_set_event_handler(timer, ^{
    BOOL finished = getStatus() == 0;
    if (!finished && clock_gettime_nsec_np(CLOCK_UPTIME_RAW) < deadline) return;
    if (!finished) NSLog(@"LND shutdown timed out after 15 seconds; terminating app.");
    dispatch_source_cancel(timer);
    dispatch_source_set_event_handler(timer, nil);
    dispatch_async(dispatch_get_main_queue(), completion);
  });
  dispatch_resume(timer);
}
@end
