import type { Rect } from "./types";

/**
 * Draw a region of `source` onto a new canvas, scaled by `scale`.
 * Used for the zoomed preview and for PNG export / OCR input.
 */
export function cropToCanvas(
	source: CanvasImageSource,
	rect: Rect,
	scale = 1,
): HTMLCanvasElement {
	const w = Math.max(1, Math.round(rect.w * scale));
	const h = Math.max(1, Math.round(rect.h * scale));
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2D context unavailable");
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h);
	return canvas;
}

/** Convert an RGB triple to a CSS `rgb(...)` string. */
export function rgbCss(rgb: readonly [number, number, number]): string {
	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
