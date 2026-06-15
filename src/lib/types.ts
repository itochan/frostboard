/** Axis-aligned rectangle in pixel coordinates. */
export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** An RGB colour (0-255 per channel). */
export type Rgb = readonly [number, number, number];

/**
 * A decoded image, DOM-independent so the algorithms can run under Node
 * (Vitest) as well as in the browser. Layout matches `ImageData`: RGBA,
 * row-major, 4 bytes per pixel.
 */
export interface ImageLike {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

/** A detected band (your own row) plus its background blue. */
export interface BandResult {
	rect: Rect;
	bg: Rgb;
}

/** Tunable parameters for {@link isolateScore}. */
export interface IsolateParams {
	/** Start of the right zone as a fraction of band width (excludes rank/avatar). */
	rstart: number;
	/** Distance threshold from the background blue; larger drops more as background. */
	inktol: number;
	/** Saturation above this is treated as colourful (avatar), not text. */
	satMax: number;
}

export const DEFAULT_PARAMS: IsolateParams = {
	rstart: 0.35,
	inktol: 55,
	satMax: 0.45,
};

/** Blue-mask tolerance used by band detection (Euclidean, squared internally). */
export const BAND_TOL = 46;
