import { rgbCss } from "../lib/crop";
import type { IsolateParams, Rgb } from "../lib/types";
import type { Mode } from "./Stage";

interface ControlsProps {
	disabled: boolean;
	mode: Mode;
	zoom: number;
	scoreOnly: boolean;
	params: IsolateParams;
	bg: Rgb | null;
	onDetect: () => void;
	onModeChange: (mode: Mode) => void;
	onZoom: (zoom: number) => void;
	onScoreOnly: (on: boolean) => void;
	onParams: (params: IsolateParams) => void;
	onLoad: () => void;
	onReset: () => void;
}

export function Controls({
	disabled,
	mode,
	zoom,
	scoreOnly,
	params,
	bg,
	onDetect,
	onModeChange,
	onZoom,
	onScoreOnly,
	onParams,
	onLoad,
	onReset,
}: ControlsProps) {
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					disabled={disabled}
					onClick={onDetect}
					className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-orange-950 disabled:opacity-40"
				>
					▶ 自動でスコアを検出
				</button>
				<span className="text-xs text-slate-400">うまくいかない時:</span>
				<div className="inline-flex overflow-hidden rounded-lg border border-slate-600">
					{(["pick", "drag"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => onModeChange(m)}
							className={`px-3 py-2 text-sm font-bold ${
								mode === m
									? "bg-orange-500 text-orange-950"
									: "bg-slate-800 text-slate-400"
							}`}
						>
							{m === "pick" ? "スポイト" : "手動ドラッグ"}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
				<label className="flex flex-col gap-1">
					<span>
						表示ズーム{" "}
						<span className="font-bold text-sky-300">{zoom.toFixed(1)}×</span>
					</span>
					<input
						type="range"
						min={1}
						max={6}
						step={0.5}
						value={zoom}
						onChange={(e) => onZoom(Number(e.target.value))}
						className="accent-orange-500"
					/>
				</label>
				<label className="flex items-center gap-2 text-slate-100">
					<input
						type="checkbox"
						checked={scoreOnly}
						onChange={(e) => onScoreOnly(e.target.checked)}
					/>
					右下のスコア行だけに絞る
				</label>
			</div>

			<div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
				<label className="flex flex-col gap-1">
					<span>
						右側の開始位置{" "}
						<span className="font-bold text-sky-300">
							{params.rstart.toFixed(2)}
						</span>
					</span>
					<input
						type="range"
						min={0}
						max={0.7}
						step={0.05}
						value={params.rstart}
						onChange={(e) =>
							onParams({ ...params, rstart: Number(e.target.value) })
						}
						className="accent-orange-500"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span>
						文字検出の感度{" "}
						<span className="font-bold text-sky-300">{params.inktol}</span>
					</span>
					<input
						type="range"
						min={20}
						max={130}
						step={5}
						value={params.inktol}
						onChange={(e) =>
							onParams({ ...params, inktol: Number(e.target.value) })
						}
						className="accent-orange-500"
					/>
				</label>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onClick={onLoad}
					className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100"
				>
					画像を選ぶ
				</button>
				<button
					type="button"
					onClick={onReset}
					className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100"
				>
					リセット
				</button>
				<span className="flex items-center gap-2 text-xs text-slate-400">
					背景色
					<span
						className="inline-block h-4 w-4 rounded border border-slate-600"
						style={{ background: bg ? rgbCss(bg) : "#333" }}
					/>
				</span>
			</div>
		</div>
	);
}
