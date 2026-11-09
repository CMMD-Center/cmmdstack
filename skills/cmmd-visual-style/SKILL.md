---
name: cmmd-visual-style
description: CMMD's V11 look for anything an agent renders, with its tokens, fonts, logo, app glyphs, chart colors and a Mermaid theme. Use before making a video, slide, HTML page, PDF, chart, rendered diagram or image, including the visuals in ketchup, ketchup-video, how, teach and pr.
---

# CMMD visual style

Everything an agent draws for CMMD looks like the CMMD app: ink on warm paper, Google Sans headings
over Roboto, hairline rules, soft lift instead of heavy borders, and color spent in only a few
places. Use the files here; do not pick colors or fonts by eye.

| File | What it is |
|---|---|
| [`assets/tokens.css`](assets/tokens.css) | Every token, light and dark, with the app's names. Paste it into a page's `<style>` |
| [`assets/tokens.json`](assets/tokens.json) | The same values for scripts and renderers that are not CSS |
| [`assets/mermaid-init.txt`](assets/mermaid-init.txt) | The first line of a Mermaid diagram, so it renders in CMMD's colors |
| [`assets/brand/`](assets/brand/) | The D Horizon Mirror symbol and wordmark, and the V11 app glyphs |
| [`scripts/inline-fonts.mjs`](scripts/inline-fonts.mjs) | Inlines CMMD's fonts into an HTML file before you render it from disk |
| [`scripts/tokens.mjs`](scripts/tokens.mjs) | Reads `tokens.css` into `{ light, dark }` for scripts |

## The look

- **Ground and ink.** Paper `--color-bg-primary`, cards `--color-bg-secondary`, quiet panels
  `--color-bg-tertiary`, ink `--color-text-primary`. Secondary text is `--color-text-secondary`, never
  a gray you mixed.
- **Type.** Headings in `--font-family-heading` at weight 400 with tight tracking (-0.02em to
  -0.04em); body in `--font-family-sans`; code and commands in `--font-family-mono`. Small uppercase
  labels are 600 weight with 0.13em tracking. No other fonts.
- **Shape.** 4px corners on controls (`--brand-radius-md`), 6 to 10px on containers. Hairline rules
  (`--color-border-default`) divide sections. Cards lift on `--brand-shadow-sm` or `-md`.
- **Color, sparingly.** The three Horizon hues (`--brand-warm`, `--brand-pink`, `--brand-cool`) appear
  only as a 2px rule over a panel, as the Still Horizon field (`--brand-horizon`) behind a title,
  or as the glow (`--brand-horizon-glow`) at the foot of a black closing panel. Status uses
  `--color-success`, `--color-warning`, `--color-error` and `--color-info`. App tiles use the
  `--brand-tile-*` pairs: warm for Sidekick and Meetings, violet for Brain and Capture, blue for Comms
  and The List.
- **One meaning per color.** A color or shape means the same thing everywhere in one piece.
- **Logo.** Use the files in `assets/brand/`; never redraw or retype it. The lockup is the symbol beside
  the wordmark, the symbol 66/80 of the wordmark's height with a 22/80 gap. Swap the master fill
  `#171717` for `currentColor` to recolor it. App names get their V11 glyph from `assets/brand/icons/`.
- **Never** gradients other than the Horizon, emoji or Unicode symbols as icons, glass or blur, text
  in a gradient, colored side borders, or a font the tokens do not name.

## By output

**HTML page or PDF.** Paste `tokens.css` into the page and write against its names. Before rendering
from disk, run `node scripts/inline-fonts.mjs page.html /tmp/page-fonts.html`, render the temporary
file (headless Chrome `--print-to-pdf` or `--screenshot`), then delete it. Check the PDF embeds
`GoogleSans` and `Roboto` with `pdffonts`; a fallback font means the inlining did not run.
cmmdstack's tip sheet (`docs/tip-sheet.src.html`, built by `scripts/build-tip-sheet.mjs`) is the
worked example.

**Video slides** (ketchup-video and the like). Build each slide as a 1920x1080 HTML page on
`--color-bg-primary`, render the frames with headless Chrome after inlining the fonts, and join them
with ffmpeg. Headings at least 56px in the heading font; labels at least 28px. The subtitle strip
is `--color-bg-secondary` with a hairline top rule, its text 30px `--color-text-primary` in the sans
font, and the symbol at 24px in its right end. Use the Still Horizon on the first slide only.

**Mermaid.** Put the line from `assets/mermaid-init.txt` first inside the code block. Chat views that
ignore it still render the diagram.

**Charts.** Series take `--chart-1` to `--chart-6` in order; one series is `--chart-1` (ink). Gridlines
`--color-border-subtle`, axis text `--color-text-secondary` in the sans font with tabular numbers.
Highlight one series with color and keep the rest ink or gray rather than coloring all of them.

**Dark.** When the output will be seen in a dark view, use the dark values: `tokens.css` switches on
`prefers-color-scheme: dark`, and `tokens.json` has them under `dark`.

The logo and glyph files are CMMD's marks. The MIT license on cmmdstack does not cover them.
