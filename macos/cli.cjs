// Use the desktop project for CLI/autolinking while sharing ../src and ../index.js.
require("../scripts/sync-macos-package.cjs").sync(true);
process.chdir(__dirname);
require("./node-resolver.cjs");
require("./node_modules/react-native-macos/cli.js").run("react-native-macos");
