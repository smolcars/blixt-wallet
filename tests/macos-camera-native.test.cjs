const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('macOS native scanner decodes QR frames once and cancels stale results', {
  skip: process.platform !== 'darwin', timeout: 120000,
}, () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'blixt-camera-test-'));
  try {
    const binary = path.join(folder, 'camera-test');
    execFileSync('xcrun', ['clang++', '-fobjc-arc', '-fblocks', '-std=c++20', '-mmacosx-version-min=14.0',
      path.join(__dirname, '../macos/camera/native/BlixtCameraPreview.mm'),
      path.join(__dirname, 'macos-camera-native.mm'),
      '-framework', 'AppKit', '-framework', 'AVFoundation', '-framework', 'Vision',
      '-framework', 'CoreImage', '-framework', 'CoreMedia', '-framework', 'CoreVideo', '-framework', 'QuartzCore',
      '-o', binary], { timeout: 90000 });
    assert.match(execFileSync(binary, { encoding: 'utf8', timeout: 20000 }), /PASS: real Vision QR decoding/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
