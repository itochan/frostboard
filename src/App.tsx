import { type DragEvent, useEffect, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { ScorePanel } from "./components/ScorePanel";
import { type Mode, Stage } from "./components/Stage";
import { useDetectionWorker } from "./hooks/useDetectionWorker";
import { useSourceImage } from "./hooks/useSourceImage";
import {
	DEFAULT_PARAMS,
	type IsolateParams,
	type Rect,
	type Rgb,
} from "./lib/types";

function App() {
	const { source, load, reset } = useSourceImage();
	const { ready, auto, pick, isolate } = useDetectionWorker(source);
	const fileRef = useRef<HTMLInputElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const isolateSeq = useRef(0);

	const [params, setParams] = useState<IsolateParams>(DEFAULT_PARAMS);
	const [scoreOnly, setScoreOnly] = useState(true);
	const [zoom, setZoom] = useState(1);
	const [mode, setMode] = useState<Mode>("pick");
	const [previewScale, setPreviewScale] = useState(3);

	const [band, setBand] = useState<Rect | null>(null);
	const [sel, setSel] = useState<Rect | null>(null);
	const [bg, setBg] = useState<Rgb | null>(null);
	const [status, setStatus] = useState("");

	const [containerW, setContainerW] = useState(640);

	// Track the stage container width for fit-to-width scaling.
	useEffect(() => {
		const el = stageRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) setContainerW(e.contentRect.width);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const baseFit = source ? Math.min(1, (containerW - 4) / source.width) : 1;
	const dispScale = baseFit * zoom;

	// Recompute the score selection whenever an auto/picked band or the tuning
	// parameters change. Manual drag selections leave band === null and are
	// kept as-is.
	useEffect(() => {
		if (!ready || !band || !bg) return;
		if (!scoreOnly) {
			setSel(band);
			return;
		}
		const seq = ++isolateSeq.current;
		isolate(band, bg, params).then((r) => {
			if (seq !== isolateSeq.current) return; // a newer request superseded this one
			if (r) {
				setSel(r);
				setStatus(`検出完了 — スコア領域 ${r.w}×${r.h}px`);
			} else {
				setSel(band);
				setStatus("スコア行を分離できず。感度/開始位置を調整、または手動で。");
			}
		});
	}, [ready, band, bg, params, scoreOnly, isolate]);

	const loadFile = (file: File) => {
		setBand(null);
		setSel(null);
		setBg(null);
		setStatus("");
		load(file).catch((e) => setStatus(`読み込み失敗: ${e.message}`));
	};

	const onDetect = async () => {
		const res = await auto();
		if (!res) {
			setStatus(
				"帯を自動検出できませんでした。スポイトで青い背景をタップしてください。",
			);
			return;
		}
		setBg(res.bg);
		setBand(res.rect);
	};

	const onPick = async (ix: number, iy: number) => {
		const res = await pick(ix, iy);
		if (!res) {
			setStatus("青い背景の余白をタップしてください。");
			return;
		}
		setBg(res.bg);
		setBand(res.rect);
	};

	const onDragRect = (rect: Rect) => {
		setBand(null);
		setSel(rect);
		setStatus(`手動選択 — ${rect.w}×${rect.h}px`);
	};

	const onReset = () => {
		reset();
		setBand(null);
		setSel(null);
		setBg(null);
		setStatus("");
	};

	const onDrop = (e: DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file?.type.startsWith("image/")) loadFile(file);
	};

	return (
		<main className="min-h-dvh bg-slate-950 text-slate-100">
			<div className="mx-auto max-w-5xl px-4 py-6">
				<header className="mb-5">
					<h1 className="text-xl font-extrabold">スコア領域 自動検出</h1>
					<p className="text-sm text-slate-400">
						帯を自動検出 →
						投影法で右下のスコア行だけを抽出。OCRは任意。全部ローカル処理。
					</p>
				</header>

				<div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
					<section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
						<Controls
							disabled={!ready}
							mode={mode}
							zoom={zoom}
							scoreOnly={scoreOnly}
							params={params}
							bg={bg}
							onDetect={onDetect}
							onModeChange={setMode}
							onZoom={setZoom}
							onScoreOnly={setScoreOnly}
							onParams={setParams}
							onLoad={() => fileRef.current?.click()}
							onReset={onReset}
						/>
						{/* biome-ignore lint/a11y/noStaticElementInteractions: drop target */}
						<div
							ref={stageRef}
							onDragOver={(e) => e.preventDefault()}
							onDrop={onDrop}
							className="mt-3 max-h-[58vh] overflow-auto rounded-xl border border-dashed border-slate-700 bg-slate-800/40"
						>
							<Stage
								source={source}
								dispScale={dispScale}
								band={band}
								sel={sel}
								mode={mode}
								onPick={onPick}
								onDragRect={onDragRect}
								onRequestFile={() => fileRef.current?.click()}
							/>
						</div>
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							hidden
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) loadFile(file);
							}}
						/>
						{status && <p className="mt-3 text-xs text-amber-300">{status}</p>}
					</section>

					<section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
						<ScorePanel
							source={source}
							sel={sel}
							scale={previewScale}
							onScale={setPreviewScale}
						/>
					</section>
				</div>
			</div>
		</main>
	);
}

export default App;
