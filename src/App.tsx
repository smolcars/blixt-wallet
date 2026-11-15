import React, { useEffect, useState } from "react";
import { StyleProvider, Root } from "native-base";
import { DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { StoreProvider } from "easy-peasy";
import { MenuProvider } from "react-native-popup-menu";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import Main from "./Main";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import { navigator } from "./utils/navigation";

import getTheme from "./native-base-theme/components";
import theme from "./native-base-theme/variables/commonColor";

import store from "./state/store";
import { clearApp } from "./storage/app";
import { BLIXT_WEB_DEMO, IS_ELECTROBUN, PLATFORM } from "./utils/constants";
import "./i18n/i18n";

export default function App() {
  const [debug, setDebug] = useState(__DEV__);

  useEffect(() => {
    (async () => {
      if (PLATFORM === "web" && !IS_ELECTROBUN && BLIXT_WEB_DEMO) {
        await clearApp();
      }
    })();
  }, []);

  const navigatorTheme: Theme = {
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      background: "transparent",
    },
    fonts: DefaultTheme.fonts,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <StoreProvider store={store}>
          <StyleProvider.Context.Provider
            value={{ theme: StyleProvider.fixTheme(getTheme(theme)) }}
          >
            <NavigationContainer
              theme={navigatorTheme}
              documentTitle={{ enabled: false }}
              ref={navigator}
            >
              <MenuProvider>
                <Root>
                  {debug ? <DEV_Commands continueCallback={() => setDebug(false)} /> : <Main />}
                </Root>
              </MenuProvider>
            </NavigationContainer>
          </StyleProvider.Context.Provider>
        </StoreProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
