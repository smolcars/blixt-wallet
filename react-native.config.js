const macos = process.env.BLIXT_PLATFORM === "macos";

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {},
    macos: {},
  },
  // The desktop Screens alias supplies JS fallback components only. Never
  // autolink a second Screens pod into either desktop or mobile targets.
  dependencies: {
    "@blixt/macos-screens": { platforms: { ios: null, android: null, macos: null } },
  },
  assets: ["./assets/fonts/"],
  ...(macos ? require("./macos/react-native.config") : {}),
};
