import React, { ReactNode } from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  InputAccessoryView,
  ScrollView,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from "react-native";
import { View, Item, Text, Label, Icon } from "native-base";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { MathPad, IMathPadProps } from "../components/MathPad";
import { MATH_PAD_NATIVE_ID, PLATFORM } from "../utils/constants";
import { KeyboardAvoidingView } from "react-native-keyboard-controller"; // TODO(macos): potentially problematic on macos

export interface IFormItem {
  title: string | null;
  component: ReactNode;
  key: string | number;
  success?: boolean;
  active?: boolean;
  stacked?: boolean;
}

export interface IFormProps {
  buttons: ReactNode[];
  items: IFormItem[];
  style?: StyleProp<ViewStyle>;
  noticeText?: string | Element;
  noticeIcon?: "info" | null;
  mathPadVisible?: boolean;
  mathPadProps?: IMathPadProps;
}

export default function Form({
  buttons,
  items,
  style,
  noticeText,
  noticeIcon,
  mathPadProps,
}: IFormProps) {
  const TheKeyboardAvoidingView =
    PLATFORM === "android" ? KeyboardAvoidingView : RNKeyboardAvoidingView;

  return (
    <TheKeyboardAvoidingView
      enabled={true}
      style={[styles.content, style]}
      behavior={"padding"}
      keyboardVerticalOffset={PLATFORM === "android" ? 120 : 77}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.itemContainer}>
          {items.map(({ key, title, component, success, active, stacked }, i) =>
            (active ?? true) ? (
              <Item
                key={key}
                style={{
                  marginTop: i > 0 ? 16 : 8,
                  ...(stacked ? { flexDirection: "column", alignItems: "stretch" } : {}),
                }}
                success={success}
              >
                <Label
                  style={{
                    ...styles.itemLabel,
                    ...(stacked ? { width: "auto", marginBottom: 4 } : {}),
                    fontSize: (title !== null && title.length) >= 14 ? 15 : 17,
                  }}
                >
                  {title}
                </Label>
                {component}
              </Item>
            ) : null,
          )}
          {noticeText && (
            <View style={styles.notice}>
              {noticeIcon == "info" && (
                <Icon style={styles.noticeIcon} type="AntDesign" name="exclamationcircleo" />
              )}
              <Text style={styles.noticeText}>{noticeText}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <>
          {buttons.map((button, i) => {
            return (
              <View key={i} style={{ marginTop: i > 0 ? 6 : 0, padding: 16 }}>
                {button}
              </View>
            );
          })}
          {/* {PLATFORM === "android" && mathPadProps && <MathPad {...mathPadProps} />} */}
        </>
      </View>
      {PLATFORM === "ios" && (
        <></>
        // <InputAccessoryView nativeID={MATH_PAD_NATIVE_ID}>
        //   <MathPad {...mathPadProps} />
        // </InputAccessoryView>
      )}
    </TheKeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    height: "100%",
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
  },
  scrollContent: {
    flexGrow: 1,
  },
  itemContainer: {
    padding: 16,
  },
  itemLabel: {
    width: 105,
  },
  buttonContainer: {
    marginHorizontal: 2,
    marginBottom: 10,
  },
  error: {
    marginTop: 22,
    marginLeft: 3,
  },
  errorText: {
    color: blixtTheme.red,
  },
  notice: {
    marginTop: 24,
    marginLeft: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeIcon: {
    marginRight: 18,
    color: blixtTheme.light,
  },
  noticeText: {
    fontSize: 14,
    color: blixtTheme.lightGray,
    marginRight: 60,
    justifyContent: "center",
    lineHeight: 20,
  },
});
