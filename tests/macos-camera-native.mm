#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import "../macos/camera/native/BlixtCameraPreview.h"

@interface BlixtCameraPreview (Testing)
- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)buffer
      fromConnection:(AVCaptureConnection *)connection;
@end
// No physical camera or permission prompt is involved in this test.
@interface FakeCaptureSession : AVCaptureSession
@end
@implementation FakeCaptureSession
- (BOOL)isRunning { return YES; }
- (void)stopRunning {}
@end

static CMSampleBufferRef qrFrame(NSString *value) {
  CIFilter *filter = [CIFilter filterWithName:@"CIQRCodeGenerator"];
  [filter setValue:[value dataUsingEncoding:NSUTF8StringEncoding] forKey:@"inputMessage"];
  CIImage *image = [filter.outputImage imageByApplyingTransform:CGAffineTransformMakeScale(8, 8)];
  CVPixelBufferRef pixels = nil;
  CVReturn status = CVPixelBufferCreate(kCFAllocatorDefault, image.extent.size.width, image.extent.size.height,
    kCVPixelFormatType_32BGRA, (__bridge CFDictionaryRef)@{(id)kCVPixelBufferIOSurfacePropertiesKey: @{}}, &pixels);
  NSCAssert(status == kCVReturnSuccess, @"Could not create QR frame");
  [[CIContext contextWithOptions:nil] render:image toCVPixelBuffer:pixels];
  CMVideoFormatDescriptionRef format = nil;
  CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault, pixels, &format);
  CMSampleTimingInfo timing = {kCMTimeInvalid, kCMTimeZero, kCMTimeInvalid};
  CMSampleBufferRef buffer = nil;
  CMSampleBufferCreateReadyWithImageBuffer(kCFAllocatorDefault, pixels, format, &timing, &buffer);
  CFRelease(format);
  CVPixelBufferRelease(pixels);
  return buffer;
}

static void drainMain(void) {
  NSDate *until = [NSDate dateWithTimeIntervalSinceNow:0.15];
  while (until.timeIntervalSinceNow > 0) [[NSRunLoop currentRunLoop] runUntilDate:until];
}

int main(void) {
  @autoreleasepool {
    [NSApplication sharedApplication];
    NSArray *values = @[
      @"lightning:lnbc1500n1pw5gmyxpp5tnx03hfr3tx2lx3aal045c5dycjsah6j6a80c27qmxla3nrk8xmsdp42fjkzep6ypxxjemgw3hxjmn8yptkset9dssx7e3qgehhyar4dejs6cqzpgxqr23s49gpc74nkm8em70rehny2fgkp94vwm6lh8ympp668x2asn8yf5vk76camftzte4nh3h8sf365vwx69mxp4x5p3s7jx8l57vaeqyr68gqx9eaf0",
      @"LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0D3H82UNVWQHKXCT5D9HZUMRF0Y",
      @"alice@example.com",
    ];
    for (NSString *value in values) {
      BlixtCameraPreview *preview = [[BlixtCameraPreview alloc] initWithFrame:NSMakeRect(0, 0, 640, 480)];
      [preview setValue:[FakeCaptureSession new] forKey:@"session"];
      [preview setValue:@YES forKey:@"effectiveActive"];
      __block NSMutableArray *reads = [NSMutableArray new];
      preview.onRead = ^(NSString *text) { [reads addObject:text]; };
      preview.onError = ^(NSString *error) { NSCAssert(NO, @"%@", error); };
      CMSampleBufferRef frame = qrFrame(value);
      dispatch_queue_t queue = [preview valueForKey:@"captureQueue"];
      dispatch_sync(queue, ^{
        [preview captureOutput:nil didOutputSampleBuffer:frame fromConnection:nil];
        [preview captureOutput:nil didOutputSampleBuffer:frame fromConnection:nil];
      });
      drainMain();
      NSCAssert([reads isEqualToArray:@[value]], @"Expected exactly one QR callback: %@", reads);
      // A result already queued for JS must be discarded after unmount.
      dispatch_sync(queue, ^{
        [preview setValue:@NO forKey:@"delivered"];
        [preview setValue:@0 forKey:@"lastFrameTime"];
        [preview captureOutput:nil didOutputSampleBuffer:frame fromConnection:nil];
      });
      [preview invalidate];
      drainMain();
      NSCAssert(reads.count == 1, @"Stale callback was delivered after unmount");
      dispatch_sync(queue, ^{});
      CFRelease(frame);
    }
    puts("PASS: real Vision QR decoding, duplicate suppression, and unmount cancellation");
  }
  return 0;
}
