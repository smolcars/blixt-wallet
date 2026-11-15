import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button, Linking, StyleSheet, Text, View } from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import {
  type TargetBarcodeFormat,
  useBarcodeScannerOutput,
} from "react-native-vision-camera-barcode-scanner";
import type { CameraHandle, ICamera } from "./Camera.types";
export type { ICamera } from "./Camera.types";

const QR_CODE_FORMATS: TargetBarcodeFormat[] = ["qr-code"];
export default forwardRef<CameraHandle, ICamera>(function CameraComponent(
  { children, onNotAuthorized, onRead, active = true, cameraType = "back", style },
  ref,
) {
  const [direction, setDirection] = useState(cameraType);
  const [denied, setDenied] = useState(false);
  const device = useCameraDevice(direction);
  const { hasPermission, requestPermission } = useCameraPermission();
  const callbacks = useRef({ onRead, onNotAuthorized, active });
  useLayoutEffect(() => {
    callbacks.current = { onRead, onNotAuthorized, active };
  }, [onRead, onNotAuthorized, active]);
  useEffect(() => setDirection(cameraType), [cameraType]);
  useImperativeHandle(ref, () => ({
    switchCamera: async () => {
      setDirection((previous) => (previous === "back" ? "front" : "back"));
    },
  }));

  const barcodeScannerOutput = useBarcodeScannerOutput({
    barcodeFormats: QR_CODE_FORMATS,
    onBarcodeScanned: (barcodes) => {
      const value = barcodes[0]?.rawValue;
      if (value && callbacks.current.active) callbacks.current.onRead?.(value);
    },
    onError: (error) => console.error("Failed to scan QR code", error),
  });

  useEffect(() => {
    if (hasPermission) {
      setDenied(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void requestPermission()
        .then((granted) => {
          if (cancelled) return;
          setDenied(!granted);
          if (!granted) callbacks.current.onNotAuthorized?.();
        })
        .catch(() => {
          if (!cancelled) {
            setDenied(true);
            callbacks.current.onNotAuthorized?.();
          }
        });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestPermission, hasPermission]);

  return (
    <View style={[styles.container, style]}>
      {hasPermission && device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={active}
          outputs={[barcodeScannerOutput]}
        />
      )}
      {children}
      {(denied || (hasPermission && !device)) && (
        <View style={styles.error}>
          <Text style={styles.text}>
            {denied ? "Allow camera access in Settings to scan QR codes." : "No camera available."}
          </Text>
          {denied && (
            <Button
              title="Open Settings"
              onPress={() => {
                void Linking.openSettings().catch(console.error);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  error: {
    position: "absolute",
    top: "35%",
    left: 48,
    right: 48,
    alignItems: "center",
    backgroundColor: "black",
    padding: 16,
  },
  text: { color: "white", textAlign: "center" },
});
