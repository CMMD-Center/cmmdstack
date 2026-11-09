#!/usr/bin/env node
// Builds docs/tip-sheet.html from docs/tip-sheet.src.html by inlining the CMMD V11 logo (D Horizon Mirror) and the V11
// app glyphs from skills/cmmd-visual-style/assets/brand, then prints the PDF and one PNG per page.
// Needs Google Chrome, poppler and network access to cmmd.ai. Fails if the PDF is not exactly
// two pages or if the CMMD fonts did not load.
//
// cmmd.ai refuses cross-origin font requests, so the committed HTML falls back to Roboto when
// opened from disk. For the print, this script downloads the two V11 faces and inlines them into a
// temporary copy. The fonts are never committed: Google Sans is not ours to redistribute.
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { inlineFonts } from "../skills/cmmd-visual-style/scripts/inline-fonts.mjs";

const docs = resolve(dirname(new URL(import.meta.url).pathname), "..", "docs");
const style = resolve(docs, "..", "skills", "cmmd-visual-style");
const brand = join(style, "assets", "brand");

// Glyphs are drawn in #171717 or #0A0A0A. currentColor lets a tile set the glyph color.
const recolor = (svg) =>
  svg
    .replace(/#(171717|0A0A0A)/gi, "currentColor")
    // Only the root <svg> loses its size; a <rect> inside a glyph keeps its own width and height.
    .replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height)="\d+"/g, ""))
    .replace(/\srole="img"\saria-label="[^"]*"/, ' aria-hidden="true"')
    .trim();

// The D Horizon Mirror identity, from CMMD's hashed Round 11 masters.
const symbol = recolor(readFileSync(join(brand, "cmmd-v11-symbol.svg"), "utf8")).replace("<svg ", '<svg class="symbol" ');
const wordmark = recolor(readFileSync(join(brand, "cmmd-v11-wordmark.svg"), "utf8")).replace("<svg ", '<svg class="wordmark" ');
const icons = Object.fromEntries(
  readdirSync(join(brand, "icons")).map((f) => [f.replace(/\.svg$/, ""), recolor(readFileSync(join(brand, "icons", f), "utf8"))]),
);

const tokens = readFileSync(join(style, "assets", "tokens.css"), "utf8");
const html = readFileSync(join(docs, "tip-sheet.src.html"), "utf8")
  .replace("  {{TOKENS}}\n", `${tokens}\n`)
  .replaceAll("{{SYMBOL}}", symbol)
  .replaceAll("{{WORDMARK}}", wordmark.replace('aria-hidden="true"', 'role="img" aria-label="CMMD"'))
  .replace(/\{\{ICON:([a-z-]+)\}\}/g, (_, name) => {
    if (!icons[name]) throw new Error(`no icon docs/brand/icons/${name}.svg`);
    return icons[name];
  });
if (html.includes("{{")) throw new Error("tip-sheet.src.html has an unfilled placeholder");
writeFileSync(join(docs, "tip-sheet.html"), html);

const printable = await inlineFonts(html);
const printFile = join(mkdtempSync(join(tmpdir(), "tip-sheet-")), "tip-sheet.html");
writeFileSync(printFile, printable);

const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pdf = join(docs, "tip-sheet.pdf");
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--virtual-time-budget=15000",
  `--print-to-pdf=${pdf}`,
  `file://${printFile}`,
], { stdio: "pipe" });
rmSync(dirname(printFile), { recursive: true, force: true });

const pages = Number(execFileSync("pdfinfo", [pdf], { encoding: "utf8" }).match(/Pages:\s+(\d+)/)[1]);
if (pages !== 2) throw new Error(`tip-sheet.pdf has ${pages} pages; it must fit on one sheet, front and back`);

const fonts = execFileSync("pdffonts", [pdf], { encoding: "utf8" });
for (const face of ["GoogleSans", "Roboto"]) {
  if (!fonts.includes(face)) throw new Error(`tip-sheet.pdf does not embed ${face}; the CMMD fonts did not load`);
}

for (const f of readdirSync(docs)) if (/^tip-sheet-page-\d+\.png$/.test(f)) rmSync(join(docs, f));
execFileSync("pdftoppm", ["-png", "-r", "110", pdf, join(docs, "tip-sheet-page")]);
for (const f of readdirSync(docs)) {
  const m = f.match(/^tip-sheet-page-0*(\d+)\.png$/);
  if (m && f !== `tip-sheet-page-${m[1]}.png`) {
    writeFileSync(join(docs, `tip-sheet-page-${m[1]}.png`), readFileSync(join(docs, f)));
    rmSync(join(docs, f));
  }
}
console.log(`ok: docs/tip-sheet.pdf, ${pages} pages`);
