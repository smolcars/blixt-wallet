const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, '../src/windows/Send/SendCamera.tsx'), 'utf8'), {
  babelrc: false, configFile: false, parserOpts: { plugins: ['typescript', 'jsx'] },
});
const cameraAst = babel.parseSync(fs.readFileSync(path.join(__dirname, '../src/components/Camera.macos.tsx'), 'utf8'), {
  babelrc: false, configFile: false, parserOpts: { plugins: ['typescript', 'jsx'] },
});
function callback(name, bindings) {
  let handler;
  babel.traverse(['permissionEffect', 'nativeChooseCamera'].includes(name) ? cameraAst : ast, {
    VariableDeclarator(p) { if (p.node.id.name === (name === 'nativeChooseCamera' ? 'chooseCamera' : name)) handler = p.node.init; },
    CallExpression(p) {
      if (name === 'permissionEffect' && p.node.callee.name === 'useEffect' && !handler) handler = p.node.arguments[0];
    },
  });
  assert(handler, name);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-typescript'] });
  return new Function(...Object.keys(bindings), `return (${code.trim().replace(/;$/, '')});`)(...Object.values(bindings));
}
function harness(evaluate) {
  const events = [];
  const bindings = {
    focusedRef: { current: true }, mountedRef: { current: true }, busyRef: { current: false }, rpcReady: true,
    setBusy: value => events.push(['busy', value]),
    setPaused: value => events.push(['paused', value]),
    evaluateLightningCode: evaluate,
    navigation: { replace: (...args) => events.push(['replace', ...args]) },
    gotoLnurl: screen => events.push(['lnurl', screen]),
    toast: message => events.push(['error', message]),
  };
  return { bindings, events, scan: callback('tryInvoice', bindings) };
}

test('Send scanner synchronously rejects duplicate frames while evaluating', async () => {
  let finish;
  let calls = 0;
  const h = harness(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = h.scan(() => 'invoice', 'QR scan error');
  await h.scan(() => assert.fail('must not read second frame'), 'QR scan error');
  await Promise.resolve();
  assert.equal(calls, 1);
  finish('BOLT11');
  await first;
  assert.deepEqual(h.events.filter(event => event[0] === 'replace'), [['replace', 'Send', { screen: 'SendConfirmation' }]]);
});

for (const [result, screen] of [
  ['LNURLAuthRequest', 'AuthRequest'], ['LNURLChannelRequest', 'ChannelRequest'],
  ['LNURLPayRequest', 'PayRequest'], ['LNURLWithdrawRequest', 'WithdrawRequest'],
]) {
  test(`Send scanner routes ${result} through the existing LNURL flow`, async () => {
    const h = harness(async () => result);
    await h.scan(() => 'code', 'QR scan error');
    assert.ok(h.events.some(event => event[0] === 'lnurl' && event[1] === screen));
  });
}

test('invalid QR and evaluation errors release the busy gate and keep scanning paused for retry', async () => {
  for (const throws of [false, true]) {
    const h = harness(async () => { if (throws) throw new Error('invalid QR'); return null; });
    await h.scan(() => 'invalid', 'QR scan error');
    assert.equal(h.bindings.busyRef.current, false);
    assert.deepEqual(h.events.at(-1), ['busy', false]);
    assert.deepEqual(h.events.filter(e => e[0] === 'paused'), [['paused', true]]);
    assert.ok(!h.events.some(e => e[0] === 'replace' || e[0] === 'lnurl'));
  }
});

test('leaving Send during evaluation prevents navigation and restores busy state for a later visit', async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.scan(() => 'invoice', 'QR scan error');
  await Promise.resolve();
  h.bindings.focusedRef.current = false;
  finish('BOLT11');
  await pending;
  assert.ok(!h.events.some(e => e[0] === 'replace'));
  assert.deepEqual(h.events.at(-1), ['busy', false]);
});

function permissionHarness(requestPermission) {
  const events = [];
  const bindings = {
    focused: true, onNotAuthorizedRef: { current: undefined },
    NativeCamera: { requestPermission, getDevices: async () => { events.push(['devices']); return []; } },
    setError: value => events.push(['error', value]),
    setPermission: value => events.push(['permission', value]),
    setDevices: value => events.push(['list', value]),
    setDeviceID: () => {},
  };
  return { events, run: callback('permissionEffect', bindings) };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('denied permission produces an actionable error and does not access cameras', async () => {
  const h = permissionHarness(async () => false);
  h.run(); await flush();
  assert.ok(h.events.some(e => e[0] === 'error' && e[1]?.includes('System Settings')));
  assert.ok(!h.events.some(e => e[0] === 'devices'));
});

test('permission completion after leaving Send does not start discovery or update state', async () => {
  let finish;
  const h = permissionHarness(() => new Promise(resolve => { finish = resolve; }));
  const cancel = h.run();
  const before = [...h.events];
  cancel(); finish(true); await flush();
  assert.deepEqual(h.events, before);
});

test('no attached camera leaves the Send screen usable with a retry message', async () => {
  const h = permissionHarness(async () => true);
  h.run(); await flush();
  assert.ok(h.events.some(e => e[0] === 'error' && e[1]?.includes('No camera found')));
});

test('camera chooser suspends scanning until selection or cancellation finishes', async () => {
  let close;
  const events = [];
  const bindings = {
    focusedRef: { current: true }, mountedRef: { current: true }, busyRef: { current: false },
    setBusy: value => events.push(['busy', value]),
    cameraRef: { current: { switchCamera: () => new Promise(resolve => { close = resolve; }) } },
    setPaused: () => {}, toast: () => {},
  };
  const pending = callback('chooseCamera', bindings)();
  await flush();
  assert.equal(bindings.busyRef.current, true);
  assert.deepEqual(events, [['busy', true]]);
  close(); await pending;
  assert.equal(bindings.busyRef.current, false);
  assert.deepEqual(events.at(-1), ['busy', false]);
});


test('macOS camera switching retries permission instead of clearing the denied state', async () => {
  let retries = 0;
  await callback('nativeChooseCamera', {
    focusedRef: { current: true }, permission: false,
    setRetry: update => { retries = update(retries); },
    NativeCamera: { getDevices: () => assert.fail('permission must be obtained first') },
  })();
  assert.equal(retries, 1);
});

test('macOS adapter selects the native device without owning Send navigation', async () => {
  const events = [];
  await callback('nativeChooseCamera', {
    focusedRef: { current: true }, permission: true,
    NativeCamera: { getDevices: async () => [{ id: 'usb', name: 'USB camera' }] },
    setDevices: () => {}, setDeviceID: id => events.push(['device', id]),
    setError: value => events.push(['error', value]),
    Alert: { promiseAlert: async (_, __, buttons) => { buttons[0].onPress(); } },
  })();
  assert.deepEqual(events, [['device', 'usb'], ['error', null]]);
});
