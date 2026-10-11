module.exports = (api) => {
  const macos = api.caller((caller) => caller?.platform === "macos");
  return {
    presets: [macos ? "module:@blixt/macos-babel-preset" : "module:@react-native/babel-preset"],
    plugins: [
      [
        "babel-plugin-react-compiler",
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
      "@babel/plugin-transform-export-namespace-from",
      "react-native-worklets/plugin",
    ],
  };
};
