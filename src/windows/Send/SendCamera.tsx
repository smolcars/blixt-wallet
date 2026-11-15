import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Clipboard from "@react-native-clipboard/clipboard";
import { Icon } from "native-base";

import Camera from "../../components/Camera";
import type { CameraHandle } from "../../components/Camera.types";
import { PLATFORM } from "../../utils/constants";
import { Chain } from "../../utils/build";
import { getStatusBarHeight } from "react-native-status-bar-height";
import BarcodeMask from "../../components/BarCodeMask";
import GoBackIcon from "../../components/GoBackIcon";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState } from "../../state/store";
import useEvaluateLightningCode from "../../hooks/useEvaluateLightningCode";
import usePromptLightningAddress from "../../hooks/usePromptLightningAddress";
import { toast } from "../../utils";
import { SendStackParamList } from "./index";

interface Props {
  navigation: StackNavigationProp<SendStackParamList, "SendCamera">;
}

export default function SendCamera({ navigation }: Props) {
  const focused = useIsFocused();
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const evaluateLightningCode = useEvaluateLightningCode();
  const promptLightningAddress = usePromptLightningAddress();
  const cameraRef = useRef<CameraHandle>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(focused);
  useLayoutEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
    };
  }, []);

  const gotoLnurl = (
    screen: "AuthRequest" | "ChannelRequest" | "PayRequest" | "WithdrawRequest",
  ) => {
    const parent = navigation.getParent();
    if (!parent?.navigate) {
      (navigation as any).replace("LNURL", { screen });
    } else if (parent.canGoBack()) {
      parent.goBack();
      setTimeout(() => parent.navigate("LNURL", { screen }), 220);
    } else {
      parent.navigate("LNURL", { screen });
    }
  };

  // Gate synchronously: consecutive frames can arrive before React commits busy.
  const tryInvoice = async (read: () => Promise<string> | string, errorPrefix: string) => {
    if (!focusedRef.current || busyRef.current || !rpcReady) return;
    busyRef.current = true;
    setBusy(true);
    setPaused(true);
    try {
      const value = await read();
      if (!focusedRef.current) return;
      const result = await evaluateLightningCode(value, errorPrefix);
      if (!focusedRef.current) return;
      switch (result) {
        case "BOLT11":
          (navigation as any).replace("Send", { screen: "SendConfirmation" });
          break;
        case "LNURLAuthRequest":
          gotoLnurl("AuthRequest");
          break;
        case "LNURLChannelRequest":
          gotoLnurl("ChannelRequest");
          break;
        case "LNURLPayRequest":
          gotoLnurl("PayRequest");
          break;
        case "LNURLWithdrawRequest":
          gotoLnurl("WithdrawRequest");
          break;
      }
    } catch (cause: any) {
      if (focusedRef.current)
        toast(cause.message ?? "Could not read the invoice.", 13000, "danger");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const onLightningAddress = async () => {
    if (!focusedRef.current || busyRef.current || !rpcReady) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const [accepted] = await promptLightningAddress();
      if (accepted && focusedRef.current) {
        setPaused(true);
        gotoLnurl("PayRequest");
      }
    } catch (cause: any) {
      if (focusedRef.current) toast(cause.message, 13000, "danger");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const chooseCamera = async () => {
    if (!focusedRef.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await cameraRef.current?.switchCamera();
      if (focusedRef.current) setPaused(false);
    } catch (cause: any) {
      if (focusedRef.current) toast(cause.message ?? "Could not switch cameras.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const onDebugPaste = async () => {
    const bolt11 =
      Chain === "mainnet"
        ? "lnbc1500n1pw5gmyxpp5tnx03hfr3tx2lx3aal045c5dycjsah6j6a80c27qmxla3nrk8xmsdp42fjkzep6ypxxjemgw3hxjmn8yptkset9dssx7e3qgehhyar4dejs6cqzpgxqr23s49gpc74nkm8em70rehny2fgkp94vwm6lh8ympp668x2asn8yf5vk76camftzte4nh3h8sf365vwx69mxp4x5p3s7jx8l57vaeqyr68gqx9eaf0"
        : "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
    await tryInvoice(() => bolt11, "Debug clipboard paste error");
  };

  const active = focused && rpcReady && !busy && !paused;
  return (
    <Camera
      ref={cameraRef}
      active={active}
      onRead={(value) => {
        if (active) void tryInvoice(() => value, "QR scan error");
      }}
    >
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <BarcodeMask
          showAnimatedLine={false}
          edgeColor={blixtTheme.primary}
          width={265}
          height={265}
        />
        {PLATFORM !== "android" && <GoBackIcon style={styles.goBack} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter Lightning address"
          style={styles.lightningAddress}
          onPress={onLightningAddress}
        >
          <Icon type="Ionicons" name="at" style={styles.icon} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose camera"
          style={styles.swapCamera}
          onPress={chooseCamera}
        >
          <Icon type="Ionicons" name="camera-reverse" style={styles.icon} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paste invoice"
          testID="paste-clipboard"
          style={styles.paste}
          onPress={() => void tryInvoice(() => Clipboard.getString(), "Clipboard paste error")}
        >
          <Icon type="FontAwesome" name="paste" style={styles.icon} />
        </Pressable>
        {(__DEV__ || PLATFORM === "web") && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Paste debug invoice"
            style={styles.pasteDebug}
            onPress={onDebugPaste}
          >
            <Icon type="MaterialCommunityIcons" name="debug-step-over" style={styles.icon} />
          </Pressable>
        )}
        <View pointerEvents="box-none" style={styles.status}>
          {!rpcReady && <Text style={styles.text}>Waiting for the wallet to be ready…</Text>}
          {rpcReady && busy && <Text style={styles.text}>Please wait…</Text>}
          {rpcReady && paused && !busy && (
            <Button title="Scan again" onPress={() => setPaused(false)} />
          )}
        </View>
      </View>
    </Camera>
  );
}

const styles = StyleSheet.create({
  goBack: { position: "absolute", top: getStatusBarHeight(false) + 8, left: 8, padding: 9 },
  lightningAddress: {
    position: "absolute",
    padding: 9,
    top: getStatusBarHeight(false) + 8,
    right: 14,
  },
  swapCamera: { position: "absolute", padding: 9, bottom: 10, left: 13 },
  paste: { position: "absolute", padding: 9, bottom: 12, right: 16 },
  pasteDebug: { position: "absolute", padding: 9, bottom: 12, right: 73 },
  icon: { fontSize: 28, color: blixtTheme.light },
  status: { position: "absolute", bottom: 64, left: 64, right: 64, alignItems: "center" },
  text: { color: "white", textAlign: "center", marginBottom: 12 },
});
