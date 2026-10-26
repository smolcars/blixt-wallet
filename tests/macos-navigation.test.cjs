const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function load(relativePath, mocks) {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "..", relativePath), {
    babelrc: false,
    configFile: false,
    plugins: [
      ...(relativePath.endsWith(".ts") ? ["@babel/plugin-transform-typescript"] : ["@babel/plugin-transform-flow-strip-types"]),
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

test("navigation respects the transition preference on desktop and mobile", () => {
  const forFadeFromCenter = () => ({});
  for (const platform of ["macos", "ios", "android"]) {
    for (const enabled of [true, false]) {
      const { default: options } = load("src/hooks/useStackNavigationOptions.ts", {
        "react-native": { Platform: { OS: platform, select: () => undefined } },
        "@react-navigation/stack": { CardStyleInterpolators: { forFadeFromCenter } },
        "../state/store": { useStoreState: selector => selector({ settings: { screenTransitionsEnabled: enabled } }) },
        "../native-base-theme/variables/commonColor": { blixtTheme: {} },
        "../utils/build": { Chain: "mainnet" },
      });
      const result = options();
      assert.equal(result.animation, enabled ? undefined : "none");
      assert.equal(result.cardStyleInterpolator === forFadeFromCenter, platform === "macos");
    }
  }
});

test("desktop shared imports resolve inside its own install tree", () => {
  const desktop = require("../macos/metro.config");
  const calls = [];
  const root = path.resolve(__dirname, "..");
  const context = {
    originModulePath: path.join(root, "src/Main.tsx"),
    resolveRequest: (ctx, name, platform) => {
      calls.push([ctx.originModulePath, name, platform]);
      return { type: "sourceFile", filePath: require.resolve(name + "/package.json", { paths: [path.dirname(ctx.originModulePath)] }) };
    },
  };
  for (const [name, expected, version] of [
    ["react-native-screens", "react-native-screens", "4.25.0"],
    ["react-native", "react-native-macos", "0.83.0"],
    ["react", "react", "19.2.3"],
  ]) {
    const result = desktop.resolver.resolveRequest(context, name, "macos");
    assert(result.filePath.startsWith(path.join(root, "macos/node_modules") + path.sep));
    assert.equal(require(result.filePath).version, version);
    assert.deepEqual(calls.at(-1), [path.join(root, "macos/__shared_source__.js"), expected, "macos"]);
  }
  assert(desktop.resolver.blockList.test(path.join(root, "node_modules/react/index.js")));
  assert(!desktop.resolver.blockList.test(path.join(root, "macos/node_modules/react/index.js")));
  assert.equal(require("../macos/react-native.config").dependencies["react-native-screens"].platforms.macos, null);
  assert.equal(require("../react-native.config").dependencies["react-native-screens"], undefined);
});


test("macOS uses Turbo Animated only in bridgeless mode, preserving the C++ driver", () => {
  const previous = global.RN$Bridgeless;
  try {
    for (const platform of ["macos", "ios", "android", "web"]) {
      for (const bridgeless of [true, false]) {
        for (const cxx of [true, false]) {
          global.RN$Bridgeless = bridgeless;
          const { default: shouldUseTurbo } = load(
            "macos/node_modules/react-native-macos/Libraries/Animated/shouldUseTurboAnimatedModule.js",
            {
              "../Utilities/Platform": { OS: platform },
              "../../src/private/featureflags/ReactNativeFeatureFlags": {
                cxxNativeAnimatedEnabled: () => cxx,
              },
            },
          );
          assert.equal(shouldUseTurbo(), !cxx && bridgeless && ["ios", "macos"].includes(platform));
        }
      }
    }
  } finally {
    if (previous === undefined) delete global.RN$Bridgeless;
    else global.RN$Bridgeless = previous;
  }
});
