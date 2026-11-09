// Reads assets/tokens.css into { light, dark } maps of custom properties, so scripts and video
// renderers use the same values as CSS. `node tokens.mjs` prints them as JSON; cmmdstack's
// scripts/check.mjs compares that with assets/tokens.json.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TOKENS_CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "tokens.css");

function props(block) {
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  return out;
}

export function readTokens(css = readFileSync(TOKENS_CSS, "utf8")) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const light = text.slice(text.indexOf(":root {"), text.indexOf("@media"));
  const dark = text.slice(text.indexOf("@media"));
  return { light: props(light), dark: props(dark) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(readTokens(), null, 2));
