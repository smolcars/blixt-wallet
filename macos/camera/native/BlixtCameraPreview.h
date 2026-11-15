#import <AppKit/AppKit.h>

// Native capture is owned by the mounted preview, never by a global singleton.
@interface BlixtCameraPreview : NSView
@property(nonatomic) BOOL active;
@property(nonatomic, copy) NSString *deviceID;
@property(nonatomic, copy) void (^onRead)(NSString *value);
@property(nonatomic, copy) void (^onError)(NSString *message);
- (void)invalidate;
@end
