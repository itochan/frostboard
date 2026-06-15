import { clamp, dominantSaturatedColor } from "./color";
import { downscale, largestComponentBBox } from "./image";
import type { BandResult, ImageLike } from "./types";
import { BAND_TOL } from "./types";

/**
 * Auto-detect the band (your own row): the bounding box of the largest
 * connected region of the dominant saturated colour (the highlight blue).
 * The band is full of text/avatar, but the blue background wraps around them,
 * so its bbox = the whole band.
 *
 * Faithful port of the original `autoBand`. Works on a full-resolution image;
 * downscales internally to keep the connected-component pass cheap, then maps
 * the result back to full-resolution coordinates.
 */
export function autoBand(
	img: ImageLike,
	targetW = 400,
	tol = BAND_TOL,
): BandResult | null {
	const { image: small, scale } = downscale(img, targetW);
	const bg = dominantSaturatedColor(small);
	if (!bg) return null;

	const { data, width: dw, height: dh } = small;
	const tol2 = tol * tol;
	const mask = new Uint8Array(dw * dh);
	for (let i = 0, j = 0; i < data.length; i += 4, j++) {
		const dr = data[i] - bg[0];
		const dg = data[i + 1] - bg[1];
		const db = data[i + 2] - bg[2];
		if (dr * dr + dg * dg + db * db < tol2) mask[j] = 1;
	}

	const box = largestComponentBBox(mask, dw, dh);
	if (!box) return null;

	const pad = 2;
	const w0 = img.width;
	const h0 = img.height;
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
