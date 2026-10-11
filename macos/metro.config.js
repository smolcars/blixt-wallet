const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@blixt/macos-metro-config");

// One root dependency tree, with the macOS renderer and 0.83 Metro toolchain.
const repoRoot = path.resolve(__dirname, "..");

const adapters = {
  "react-native-keyboard-controller": "keyboard",
  "react-native-nitro-tor": "tor",
  "react-native-fingerprint-scanner": "fingerprint",
  "react-native-icloudstore": "icloud",
  "react-native-permissions": "permissions",
  "@notifee/react-native": "notifications",
  "@react-native-community/geolocation": "geolocation",
  "@react-native-documents/picker": "documents",
  "react-native-maps": "maps",
  "react-native-hash": "hash",
};

module.exports = mergeConfig(getDefaultConfig(repoRoot), {
  resolver: {
    platforms: ["macos", "native"],
    resolveRequest(context, moduleName, platform) {
      if (moduleName === "react-native-screens" || moduleName.startsWith("react-native-screens/")) {
        moduleName = moduleName.replace(/^react-native-screens/, "@blixt/macos-screens");
      }
      if (adapters[moduleName]) {
        return { type: "sourceFile", filePath: path.join(repoRoot, "src/platform/macos", `${adapters[moduleName]}.js`) };
      }
      if (moduleName === "react-native" || moduleName.startsWith("react-native/")) {
        moduleName = moduleName.replace(/^react-native/, "react-native-macos");
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
