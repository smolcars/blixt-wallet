import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button, InteractionManager, Text, View } from "react-native";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import type { CameraHandle, ICamera } from "./Camera.types";
export type { ICamera } from "./Camera.types";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

const SCANNER_OPTIONS = {
  delayBetweenScanAttempts: 300,
  delayBetweenScanSuccess: 650,
};

const getConstraints = (
  cameraType: ICamera["cameraType"],
  useFallbackConstraints: boolean,
): MediaStreamConstraints => {
  if (useFallbackConstraints) {
    return { video: true, audio: false };
  }

  return {
    video: {
      facingMode: { exact: cameraType === "front" ? "user" : "environment" },
    },
    audio: false,
  };
};

const getErrorName = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const cast = error as {
    name?: unknown;
  };

  return typeof cast.name === "string" ? cast.name : "";
};

const isConstraintError = (error: unknown) => {
  const name = getErrorName(error);
  return name === "OverconstrainedError" || name === "NotFoundError";
};

export default forwardRef<CameraHandle, ICamera>(function CameraComponent(
  { cameraType, children, onNotAuthorized, onRead, style, active },
  ref,
) {
  const [direction, setDirection] = useState(cameraType ?? "back");
  const [retry, setRetry] = useState(0);
  const callbacks = useRef({ onRead, onNotAuthorized });
  useLayoutEffect(() => {
    callbacks.current = { onRead, onNotAuthorized };
  }, [onRead, onNotAuthorized]);
  useEffect(() => setDirection(cameraType ?? "back"), [cameraType]);
  useImperativeHandle(ref, () => ({
    switchCamera: async () => {
      setDirection((previous) => (previous === "back" ? "front" : "back"));
    },
  }));
  const [start, setStart] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedTextRef = useRef("");
  const onNotAuthorizedCalledRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isActive = active ?? true;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setStart(true);
    });

    return () => {
      task.cancel();
    };
  }, []);

  useEffect(() => {
    setCameraUnavailable(false);
    onNotAuthorizedCalledRef.current = false;
  }, [direction, isActive, retry]);

  useEffect(() => {
    if (!start || !isActive) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    const markCameraUnavailable = () => {
      setCameraUnavailable(true);
      if (!onNotAuthorizedCalledRef.current) {
        onNotAuthorizedCalledRef.current = true;
        callbacks.current.onNotAuthorized?.();
      }
    };

    if (typeof window !== "undefined" && !window.isSecureContext) {
      markCameraUnavailable();
      return;
    }

    if (
      !videoRef.current ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      markCameraUnavailable();
      return;
    }

    let cancelled = false;
    let ownedControls: IScannerControls | null = null;
    const reader = new BrowserQRCodeReader(undefined, SCANNER_OPTIONS);

    const startScanner = async (useFallbackConstraints: boolean) => {
      try {
        const controls = await reader.decodeFromConstraints(
          getConstraints(direction, useFallbackConstraints),
          videoRef.current ?? undefined,
          (result, _error, controls) => {
            if (cancelled) {
              controls.stop();
              return;
            }
            ownedControls = controls;
            controlsRef.current = controls;
            if (!result) return;

            const text = result.getText();
            if (text && text !== lastScannedTextRef.current) {
              lastScannedTextRef.current = text;
              callbacks.current.onRead?.(text);
            }
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        ownedControls = controls;
        controlsRef.current = controls;
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (!useFallbackConstraints && isConstraintError(error)) {
          controlsRef.current?.stop();
          controlsRef.current = null;
          await startScanner(true);
          return;
        }

        markCameraUnavailable();
      }
    };

    void startScanner(false);

    return () => {
      cancelled = true;
      ownedControls?.stop();
      if (controlsRef.current === ownedControls) controlsRef.current = null;
      lastScannedTextRef.current = "";
    };
  }, [start, isActive, direction, retry]);

  return (
    <View style={[{ width: "100%", height: "100%", backgroundColor: blixtTheme.dark }, style]}>
      <video
        key={`${direction}:${isActive}:${retry}`}
        ref={videoRef}
        muted={true}
        autoPlay={true}
        playsInline={true}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: start && isActive && !cameraUnavailable ? "block" : "none",
          transform: direction === "front" ? "scaleX(-1)" : undefined,
        }}
      />
      {children}
      {cameraUnavailable && (
        <View
          style={{
            position: "absolute",
            top: "35%",
            left: 48,
            right: 48,
            backgroundColor: "black",
            padding: 16,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            Camera unavailable. Allow camera access in your browser and use HTTPS or localhost.
          </Text>
          <Button title="Retry camera" onPress={() => setRetry((value) => value + 1)} />
        </View>
      )}
    </View>
  );
});
