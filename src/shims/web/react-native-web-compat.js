import * as ReactNativeWeb from "react-native-web";
import { unstable_batchedUpdates as reactDomBatchedUpdates } from "react-dom";
import codegenNativeComponent from "./react-native-libraries/codegenNativeComponent";
import codegenNativeCommands from "./react-native-libraries/codegenNativeCommands";

export * from "react-native-web";

export const PermissionsAndroid = {
  RESULTS: {
    DENIED: "denied",
    GRANTED: "granted",
    NEVER_ASK_AGAIN: "never_ask_again",
  },
  PERMISSIONS: {},
  async check() {
    return true;
  },
  async request() {
    return "granted";
  },
  async requestMultiple() {
    return {};
  },
};

export const TurboModuleRegistry = {
  get() {
    return null;
  },
  getEnforcing() {
    return {};
  },
};

export const ToastAndroid = {
  SHORT: 0,
  LONG: 1,
  TOP: 49,
  BOTTOM: 81,
  CENTER: 17,
  show() {},
  showWithGravity() {},
  showWithGravityAndOffset() {},
};

export const unstable_batchedUpdates =
  reactDomBatchedUpdates ??
  ((callback, ...args) => callback(...args));

export { codegenNativeComponent, codegenNativeCommands };

const compat = {
  ...ReactNativeWeb,
  PermissionsAndroid,
  TurboModuleRegistry,
  ToastAndroid,
  unstable_batchedUpdates,
  codegenNativeComponent,
  codegenNativeCommands,
};

export default compat;
