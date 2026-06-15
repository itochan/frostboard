import type { ImageLike } from "./types";

/** A bounding box in integer pixel coordinates (inclusive max). */
export interface BBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * Nearest-neighbour downscale to at most `targetW` wide (never upscales).
 * Returns the smaller image plus the scale factor (small = full * scale).
 *
 * The original ran this through a canvas (smooth scaling); here it is pure JS
 * so the detection works under Node too. Only the resampling differs — the
 * dominant-colour / connected-component logic downstream is unchanged.
 */
export function downscale(
	img: ImageLike,
	targetW: number,
): { image: ImageLike; scale: number } {
	const scale = Math.min(1, targetW / img.width);
	const dw = Math.max(1, Math.round(img.width * scale));
	const dh = Math.max(1, Math.round(img.height * scale));
	const out = new Uint8ClampedArray(dw * dh * 4);
	for (let y = 0; y < dh; y++) {
		const sy = Math.min(img.height - 1, Math.floor(y / scale));
		for (let x = 0; x < dw; x++) {
			const sx = Math.min(img.width - 1, Math.floor(x / scale));
			const so = (sy * img.width + sx) * 4;
			const dindex = (y * dw + x) * 4;
			out[dindex] = img.data[so];
			out[dindex + 1] = img.data[so + 1];
			out[dindex + 2] = img.data[so + 2];
			out[dindex + 3] = img.data[so + 3];
		}
	}
	return { image: { data: out, width: dw, height: dh }, scale };
}

/**
 * Bounding box of the largest 4-connected component of a binary mask.
 * Iterative flood fill (no recursion). Returns null if the mask is empty.
 */
export function largestComponentBBox(
	mask: Uint8Array,
	w: number,
	h: number,
): BBox | null {
	const seen = new Uint8Array(w * h);
	let box: BBox | null = null;
	let bestCount = 0;
	for (let start = 0; start < mask.length; start++) {
		if (!mask[start] || seen[start]) continue;
		let minX = start % w;
		let maxX = minX;
		let minY = (start / w) | 0;
		let maxY = minY;
		let count = 0;
		const stack = [start];
		seen[start] = 1;
		while (stack.length) {
			const p = stack.pop() as number;
			const px = p % w;
			const py = (p / w) | 0;
			count++;
			if (px < minX) minX = px;
			if (px > maxX) maxX = px;
			if (py < minY) minY = py;
			if (py > maxY) maxY = py;
			if (px + 1 < w && mask[p + 1] && !seen[p + 1]) {
				seen[p + 1] = 1;
				stack.push(p + 1);
			}
			if (px - 1 >= 0 && mask[p - 1] && !seen[p - 1]) {
				seen[p - 1] = 1;
				stack.push(p - 1);
			}
			if (py + 1 < h && mask[p + w] && !seen[p + w]) {
				seen[p + w] = 1;
				stack.push(p + w);
			}
			if (py - 1 >= 0 && mask[p - w] && !seen[p - w]) {
				seen[p - w] = 1;
				stack.push(p - w);
			}
		}
		if (count > bestCount) {
			bestCount = count;
			box = { minX, minY, maxX, maxY };
		}
	}
	return box;
}

/**
 * Flood fill from a seed pixel over all pixels within `tol` (Euclidean) of the
 * seed-region background colour. Returns the bounding box and pixel count.
 * Used by the eyedropper. Mirrors the original `pickAt` flood fill.
 */
export function floodFillBBox(
	img: ImageLike,
	seedX: number,
	seedY: number,
	bg: readonly [number, number, number],
	tol: number,
): { box: BBox; count: number } {
	const { data, width: w, height: h } = img;
	const tol2 = tol * tol;
	const seen = new Uint8Array(w * h);
	const startIndex = seedY * w + seedX;
	const stack = [startIndex];
	seen[startIndex] = 1;
	let minX = seedX;
	let maxX = seedX;
	let minY = seedY;
	let maxY = seedY;
	let count = 0;
	while (stack.length) {
		const p = stack.pop() as number;
		const px = p % w;
		const py = (p / w) | 0;
		const o = p * 4;
		const dr = data[o] - bg[0];
		const dg = data[o + 1] - bg[1];
		const db = data[o + 2] - bg[2];
		if (dr * dr + dg * dg + db * db > tol2) continue;
		count++;
		if (px < minX) minX = px;
		if (px > maxX) maxX = px;
		if (py < minY) minY = py;
		if (py > maxY) maxY = py;
		if (px + 1 < w && !seen[p + 1]) {
			seen[p + 1] = 1;
			stack.push(p + 1);
		}
		if (px - 1 >= 0 && !seen[p - 1]) {
			seen[p - 1] = 1;
			stack.push(p - 1);
		}
		if (py + 1 < h && !seen[p + w]) {
			seen[p + w] = 1;
			stack.push(p + w);
		}
		if (py - 1 >= 0 && !seen[p - w]) {
			seen[p - w] = 1;
			stack.push(p - w);
		}
	}
	return { box: { minX, minY, maxX, maxY }, count };
}
