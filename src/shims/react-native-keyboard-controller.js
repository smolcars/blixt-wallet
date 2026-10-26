import { KeyboardAvoidingView as RNKeyboardAvoidingView } from "react-native";

export const KeyboardProvider = ({ children }) => children;
export const KeyboardAvoidingView = RNKeyboardAvoidingView;

export default {
  KeyboardProvider,
  KeyboardAvoidingView,
};
