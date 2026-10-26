const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

// Load the real translation setup and restart helper, without loading a wallet.
function harness(platform) {
  const alerts = [];
  const cache = new Map();
  const unexpected = () => assert.fail('A restart notice must not stop or restart the wallet');
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file, babelrc: false, configFile: false,
      plugins: ['@babel/plugin-transform-typescript', '@babel/plugin-transform-modules-commonjs'],
    });
    const localRequire = name => {
      if (name === '../storage/app') return { getItemObject: async () => null, StorageItem: { language: 'language' } };
      if (name === './constants') return { PLATFORM: platform, IS_ELECTROBUN: false };
      if (name === './alert') return { Alert: { alert: (...args) => alerts.push(args) } };
      if (name === 'react-native-turbo-lnd') return { stopDaemon: unexpected };
      if (name === '../turbomodules/NativeBlixtTools') return { restartApp: unexpected };
      if (name === '../turbomodules/NativeLndmobileTools') return { getStatus: unexpected };
      if (name === '.') return { timeout: unexpected };
      if (name.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), name);
        return name.endsWith('.json') ? require(resolved) : load(resolved + '.ts');
      }
      return require(name);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  const root = path.resolve(__dirname, '../src');
  const { i18n } = load(path.join(root, 'i18n/i18n.ts'));
  const restart = load(path.join(root, 'utils/restart-app.ts'));
  return { alerts, i18n, restart };
}

for (const platform of ['macos', 'ios']) {
  test(`${platform}: restart notice uses the app's initialized translations and current language`, async () => {
    const { alerts, i18n, restart } = harness(platform);
    for (const language of ['en', 'sv']) {
      await i18n.changeLanguage(language);
      await restart.restartAppOrNotify();
      const [title, message] = alerts.at(-1);
      const expected = require(`../locales/${language}.json`)['settings.settings'].bitcoinNetwork.restartDialog;
      assert.equal(title, expected.title);
      assert.equal(message, expected.msg);
      assert.ok(title.length > 0 && message.length > 0);
    }
  });
}
