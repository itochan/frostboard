# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser tool that, from a mobile-game ranking screenshot, **auto-detects the score-number region of your own row** and optionally reads it as a number via OCR. Runs entirely in the browser, no paid API (Tesseract.js v7 = WASM, self-hosted; only the language data is fetched from a CDN), works on iOS/Android. **Region detection is pure image processing** (saturation + projection profiling), not OCR.

## Stack & tooling

Vite + React + TypeScript, Tailwind CSS v4, Tesseract.js v7, Vitest, Biome. Toolchain is the jdx/en.dev ecosystem: **mise** (tool versions in `mise.toml`), **aube** (pnpm-compatible package manager; `aube install/add/run/exec/ci`, lockfile `aube-lock.yaml`), **hk** (git hooks in `hk.pkl`, composed from builtins). Do not substitute npm/pnpm/yarn — use aube.

## Commands

```bash
mise install       # provision node, aube, biome, hk, pkl
aube install       # dependencies
aube run dev       # dev server
aube test          # Vitest regression suite  (= the e2e verification)
aube run build     # tsc -b + vite build → dist/
biome check        # lint + format check  (biome check --write to fix)
hk install         # install git hooks (once)
```

The hk hooks run Biome + hygiene checks on pre-commit, enforce Conventional Commits on commit-msg, and run `aube test` on pre-push.

### Regression test (required whenever the algorithm changes)

`aube test` runs the Vitest suite in `test/`. It builds PII-free synthetic band images (`test/fixtures.ts`) and asserts `isolateScore` returns the bottom-right number (excluding name/rank/avatar) and `autoBand` finds the band bbox. No real screenshots (no game/PII) are committed.

## Architecture

Detection logic is **pure, DOM-independent functions in `src/lib`** (operate on an `ImageLike = {data,width,height}`, which `ImageData` satisfies — so they run in the browser and under Node/Vitest). The React UI (`src/components`, `src/hooks`) only wires these to a canvas.

- `src/lib/band-detect.ts` — `autoBand()`: downscale to width ≤400, build a 4-bit quantized histogram over pixels with `sat>0.28 && 0.25<bri<0.96`, take the most frequent color (= highlight blue), and return the **bounding box of the largest connected component (4-conn)** of the mask within ±tol (=46). The blue background wraps around the text/avatar, so its bbox = the whole band.
- `src/lib/score-isolate.ts` — `isolateScore(img, band, bg, params)`: **ink = farther than `inktol` from the background blue AND low saturation (`sat ≤ satMax`)** (drops the colorful avatar). Row-project over the right zone (`x ≥ rstart*W`) → bottom-most tall-enough line = the score line (name line is above) → column-project bridging digit/comma gaps → **widest group = the number**. Returns the bbox with pad=4.
- `src/lib/eyedropper.ts` — `bandFromSeed()`: flood-fill the band from a tapped blue pixel (fallback).
- `src/lib/color.ts` / `image.ts` — dominant-color/ink helpers; downscale + connected-component/flood-fill.
- `src/lib/ocr.ts` — optional Tesseract wrapper (grayscale → whitelist + PSM). Worker + core wasm are self-hosted (copied to `/tesseract` by `vite-plugin-static-copy` in `vite.config.ts`); `langPath` points to the CDN.

Target UI layout (your own row is a solid blue band): top = rank / avatar / alliance name + user name; bottom = score number. We only want the bottom-right score.

### Tuning parameters (`src/lib/types.ts` DEFAULT_PARAMS)

| Parameter | Default | Role / tuning guidance |
|---|---|---|
| `rstart` | 0.35 | Start of the right zone. Raise it if it straddles the avatar; lower it if the leading digit is clipped (**at 0.39 the leading "2" was lost**) |
| `inktol` | 55 | Distance threshold from the background blue. Lower to catch missing ink, raise to drop noise |
| `satMax` | 0.45 | Above this is treated as "colorful = non-text" and excluded. digit sat≈0.15 / name ≈0.20 / avatar ≈0.45 |
| `BAND_TOL` | 46 | Blue-mask tolerance in `autoBand` |

## Important constraints

- **Do not rewrite the verified algorithm by guesswork.** It was finalized by debugging against real images; the `src/lib` port keeps the original thresholds and logic. Known traps:
  - ❌ Selecting digits by cluster count does NOT work (tightly-packed digits form 2 clusters, while a name forms ~12 with symbols/CJK — the **opposite** of intuition)
  - ❌ Saturation alone cannot remove the avatar (a white balloon / bright skin survive as low-saturation → exclude **by position = the right zone**)
  - ⚠️ No orange-exclusion logic is needed (a previous note called the "bottom orange bar" a misdetection, but that was the selection box drawn by the tool — it does not exist in the original screenshot)
  - Always confirm with `aube test` (extend the synthetic fixtures if needed) when changing this.
- README must not reference or link internal development docs. Do not put the concrete game name in code, docs, repo name, or commits; use a generic term like "mobile game" (the target game is recorded in local memory).

## Remaining work / next steps

- **Harden full-screen-screenshot band detection**: the largest connected component can lose to other blue (tabs/title bar). Room to add priors like "prefer the band near the bottom of the screen." For now, fall back to the eyedropper.
- **Roman numerals Ⅰ–Ⅴ** (low priority): a separate path from color detection.
- **Validate across multiple resolutions**. Relative coordinates mostly hold, but `rstart` may need re-tuning when the layout changes.
- Improve OCR accuracy: binarize (in addition to the existing upscale + grayscale) before `recognize`.

## Git

Commits use Conventional Commits (English), split per logical step. PRs are Draft by default; the title also follows Conventional Commits.
