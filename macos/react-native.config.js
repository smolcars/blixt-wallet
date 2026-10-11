const path = require("path");

// These packages have no macOS native implementation. Both entries are needed:
// the Apple autolinker falls back to ios, and codegen also reads that entry.
// Desktop Metro adapters handle startup imports; see RESTORATION.md for limits.
const unsupported = [
  "@notifee/react-native",
  "@react-native-community/geolocation",
  "@react-native-community/push-notification-ios",
  "@react-native-documents/picker",
  "@react-native-google-signin/google-signin",
  "react-native-fingerprint-scanner",
  "react-native-haptic-feedback",
  "react-native-hash",
  "react-native-icloudstore",
  "react-native-keyboard-controller",
  "react-native-linear-gradient",
  "react-native-maps",
  "react-native-nitro-image",
  "react-native-nitro-tor",
  "react-native-permissions",
  "react-native-screens",
  "react-native-vector-icons",
  "react-native-vision-camera",
  "react-native-vision-camera-barcode-scanner",
];

module.exports = {
  reactNativePath: path.dirname(require.resolve("react-native-macos/package.json")),
  dependencies: {
    "@blixt/macos-screens": { platforms: { ios: null, android: null, macos: null } },
    ...Object.fromEntries(
      unsupported.map((name) => [name, { platforms: { ios: null, macos: null } }]),
    ),
  },
};
