import React, { ReactNode } from "react";
import { StyleProp, ViewStyle, View, Text } from "react-native";

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: keyof unknown;
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void; // TODO(hsjoberg):
  style?: StyleProp<ViewStyle>;
}
export default function CameraComponent({
  cameraType,
  children,
  onNotAuthorized,
  onRead,
  style,
  active,
}: ICamera) {
  return (
    <View style={style}>
      <Text style={{ color: "white", padding: 16 }}>
        Camera scanning is unavailable on macOS. Paste an invoice or address instead.
      </Text>
      {children}
    </View>
  );
}
