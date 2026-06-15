import { useEffect, useRef } from "react";
import type { SourceImage } from "../hooks/useSourceImage";
import { cropToCanvas } from "../lib/crop";
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
	const rel = `x=${f(sel.x / source.width)} y=${f(sel.y / source.height)} w=${f(sel.w / source.width)} h=${f(sel.h / source.height)}`;
	return `px : x=${sel.x} y=${sel.y} w=${sel.w} h=${sel.h}\n相対: ${rel}`;
}

export function ScorePanel({ source, sel, scale, onScale }: ScorePanelProps) {
	const previewRef = useRef<HTMLCanvasElement>(null);

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
			</div>
			<label className="flex flex-col gap-1 text-xs text-slate-400">
				<span>
					プレビュー拡大{" "}
					<span className="font-bold text-sky-300">{scale}×</span>
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
	);
}
