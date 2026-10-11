import React from "react";
import { Button, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Camera from "../../components/Camera";

export default function SendCamera() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Button title="Back" onPress={() => navigation.goBack()} />
      <Camera />
    </View>
  );
}
