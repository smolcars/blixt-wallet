const path = require("path");

// These packages have no macOS native implementation. Both entries are needed:
// the Apple autolinker falls back to ios, and codegen also reads that entry.
// Desktop Metro shims handle startup imports; see RESTORATION.md for limits.
const unsupported = [
  "@notifee/react-native",
  "@react-native-community/geolocation",
  "@react-native-community/push-notification-ios",
  "@react-native-documents/picker",
  "@react-native-google-signin/google-signin",
  "react-native-fingerprint-scanner",
  "react-native-haptic-feedback",
  "react-native-icloudstore",
  "react-native-keyboard-controller",
  "react-native-linear-gradient",
  "react-native-maps",
  "react-native-nitro-image",
  "react-native-permissions",
  "react-native-screens",
  "react-native-vector-icons",
  "react-native-vision-camera",
  "react-native-vision-camera-barcode-scanner",
];

module.exports = {
  project: { macos: { sourceDir: "." } },
  assets: [path.resolve(__dirname, "../assets/fonts")],
  reactNativePath: path.dirname(require.resolve("react-native-macos/package.json")),
  dependencies: {
    // Compile the in-repo camera sources directly while developing the local package.
    "blixt-macos-camera": { root: path.join(__dirname, "camera") },
    ...Object.fromEntries(
      unsupported.map((name) => [name, { platforms: { ios: null, macos: null } }]),
    ),
  },
};
