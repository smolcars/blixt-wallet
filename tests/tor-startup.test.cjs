const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const babel = require("@babel/core");

function load(start) {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../src/utils/tor.ts"), {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-typescript", "@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => {
    assert.equal(name, "react-native-nitro-tor");
    return { Tor: { daemon: { start } } };
  }, module, module.exports);
  return module.exports.startTorForLnd;
}

const config = { dataDirectory: "/tmp/tor-test", socksPort: 9056, bootstrapTimeoutMs: 30000 };

test("LND uses the endpoints returned by NitroTor 1.0", async () => {
  const start = load(async (received) => {
    assert.deepEqual(received, config);
    return { state: "running", socksAddress: "127.0.0.1:19056", controlAddress: "127.0.0.1:49152" };
  });
  assert.equal(await start(config),
    "--tor.active --tor.socks=127.0.0.1:19056 --tor.v3 --tor.control=127.0.0.1:49152 --listen=localhost ");
});

test("Tor errors propagate to the existing explicit fallback prompt", async () => {
  const error = Object.assign(new Error("Bootstrap timed out"), { code: "BOOTSTRAP_TIMEOUT" });
  const start = load(async () => { throw error; });
  await assert.rejects(start(config), (received) => received === error);
});
