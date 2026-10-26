// Used only by macOS CLI commands and CocoaPods subprocesses. Several native
// libraries discover RN's version/headers using require.resolve('react-native').
// Make those lookups select the macOS fork without changing the mobile package.
const Module = require("module");
const path = require("path");
const resolveFilename = Module._resolveFilename;

process.env.BLIXT_PLATFORM = "macos";

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "react-native" || request.startsWith("react-native/")) {
    request = request.replace(/^react-native/, path.join(__dirname, "node_modules/react-native-macos"));
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};
