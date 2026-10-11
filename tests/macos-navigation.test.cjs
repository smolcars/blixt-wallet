const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function load(relativePath, mocks) {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "..", relativePath), {
    babelrc: false,
    configFile: false,
    plugins: [
      ...(relativePath.endsWith(".ts") ? ["@babel/plugin-transform-typescript"] : []),
      "@babel/plugin-transform-react-jsx",
      "@babel/plugin-transform-modules-commonjs",
    ],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    id => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
    module, module.exports,
  );
  return module.exports;
}

test("macOS navigation ignores enabled legacy transitions without changing mobile options", () => {
  const forNoAnimation = () => ({});
  for (const platform of ["macos", "ios", "android"]) {
    for (const enabled of [true, false]) {
      const { default: options } = load("src/hooks/useStackNavigationOptions.ts", {
        "react-native": { Platform: { OS: platform, select: () => undefined } },
        "@react-navigation/stack": { CardStyleInterpolators: { forNoAnimation } },
        "../state/store": { useStoreState: selector => selector({ settings: { screenTransitionsEnabled: enabled } }) },
        "../native-base-theme/variables/commonColor": { blixtTheme: {} },
        "../utils/build": { Chain: "mainnet" },
      });
      const result = options();
      assert.equal(result.animation, platform === "macos" || !enabled ? "none" : undefined);
      assert.equal(result.cardStyleInterpolator === forNoAnimation, platform === "macos");
      if (platform === "macos") {
        // A new route must not depend on a native animation advancing from zero.
        assert.deepEqual(result.cardStyleInterpolator({ current: { progress: 0 } }), {});
      }
    }
  }
});

test("desktop resolves the real Screens package and excludes its native alias from all targets", () => {
  const manifest = require("../package.json");
  const desktop = require("../macos/metro.config");
  const calls = [];
  const context = { resolveRequest: (_, name, platform) => {
    calls.push([name, platform]);
    return { type: "sourceFile", filePath: require.resolve(name + "/package.json") };
  }};
  const result = desktop.resolver.resolveRequest(context, "react-native-screens", "macos");
  assert.match(result.filePath, /node_modules\/@blixt\/macos-screens\/package.json$/);
  assert.equal(require(result.filePath).version, "4.25.0");
  assert.deepEqual(calls, [["@blixt/macos-screens", "macos"]]);
  assert.equal(manifest.devDependencies["@blixt/macos-screens"], "npm:react-native-screens@4.25.0");
  assert.notEqual(require("react-native-screens/package.json").version, "4.25.0");
  for (const config of [require("../react-native.config"), require("../macos/react-native.config")]) {
    assert.deepEqual(config.dependencies["@blixt/macos-screens"].platforms,
      { ios: null, android: null, macos: null });
  }
});
