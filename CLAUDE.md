# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-HTML tool that, from a mobile-game ranking screenshot, **auto-detects the score-number region of your own row** and optionally reads it as a number via OCR. Runs entirely in the browser, no paid API (only Tesseract.js v7 = WASM loaded from a CDN), works on iOS/Android. **Region detection is pure image processing** (saturation + projection profiling), not OCR.

## Running

There is no build system, package manager, lint, or automated test harness. Open `game-number-ocr.html` directly in a browser (serve over your own HTTPS for mobile). In sandboxed iframes (claude.ai etc.) the Worker/WASM is blocked by CSP. Opening via `file://` is prone to cross-origin Worker failures.

### Regression test (required whenever the algorithm changes)

No browser needed. Decode a real image with `node + jpeg-js` (or `pngjs`) and call the core (`isolateScore`) directly:

```bash
mkdir t && cd t && npm init -y && npm install jpeg-js
# Paste the core (isolateScore) from game-number-ocr.html into test.js,
# decode the target image, and call it.
node test.js
# Expected (test band image 1096x258): SCORE BOX ≈ {x:406,y:128,w:175,h:35} ("2,992,500")
```

Decode example: `const {width:W,height:H,data:d}=jpeg.decode(fs.readFileSync('band.jpg'),{useTArray:true}); // RGBA`

## Architecture

All logic lives in an IIFE inside `game-number-ocr.html`. The detection pipeline has two stages:

1. **`autoBand()`** — detect the band (your own row). Downscale the image to width ≤400, build a 4-bit quantized histogram over pixels with `sat>0.28 && 0.25<bri<0.96`, take the most frequent color (= the highlight blue), and use the **bounding box of the largest connected component (4-connectivity)** of the mask within ±tol (=46) of that color. Even though the band contains text/avatar, the blue background wraps around them, so its bbox = the whole band.
2. **`isolateScore(band, bg)`** — isolate only the score line via projection profiling. **ink = farther than `inktol` from the background blue AND low saturation (`sat ≤ satMax`)** (the low-saturation condition drops the colorful avatar). Row-project over the right zone only (`x ≥ rstart*W`) → the bottom-most line tall enough to be real = the score line (the name line is above) → column-project, bridging digit/comma gaps, and take the **widest group = the number** (rejects right-edge gradient noise). Returns the bbox with pad=4.

Target UI layout (your own row is a solid blue band): top = rank / avatar / alliance name + user name; bottom = score number. We only want the bottom-right score.

Fallbacks: `pickAt()` (eyedropper — tap the blue background → flood fill to get the band) / manual drag. OCR is optional via `Tesseract.createWorker('eng',1,...)` → `setParameters({tessedit_char_whitelist, tessedit_pageseg_mode})` → `recognize`.

### Tuning parameters

| Parameter | Default | Role / tuning guidance |
|---|---|---|
| `rstart` | 0.35 | Start of the right zone. Raise it if it straddles the avatar; lower it if the leading digit is clipped (**at 0.39 the leading "2" was lost**) |
| `inktol` | 55 | Distance threshold from the background blue. Lower to catch missing ink, raise to drop noise |
| `satMax` | 0.45 | Above this is treated as "colorful = non-text" and excluded. digit sat≈0.15 / name ≈0.20 / avatar ≈0.45 |
| band tol | 46 | Blue-mask tolerance in `autoBand` |

## Important constraints

- **Do not rewrite the verified algorithm by guesswork.** It was finalized by debugging against real images. Known traps:
  - ❌ Selecting digits by cluster count does NOT work (tightly-packed digits form 2 clusters, while a name forms ~12 with symbols/CJK — the **opposite** of intuition)
  - ❌ Saturation alone cannot remove the avatar (a white balloon / bright skin survive as low-saturation → exclude **by position = the right zone**)
  - ⚠️ No orange-exclusion logic is needed (a previous note called the "bottom orange bar" a misdetection, but that was the selection box drawn by the tool — it does not exist in the original screenshot)
  - Always confirm against a real image with the regression test above when changing this.
- README must not reference or link internal development docs. Do not put the concrete game name in code or docs; use a generic term like "mobile game" (the target game is recorded in local memory).

## Remaining work / next steps

- **Harden full-screen-screenshot band detection**: the largest connected component can lose to other blue (tabs/title bar). Room to add priors like "prefer the band near the bottom / lower part of the screen." For now, fall back to the eyedropper.
- **Roman numerals Ⅰ–Ⅴ** (low priority): a separate path from color detection. `whitelist='IVX'` + single-char PSM, or hard-coded coordinates.
- **Validate across multiple resolutions**. Relative coordinates mostly hold, but `rstart` may need re-tuning when the layout changes.
- Improve OCR accuracy: after cropping, upscale (3–4x) + grayscale + binarize before `recognize` (whitelist=`0123456789,`).

## Git

Commits use Conventional Commits (English). PRs are Draft by default; the title also follows Conventional Commits.
