#import "BlixtCameraPreview.h"
#import "BlixtCameraDevices.h"
#import <Vision/Vision.h>
#include <atomic>

@interface BlixtCameraPreview () <AVCaptureVideoDataOutputSampleBufferDelegate>
@end

@implementation BlixtCameraPreview {
  AVCaptureSession *_session;
  AVCaptureVideoPreviewLayer *_preview;
  dispatch_queue_t _captureQueue;
  BOOL _invalidated;
  BOOL _effectiveActive;
  NSString *_effectiveDeviceID;
  std::atomic<NSUInteger> _generation; // Also cancels queued starts after hiding/unmount.
  // The following fields are accessed only on _captureQueue.
  NSUInteger _captureGeneration;
  BOOL _delivered;
  CFTimeInterval _lastFrameTime;
}

- (instancetype)initWithFrame:(NSRect)frame {
  if ((self = [super initWithFrame:frame])) {
    _generation.store(0);
    _deviceID = @"";
    _captureQueue = dispatch_queue_create("com.blixtwallet.camera", DISPATCH_QUEUE_SERIAL);
    _session = [AVCaptureSession new];
    _preview = [AVCaptureVideoPreviewLayer layerWithSession:_session];
    _preview.videoGravity = AVLayerVideoGravityResizeAspectFill;
    self.wantsLayer = YES;
    self.layer.backgroundColor = NSColor.blackColor.CGColor;
    [self.layer addSublayer:_preview];
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    for (NSNotificationName name in @[
      NSApplicationDidBecomeActiveNotification, NSApplicationDidResignActiveNotification,
      NSWindowDidChangeOcclusionStateNotification, NSWindowDidMiniaturizeNotification,
      NSWindowDidDeminiaturizeNotification, NSWindowWillCloseNotification
    ]) {
      [center addObserver:self selector:@selector(visibilityChanged:) name:name object:nil];
    }
    [center addObserver:self selector:@selector(captureFailed:)
                  name:AVCaptureSessionRuntimeErrorNotification object:_session];
    [center addObserver:self selector:@selector(deviceDisconnected:)
                  name:AVCaptureDeviceWasDisconnectedNotification object:nil];
  }
  return self;
}

- (void)layout {
  [super layout];
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _preview.frame = self.bounds;
  [CATransaction commit];
}

- (void)setActive:(BOOL)active { _active = active; [self updateCapture]; }
- (void)setDeviceID:(NSString *)deviceID { _deviceID = [deviceID copy]; [self updateCapture]; }
- (void)viewDidMoveToWindow { [super viewDidMoveToWindow]; [self updateCapture]; }
- (void)viewDidHide { [super viewDidHide]; [self updateCapture]; }
- (void)viewDidUnhide { [super viewDidUnhide]; [self updateCapture]; }

- (void)visibilityChanged:(NSNotification *)notification {
  if ([notification.object isKindOfClass:NSWindow.class] && notification.object != self.window) return;
  if ([notification.name isEqualToString:NSWindowWillCloseNotification]) {
    self.active = NO;
  } else {
    [self updateCapture];
  }
}

- (void)captureFailed:(NSNotification *)notification {
  NSError *error = notification.userInfo[AVCaptureSessionErrorKey];
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self->_effectiveActive && !self->_invalidated) {
      self.active = NO;
      if (self.onError) self.onError(error.localizedDescription ?: @"The camera stopped unexpectedly.");
    }
  });
}

- (void)deviceDisconnected:(NSNotification *)notification {
  NSString *deviceID = ((AVCaptureDevice *)notification.object).uniqueID;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self->_effectiveActive && [self.deviceID isEqualToString:deviceID]) {
      self.active = NO;
      if (self.onError) self.onError(@"The selected camera was disconnected. Choose another camera or retry.");
    }
  });
}

- (void)updateCapture {
  NSAssert(NSThread.isMainThread, @"Camera visibility must be updated on the main thread");
  BOOL active = !_invalidated && _active && NSApp.active && self.window.visible &&
    !self.window.miniaturized && !self.hiddenOrHasHiddenAncestor &&
    (self.window.occlusionState & NSWindowOcclusionStateVisible);
  if (active == _effectiveActive && [_deviceID isEqualToString:_effectiveDeviceID]) return;
  _effectiveActive = active;
  _effectiveDeviceID = [_deviceID copy];
  NSUInteger generation = ++_generation;
  NSString *deviceID = [_deviceID copy];
  __weak BlixtCameraPreview *weakSelf = self;
  dispatch_async(_captureQueue, ^{
    BlixtCameraPreview *owner = weakSelf;
    if (!owner || owner->_generation.load() != generation) return;
    [owner->_session stopRunning];
    owner->_captureGeneration = generation;
    owner->_delivered = NO;
    owner->_lastFrameTime = 0;
    // Release the device even while this screen remains mounted in navigation.
    [owner->_session beginConfiguration];
    for (AVCaptureInput *input in owner->_session.inputs) [owner->_session removeInput:input];
    for (AVCaptureOutput *output in owner->_session.outputs) [owner->_session removeOutput:output];
    [owner->_session commitConfiguration];
    if (!active) return;
    [owner startDevice:deviceID generation:generation];
  });
}

- (void)reportError:(NSString *)message generation:(NSUInteger)generation {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self->_invalidated && self->_effectiveActive && self->_generation == generation) {
      self.active = NO;
      if (self.onError) self.onError(message ?: @"Unable to use the camera.");
    }
  });
}

- (void)startDevice:(NSString *)deviceID generation:(NSUInteger)generation {
  if ([AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] != AVAuthorizationStatusAuthorized) {
    [self reportError:@"Camera access is not allowed. Enable it in System Settings → Privacy & Security → Camera."
          generation:generation];
    return;
  }
  AVCaptureDevice *device = nil;
  for (AVCaptureDevice *candidate in BlixtCameraDevices()) {
    if ([candidate.uniqueID isEqualToString:deviceID]) { device = candidate; break; }
  }
  if (!device) {
    [self reportError:@"The selected camera is unavailable. Connect a camera and retry." generation:generation];
    return;
  }
  NSError *error = nil;
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
  if (!input) { [self reportError:error.localizedDescription generation:generation]; return; }
  AVCaptureVideoDataOutput *output = [AVCaptureVideoDataOutput new];
  output.alwaysDiscardsLateVideoFrames = YES;
  output.videoSettings = @{(NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)};
  [output setSampleBufferDelegate:self queue:_captureQueue];
  [_session beginConfiguration];
  if ([_session canSetSessionPreset:AVCaptureSessionPreset1280x720]) _session.sessionPreset = AVCaptureSessionPreset1280x720;
  BOOL configured = [_session canAddInput:input];
  if (configured) [_session addInput:input];
  configured = configured && [_session canAddOutput:output];
  if (configured) [_session addOutput:output];
  [_session commitConfiguration];
  if (!configured) {
    [self reportError:@"This camera cannot provide video for scanning." generation:generation];
    return;
  }
  if (_generation.load() == generation) [_session startRunning];
}

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
       fromConnection:(AVCaptureConnection *)connection {
  if (_delivered || !_session.running) return;
  CFTimeInterval now = CACurrentMediaTime();
  if (now - _lastFrameTime < 0.2) return; // Decode at most five frames per second.
  _lastFrameTime = now;
  CVPixelBufferRef buffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!buffer) return;
  VNDetectBarcodesRequest *request = [VNDetectBarcodesRequest new];
  request.symbologies = @[VNBarcodeSymbologyQR];
  NSError *error = nil;
  BOOL succeeded = [[[VNImageRequestHandler alloc] initWithCVPixelBuffer:buffer options:@{}]
                    performRequests:@[request] error:&error];
  if (!succeeded) {
    _delivered = YES;
    [self reportError:error.localizedDescription ?: @"Could not scan the camera image." generation:_captureGeneration];
    return;
  }
  for (VNBarcodeObservation *barcode in request.results) {
    NSString *value = barcode.payloadStringValue;
    if (value.length == 0) continue;
    _delivered = YES;
    NSUInteger generation = _captureGeneration;
    dispatch_async(dispatch_get_main_queue(), ^{
      if (!self->_invalidated && self->_effectiveActive && self->_generation == generation && self.onRead) self.onRead(value);
    });
    break;
  }
}

- (void)invalidate {
  if (_invalidated) return;
  _invalidated = YES;
  [NSNotificationCenter.defaultCenter removeObserver:self];
  [self updateCapture];
  self.onRead = nil;
  self.onError = nil;
}

- (void)dealloc {
  [NSNotificationCenter.defaultCenter removeObserver:self];
  AVCaptureSession *session = _session;
  dispatch_async(_captureQueue, ^{
    [session stopRunning];
    for (AVCaptureOutput *output in session.outputs) {
      if ([output isKindOfClass:AVCaptureVideoDataOutput.class])
        [(AVCaptureVideoDataOutput *)output setSampleBufferDelegate:nil queue:NULL];
    }
  });
}
@end
