import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { Chain } from "../utils/build";
import Color from "color";
import { PLATFORM } from "../utils/constants";
import { useStoreState } from "../state/store";

export default function BlixtHeader(props: any) {
  const useLegacyHeaderGradient = useStoreState((store) => store.settings.useLegacyHeaderGradient);

  const gradientColors =
    Chain === "mainnet"
      ? [blixtTheme.secondary, blixtTheme.primary]
      : [blixtTheme.lightGray, Color(blixtTheme.lightGray).darken(0.3).hex()];

  const containerStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: blixtTheme.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  } as StyleProp<ViewStyle>;

  if (useLegacyHeaderGradient && PLATFORM !== "web" && PLATFORM !== "macos") {
    return (
      <LinearGradient style={containerStyle} colors={gradientColors}>
        {props?.children}
      </LinearGradient>
    );
  }

  const gradientCss = `linear-gradient(to bottom, ${gradientColors[0]}, ${gradientColors[1]})`;

  const gradientStyle: any =
    PLATFORM === "web"
      ? { backgroundImage: gradientCss }
      : { experimental_backgroundImage: gradientCss };

  return <View style={[{ ...containerStyle, ...gradientStyle }]}>{props?.children}</View>;
}
