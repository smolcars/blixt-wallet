import React, { useState } from "react";
import {
  PixelRatio,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Icon, Text } from "native-base";
import { DrawerActions } from "@react-navigation/native";
import { DrawerContentComponentProps } from "@react-navigation/drawer/lib/typescript/src/types";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { BlixtLogo } from "./BlixtWallet";
import usePromptLightningAddress from "../hooks/usePromptLightningAddress";
import useEvaluateLightningCode from "../hooks/useEvaluateLightningCode";
import { fontFactorNormalized } from "../utils/scale";
import useLayoutMode from "../hooks/useLayoutMode";
import { useStoreState } from "../state/store";
import { PLATFORM } from "../utils/constants";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useTranslation } from "react-i18next";
import { namespaces } from "../i18n/i18n.constants";

export default function Drawer({ navigation }: DrawerContentComponentProps) {
  const t = useTranslation(namespaces.drawer).t;
  const promptLightningAddress = usePromptLightningAddress();
  const evaluateLightningCode = useEvaluateLightningCode();
  const layoutMode = useLayoutMode();
  const [expandAdvanced, setExpandAdvanced] = useState(false);
  const channels = useStoreState((store) => store.channel.channels);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);

  const closeDrawer = () => {
    if (PLATFORM !== "macos") {
      navigation.dispatch(DrawerActions.closeDrawer);
    }
    setExpandAdvanced(false);
  };

  const goToScreen = (screen: string, options: any = undefined, delayDrawerClose = true) => {
    setTimeout(closeDrawer, delayDrawerClose ? 600 : 1);
    navigation.navigate(screen, options);
  };

  const sendToLightningAddress = async () => {
    if (PLATFORM !== "macos") {
      navigation.dispatch(DrawerActions.closeDrawer);
    }
    if ((await promptLightningAddress())[0]) {
      navigation.navigate("LNURL", { screen: "PayRequest" });
    } else {
      if (PLATFORM !== "macos") {
        navigation.dispatch(DrawerActions.openDrawer);
      }
    }
  };

  const pasteFromClipboard = async () => {
    const clipboardText = await Clipboard.getString();

    if (clipboardText === "" && PLATFORM === "ios") {
      return;
    }

    switch (await evaluateLightningCode(clipboardText, "Clipboard paste error")) {
      case "BOLT11":
        goToScreen("Send", { screen: "SendConfirmation" });
        break;
      case "LNURLAuthRequest":
        goToScreen("LNURL", { screen: "AuthRequest" }, false);
        break;
      case "LNURLChannelRequest":
        goToScreen("LNURL", { screen: "ChannelRequest" });
        break;
      case "LNURLPayRequest":
        goToScreen("LNURL", { screen: "PayRequest" }, false);
        break;
      case "LNURLWithdrawRequest":
        goToScreen("LNURL", { screen: "WithdrawRequest" }, false);
        break;
      case null:
        break;
    }
  };

  const goToLightningBrowser = () => {
    setTimeout(() => navigation.navigate("WebLNBrowser"), 270);
    navigation.dispatch(DrawerActions.closeDrawer);
  };

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandAdvanced(!expandAdvanced);
  };

  let statusIndicatorColor = blixtTheme.red;
  if (syncedToChain && channels.length > 0) {
    if (channels.some((channel) => channel.active)) {
      statusIndicatorColor = blixtTheme.green;
    } else {
      statusIndicatorColor = blixtTheme.primary;
    }
  }

  return (
    <View style={style.drawerContainer}>
      <ScrollView
        style={style.drawerScroll}
        contentContainerStyle={style.drawerScrollInner}
        alwaysBounceVertical={false}
      >
        <View
          style={[
            {
              backgroundColor: statusIndicatorColor,
            },
            style.statusIndicator,
          ]}
        ></View>
        <View style={style.logoContainer}>
          <BlixtLogo />
          <Text style={style.blixtTitle} onPress={() => goToScreen("SyncInfo", undefined, false)}>
            Blixt Wallet
          </Text>
        </View>
        <View style={style.menu}>
          {(layoutMode === "full" || PLATFORM === "macos") && (
            <>
              <TouchableOpacity onPress={() => goToScreen("Send")}>
                <View style={style.menuItem}>
                  <Icon style={style.menuItemIcon} type="AntDesign" name="camerao" />
                  <Text style={style.menuItemText}>{t("menu.scan")}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => goToScreen("Receive")}>
                <View style={style.menuItem}>
                  <Icon style={style.menuItemIcon} type="AntDesign" name="qrcode" />
                  <Text style={style.menuItemText}>{t("menu.receive")}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={pasteFromClipboard}>
            <View style={style.menuItem}>
              <Icon
                style={style.menuItemIcon}
                type={PLATFORM === "macos" ? "FontAwesome" : "FontAwesome5"}
                name="paste"
              />
              <Text style={style.menuItemText}>{t("menu.pasteFromClipboard")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={sendToLightningAddress}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="Ionicons" name="at" />
              <Text style={style.menuItemText}>{t("menu.sendToLightningAddress")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goToScreen("Contacts")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="AntDesign" name="contacts" />
              <Text style={style.menuItemText}>{t("menu.contactsAndServices")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToLightningBrowser}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="MaterialCommunityIcons" name="web" />
              <Text style={style.menuItemText}>{t("menu.lightningBrowser")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goToScreen("OnChain")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="MaterialCommunityIcons" name="bitcoin" />
              <Text style={style.menuItemText}>{t("menu.onChainWallet")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goToScreen("LightningInfo")}>
            <View style={style.menuItem}>
              <Icon style={style.menuItemIcon} type="Entypo" name="thunder-cloud" />
              <Text style={style.menuItemText}>{t("menu.lightningChannels")}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAdvanced}>
            <View style={style.advancedExpand}>
              <Text note style={style.advancedExpandText}>
                {t("menu.showMore")}
              </Text>
              <Icon
                style={style.advancedExpandIcon}
                type="AntDesign"
                name={expandAdvanced ? "up" : "down"}
              />
            </View>
          </TouchableOpacity>

          <View style={[{ height: expandAdvanced ? "auto" : 0 }, style.advanced]}>
            <TouchableOpacity onPress={() => goToScreen("KeysendExperiment")}>
              <View style={style.menuItem}>
                <Icon
                  style={[style.menuItemIcon, { fontSize: 25 }]}
                  color={blixtTheme.dark}
                  type="FontAwesome"
                  name="send"
                />
                <Text style={style.menuItemText}>{t("menu.keysendExperiment")}</Text>
              </View>
            </TouchableOpacity>
            {PLATFORM === "android" && (
              <TouchableOpacity onPress={() => goToScreen("LightningBox")}>
                <View style={style.menuItem}>
                  <Icon
                    style={[style.menuItemIcon, { fontSize: 25 }]}
                    color={blixtTheme.dark}
                    type="FontAwesome"
                    name="inbox"
                  />
                  <Text style={style.menuItemText}>Lightning Box</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => goToScreen("Settings", { screen: "PowerUserTools" })}
            >
              <View style={style.menuItem}>
                <Icon
                  style={[style.menuItemIcon, { fontSize: 25 }]}
                  color={blixtTheme.dark}
                  type="MaterialCommunityIcons"
                  name="wrench"
                />
                <Text style={style.menuItemText}>{t("menu.powerUserTools")}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View style={style.bottom}>
        <Text style={style.bottomText} note>
          {t("madeInSweden")}
        </Text>
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: blixtTheme.dark,
  },
  drawerScroll: {
    flex: 1,
  },
  logoContainer: {
    marginTop: PLATFORM === "macos" ? 17 : 34,
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: "center",
  },
  blixtTitle: {
    marginTop: 3,
    fontFamily: blixtTheme.fontMedium,
    fontSize: 33 / PixelRatio.getFontScale(),
  },
  menu: {
    marginTop: 10,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: blixtTheme.gray,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginLeft: 18,
    marginRight: PLATFORM !== "macos" ? 18 : 4,
    marginBottom: 11,
    borderRadius: 12,
  },
  advancedExpand: {
    padding: 13,
    marginHorizontal: 19,
    marginTop: -9,
    marginBottom: 3,
    borderRadius: 12,
    flexDirection: "row",

    justifyContent: "center",
    alignItems: "center",
  },
  advancedExpandText: {},
  advancedExpandIcon: {
    fontSize: 16,
    marginLeft: 5,
    marginTop: 3,
  },
  advanced: {
    overflow: "hidden",
  },
  menuItemIcon: {
    width: 32,
    marginRight: 8,
  },
  menuItemText: {
    fontFamily: blixtTheme.fontMedium,
    fontSize: 14 * fontFactorNormalized,
  },
  bottom: {
    backgroundColor: blixtTheme.dark,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "column-reverse",
    alignItems: "center",
  },
  bottomText: {
    fontSize: 12.5 * fontFactorNormalized,
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 8,
    position: "absolute",
    top: 16 + getStatusBarHeight(),
    right: 18,
  },
});
