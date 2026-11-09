#!/usr/bin/env node
// Makes an HTML file render in CMMD's own fonts from disk: downloads each cmmd.ai woff2 the file's
// @font-face rules name and inlines it as a data URI.
//
//   node inline-fonts.mjs <in.html> <out.html>
//
// cmmd.ai refuses cross-origin font requests, so a page opened from file:// falls back to Roboto.
// Write the output to a temporary path, render it, and delete it. Never commit it: Google Sans is
// not ours to redistribute.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FONT_URL = /url\("(https:\/\/cmmd\.ai\/fonts\/[^"]+\.woff2)"\)/g;

export async function inlineFonts(html) {
  let out = html;
  for (const url of new Set([...html.matchAll(FONT_URL)].map((m) => m[1]))) {
    const res = await fetch(url, { redirect: "error" });
    if (!res.ok || !res.headers.get("content-type")?.includes("woff2")) throw new Error(`could not fetch ${url} (${res.status})`);
    out = out.replaceAll(url, `data:font/woff2;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node inline-fonts.mjs <in.html> <out.html>");
    process.exit(2);
  }
  writeFileSync(output, await inlineFonts(readFileSync(input, "utf8")));
  console.log(`inlined CMMD fonts into ${output}`);
}
