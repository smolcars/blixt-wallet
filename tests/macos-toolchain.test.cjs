const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const manifest = require("../package.json");

function inspect(desktop) {
  const args = desktop ? ["--require", "./macos/node-resolver.cjs"] : [];
  args.push("-e", `
    const { createRequire } = require('node:module');
    const packagePath = require.resolve('react-native/package.json');
    const rnRequire = createRequire(packagePath);
    const config = require(${JSON.stringify(desktop ? './macos/react-native.config' : './react-native.config')});
    const metro = require(${JSON.stringify(desktop ? './macos/metro.config' : './metro.config')});
    function desktopTorShim() {
      if (!${JSON.stringify(desktop)}) return false;
      const resolved = metro.resolver.resolveRequest({
        originModulePath: require('node:path').resolve('src/utils/tor.ts'),
        resolveRequest: () => ({ type: 'sourceFile', filePath: 'native-package' }),
      }, 'react-native-nitro-tor', 'macos');
      return resolved.filePath !== 'native-package';
    }
    console.log(JSON.stringify({
      packagePath,
      name: require(packagePath).name,
      version: require(packagePath).version,
      codegen: rnRequire('@react-native/codegen/package.json').version,
      screensIOS: config.dependencies['react-native-screens']?.platforms.ios,
      torExcluded: config.dependencies['react-native-nitro-tor']?.platforms.ios === null,
      torUsesShim: desktopTorShim(),
      corePath: require.resolve('react-native/Libraries/Core/InitializeCore'),
      metroPlatforms: metro.resolver.platforms,
      desktopTreeBlocked: metro.resolver.blockList.test(require('node:path').resolve('macos/node_modules/react/index.js')),
      mobileTreeBlocked: metro.resolver.blockList.test(require('node:path').resolve('node_modules/react/index.js')),
    }));
  `);
  return JSON.parse(execFileSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, BLIXT_PLATFORM: "" },
    encoding: "utf8",
  }));
}

test("desktop selection does not replace the root mobile runtime or codegen", () => {
  const mobileBefore = inspect(false);
  const desktop = inspect(true);
  const mobileAfter = inspect(false);
  assert.deepEqual(mobileBefore, mobileAfter);
  assert.equal(mobileBefore.name, "react-native");
  assert.equal(mobileBefore.version, manifest.dependencies["react-native"]);
  assert.equal(mobileBefore.codegen, manifest.dependencies["react-native"]);
  assert.equal(mobileBefore.screensIOS, undefined);
  assert.equal(mobileBefore.desktopTreeBlocked, true);
  assert.equal(mobileBefore.mobileTreeBlocked, false);
  assert.equal(desktop.desktopTreeBlocked, false);
  assert.equal(desktop.mobileTreeBlocked, true);
  assert.equal(desktop.name, "react-native-macos");
  assert.equal(desktop.version, require("../macos/package.json").dependencies["react-native-macos"]);
  assert.equal(desktop.codegen, "0.83.10");
  assert.equal(desktop.screensIOS, null);
  assert.equal(desktop.torExcluded, false);
  assert.equal(desktop.torUsesShim, false);
  assert.match(desktop.corePath, /macos\/node_modules\/react-native-macos\//);
  assert(desktop.metroPlatforms.includes("macos"));
  assert(mobileBefore.metroPlatforms.includes("ios"));
});

test("Babel selects the renderer-specific preset by Metro platform", () => {
  const babel = require("@babel/core");
  for (const platform of ["ios", "macos", "android", "ios"]) {
    const config = babel.loadPartialConfig({
      cwd: root,
      filename: path.join(root, "src/App.tsx"),
      caller: { name: "metro", platform },
    });
    const expected = platform === "macos"
      ? "../macos/node_modules/@react-native/babel-preset"
      : "@react-native/babel-preset";
    assert.equal(config.options.presets[0].file.resolved, require.resolve(expected));
    if (platform === "macos") {
      for (const plugin of config.options.plugins) {
        assert(plugin.file.resolved.startsWith(path.join(root, "macos/node_modules") + path.sep));
      }
    }
  }
});
