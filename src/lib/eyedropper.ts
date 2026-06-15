import { clamp } from "./color";
import { downscale, floodFillBBox } from "./image";
import type { BandResult, ImageLike } from "./types";
import { BAND_TOL } from "./types";

/** Minimum flood-fill size (in downscaled pixels) to accept a pick. */
const MIN_PICK_PIXELS = 30;

/**
 * Eyedropper: from a tap at full-resolution (seedX, seedY) on the blue
 * background, flood-fill the connected blue region and return its band rect
 * plus the sampled background colour. Returns null if the picked region is too
 * small (the user likely tapped off the band).
 *
 * Faithful port of the original `pickAt`: the background colour is sampled at
 * full resolution, the flood fill runs on a downscaled copy for speed.
 */
export function bandFromSeed(
	img: ImageLike,
	seedX: number,
	seedY: number,
	targetW = 700,
	tol = BAND_TOL,
): BandResult | null {
	const w0 = img.width;
	const h0 = img.height;
	const ix = clamp(Math.round(seedX), 0, w0 - 1);
	const iy = clamp(Math.round(seedY), 0, h0 - 1);
	const so = (iy * w0 + ix) * 4;
	const bg: [number, number, number] = [
		img.data[so],
		img.data[so + 1],
		img.data[so + 2],
	];

	const { image: small, scale } = downscale(img, targetW);
	const sx = clamp(Math.round(ix * scale), 0, small.width - 1);
	const sy = clamp(Math.round(iy * scale), 0, small.height - 1);
	const { box, count } = floodFillBBox(small, sx, sy, bg, tol);
	if (count < MIN_PICK_PIXELS) return null;

	const pad = 2;
	const x = clamp(Math.floor(box.minX / scale) - pad, 0, w0);
	const y = clamp(Math.floor(box.minY / scale) - pad, 0, h0);
	return {
		rect: {
			x,
			y,
			w: clamp(Math.ceil((box.maxX + 1) / scale) + pad, 0, w0) - x,
			h: clamp(Math.ceil((box.maxY + 1) / scale) + pad, 0, h0) - y,
		},
		bg,
	};
}
