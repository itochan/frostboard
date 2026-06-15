import type { ImageLike, Rgb } from "./types";

export const clamp = (v: number, lo: number, hi: number): number =>
	Math.max(lo, Math.min(hi, v));

/**
 * Dominant saturated mid-tone colour (= the highlight blue), found via a
 * 4-bit-per-channel quantised histogram over sufficiently saturated, mid-bright
 * pixels. Faithful port of the first pass of the original `autoBand`.
 * Returns null if no pixel qualifies.
 */
export function dominantSaturatedColor(img: ImageLike): Rgb | null {
	const d = img.data;
	const hist = new Map<number, number>();
	let best = 0;
	let bestKey = 0;
	// Sample every other pixel (i += 8), as in the original.
	for (let i = 0; i < d.length; i += 8) {
		const r = d[i];
		const g = d[i + 1];
		const b = d[i + 2];
		const mx = Math.max(r, g, b);
		const mn = Math.min(r, g, b);
		const sat = mx === 0 ? 0 : (mx - mn) / mx;
		const bri = mx / 255;
		if (sat < 0.28 || bri < 0.25 || bri > 0.96) continue;
		const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
		const c = (hist.get(key) ?? 0) + 1;
		hist.set(key, c);
		if (c > best) {
			best = c;
			bestKey = key;
		}
	}
	if (!best) return null;
	return [
		((bestKey >> 8) & 15) * 17,
		((bestKey >> 4) & 15) * 17,
		(bestKey & 15) * 17,
	];
}

/**
 * Build an "ink" predicate for a region of `img` offset by (ox, oy).
 * A pixel is ink when it is far enough from the background blue AND low
 * saturation (text is white/dark; the colourful avatar is high-saturation and
 * is rejected).
 */
export function makeInkTest(
	img: ImageLike,
	bg: Rgb,
	inktol: number,
	satMax: number,
	ox = 0,
	oy = 0,
): (x: number, y: number) => boolean {
	const { data, width } = img;
	const t2 = inktol * inktol;
	const [br, bgc, bb] = bg;
	return (x, y) => {
		const o = ((oy + y) * width + (ox + x)) * 4;
		const r = data[o];
		const g = data[o + 1];
		const b = data[o + 2];
		const dr = r - br;
		const dg = g - bgc;
		const db = b - bb;
		if (dr * dr + dg * dg + db * db <= t2) return false; // ~background
		const mx = Math.max(r, g, b);
		const mn = Math.min(r, g, b);
		if (mx && (mx - mn) / mx > satMax) return false; // colourful (avatar)
		return true;
	};
}
