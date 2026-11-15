import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button, Linking, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import NativeCamera, { CameraDevice } from "../../macos/camera/src/NativeBlixtCamera";
import CameraPreview from "../../macos/camera/src/BlixtCameraPreviewNativeComponent";
import { Alert } from "../utils/alert";
import { toast } from "../utils";
import type { CameraHandle, ICamera } from "./Camera.types";
export type { ICamera } from "./Camera.types";

export default forwardRef<CameraHandle, ICamera>(function CameraComponent(
  { active = true, children, style, onRead, onNotAuthorized },
  ref,
) {
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  useLayoutEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  const onNotAuthorizedRef = useRef(onNotAuthorized);
  useLayoutEffect(() => {
    onNotAuthorizedRef.current = onNotAuthorized;
  }, [onNotAuthorized]);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceID, setDeviceID] = useState("");
  const [permission, setPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    setError(null);
    setPermission(false);
    (async () => {
      try {
        const granted = await NativeCamera.requestPermission();
        if (cancelled) return;
        setPermission(granted);
        if (!granted) {
          onNotAuthorizedRef.current?.();
          setError(
            "Allow camera access in System Settings → Privacy & Security → Camera, then retry.",
          );
          return;
        }
        const cameras = await NativeCamera.getDevices();
        if (cancelled) return;
        setDevices(cameras);
        setDeviceID((previous) =>
          cameras.some((camera) => camera.id === previous) ? previous : (cameras[0]?.id ?? ""),
        );
        if (!cameras.length)
          setError("No camera found. Connect a camera and retry, or paste an invoice.");
      } catch (cause: any) {
        if (!cancelled) setError(cause.message ?? "Could not open the camera.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focused, retry]);

  useEffect(() => {
    return () => {
      focusedRef.current = false;
    };
  }, []);

  const chooseCamera = async () => {
    if (!focusedRef.current) return;
    if (!permission) {
      setRetry((value) => value + 1);
      return;
    }
    try {
      const cameras = await NativeCamera.getDevices();
      if (!focusedRef.current) return;
      setDevices(cameras);
      if (!cameras.length) {
        setError("No camera found. Connect a camera and retry.");
        return;
      }
      await Alert.promiseAlert("Choose camera", undefined, [
        ...cameras.map((camera) => ({
          text: camera.name,
          onPress: () => {
            if (!focusedRef.current) return;
            setDeviceID(camera.id);
            setError(null);
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (cause: any) {
      if (focusedRef.current) setError(cause.message ?? "Could not list cameras.");
    }
  };

  useImperativeHandle(ref, () => ({ switchCamera: chooseCamera }));
  const capturing = active && focused && permission && !!deviceID && !error;
  return (
    <View style={[styles.container, style]}>
      {permission && !!deviceID && !error && (
        <CameraPreview
          key={retry}
          style={StyleSheet.absoluteFill}
          active={capturing}
          deviceID={deviceID}
          onRead={(event) => {
            if (capturing) onRead?.(event.nativeEvent.value);
          }}
          onCameraError={(event) => setError(event.nativeEvent.message)}
        />
      )}
      {children}
      {!!error && (
        <View style={styles.error}>
          <Text style={styles.text}>{error}</Text>
          {!permission && (
            <Button
              title="Open System Settings"
              onPress={() => {
                void Linking.openURL(
                  "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
                ).catch(() => toast("Open System Settings → Privacy & Security → Camera."));
              }}
            />
          )}
          <Button title="Retry camera" onPress={() => setRetry((value) => value + 1)} />
        </View>
      )}
      {capturing && (
        <Text pointerEvents="none" style={styles.deviceName}>
          {devices.find((camera) => camera.id === deviceID)?.name}
        </Text>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  error: {
    position: "absolute",
    top: "35%",
    left: 64,
    right: 64,
    alignItems: "center",
    backgroundColor: "black",
    padding: 16,
  },
  text: { color: "white", textAlign: "center", marginBottom: 12 },
  deviceName: {
    position: "absolute",
    bottom: 64,
    left: 64,
    right: 64,
    color: "white",
    textAlign: "center",
  },
});
