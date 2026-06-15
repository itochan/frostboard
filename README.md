# frostboard

A browser tool that automatically detects the **score-number region of your own
row** in a mobile-game ranking screenshot and optionally reads it with OCR.

- Runs entirely in the browser, **no paid API** (Tesseract.js v7 = WASM, self-hosted)
- Works on iOS / Android mobile browsers
- Region detection is pure image processing — no OCR (saturation + projection profiling)

## Tech stack

Vite · React · TypeScript · Tailwind CSS v4 · Tesseract.js v7 (self-hosted, language
data from CDN) · Vitest · Biome. Tooling via [mise](https://mise.jdx.dev) (tool
versions), [aube](https://github.com/jdx/aube) (package manager), and
[hk](https://hk.jdx.dev) (git hooks).

## Develop

Tools are pinned in `mise.toml`; `mise install` provisions node, aube, biome, hk.

```bash
mise install          # provision toolchain
aube install          # install dependencies
aube run dev          # dev server
aube test             # run the regression tests
aube run build        # type-check + production build (dist/)
biome check           # lint + format check  (biome check --write to fix)
```

Install the git hooks once with `hk install` (pre-commit: Biome + hygiene;
commit-msg: Conventional Commits; pre-push: tests).

## How it works

1. **Band detection** — find your own row (a solid blue band) as the bounding box of
   the largest connected region of the dominant saturated colour.
2. **Score isolation** — within the band's right zone, project ink rows/columns to
   pick the bottom-most line (the score) and its widest run (the number). Avatars are
   dropped by saturation, the rank number by position.
3. **OCR (optional)** — crop, upscale, grayscale, and run Tesseract restricted to digits.

The detection lives in `src/lib` as pure, DOM-independent functions, exercised by the
Vitest suite (`test/`). The React UI in `src/components` + `src/hooks` wires them to the
canvas. See `CLAUDE.md` for the architecture and tuning parameters.

## Deploy

Static SPA. CI builds and deploys `dist/` to Cloudflare Pages (`public/_headers` sets
cross-origin isolation so Tesseract can use multi-threaded WASM). Set the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets and create a
Pages project named `frostboard`.
