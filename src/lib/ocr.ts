import { createWorker, PSM, type Worker } from "tesseract.js";

/** Character-set presets exposed in the UI. */
export type CharMode = "digits" | "roman" | "free";

const WHITELIST: Record<CharMode, string> = {
	digits: "0123456789,",
	roman: "IVX",
	free: "",
};

const base = import.meta.env.BASE_URL;

/**
 * Worker options: the worker script and core wasm are served from our own
 * origin (copied into /tesseract by vite-plugin-static-copy); only the
 * language data is fetched from the CDN.
 */
const WORKER_OPTIONS = {
	workerPath: `${base}tesseract/worker.min.js`,
	corePath: `${base}tesseract/`,
	langPath: "https://tessdata.projectnaptha.com/4.0.0",
};

let workerPromise: Promise<Worker> | null = null;

function getWorker(onStatus?: (msg: string) => void): Promise<Worker> {
	if (!workerPromise) {
		workerPromise = createWorker("eng", 1, {
			...WORKER_OPTIONS,
			logger: (m) => {
				if (m.status && onStatus) {
					onStatus(`${m.status} ${Math.round((m.progress ?? 0) * 100)}%`);
				}
			},
		});
	}
	return workerPromise;
}

export interface OcrResult {
	text: string;
	confidence: number;
	/** Numeric tokens extracted from the text (e.g. "2,992,500"). */
	numbers: string[];
}

/** PSM presets: 7 = single line, 6 = block, 8 = single word. */
export type Psm = "6" | "7" | "8";

const PSM_MAP: Record<Psm, PSM> = {
	"6": PSM.SINGLE_BLOCK,
	"7": PSM.SINGLE_LINE,
	"8": PSM.SINGLE_WORD,
};

/**
 * Recognise text in a canvas. Converts to grayscale first (helps the engine on
 * coloured backgrounds), then runs Tesseract with the chosen whitelist + PSM.
 */
export async function recognize(
	canvas: HTMLCanvasElement,
	charMode: CharMode,
	psm: Psm,
	onStatus?: (msg: string) => void,
): Promise<OcrResult> {
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (ctx) {
		const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const px = id.data;
		for (let i = 0; i < px.length; i += 4) {
			const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
			px[i] = g;
			px[i + 1] = g;
			px[i + 2] = g;
		}
		ctx.putImageData(id, 0, 0);
	}

	const worker = await getWorker(onStatus);
	await worker.setParameters({
		tessedit_char_whitelist: WHITELIST[charMode],
		tessedit_pageseg_mode: PSM_MAP[psm],
	});
	const { data } = await worker.recognize(canvas);
	const text = (data.text ?? "").trim();
	const numbers = (text.match(/\d[\d,]*/g) ?? []).filter(
		(n) => n.replace(/\D/g, "").length >= 1,
	);
	return { text, confidence: data.confidence ?? 0, numbers };
}

/** Terminate the shared worker (e.g. on unmount). */
export async function terminateOcr(): Promise<void> {
	if (workerPromise) {
		const worker = await workerPromise;
		await worker.terminate();
		workerPromise = null;
	}
}
