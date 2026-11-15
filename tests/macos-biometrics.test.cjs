const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const babel = require('@babel/core');

function adapter(native) {
  const { code } = babel.transformFileSync(path.join(__dirname, '../macos/biometrics/src/index.js'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => native, module, module.exports);
  return module.exports.default;
}

test('Touch ID adapter only resolves an explicit successful match', async () => {
  for (const result of [false, null, undefined, 'true']) {
    await assert.rejects(adapter({ authenticate: async () => result }).authenticate(), { name: 'AuthenticationFailed' });
  }
  assert.equal(await adapter({ authenticate: async () => true }).authenticate(), true);
});

test('Touch ID adapter exposes availability and forwards prompt options', async () => {
  const scanner = adapter({
    isSensorAvailable: async () => 'Touch ID',
    authenticate: async (reason, fallback) => {
      assert.equal(reason, 'Confirm security settings');
      assert.equal(fallback, false);
      return true;
    },
  });
  assert.equal(await scanner.isSensorAvailable(), 'Touch ID');
  assert.equal(await scanner.authenticate({ description: 'Confirm security settings', fallbackEnabled: false }), true);
});

test('shared authentication calls enable the system password fallback', async () => {
  const scanner = adapter({ authenticate: async (_, fallback) => {
    assert.equal(fallback, true);
    return true;
  } });
  await scanner.authenticate();
  await scanner.authenticate({ onAttempt: () => {} });
});

test('Touch ID errors preserve names consumed by the shared authentication flow', async () => {
  for (const name of ['UserCancel', 'UserFallback', 'DeviceLockedPermanent', 'FingerprintScannerNotEnrolled']) {
    const fail = async () => { throw { code: name, message: 'Test error' }; };
    const scanner = adapter({ authenticate: fail, isSensorAvailable: fail });
    await assert.rejects(scanner.authenticate(), { name, message: 'Test error' });
    await assert.rejects(scanner.isSensorAvailable(), { name });
  }
});

test('release or a newer attempt invalidates a pending JS success', async () => {
  for (const replace of [false, true]) {
    const resolves = [];
    let cancelled = 0;
    const scanner = adapter({ authenticate: () => new Promise(resolve => resolves.push(resolve)), cancel: () => cancelled++ });
    const first = scanner.authenticate();
    const rejected = assert.rejects(first, { name: 'UserCancel' });
    const second = replace ? scanner.authenticate() : scanner.release();
    resolves[0](true);
    await rejected;
    if (replace) { resolves[1](true); assert.equal(await second, true); }
    else assert.equal(cancelled, 1);
  }
});

test('native Touch ID controller enforces policy and cancels stale results', {
  skip: process.platform !== 'darwin', timeout: 120000,
}, () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'blixt-touchid-test-'));
  try {
    const binary = path.join(folder, 'test');
    execFileSync('xcrun', ['clang++', '-fobjc-arc', '-fblocks', '-std=c++20', '-mmacosx-version-min=14.0',
      path.join(__dirname, '../macos/biometrics/native/BlixtBiometricsController.mm'),
      path.join(__dirname, 'macos-biometrics-native.mm'),
      '-framework', 'Foundation', '-framework', 'LocalAuthentication', '-o', binary], { timeout: 90000 });
    assert.match(execFileSync(binary, { encoding: 'utf8', timeout: 20000 }), /PASS: biometric policy/);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
