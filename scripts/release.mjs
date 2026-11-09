#!/usr/bin/env node
// Usage: node scripts/release.mjs 0.2.0
// Bumps every manifest and the tip sheet's version label, rebuilds the tip sheet and the Sidekick
// flow diagram, runs the check,
// commits and tags vX.Y.Z. Push the tag to publish.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("usage: node scripts/release.mjs <major.minor.patch>");
  process.exit(2);
}
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
if (execFileSync("git", ["status", "--porcelain"], { cwd: root }).toString().trim()) {
  console.error("working tree is dirty; commit or drop changes first");
  process.exit(1);
}
const manifests = [".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".github/plugin/plugin.json", ".muse-plugin/plugin.json"]
  .filter((f) => existsSync(join(root, f)));
for (const f of manifests) {
  const path = join(root, f);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.version = version;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}
const sheet = join(root, "docs", "tip-sheet.src.html");
writeFileSync(sheet, readFileSync(sheet, "utf8").replace(/v\d+\.\d+\.\d+/g, `v${version}`));
const touched = [...manifests, "docs"];
try {
  run("node", ["scripts/build-tip-sheet.mjs"]);
  run("node", ["scripts/build-flow.mjs"]);
  run("node", ["scripts/check.mjs"]);
} catch {
  run("git", ["checkout", "--", ...touched]);
  console.error("build or check failed; manifests and docs restored, nothing committed or tagged");
  process.exit(1);
}
run("git", ["add", ...touched]);
run("git", ["commit", "-m", `release: v${version}`]);
run("git", ["tag", "-a", `v${version}`, "-m", `cmmdstack v${version}`]);
console.log(`tagged v${version}. Publish with: git push origin main v${version}`);
