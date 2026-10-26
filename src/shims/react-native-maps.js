import React from "react";
import { View, Text } from "react-native";

export const PROVIDER_DEFAULT = "default";
export const PROVIDER_GOOGLE = "google";
export const Marker = () => null;

export default function MapView({ style }) {
  return React.createElement(View, { style },
    React.createElement(Text, null, "Maps are unavailable on this platform."));
}

MapView.Animated = MapView;
Marker.Animated = Marker;
