import { useEffect, useRef, useState } from "react";
import type { SourceImage } from "../hooks/useSourceImage";
import { cropToCanvas } from "../lib/crop";
import { type CharMode, type OcrResult, type Psm, recognize } from "../lib/ocr";
import type { Rect } from "../lib/types";

interface ScorePanelProps {
	source: SourceImage | null;
	sel: Rect | null;
	scale: number;
	onScale: (scale: number) => void;
}

function coordsText(sel: Rect | null, source: SourceImage | null): string {
	if (!sel || !source) return "領域はまだ未検出";
	const f = (n: number) => n.toFixed(4);
	// Relative coords are scale-invariant. px is reported in the original
	// screenshot's resolution (the working image may be downscaled).
	const o = (n: number) => Math.round(n / source.scale);
	const rel = `x=${f(sel.x / source.width)} y=${f(sel.y / source.height)} w=${f(sel.w / source.width)} h=${f(sel.h / source.height)}`;
	return `px : x=${o(sel.x)} y=${o(sel.y)} w=${o(sel.w)} h=${o(sel.h)}\n相対: ${rel}`;
}

export function ScorePanel({ source, sel, scale, onScale }: ScorePanelProps) {
	const previewRef = useRef<HTMLCanvasElement>(null);
	const [charMode, setCharMode] = useState<CharMode>("digits");
	const [psm, setPsm] = useState<Psm>("7");
	const [running, setRunning] = useState(false);
	const [status, setStatus] = useState("");
	const [result, setResult] = useState<OcrResult | null>(null);

	useEffect(() => {
		const canvas = previewRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		if (!source || !sel) {
			canvas.width = 10;
			canvas.height = 10;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			return;
		}
		const crop = cropToCanvas(source.canvas, sel, scale);
		canvas.width = crop.width;
		canvas.height = crop.height;
		ctx.drawImage(crop, 0, 0);
	}, [source, sel, scale]);

	const onDownload = () => {
		if (!source || !sel) return;
		const crop = cropToCanvas(source.canvas, sel, 1);
		const a = document.createElement("a");
		a.download = "score-crop.png";
		a.href = crop.toDataURL("image/png");
		a.click();
	};

	const onRunOcr = async () => {
		if (!source || !sel) return;
		setRunning(true);
		setResult(null);
		setStatus("エンジン初期化中…");
		try {
			const crop = cropToCanvas(source.canvas, sel, scale);
			const res = await recognize(crop, charMode, psm, setStatus);
			setResult(res);
			setStatus(
				res.text
					? `OCR完了 — 信頼度 ${Math.round(res.confidence)}%`
					: "認識できず",
			);
		} catch (e) {
			setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			setRunning(false);
		}
	};

	const copy = (n: string) => navigator.clipboard?.writeText(n);

	return (
		<div className="space-y-3">
			<h2 className="text-xs font-bold uppercase tracking-wider text-sky-300">
				検出されたスコア領域
			</h2>
			<canvas
				ref={previewRef}
				className="min-h-12 w-full rounded-lg border border-slate-600 bg-white [image-rendering:pixelated]"
			/>
			<pre className="overflow-auto rounded-lg border border-slate-600 bg-slate-800 p-2 font-mono text-xs text-sky-300">
				{coordsText(sel, source)}
			</pre>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onDownload}
					disabled={!sel}
					className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 disabled:opacity-40"
				>
					この領域をPNG保存
				</button>
				<button
					type="button"
					onClick={onRunOcr}
					disabled={!sel || running}
					className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-orange-950 disabled:opacity-40"
				>
					{running ? "OCR中…" : "OCR(任意)"}
				</button>
			</div>

			{result && result.numbers.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{result.numbers.map((n, i) => (
						<button
							// biome-ignore lint/suspicious/noArrayIndexKey: OCR tokens may repeat; the list is static per result
							key={`${n}-${i}`}
							type="button"
							onClick={() => copy(n)}
							className="rounded-lg border border-sky-700 bg-sky-900/50 px-3 py-1.5 font-mono text-base font-bold text-sky-200"
						>
							{n}
						</button>
					))}
				</div>
			)}

			<textarea
				value={result?.text ?? ""}
				readOnly
				placeholder="OCRの生結果(任意)"
				className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 p-2 font-mono text-sm text-slate-100"
			/>
			{status && <p className="text-xs text-slate-400">{status}</p>}

			<h2 className="pt-2 text-xs font-bold uppercase tracking-wider text-sky-300">
				OCR設定
			</h2>
			<div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
				<label className="flex flex-col gap-1">
					文字
					<select
						value={charMode}
						onChange={(e) => setCharMode(e.target.value as CharMode)}
						className="rounded-lg border border-slate-600 bg-slate-800 p-1.5 text-slate-100"
					>
						<option value="digits">数字 (0-9 ,)</option>
						<option value="roman">ローマ数字</option>
						<option value="free">制限なし</option>
					</select>
				</label>
				<label className="flex flex-col gap-1">
					PSM
					<select
						value={psm}
						onChange={(e) => setPsm(e.target.value as Psm)}
						className="rounded-lg border border-slate-600 bg-slate-800 p-1.5 text-slate-100"
					>
						<option value="7">1行</option>
						<option value="6">ブロック</option>
						<option value="8">1単語</option>
					</select>
				</label>
				<label className="flex flex-col gap-1">
					<span>
						拡大 <span className="font-bold text-sky-300">{scale}×</span>
					</span>
					<input
						type="range"
						min={1}
						max={6}
						step={1}
						value={scale}
						onChange={(e) => onScale(Number(e.target.value))}
						className="accent-orange-500"
					/>
				</label>
			</div>
		</div>
	);
}
