import { useCallback, useState } from "react";
import type { ImageLike } from "../lib/types";

/**
 * Cap the working image's long edge. Phone screenshots/photos can be very
 * large (10+ MP); holding a full-resolution canvas + ImageData crashes mobile
 * WebKit (out of memory). Detection downscales to 400px internally and the
 * exported coordinates are resolution-independent, so a capped working image
 * loses no useful accuracy. 2000px keeps typical screenshots near-native.
 */
const MAX_EDGE = 2000;

export interface SourceImage {
	/** Offscreen canvas holding the working-resolution image (for cropping). */
	canvas: HTMLCanvasElement;
	/** Working-resolution pixels; structurally an ImageLike for the algorithms. */
	imageData: ImageLike;
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
 * Decode an image File into an offscreen canvas + ImageData, downscaling to a
 * safe working size. The returned ImageData is passed straight to detection.
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
				const imageData = ctx.getImageData(0, 0, width, height);
				URL.revokeObjectURL(url);
				setSource({
					canvas,
					imageData,
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
