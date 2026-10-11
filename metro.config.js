const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    unstable_enablePackageExports: true,
  },
};

// run-macos can start Metro itself; honor the platform selected by its launcher.
module.exports = process.env.BLIXT_PLATFORM === "macos"
  ? require("./macos/metro.config")
  : mergeConfig(getDefaultConfig(__dirname), config);
