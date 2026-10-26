const path = require("path");
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
    // The generated desktop install is not part of the mobile bundle graph.
    blockList: new RegExp(`^${path.join(__dirname, "macos/node_modules").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
