import type { HostComponent, ViewProps } from "react-native";
import type { DirectEventHandler, WithDefault } from "react-native/Libraries/Types/CodegenTypes";
import { codegenNativeComponent } from "react-native";

export interface NativeProps extends ViewProps {
  active?: WithDefault<boolean, false>;
  deviceID?: WithDefault<string, "">;
  onRead?: DirectEventHandler<Readonly<{ value: string }>>;
  onCameraError?: DirectEventHandler<Readonly<{ message: string }>>;
}
export default codegenNativeComponent<NativeProps>("BlixtCameraPreview") as HostComponent<NativeProps>;
