const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function adapter(name) {
  const filename = path.resolve(__dirname, "../src/platform/macos", `${name}.js`);
  const { code } = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => (id === "./unavailable" ? adapter("unavailable") : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}

test("macOS SHA-256 adapter preserves UTF-8 hashing", async () => {
  const { JSHash, CONSTANTS } = adapter("hash");
  for (const input of ["", "abc", "Blixt ⚡ 日本語"]) {
    assert.equal(
      await JSHash(input, CONSTANTS.HashAlgorithms.sha256),
      crypto.createHash("sha256").update(input, "utf8").digest("hex"),
    );
  }
  await assert.rejects(JSHash("abc", "unsupported"), /Unsupported hash/);
});

test("unavailable desktop services cannot report successful security or backup operations", async () => {
  const permissions = adapter("permissions");
  assert.equal(await permissions.request("location"), permissions.RESULTS.UNAVAILABLE);
  assert.equal((await permissions.requestNotifications()).status, permissions.RESULTS.UNAVAILABLE);
  await assert.rejects(adapter("fingerprint").default.authenticate(), /unavailable/);
  await assert.rejects(adapter("icloud").default.setItem("backup", "test"), /unavailable/);
  await assert.rejects(adapter("documents").pick(), /unavailable/);
  assert.equal((await adapter("tor").RnTor.startTorIfNotRunning()).is_success, false);
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
