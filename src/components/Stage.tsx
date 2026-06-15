import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import type { SourceImage } from "../hooks/useSourceImage";
import type { Rect } from "../lib/types";

export type Mode = "pick" | "drag";

interface StageProps {
	source: SourceImage | null;
	dispScale: number;
	band: Rect | null;
	sel: Rect | null;
	mode: Mode;
	onPick: (ix: number, iy: number) => void;
	onDragRect: (rect: Rect) => void;
	onRequestFile: () => void;
}

const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v));

function overlayStyle(rect: Rect | null, scale: number): React.CSSProperties {
	if (!rect) return { display: "none" };
	return {
		display: "block",
		left: rect.x * scale,
		top: rect.y * scale,
		width: rect.w * scale,
		height: rect.h * scale,
	};
}

export function Stage({
	source,
	dispScale,
	band,
	sel,
	mode,
	onPick,
	onDragRect,
	onRequestFile,
}: StageProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const dragStart = useRef<{ ix: number; iy: number } | null>(null);
	const [dragRect, setDragRect] = useState<Rect | null>(null);

	// Render the source image onto the display canvas at the current scale.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !source) return;
		canvas.width = Math.round(source.width * dispScale);
		canvas.height = Math.round(source.height * dispScale);
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.drawImage(source.canvas, 0, 0, canvas.width, canvas.height);
	}, [source, dispScale]);

	if (!source) {
		return (
			<button
				type="button"
				onClick={onRequestFile}
				className="flex min-h-56 w-full items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-8 text-center text-sm text-slate-400 hover:border-orange-400"
			>
				タップで画像を選択
				<br />
				(ドラッグ&ドロップも可)
			</button>
		);
	}

	const toImage = (e: ReactPointerEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return { ix: 0, iy: 0 };
		const r = canvas.getBoundingClientRect();
		return {
			ix: clamp((e.clientX - r.left) / dispScale, 0, source.width),
			iy: clamp((e.clientY - r.top) / dispScale, 0, source.height),
		};
	};

	const onPointerDown = (e: ReactPointerEvent) => {
		if (mode !== "drag") return;
		const { ix, iy } = toImage(e);
		dragStart.current = { ix, iy };
		setDragRect({ x: ix, y: iy, w: 0, h: 0 });
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: ReactPointerEvent) => {
		if (mode !== "drag" || !dragStart.current) return;
		const { ix, iy } = toImage(e);
		const s = dragStart.current;
		setDragRect({
			x: Math.min(s.ix, ix),
			y: Math.min(s.iy, iy),
			w: Math.abs(ix - s.ix),
			h: Math.abs(iy - s.iy),
		});
	};

	const onPointerUp = (e: ReactPointerEvent) => {
		if (mode === "pick") {
			const { ix, iy } = toImage(e);
			onPick(ix, iy);
			return;
		}
		const r = dragRect;
		dragStart.current = null;
		setDragRect(null);
		if (r && r.w > 3 && r.h > 3) onDragRect(r);
	};

	return (
		<div
			className="relative inline-block"
			style={{
				cursor: mode === "pick" ? "cell" : "crosshair",
				touchAction: "none",
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			<canvas ref={canvasRef} className="block" />
			<div
				className="pointer-events-none absolute border border-dashed border-sky-300"
				style={overlayStyle(band, dispScale)}
			/>
			<div
				className="pointer-events-none absolute border-2 border-orange-400 bg-orange-400/15"
				style={overlayStyle(dragRect ?? sel, dispScale)}
			/>
		</div>
	);
}
