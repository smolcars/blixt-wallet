const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const babel = require("@babel/core");

function load(file, imports) {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "..", file), {
    babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-typescript", "@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, module, module.exports);
  return module.exports;
}
function shim(platform, native) {
  return load("src/shims/notifee-react-native.js", {
    "react-native": { Platform: { OS: platform }, NativeModules: { BlixtNotifications: native } },
  }).default;
}

test("macOS permission checks are passive and preserve all authorization statuses", async () => {
  for (const status of [-1, 0, 1, 2]) {
    const api = shim("macos", {
      getNotificationSettings: async () => ({ authorizationStatus: status }),
      requestPermission: () => assert.fail("passive checks must not prompt"),
    });
    assert.deepEqual(await api.getNotificationSettings(), { authorizationStatus: status });
  }
});
test("permission request options and denial reach the caller", async () => {
  const api = shim("macos", {
    requestPermission: async (options) => {
      assert.deepEqual(options, { sound: false });
      return { authorizationStatus: 0 };
    },
  });
  assert.equal((await api.requestPermission({ sound: false })).authorizationStatus, 0);
});
test("macOS notification delivery forwards content, ID and sound choice", async () => {
  const calls = [];
  const api = shim("macos", {
    displayNotification: async (notification) => { calls.push(notification); return notification.id; },
  });
  assert.equal(await api.displayNotification({
    id: "payment", title: "Blixt", body: "Payment received",
    ios: { sound: "" }, android: { channelId: "common" },
  }), "payment");
  assert.deepEqual(calls, [{ id: "payment", title: "Blixt", body: "Payment received", sound: false }]);
  await api.displayNotification({ body: "Payment received" });
  assert.equal(calls[1].sound, true);
  await assert.rejects(api.displayNotification({ android: { asForegroundService: true } }),
    /Foreground services/);
});
test("native permission/delivery errors and missing builds are not reported as success", async () => {
  const failure = new Error("OS denied request");
  const api = shim("macos", {
    requestPermission: async () => { throw failure; },
    displayNotification: async () => { throw failure; },
  });
  await assert.rejects(api.requestPermission(), failure);
  await assert.rejects(api.displayNotification({ body: "Payment" }), failure);
  await assert.rejects(shim("macos").getNotificationSettings(), /Rebuild Blixt/);
});
test("web still reports notification permission unavailable without touching native code", async () => {
  const native = new Proxy({}, { get: () => assert.fail("web accessed native notifications") });
  const api = shim("web", native);
  assert.equal((await api.requestPermission()).authorizationStatus, 0);
  assert.equal((await api.getNotificationSettings()).authorizationStatus, 0);
});

function manager(platform, enabled, delivery) {
  const calls = { toasts: [], errors: [], checks: 0 };
  const model = load("src/state/NotificationManager.ts", {
    "easy-peasy": { thunk: fn => fn },
    "@notifee/react-native": { getNotificationSettings: async () => { calls.checks++; } },
    "../utils/constants": { PLATFORM: platform },
    "../utils/push-notification": { localNotification: delivery },
    "../utils": { toast: message => calls.toasts.push(message) },
    "./../utils/log": { __esModule: true, default: () => ({
      d() {}, i() {}, e: (...args) => calls.errors.push(args),
    }) },
  }).notificationManager;
  return { model, calls, helpers: { getStoreState: () => ({
    settings: { pushNotificationsEnabled: enabled },
  }) } };
}
test("hidden-window macOS payment events use native delivery and honor the stored toggle", async () => {
  for (const enabled of [false, true]) {
    const messages = [];
    const { model, calls, helpers } = manager("macos", enabled, async msg => messages.push(msg));
    await model.localNotification(null, { message: "Payment received" }, helpers);
    assert.deepEqual(messages, enabled ? ["Payment received"] : []);
    assert.deepEqual(calls.toasts, []);
    await model.initialize();
    assert.equal(calls.checks, 1);
  }
});
test("OS delivery rejection is caught by the event handler", async () => {
  const { model, calls, helpers } = manager("macos", true, async () => { throw new Error("Denied"); });
  await model.localNotification(null, { message: "Payment received" }, helpers);
  assert.equal(calls.errors.length, 1);
});

function toggle(enabled, platform, permission) {
  const ast = babel.parseSync(require("node:fs").readFileSync(
    path.resolve(__dirname, "../src/windows/Settings/Settings.tsx"), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript", "jsx"] },
  });
  let handler;
  babel.traverse(ast, { VariableDeclarator(p) {
    if (p.node.id.name === "onTogglePushNotificationsPress") handler = p.node.init;
  } });
  assert.ok(handler);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-typescript"] });
  const saved = [], messages = [];
  const fn = new Function("PLATFORM", "pushNotificationsEnabled", "notifee",
    "AuthorizationStatus", "changePushNotificationsEnabled", "toast",
    `return (${code.trim().replace(/;$/, "")});`)(platform, enabled,
    { requestPermission: permission }, { AUTHORIZED: 1, PROVISIONAL: 2 },
    async value => saved.push(value), message => messages.push(message));
  return { fn, saved, messages };
}
test("Settings enables notifications only after OS permission; disabling never prompts", async () => {
  for (const status of [-1, 0, 1, 2]) {
    const { fn, saved, messages } = toggle(false, "macos", async () => ({ authorizationStatus: status }));
    await fn();
    assert.deepEqual(saved, status > 0 ? [true] : []);
    assert.equal(messages.length, status > 0 ? 0 : 1);
  }
  const disabled = toggle(true, "macos", () => assert.fail("must not prompt when disabling"));
  await disabled.fn();
  assert.deepEqual(disabled.saved, [false]);
  const mobile = toggle(false, "ios", () => assert.fail("preserve mobile toggle behavior"));
  await mobile.fn();
  assert.deepEqual(mobile.saved, [true]);
});
test("Settings handles native permission errors without enabling the preference", async () => {
  const { fn, saved, messages } = toggle(false, "macos", async () => { throw new Error("Native failed"); });
  await fn();
  assert.deepEqual(saved, []);
  assert.deepEqual(messages, ["Native failed"]);
});
