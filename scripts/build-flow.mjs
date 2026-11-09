#!/usr/bin/env node
// Builds docs/sidekick-flow.html from docs/sidekick-flow.src.html with CMMD's tokens, then renders
// light and dark PNGs for the README. Needs Google Chrome and network access to cmmd.ai for fonts.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { inlineFonts } from "../skills/cmmd-visual-style/scripts/inline-fonts.mjs";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const docs = join(root, "docs");
const tokens = readFileSync(join(root, "skills", "cmmd-visual-style", "assets", "tokens.css"), "utf8");
const html = readFileSync(join(docs, "sidekick-flow.src.html"), "utf8").replace("  {{TOKENS}}\n", `${tokens}\n`);
if (html.includes("{{")) throw new Error("sidekick-flow.src.html has an unfilled placeholder");
writeFileSync(join(docs, "sidekick-flow.html"), html);

const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(join(tmpdir(), "sidekick-flow-"));
try {
  const withFonts = await inlineFonts(html);
  for (const theme of ["light", "dark"]) {
    const page = join(work, `${theme}.html`);
    writeFileSync(page, withFonts.replace('<html lang="en">', `<html lang="en" data-theme="${theme}">`));
    execFileSync(chrome, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
      "--window-size=800,990", "--virtual-time-budget=8000",
      ...(theme === "dark" ? ["--blink-settings=preferredColorScheme=0"] : ["--blink-settings=preferredColorScheme=1"]),
      `--screenshot=${join(docs, `sidekick-flow-${theme}.png`)}`, `file://${page}?step=1`,
    ], { stdio: "pipe" });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log("ok: docs/sidekick-flow.html, sidekick-flow-light.png, sidekick-flow-dark.png");
