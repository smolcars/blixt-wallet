const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
require("../scripts/sync-macos-package.cjs").sync(true);

const repoRoot = path.resolve(__dirname, "..");
const desktopModules = path.join(__dirname, "node_modules");
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const shims = {
  "react-native-keyboard-controller": "react-native-keyboard-controller",
  "react-native-fingerprint-scanner": "react-native-fingerprint-scanner",
  "react-native-icloudstore": "react-native-icloudstore",
  "react-native-permissions": "react-native-permissions",
  "@notifee/react-native": "notifee-react-native",
  "@react-native-community/geolocation": "react-native-geolocation",
  "@react-native-documents/picker": "react-native-documents-picker",
  "react-native-maps": "react-native-maps",
};

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  projectRoot: repoRoot,
  resolver: {
    platforms: ["macos", "native"],
    // Shared source lives above this package. Never bundle mobile's installed
    // modules; resolve its bare imports as though they originated in macos/.
    blockList: new RegExp(`^${escapeRegExp(path.join(repoRoot, "node_modules"))}/`),
    nodeModulesPaths: [desktopModules],
    resolveRequest(context, moduleName, platform) {
      if (shims[moduleName]) {
        return { type: "sourceFile", filePath: path.join(repoRoot, "src/shims", `${shims[moduleName]}.js`) };
      }
      const bare = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
      const singleton = /^(react|react-native)(\/|$)/.test(moduleName);
      if (moduleName === "react-native" || moduleName.startsWith("react-native/")) {
        moduleName = moduleName.replace(/^react-native/, "react-native-macos");
      }
      if (bare && (singleton || !context.originModulePath.startsWith(desktopModules + path.sep))) {
        context = { ...context, originModulePath: path.join(__dirname, "__shared_source__.js") };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
