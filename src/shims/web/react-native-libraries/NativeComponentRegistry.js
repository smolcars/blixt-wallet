import React from "react";
import { View } from "react-native";

const get = (componentName = "NativeComponent") => {
  const NativeComponent = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );

  NativeComponent.displayName = componentName;
  return NativeComponent;
};

const NativeComponentRegistry = {
  get,
};

export { get };
export default NativeComponentRegistry;
