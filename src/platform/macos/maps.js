import React from "react";
import { View, Text } from "react-native";
export const PROVIDER_DEFAULT = undefined;
export const Marker = () => null;
export default function MapView({ style }) {
  return <View style={style}><Text>Maps are unavailable on macOS.</Text></View>;
}
