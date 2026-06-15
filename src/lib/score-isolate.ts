import { makeInkTest } from "./color";
import type { ImageLike, IsolateParams, Rect, Rgb } from "./types";
import { DEFAULT_PARAMS } from "./types";

type Span = [number, number];

/**
 * Isolate the score number's bounding box within a band, via projection
 * profiling. No OCR. Faithful port of the original `isolateScore`:
 *
 *  1. ink = not the background blue AND low saturation (drops the avatar)
 *  2. right zone only (x >= rstart*W) so the tall rank number doesn't bridge
 *     the name and score rows vertically
 *  3. pick the BOTTOM-most text line tall enough to be real (= score)
 *  4. on that line, group ink columns (bridging digit/comma gaps) and take the
 *     WIDEST group = the number (rejects stray right-edge noise)
 *
 * Returns the box in the image's coordinates, or null if nothing qualifies.
 */
export function isolateScore(
	img: ImageLike,
	band: Rect,
	bg: Rgb,
	params: IsolateParams = DEFAULT_PARAMS,
): Rect | null {
	const { rstart, inktol, satMax } = params;
	const W = band.w;
	const H = band.h;
	const x0 = Math.floor(W * rstart);
	const ink = makeInkTest(img, bg, inktol, satMax, band.x, band.y);

	// Row projection over the right zone.
	const rows = new Int32Array(H);
	let maxRow = 0;
	for (let y = 0; y < H; y++) {
		let c = 0;
		for (let x = x0; x < W; x++) if (ink(x, y)) c++;
		rows[y] = c;
		if (c > maxRow) maxRow = c;
	}
	if (maxRow < 3) return null;

	// Group rows into text lines.
	const thr = maxRow * 0.15;
	const gapY = Math.max(2, Math.round(H * 0.04));
	const lines: Span[] = [];
	let s = -1;
	let last = -1;
	for (let y = 0; y < H; y++) {
		if (rows[y] > thr) {
			if (s < 0) s = y;
			last = y;
		} else if (s >= 0 && y - last > gapY) {
			lines.push([s, last]);
			s = -1;
		}
	}
	if (s >= 0) lines.push([s, last]);

	// Bottom-most line tall enough to be the score (the name line is above).
	const minH = Math.max(5, Math.round(H * 0.05));
	let ln: Span | null = null;
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		if (line[1] - line[0] + 1 >= minH) {
			ln = line;
			break;
		}
	}
	if (!ln) return null;

	// Column projection on that line.
	const cols = new Int32Array(W);
	let colMax = 0;
	for (let x = x0; x < W; x++) {
		let c = 0;
		for (let y = ln[0]; y <= ln[1]; y++) if (ink(x, y)) c++;
		cols[x] = c;
		if (c > colMax) colMax = c;
	}
	const lineH = ln[1] - ln[0] + 1;
	const ct = Math.max(2, colMax * 0.18);
	const gapX = Math.round(lineH * 0.7);
	const groups: Span[] = [];
	let gs = -1;
	let gl = -1;
	for (let x = x0; x < W; x++) {
		if (cols[x] > ct) {
			if (gs < 0) gs = x;
			gl = x;
		} else if (gs >= 0 && x - gl > gapX) {
			groups.push([gs, gl]);
			gs = -1;
		}
	}
	if (gs >= 0) groups.push([gs, gl]);

	const wide = groups.filter((g) => g[1] - g[0] + 1 >= lineH * 0.5);
	if (!wide.length) return null;
	let g = wide[0];
	for (const candidate of wide) {
		if (candidate[1] - candidate[0] > g[1] - g[0]) g = candidate;
	}

	const p = 4;
	const left = Math.max(0, g[0] - p);
	const top = Math.max(0, ln[0] - p);
	return {
		x: band.x + left,
		y: band.y + top,
		w: Math.min(W, g[1] + p) - left,
		h: Math.min(H, ln[1] + p) - top,
	};
}
