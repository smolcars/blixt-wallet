const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function shim(name) {
  const filename = path.resolve(__dirname, "../src/shims", `${name}.js`);
  const { code } = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => id === "react-native" ? { Platform: { OS: "web" }, NativeModules: {} }
      : (id === "./unavailable" ? shim("unavailable") : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}

test("unavailable desktop services cannot report successful security or backup operations", async () => {
  const permissions = shim("react-native-permissions");
  assert.equal(await permissions.request("location"), permissions.RESULTS.UNAVAILABLE);
  assert.equal((await permissions.requestNotifications()).status, permissions.RESULTS.UNAVAILABLE);
  await assert.rejects(shim("react-native-fingerprint-scanner").default.authenticate(), /unavailable/);
  await assert.rejects(shim("react-native-icloudstore").default.setItem("backup", "test"), /unavailable/);
  await assert.rejects(shim("react-native-documents-picker").pick(), /unavailable/);
  await assert.rejects(shim("react-native-nitro-tor").Tor.daemon.start(), /unavailable/);
  const documents = shim("react-native-documents-picker");
  await assert.rejects(documents.keepLocalCopy({ files: [] }), /unavailable/);
  await assert.rejects(documents.default.pickSingle(), /unavailable/);
  assert.equal(documents.isCancel(new Error("File import unavailable")), false);
  assert.equal(documents.isCancel({ code: documents.errorCodes.OPERATION_CANCELED }), true);
  assert.deepEqual(await permissions.checkMultiple([]), {});
  assert.deepEqual(await permissions.requestMultiple(["location", "camera"]), {
    location: permissions.RESULTS.UNAVAILABLE,
    camera: permissions.RESULTS.UNAVAILABLE,
  });
  await assert.rejects(permissions.checkLocationAccuracy(), /unavailable/);
  const cloud = shim("react-native-icloudstore").default;
  await assert.rejects(cloud.getItem("backup"), /unavailable/);
  await assert.rejects(cloud.removeItem("backup"), /unavailable/);
  const notifications = shim("notifee-react-native");
  assert.equal((await notifications.default.requestPermission()).authorizationStatus,
    notifications.AuthorizationStatus.DENIED);

});

test("macOS keychain names are isolated while mobile credential names stay unchanged", async () => {
  const filename = path.resolve(__dirname, "../src/storage/keystore.ts");
  const { code } = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-typescript", "@babel/plugin-transform-modules-commonjs"],
  });
  for (const [platform, applicationId] of [
    ["macos", "com.blixtwallet.test"],
    ["macos", "com.blixtwallet"],
    ["macos", "com.blixtwallet.debug"],
    ["macos", "com.blixtwallet.regtest"],
    ["macos", "com.blixtwallet.regtest.debug"],
    ["ios", "com.blixtwallet"],
    ["android", "com.blixtwallet"],
  ]) {
    const keys = [];
    const keychain = {
      ACCESSIBLE: { ALWAYS: "always" },
      setInternetCredentials: async (key) => keys.push(key),
      getInternetCredentials: async (key) => {
        keys.push(key);
        return { password: "probe" };
      },
      resetInternetCredentials: async (key) => keys.push(key),
    };
    const module = { exports: {} };
    new Function("require", "module", "exports", code)(
      (id) => {
        if (id === "react-native-keychain") return keychain;
        if (id === "react-native") return { Platform: { OS: platform } };
        if (id === "../turbomodules/NativeBlixtTools")
          return { getApplicationId: () => applicationId };
        throw new Error(`Unexpected import: ${id}`);
      },
      module,
      module.exports,
    );
    await module.exports.setWalletPassword("probe");
    assert.equal(await module.exports.getWalletPassword(), "probe");
    await module.exports.removeItem("password");
    const expected = platform === "macos" && applicationId === "com.blixtwallet.test" ? `${applicationId}:password` : "password";
    assert.deepEqual(keys, [expected, expected, expected]);
  }
});
