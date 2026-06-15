import { useCallback, useEffect, useRef, useState } from "react";
import type { BandResult, IsolateParams, Rect, Rgb } from "../lib/types";
import type { DetectResponse } from "../workers/protocol";
import type { SourceImage } from "./useSourceImage";

export interface DetectionWorker {
	/** True once the current image has been handed to the worker. */
	ready: boolean;
	/** Auto-detect the band (off the main thread). */
	auto: () => Promise<BandResult | null>;
	/** Eyedropper: detect the band from a seed pixel. */
	pick: (x: number, y: number) => Promise<BandResult | null>;
	/** Isolate the score rect within a known band. */
	isolate: (band: Rect, bg: Rgb, params: IsolateParams) => Promise<Rect | null>;
}

/**
 * Run detection (autoBand / bandFromSeed / isolateScore) in a Web Worker so the
 * UI stays responsive on large images. The image pixels are sent to the worker
 * once per load; subsequent calls only carry parameters.
 */
export function useDetectionWorker(
	source: SourceImage | null,
): DetectionWorker {
	const workerRef = useRef<Worker | null>(null);
	const pending = useRef(new Map<number, (res: DetectResponse) => void>());
	const idRef = useRef(0);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const worker = new Worker(
			new URL("../workers/detection.worker.ts", import.meta.url),
			{
				type: "module",
			},
		);
		worker.onmessage = (e: MessageEvent<DetectResponse>) => {
			const resolve = pending.current.get(e.data.id);
			if (resolve) {
				pending.current.delete(e.data.id);
				resolve(e.data);
			}
		};
		workerRef.current = worker;
		return () => {
			worker.terminate();
			workerRef.current = null;
			pending.current.clear();
		};
	}, []);

	const send = useCallback(
		(
			message: Record<string, unknown>,
			transfer?: Transferable[],
		): Promise<DetectResponse> => {
			const worker = workerRef.current;
			const id = ++idRef.current;
			if (!worker) return Promise.resolve({ id });
			return new Promise((resolve) => {
				pending.current.set(id, resolve);
				worker.postMessage({ ...message, id }, transfer ?? []);
			});
		},
		[],
	);

	// Hand the (downscaled) pixels to the worker whenever the image changes.
	// Pixels are read fresh from the canvas and the buffer is transferred (not
	// copied), so the main thread keeps only the canvas — no duplicate buffer.
	useEffect(() => {
		setReady(false);
		if (!source) return;
		let cancelled = false;
		const ctx = source.canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;
		const { data } = ctx.getImageData(0, 0, source.width, source.height);
		send(
			{ kind: "setImage", data, width: source.width, height: source.height },
			[data.buffer],
		).then(() => {
			if (!cancelled) setReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [source, send]);

	const auto = useCallback(async (): Promise<BandResult | null> => {
		const r = await send({ kind: "auto" });
		return r.band && r.bg ? { rect: r.band, bg: r.bg } : null;
	}, [send]);

	const pick = useCallback(
		async (x: number, y: number): Promise<BandResult | null> => {
			const r = await send({ kind: "pick", x, y });
			return r.band && r.bg ? { rect: r.band, bg: r.bg } : null;
		},
		[send],
	);

	const isolate = useCallback(
		async (
			band: Rect,
			bg: Rgb,
			params: IsolateParams,
		): Promise<Rect | null> => {
			const r = await send({ kind: "isolate", band, bg, params });
			return r.sel ?? null;
		},
		[send],
	);

	return { ready, auto, pick, isolate };
}
