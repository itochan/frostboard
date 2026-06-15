import type { ImageLike, Rgb } from "../src/lib/types";

/** The highlight blue of the band background (matches the verified original). */
export const BLUE: Rgb = [68, 153, 221];
/** Near-white, low-saturation "ink" used for digits and names. */
export const INK: Rgb = [240, 240, 245];
/** A highly-saturated avatar colour that must be excluded by satMax. */
export const AVATAR: Rgb = [230, 60, 60];
/** Non-band screenshot background (low saturation, far from blue). */
export const BACKDROP: Rgb = [20, 20, 24];

export function makeImage(width: number, height: number, fill: Rgb): ImageLike {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = fill[0];
		data[i + 1] = fill[1];
		data[i + 2] = fill[2];
		data[i + 3] = 255;
	}
	return { data, width, height };
}

export function fillRect(
	img: ImageLike,
	x: number,
	y: number,
	w: number,
	h: number,
	rgb: Rgb,
): void {
	const x1 = Math.min(img.width, x + w);
	const y1 = Math.min(img.height, y + h);
	for (let yy = Math.max(0, y); yy < y1; yy++) {
		for (let xx = Math.max(0, x); xx < x1; xx++) {
			const o = (yy * img.width + xx) * 4;
			img.data[o] = rgb[0];
			img.data[o + 1] = rgb[1];
			img.data[o + 2] = rgb[2];
			img.data[o + 3] = 255;
		}
	}
}

/** Where the score number was drawn, for assertions. */
export interface Layout {
	score: { x: number; y: number; w: number; h: number };
	name: { x: number; y: number; w: number; h: number };
}

/**
 * Paint a band's contents into `img` at (ox, oy) over a `w`x`h` blue area:
 *  - left: a tall rank number spanning both rows (must be excluded by rstart)
 *  - an avatar block (high saturation, must be excluded by satMax)
 *  - top-right: a name row (a text line above the score)
 *  - bottom-right: the score number (the WIDEST run on the lower line)
 * Returns the absolute score/name rectangles.
 */
export function paintBand(
	img: ImageLike,
	ox: number,
	oy: number,
	w: number,
	h: number,
): Layout {
	fillRect(img, ox, oy, w, h, BLUE);

	// Tall rank number on the far left (low saturation, spans both rows).
	fillRect(img, ox + 20, oy + 12, 36, h - 24, INK);

	// Colourful avatar — partly in the right zone to exercise satMax exclusion.
	fillRect(img, ox + 120, oy + 18, 80, h - 36, AVATAR);

	// Name row (upper line, right zone).
	const name = { x: ox + 320, y: oy + 14, w: 240, h: 40 };
	fillRect(img, name.x, name.y, name.w, name.h, INK);

	// Score row (lower line, right zone) — the target.
	const score = { x: ox + 300, y: oy + 72, w: 260, h: 34 };
	fillRect(img, score.x, score.y, score.w, score.h, INK);

	return { score, name };
}

/** A standalone band image (band == whole image), plus the score rect. */
export function makeBandImage(): {
	img: ImageLike;
	w: number;
	h: number;
	layout: Layout;
} {
	const w = 600;
	const h = 120;
	const img = makeImage(w, h, BLUE);
	const layout = paintBand(img, 0, 0, w, h);
	return { img, w, h, layout };
}

/** A full screenshot: a band placed on a non-band backdrop. */
export function makeScreenshot(): {
	img: ImageLike;
	band: { x: number; y: number; w: number; h: number };
	layout: Layout;
} {
	const img = makeImage(700, 300, BACKDROP);
	const band = { x: 50, y: 40, w: 600, h: 120 };
	const layout = paintBand(img, band.x, band.y, band.w, band.h);
	return { img, band, layout };
}
