import { useCallback, useState } from "react";
import type { ImageLike } from "../lib/types";

export interface SourceImage {
	/** Offscreen canvas holding the full-resolution image (for cropping). */
	canvas: HTMLCanvasElement;
	/** Full-resolution pixels; structurally an ImageLike for the algorithms. */
	imageData: ImageLike;
	width: number;
	height: number;
}

/**
 * Decode an image File into an offscreen canvas + ImageData.
 * The returned ImageData is passed straight to the detection algorithms.
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
				const canvas = document.createElement("canvas");
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					URL.revokeObjectURL(url);
					reject(new Error("2D context unavailable"));
					return;
				}
				ctx.drawImage(img, 0, 0);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				URL.revokeObjectURL(url);
				setSource({
					canvas,
					imageData,
					width: canvas.width,
					height: canvas.height,
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
