import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import NativeBlixtTools from "./turbomodules/NativeBlixtTools";
import { Spinner, H1, H2, Text } from "native-base";
import { Button } from "./components/Button";
import {
  createStackNavigator,
  CardStyleInterpolators,
  StackNavigationOptions,
} from "@react-navigation/stack";

import Overview from "./windows/Overview";
import Help from "./windows/Help";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";
import OnChain from "./windows/OnChain";
import Authentication from "./windows/InitProcess/Authentication";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import Welcome from "./windows/Welcome";
import LNURL from "./windows/LNURL";
import KeysendExperiment from "./windows/Keysend/Experiment";
import LightingBox from "./windows/LightningBox";
import GoogleDriveTestbed from "./windows/Google/GoogleDriveTestbed";
import TransactionDetails from "./windows/TransactionDetails";
import SyncInfo from "./windows/SyncInfo";
import WebLNBrowser from "./windows/WebLN/Browser";
import WebInfo from "./windows/Web/Info";
import Contacts from "./windows/Contacts";
import Loading from "./windows/Loading";
import LoadingModal from "./windows/LoadingModal";
import SyncWorkerReport from "./windows/SyncWorkerReport";
import SyncWorkerTimelineReport from "./windows/SyncWorkerTimelineReport";

import { useStoreState, useStoreActions } from "./state/store";
import { toast } from "./utils";
import CameraFullscreen from "./windows/CameraFullscreen";

import { blixtTheme } from "./native-base-theme/variables/commonColor";
import Container from "./components/Container";
import useStackNavigationOptions from "./hooks/useStackNavigationOptions";
import { navigator } from "./utils/navigation";
import { PLATFORM } from "./utils/constants";
import Prompt, { IPromptNavigationProps } from "./windows/HelperWindows/Prompt";
import HelperAlert, { IHelperAlertNavigationProps } from "./windows/HelperWindows/Alert";
import { isInstanceBricked } from "./storage/app";

const RootStack = createStackNavigator();

export type RootStackParamList = {
  DEV_Commands: undefined;
  Authentication: undefined;

  Loading: undefined;
  LoadingModal: undefined;
  CameraFullscreen: {
    onRead: (address: string) => void;
  };
  Welcome: undefined;
  Overview: undefined;
  Help: undefined;
  TransactionDetails: {
    rHash: string; // TODO
  };
  SyncInfo: undefined;
  Receive: undefined;
  Send: undefined;
  OnChain: undefined;
  Settings: undefined;
  LNURL: undefined;
  GoogleDriveTestbed: undefined;
  KeysendTest: undefined;
  KeysendExperiment: undefined;
  LightningBox: undefined;
  DeeplinkChecker: undefined;
  WebLNBrowser:
    | {
        url: string;
      }
    | undefined;
  WebInfo: undefined;

  Prompt: IPromptNavigationProps;
  HelperAlert: IHelperAlertNavigationProps;

  DEV_CommandsX: undefined;
  SyncWorkerReport: undefined;
};

export default function Main() {
  const persistentServicesEnabled = useStoreState((store) => store.settings.persistentServicesEnabled);
  useEffect(() => {
    if (PLATFORM === "macos") {
      NativeBlixtTools.setPersistentModeEnabled(persistentServicesEnabled);
    }
  }, [persistentServicesEnabled]);
  const holdOnboarding = useStoreState((store) => store.holdOnboarding);
  const appReady = useStoreState((store) => store.appReady);
  const lightningReady = useStoreState((store) => store.lightning.ready);
  const walletCreated = useStoreState((store) => store.walletCreated);
  const importChannelDbOnStartup = useStoreState((store) => store.importChannelDbOnStartup);
  const loggedIn = useStoreState((store) => store.security.loggedIn);
  const initializeApp = useStoreActions((store) => store.initializeApp);
  const setAppReady = useStoreActions((store) => store.setAppReady);
  const [initialRoute, setInitialRoute] = useState("Loading");
  const torLoading = useStoreState((store) => store.torLoading);
  const speedloaderLoading = useStoreState((store) => store.speedloaderLoading);
  const speedloaderCancelVisible = useStoreState((store) => store.speedloaderCancelVisible);
  const cancelSpeedloader = useStoreActions((store) => store.cancelSpeedloader);
  const screenTransitionsEnabled = useStoreState(
    (store) => store.settings.screenTransitionsEnabled,
  );

  const [state, setState] = useState<
    "init" | "authentication" | "onboarding" | "started" | "bricked"
  >("init");
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // tslint:disable-next-line
    (async () => {
      if (!appReady) {
        try {
          setInitError(null);
          if (await isInstanceBricked()) {
            setState("bricked");
            return;
          }

          await initializeApp();
        } catch (e: any) {
          const message = e?.message ?? String(e);
          const detail = e?.stack ?? message;
          console.error("initializeApp failed", e);
          setInitError(detail);
          toast(message, 0, "danger");
        }
      }
    })();
  }, [appReady, initializeApp]);

  useEffect(() => {
    if (!appReady) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      if (!loggedIn) {
        setState("authentication");
      } else if (!lightningReady) {
        setState("started");
        if (!walletCreated && !importChannelDbOnStartup) {
          setInitialRoute("Welcome");
        } else {
          // try {
          //   const lightningTimeout = setTimeout(() => {
          //     Alert.alert(
          //       "",
          //       "It looks like Blixt Wallet is having trouble starting lnd.\n" +
          //       "What do you want to do?",
          //       [{
          //         text: "Go to Help Center",
          //         onPress: () => {
          //           navigator.current?.navigate("Settings", { screen: "LndMobileHelpCenter" });
          //         },
          //         style:"default",
          //       }, {
          //         text: "Restart app",
          //         onPress: async () => {
          //           NativeModules.LndMobileTools.restartApp();
          //         },
          //       }, {
          //         text: "Try again",
          //         onPress: () => {
          //           setAppReady(false);
          //         },
          //       }]
          //     )
          //   }, 12 * 1000);
          //   clearTimeout(lightningTimeout);
          // } catch (e) {
          //   toast(e.message, 0, "danger");
          // }
        }
      } else {
        setState("started");
      }
    })();
  }, [appReady, loggedIn, holdOnboarding, walletCreated, importChannelDbOnStartup]);

  const screenOptions: StackNavigationOptions = {
    ...useStackNavigationOptions(),
    gestureEnabled: false,
    gestureDirection: "horizontal",
    gestureVelocityImpact: 1.9,
    animation: screenTransitionsEnabled ? "default" : "none",
  };

  const animationDisabled: StackNavigationOptions = {
    animation: "none",
    cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
  };

  const horizontalTransition: StackNavigationOptions = {
    gestureEnabled: PLATFORM !== "macos",
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  };

  if (state === "init") {
    if (initError) {
      return (
        <Container centered>
          <StatusBar
            backgroundColor="transparent"
            hidden={false}
            translucent={true}
            networkActivityIndicatorVisible={true}
            barStyle="light-content"
          />
          <H2>Initialization Failed</H2>
          <Text selectable>{initError}</Text>
          <Button
            small
            onPress={async () => {
              setInitError(null);
              setState("init");
              setAppReady(false);
              try {
                await initializeApp();
              } catch (e: any) {
                const message = e?.message ?? String(e);
                const detail = e?.stack ?? message;
                console.error("initializeApp retry failed", e);
                setInitError(detail);
                toast(message, 0, "danger");
              }
            }}
          >
            <Text>Retry Startup</Text>
          </Button>
        </Container>
      );
    }

    if (torLoading) {
      return (
        <Container centered>
          <StatusBar
            backgroundColor="transparent"
            hidden={false}
            translucent={true}
            networkActivityIndicatorVisible={true}
            barStyle="light-content"
          />
          <Spinner color={blixtTheme.light} size={55} />
          <H1>Initializing Tor</H1>
        </Container>
      );
    }
    if (speedloaderLoading) {
      return (
        <Container centered>
          <StatusBar
            backgroundColor="transparent"
            hidden={false}
            translucent={true}
            networkActivityIndicatorVisible={true}
            barStyle="light-content"
          />
          <Spinner color={blixtTheme.light} size={55} />
          <H2>Syncing Lightning Network</H2>

          {/* The button becomes visible after 10s */}
          {speedloaderCancelVisible && (
            <Button
              small
              style={{
                marginTop: 24,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8,
                minWidth: 120,
                justifyContent: "center",
              }}
              onPress={() => cancelSpeedloader()}
            >
              <Text style={{ color: blixtTheme.light, fontSize: 14, textAlign: "center" }}>
                Cancel Sync
              </Text>
            </Button>
          )}
        </Container>
      );
    }
    return (
      <>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />
      </>
    );
  }

  if (state === "authentication") {
    return <Authentication />;
  }

  if (state === "bricked") {
    return <Text>Bricked</Text>;
  }

  return (
    <RootStack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
      <RootStack.Screen
        name="Welcome"
        component={Welcome}
        options={
          PLATFORM === "ios"
            ? {
                gestureEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              }
            : animationDisabled
        }
      />
      <RootStack.Screen name="Loading" component={Loading} options={animationDisabled} />
      <RootStack.Screen name="LoadingModal" component={LoadingModal} options={animationDisabled} />
      <RootStack.Screen
        name="CameraFullscreen"
        component={CameraFullscreen}
        options={{
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />

      <RootStack.Screen name="Overview" component={Overview} options={animationDisabled} />
      <RootStack.Screen name="Help" component={Help} options={animationDisabled} />
      <RootStack.Screen
        name="TransactionDetails"
        component={TransactionDetails as any}
        options={animationDisabled}
      />
      <RootStack.Screen name="SyncInfo" component={SyncInfo} options={animationDisabled} />
      <RootStack.Screen name="Receive" component={Receive} options={horizontalTransition} />
      <RootStack.Screen
        name="Send"
        component={Send}
        options={{
          animation: screenTransitionsEnabled ? "default" : "none",
          gestureEnabled: true,
          gestureResponseDistance: 1000,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          ...(PLATFORM === "macos" ? { gestureEnabled: false } : {}),
        }}
      />
      <RootStack.Screen name="OnChain" component={OnChain} options={horizontalTransition} />
      <RootStack.Screen
        name="LightningInfo"
        component={LightningInfo}
        options={horizontalTransition}
      />
      <RootStack.Screen name="Settings" component={Settings} options={horizontalTransition} />
      <RootStack.Screen name="LNURL" component={LNURL} options={animationDisabled} />
      <RootStack.Screen name="WebLNBrowser" component={WebLNBrowser} options={animationDisabled} />
      <RootStack.Screen name="WebInfo" component={WebInfo} options={animationDisabled} />
      <RootStack.Screen name="Contacts" component={Contacts} options={horizontalTransition} />

      <RootStack.Screen
        name="GoogleDriveTestbed"
        component={GoogleDriveTestbed}
        options={animationDisabled}
      />
      <RootStack.Screen
        name="KeysendExperiment"
        component={KeysendExperiment}
        options={horizontalTransition}
      />
      <RootStack.Screen
        name="LightningBox"
        component={LightingBox}
        options={horizontalTransition}
      />
      <RootStack.Screen name="Prompt" component={Prompt} options={animationDisabled} />
      <RootStack.Screen name="HelperAlert" component={HelperAlert} options={animationDisabled} />
      <RootStack.Screen name="DEV_CommandsX" component={DEV_Commands} options={animationDisabled} />
      <RootStack.Screen
        name="SyncWorkerReport"
        component={SyncWorkerReport}
        options={animationDisabled}
      />
      <RootStack.Screen
        name="SyncWorkerTimelineReport"
        component={SyncWorkerTimelineReport}
        options={animationDisabled}
      />
    </RootStack.Navigator>
  );
}
