import React from "react";
import { View } from "react-native";

const AppContainer = ({ children }) =>
  React.createElement(
    View,
    {
      style: { flex: 1 },
    },
    children,
  );

export default AppContainer;
