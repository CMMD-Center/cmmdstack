import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { scripts } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test("each test file runs in exactly one CI shard, so no file is left out or run twice", () => {
  const shards = Object.entries<string>(scripts).filter(([name]) => name.startsWith("test:"));
  assert.ok(shards.length > 1, "package.json defines the test:<shard> scripts that CI runs");
  const listed = shards.flatMap(([, command]) => command.match(/test\/\S+\.test\.ts/g) ?? []).sort();
  const onDisk = fs
    .readdirSync(path.join(root, "test"))
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => `test/${f}`)
    .sort();
  assert.deepEqual(listed, onDisk);
});
