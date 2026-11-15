#import <AVFoundation/AVFoundation.h>

static inline NSArray<AVCaptureDevice *> *BlixtCameraDevices(void) {
  return [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:@[
    AVCaptureDeviceTypeBuiltInWideAngleCamera, AVCaptureDeviceTypeExternal,
    AVCaptureDeviceTypeContinuityCamera
  ] mediaType:AVMediaTypeVideo position:AVCaptureDevicePositionUnspecified].devices;
}
