const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { generate } = require("../scripts/sync-macos-package.cjs");
const root = require("../package.json");
const overrides = require("../macos/dependency-overrides.json");

test("shared dependency changes propagate while explicit desktop overrides stay fixed", () => {
  const changed = structuredClone(root);
  changed.dependencies["shared-example"] = "2.0.0";
  changed.devDependencies["shared-tool"] = "3.0.0";
  changed.dependencies["react-native"] = "0.99.0";
  changed.scripts.postinstall = "do-not-inherit-mobile-script";
  const desktop = generate(changed, overrides);
  assert.equal(desktop.dependencies["shared-example"], "2.0.0");
  assert.equal(desktop.devDependencies["shared-tool"], "3.0.0");
  assert.equal(desktop.dependencies["react-native"], "0.83.10");
  assert.equal(desktop.dependencies["react-native-screens"], "4.25.0");
  assert.equal(desktop.codegenConfig.jsSrcsDir, "../src/turbomodules");
  assert.equal(root.codegenConfig.jsSrcsDir, "src/turbomodules");
  assert.match(desktop.scripts.postinstall, /--targets=macos/);
  assert.equal(desktop.patchedDependencies["react-native-svg@15.15.5"], "../patches/react-native-svg@15.15.5.patch");
  delete changed.dependencies["shared-example"];
  assert.equal(generate(changed, overrides).dependencies["shared-example"], undefined);
});

test("sync check detects drift and regeneration repairs it without desktop dependencies installed", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "blixt-manifest-"));
  try {
    fs.mkdirSync(path.join(temp, "scripts"));
    fs.mkdirSync(path.join(temp, "macos"));
    fs.copyFileSync(path.resolve(__dirname, "../scripts/sync-macos-package.cjs"), path.join(temp, "scripts/sync-macos-package.cjs"));
    fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify(root));
    fs.writeFileSync(path.join(temp, "macos/dependency-overrides.json"), JSON.stringify(overrides));
    const run = (...args) => spawnSync(process.execPath, ["scripts/sync-macos-package.cjs", ...args], { cwd: temp, encoding: "utf8" });
    assert.equal(run().status, 0);
    assert.equal(run("--check").status, 0);
    const changed = structuredClone(root);
    changed.dependencies["shared-example"] = "2.0.0";
    fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify(changed));
    const stale = run("--check");
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /macos\/package.json is stale/);
    assert.equal(run().status, 0);
    assert.equal(run("--check").status, 0);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
