const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

// Execute production callbacks with mocked storage/native boundaries.
function callback(file, name, bindings) {
  const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript", "jsx"] },
  });
  let handler;
  babel.traverse(ast, {
    ObjectProperty(p) {
      if (p.node.key.name === name) handler = p.node.value.arguments[0];
    },
    VariableDeclarator(p) {
      if (p.node.id.name === name) handler = p.node.init;
    },
  });
  assert(handler, name);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, {
    babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-typescript"],
  });
  return new Function(...Object.keys(bindings), `return (${code.trim().replace(/;$/, "")});`)(...Object.values(bindings));
}
const StorageItem = { persistentServicesEnabled: "persistent" };

test("Persistent Mode persists before updating state, and preserves state on write failure", async () => {
  for (const enabled of [true, false]) {
    const events = [];
    await callback("src/state/Settings.ts", "changePersistentServicesEnabled", {
      StorageItem, setItemObject: async (key, value) => events.push(["write", key, value]),
    })({ setPersistentServicesEnabled: value => events.push(["state", value]) }, enabled);
    assert.deepEqual(events, [["write", "persistent", enabled], ["state", enabled]]);
  }
  await assert.rejects(callback("src/state/Settings.ts", "changePersistentServicesEnabled", {
    StorageItem, setItemObject: async () => { throw new Error("write failed"); },
  })({ setPersistentServicesEnabled: () => assert.fail("must not update state") }, true), /write failed/);
});

test("Persistent Mode reads its own preference and defaults off", async () => {
  for (const value of [true, false, undefined]) {
    const read = callback("src/storage/app.ts", "getPersistentServicesEnabled", {
      StorageItem,
      getItemObject: async key => {
        assert.equal(key, "persistent");
        return value;
      },
    });
    assert.equal(await read(), value ?? false);
  }
});

test("toggle requests restart only on Android, and reports persistence errors", async () => {
  for (const platform of ["android", "macos"]) {
    for (const fails of [false, true]) {
      const events = [];
      await callback("src/windows/Settings/Settings.tsx", "changePersistentServicesEnabledPress", {
        PLATFORM: platform, persistentServicesEnabled: false,
        changePersistentServicesEnabled: async enabled => {
          events.push(["change", enabled]);
          if (fails) throw new Error("write failed");
        },
        restartNeeded: () => events.push(["restart"]),
        toast: message => events.push(["toast", message]),
      })();
      assert.deepEqual(events, [["change", true],
        ...(fails ? [["toast", "write failed"]] : platform === "android" ? [["restart"]] : [])]);
    }
  }
});
