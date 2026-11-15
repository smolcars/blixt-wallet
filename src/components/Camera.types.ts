import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface CameraHandle {
  switchCamera(): Promise<void>;
}
export interface ICamera {
  active?: boolean;
  children?: ReactNode;
  cameraType?: "front" | "back";
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void;
  style?: StyleProp<ViewStyle>;
}
