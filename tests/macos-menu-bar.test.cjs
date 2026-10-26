const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("macOS menu bar preserves the window and applies the native setting", {
  skip: process.platform !== "darwin",
  timeout: 120000,
}, () => {
  const source = path.join(__dirname, "../macos/BlixtWallet/BlixtMenuBarController.swift");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "blixt-menu-bar-test-"));
  try {
    const swift = path.join(folder, "main.swift");
    const binary = path.join(folder, "smoke");
    fs.writeFileSync(swift, "import AppKit\n" +
      fs.readFileSync(path.join(__dirname, "macos-menu-bar-smoke.swift"), "utf8"));
    execFileSync("xcrun", ["swiftc", source, swift, "-o", binary], { timeout: 90000 });
    const output = execFileSync(binary, { encoding: "utf8", timeout: 20000 });
    assert.match(output, /PASS:/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

// SwiftUI's Window scene can terminate the process even when AppKit only hides
// a window. Exercise the real scene kind rather than just the window delegate.
test("SwiftUI stays alive after close and reopens the same window", {
  skip: process.platform !== "darwin", timeout: 120000,
}, () => {
  const app = fs.readFileSync(path.join(__dirname, "../macos/BlixtWallet/AppDelegate.swift"), "utf8");
  assert.match(app, /WindowGroup\("Blixt Wallet"/);
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "blixt-tray-swiftui-"));
  try {
    const binary = path.join(folder, "smoke");
    execFileSync("xcrun", ["swiftc", "-parse-as-library",
      path.join(__dirname, "../macos/BlixtWallet/BlixtMenuBarController.swift"),
      path.join(__dirname, "macos-menu-bar-swiftui-smoke.swift"), "-o", binary], { timeout: 90000 });
    for (const quit of ["0", "1"]) {
      const output = execFileSync(binary, { encoding: "utf8", timeout: 20000,
        env: { ...process.env, TRAY_SMOKE_QUIT: quit } });
      assert.match(output, /PASS: SwiftUI close and reopen/);
      assert.match(output, /PASS: explicit exit after reopen/);
    }
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
