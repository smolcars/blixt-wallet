#import "BlixtCameraPreviewComponentView.h"
#import "BlixtCameraPreview.h"
#import <react/renderer/components/BlixtCameraSpec/ComponentDescriptors.h>
#import <react/renderer/components/BlixtCameraSpec/Props.h>
#import <react/renderer/components/BlixtCameraSpec/EventEmitters.h>

using namespace facebook::react;

@implementation BlixtCameraPreviewComponentView {
  BlixtCameraPreview *_camera;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<BlixtCameraPreviewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if ((self = [super initWithFrame:frame])) {
    _props = std::make_shared<const BlixtCameraPreviewProps>();
    [self createCamera];
  }
  return self;
}

- (void)createCamera {
  _camera = [[BlixtCameraPreview alloc] initWithFrame:self.bounds];
  __weak BlixtCameraPreviewComponentView *weakSelf = self;
  _camera.onRead = ^(NSString *value) {
    BlixtCameraPreviewComponentView *owner = weakSelf;
    if (owner && owner->_eventEmitter) {
      auto emitter = std::static_pointer_cast<const BlixtCameraPreviewEventEmitter>(owner->_eventEmitter);
      emitter->onRead({std::string(value.UTF8String)});
    }
  };
  _camera.onError = ^(NSString *message) {
    BlixtCameraPreviewComponentView *owner = weakSelf;
    if (owner && owner->_eventEmitter) {
      auto emitter = std::static_pointer_cast<const BlixtCameraPreviewEventEmitter>(owner->_eventEmitter);
      emitter->onCameraError({std::string(message.UTF8String)});
    }
  };
  self.contentView = _camera;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  if (!_camera) [self createCamera];
  const auto &cameraProps = *std::static_pointer_cast<const BlixtCameraPreviewProps>(props);
  _camera.deviceID = [NSString stringWithUTF8String:cameraProps.deviceID.c_str()];
  _camera.active = cameraProps.active;
  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [_camera invalidate];
  self.contentView = nil;
  _camera = nil;
  [super prepareForRecycle];
}
@end
