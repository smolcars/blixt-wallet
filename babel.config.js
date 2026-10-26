module.exports = (api) => {
  const macos = api.caller((caller) => caller?.platform === "macos");
  return {
    presets: [macos
      ? require.resolve("./macos/node_modules/@react-native/babel-preset")
      : "module:@react-native/babel-preset"],
    plugins: [
      [
        macos ? require.resolve("./macos/node_modules/babel-plugin-react-compiler") : "babel-plugin-react-compiler",
        {
          logger: {
            logEvent: (filename, event) => {
              if (event.kind === "CompileSuccess") {
                console.log("✨ React Compiler successfully compiled: ", filename);
              }
              if (event.kind === "CompileError") {
                console.warn("⚠️ React Compiler failed to compile: " + filename);
                console.warn(filename, JSON.stringify(event, null, 2));
              }
            },
          },
        },
      ],
      macos ? require.resolve("./macos/node_modules/@babel/plugin-transform-export-namespace-from") : "@babel/plugin-transform-export-namespace-from",
      macos ? require.resolve("./macos/node_modules/react-native-worklets/plugin") : "react-native-worklets/plugin",
    ],
  };
};
