# frostboard

A tool that automatically detects the **score-number region of your own row** in a
mobile-game ranking screenshot and optionally reads it with OCR.

- Runs entirely in the browser, **no paid API** (Tesseract.js v7 = WASM, local processing)
- Works on iOS / Android mobile browsers
- Region detection is pure image processing — no OCR (saturation + projection profiling)

## Deliverable

- [`game-number-ocr.html`](./game-number-ocr.html) — a single HTML file. Load image → auto-detect score → optional OCR.
  - Auto band detection / eyedropper (tap the blue background) / manual drag / PNG export / px + relative coordinate output

## Usage

Save it locally and open it directly, or serve it over your own HTTPS (HTTPS hosting recommended for mobile).
In sandboxed iframes the Worker/WASM may be blocked by CSP.

## Development notes

See the development guide for algorithm details, tuning, and the regression-test procedure.
**Do not rewrite the verified algorithm by guesswork.**
