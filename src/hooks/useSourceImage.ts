import { useCallback, useState } from "react";

/**
 * Cap the working image's long edge. Phone screenshots/photos can be very
 * large (10+ MP); holding full-resolution pixels crashes mobile WebKit (out of
 * memory). Region detection downscales to 400px internally and exported
 * coordinates are resolution-independent, so it is unaffected far below this.
 * The binding constraint is OCR: the score crop is upscaled ~3x before
 * recognition, so too small a working image blurs the digits. 1000px is the
 * balance point (detection solid, OCR still legible, ~half the memory of 1400).
 * Lower it further only if OCR accuracy is not needed.
 */
const MAX_EDGE = 1000;

export interface SourceImage {
	/**
	 * Offscreen canvas holding the working-resolution image. This is the ONLY
	 * full-size pixel buffer kept on the main thread (used for crop/preview/OCR
	 * and to seed the detection worker); detection reads pixels from here.
	 */
	canvas: HTMLCanvasElement;
	/** Working (possibly downscaled) dimensions. */
	width: number;
	height: number;
	/** Original decoded dimensions, before any downscale. */
	naturalWidth: number;
	naturalHeight: number;
	/** working = natural * scale (≤ 1). */
	scale: number;
}

/**
 * Decode an image File into an offscreen canvas, downscaling to a safe working
 * size. No ImageData is retained here — the detection worker extracts pixels
 * from the canvas on demand, so only one full-size buffer lives on the main
 * thread.
 */
export function useSourceImage(): {
	source: SourceImage | null;
	load: (file: File) => Promise<void>;
	reset: () => void;
} {
	const [source, setSource] = useState<SourceImage | null>(null);

	const load = useCallback((file: File) => {
		return new Promise<void>((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				const naturalWidth = img.naturalWidth;
				const naturalHeight = img.naturalHeight;
				const scale = Math.min(
					1,
					MAX_EDGE / Math.max(naturalWidth, naturalHeight),
				);
				const width = Math.max(1, Math.round(naturalWidth * scale));
				const height = Math.max(1, Math.round(naturalHeight * scale));

				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					URL.revokeObjectURL(url);
					reject(new Error("2D context unavailable"));
					return;
				}
				ctx.drawImage(img, 0, 0, width, height);
				URL.revokeObjectURL(url);
				setSource({
					canvas,
					width,
					height,
					naturalWidth,
					naturalHeight,
					scale,
				});
				resolve();
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Failed to load image"));
			};
			img.src = url;
		});
	}, []);

	const reset = useCallback(() => setSource(null), []);

	return { source, load, reset };
}
