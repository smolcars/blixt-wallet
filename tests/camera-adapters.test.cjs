const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');

function effect(file, marker, bindings) {
  const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, '../src/components', file), 'utf8'), {
    babelrc: false, configFile: false, parserOpts: { plugins: ['typescript', 'jsx'] },
  });
  let handler;
  babel.traverse(ast, { CallExpression(p) {
    if (p.node.callee.name === 'useEffect' && JSON.stringify(p.node.arguments[0]).includes(`"name":"${marker}"`)) handler = p.node.arguments[0];
  } });
  assert(handler);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-typescript'] });
  return new Function(...Object.keys(bindings), `return (${code.trim().replace(/;$/, '')});`)(...Object.values(bindings));
}
const flush = () => new Promise(resolve => setImmediate(resolve));

function webHarness() {
  let resolve;
  let onScan;
  let stopped = 0;
  const reads = [];
  const controls = { stop: () => stopped++ };
  const bindings = {
    start: true, isActive: true, direction: 'back', retry: 0,
    controlsRef: { current: null }, videoRef: { current: {} }, lastScannedTextRef: { current: '' },
    callbacks: { current: { onRead: value => reads.push(value) } },
    onNotAuthorizedCalledRef: { current: false }, setCameraUnavailable: () => {},
    window: { isSecureContext: true }, navigator: { mediaDevices: { getUserMedia() {} } },
    SCANNER_OPTIONS: {}, getConstraints: () => ({}), isConstraintError: () => false,
    BrowserQRCodeReader: class { decodeFromConstraints(_, __, callback) {
      onScan = callback; return new Promise(done => { resolve = done; });
    } },
  };
  return { bindings, reads, controls, stopped: () => stopped,
    run: effect('Camera.web.tsx', 'reader', bindings),
    resolve: () => resolve(controls), scan: value => onScan({ getText: () => value }, null, controls) };
}

test('web closes a stream acquired after cleanup without replacing a newer session', async () => {
  const h = webHarness();
  const cleanup = h.run(); cleanup();
  const newer = { stop: () => assert.fail('must not stop the new stream') };
  h.bindings.controlsRef.current = newer;
  h.resolve(); await flush();
  assert.equal(h.stopped(), 1);
  assert.equal(h.bindings.controlsRef.current, newer);
});

test('web uses the latest scan callback without restarting capture and suppresses duplicate codes', async () => {
  const h = webHarness(); const cleanup = h.run();
  h.resolve(); await flush();
  h.bindings.callbacks.current.onRead = value => h.reads.push('new:' + value);
  h.scan('invoice'); h.scan('invoice');
  assert.deepEqual(h.reads, ['new:invoice']);
  cleanup(); h.scan('late');
  assert.deepEqual(h.reads, ['new:invoice']);
  assert.ok(h.stopped() >= 1);
});

for (const cancelled of [false, true]) {
  test(`mobile permission response ${cancelled ? 'after cleanup is ignored' : 'is awaited before reporting denial'}`, async () => {
    let complete;
    let timer;
    const events = [];
    const run = effect('Camera.tsx', 'requestPermission', {
      hasPermission: false,
      requestPermission: () => new Promise(resolve => { complete = resolve; }),
      setDenied: denied => events.push(['denied', denied]),
      callbacks: { current: { onNotAuthorized: () => events.push(['notAuthorized']) } },
      setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => {},
    });
    const cleanup = run(); timer();
    assert.deepEqual(events, []);
    if (cancelled) cleanup();
    complete(false); await flush();
    assert.deepEqual(events, cancelled ? [] : [['denied', true], ['notAuthorized']]);
  });
}
