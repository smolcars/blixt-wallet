import React from "react";
import { View } from "react-native";

const codegenNativeComponent = (componentName = "NativeComponent") => {
  const NativeComponent = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );

  NativeComponent.displayName = componentName;
  return NativeComponent;
};

export default codegenNativeComponent;
