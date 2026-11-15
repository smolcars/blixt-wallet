const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const test = require("node:test");
const babel = require("@babel/core");

// Execute the actual UI callbacks with mocked native/RPC boundaries. Never load
// the store or send restore requests to a running wallet in these tests.
function callback(file, name, bindings) {
  const ast = babel.parseSync(fs.readFileSync(path.resolve(__dirname, "../src/windows", file), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript", "jsx"] },
  });
  let handler;
  babel.traverse(ast, { VariableDeclarator(p) {
    if (p.node.id.name === name) handler = p.node.init;
  } });
  assert(handler, name);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, {
    babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-typescript"],
  });
  return new Function(...Object.keys(bindings), `return (${code.trim().replace(/;$/, "")});`)(...Object.values(bindings));
}

const cases = [
  ["Settings/Settings.tsx", "onVerifyChannelsBackupPress", "verify"],
  ["Settings/PowerUserTools.tsx", "onPressRestoreChannelBackup", "restore"],
  ["Welcome/Restore.tsx", "pickChannelsExportFile", "welcome"],
];
const bytes = Buffer.from([0, 255, 1, 128, 10, 13]);
const encoded = bytes.toString("base64");

function bindings(selected, events) {
  return {
    PLATFORM: "macos",
    NativeBlixtTools: { macosOpenFileDialog: async () => {
      events.push(["open"]);
      if (selected instanceof Error) throw selected;
      return selected;
    } },
    pick: async () => { throw new Error("Mobile picker must not run on macOS"); },
    readFile: async () => { throw new Error("Native picker already returned file contents"); },
    base64Decode: (value) => Buffer.from(value, "base64"),
    verifyChanBackup: async (request) => events.push(["verify", request]),
    restoreChannelBackups: async (request) => events.push(["restore", request]),
    create: (_, value) => value,
    RestoreChanBackupRequestSchema: {},
    setMacosBakBase64: (value) => events.push(["contents", value]),
    setBackupType: (value) => events.push(["type", value]),
    Alert: { alert: (...args) => events.push(["alert", ...args]) },
    toast: (...args) => events.push(["toast", ...args]),
    console: { log() {} },
  };
}

for (const [file, name, kind] of cases) {
  for (const cancelled of [null, undefined]) {
    test(`${kind}: macOS cancel (${cancelled}) leaves state and RPCs untouched`, async () => {
      const events = [];
      await callback(file, name, bindings(cancelled, events))();
      assert.deepEqual(events, [["open"]]);
    });
  }
  test(`${kind}: selected binary backup reaches the correct consumer`, async () => {
    const events = [];
    await callback(file, name, bindings(encoded, events))();
    if (kind === "welcome") {
      assert.deepEqual(events, [["open"], ["contents", encoded], ["type", "macos"]]);
    } else if (kind === "verify") {
      assert.deepEqual(events, [["open"], ["verify", { multiChanBackup: { multiChanBackup: bytes } }],
        ["alert", "Channel backup file is valid"]]);
    } else {
      assert.deepEqual(events, [["open"], ["restore", { backup: { case: "multiChanBackup", value: bytes } }]]);
    }
  });
  test(`${kind}: file errors are surfaced without applying a backup`, async () => {
    const events = [];
    await callback(file, name, bindings(new Error("File cannot be read"), events))();
    assert.equal(events.length, 2);
    assert(["alert", "toast"].includes(events[1][0]));
    assert(events[1].some((value) => typeof value === "string" && value.includes("File cannot be read")));
  });
}

for (const platform of ["ios", "android"]) {
  for (const [file, name, kind] of cases.slice(0, 2)) {
    test(`${kind}: ${platform} retains its picker and file-reading path`, async () => {
      const events = [];
      const mocks = bindings(null, events);
      mocks.PLATFORM = platform;
      mocks.NativeBlixtTools.macosOpenFileDialog = async () => assert.fail("Unexpected macOS dialog");
      mocks.pick = async () => [{ uri: "file:///tmp/backup%20file.dat" }];
      mocks.readFile = async (uri, encoding) => {
        assert.equal(uri, platform === "ios" ? "file:///tmp/backup file.dat" : "file:///tmp/backup%20file.dat");
        assert.equal(encoding, kind === "restore" && platform === "ios" ? undefined : "base64");
        return encoded;
      };
      await callback(file, name, mocks)();
      assert.equal(events[0][0], kind);
      assert.deepEqual(kind === "verify" ? events[0][1].multiChanBackup.multiChanBackup : events[0][1].backup.value, bytes);
    });
  }
}
