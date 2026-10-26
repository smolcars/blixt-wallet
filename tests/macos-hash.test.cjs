const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

test("upstream JSHash computes SHA-256 in macOS Hermes", {
  skip: process.platform !== "darwin", timeout: 30000,
}, () => {
  const root = path.resolve(__dirname, "..");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "blixt-hash-"));
  try {
    const entry = path.join(folder, "entry.js");
    const bundle = path.join(folder, "hash.js");
    const inputs = ["", "abc", "Blixt ⚡ 日本語", "x".repeat(1024)];
    const vectors = inputs.map(input => [input,
      crypto.createHash("sha256").update(input, "utf8").digest("hex")]);
    fs.writeFileSync(entry, [
      `import JSHash from ${JSON.stringify(path.join(root, "macos/node_modules/react-native-hash/JSHash/JSHash.js"))};`,
      `import CONSTANTS from ${JSON.stringify(path.join(root, "macos/node_modules/react-native-hash/Constants.js"))};`,
      `(async () => {
        for (const [input, expected] of ${JSON.stringify(vectors)}) {
          const actual = await JSHash(input, CONSTANTS.HashAlgorithms.sha256);
          if (actual !== expected) throw new Error("SHA-256 mismatch");
        }
        print("PASS: upstream JSHash");
      })().catch(error => { print(String(error)); });`,
    ].join("\n"));
    execFileSync("bun", ["build", entry, "--target=browser", "--outfile", bundle]);
    const transformed = require("@babel/core").transformFileSync(bundle, {
      babelrc: false, configFile: false,
      presets: [[path.join(root, "macos/node_modules/@react-native/babel-preset"), { enableBabelRuntime: false }]],
    });
    fs.writeFileSync(bundle, transformed.code);
    const output = execFileSync(path.join(root, "macos/Pods/hermes-engine/destroot/bin/hermes"),
      [bundle], { encoding: "utf8" });
    assert.match(output, /PASS: upstream JSHash/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
