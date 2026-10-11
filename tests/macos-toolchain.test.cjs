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
    const config = require('./react-native.config');
    const metro = require('./metro.config');
    console.log(JSON.stringify({
      packagePath,
      name: require(packagePath).name,
      version: require(packagePath).version,
      codegen: rnRequire('@react-native/codegen/package.json').version,
      screensIOS: config.dependencies['react-native-screens']?.platforms.ios,
      corePath: require.resolve('react-native/Libraries/Core/InitializeCore'),
      metroPlatforms: metro.resolver.platforms,
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
  assert.equal(desktop.name, "react-native-macos");
  assert.equal(desktop.version, manifest.dependencies["react-native-macos"]);
  assert.equal(desktop.codegen, "0.83.10");
  assert.equal(desktop.screensIOS, null);
  assert.match(desktop.corePath, /node_modules\/react-native-macos\//);
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
      ? "@blixt/macos-babel-preset"
      : "@react-native/babel-preset";
    assert.equal(config.options.presets[0].file.resolved, require.resolve(expected));
  }
});
