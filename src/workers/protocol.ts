import type { IsolateParams, Rect, Rgb } from "../lib/types";

/** Messages sent from the main thread to the detection worker. */
export type DetectRequest =
	| {
			id: number;
			kind: "setImage";
			data: Uint8ClampedArray;
			width: number;
			height: number;
	  }
	| { id: number; kind: "auto" }
	| { id: number; kind: "pick"; x: number; y: number }
	| { id: number; kind: "isolate"; band: Rect; bg: Rgb; params: IsolateParams };

/** Replies sent from the worker back to the main thread (keyed by request id). */
export interface DetectResponse {
	id: number;
	/** setImage acknowledgement. */
	ack?: boolean;
	/** auto / pick result (null = nothing found). */
	band?: Rect | null;
	bg?: Rgb | null;
	/** isolate result (null = no score line). */
	sel?: Rect | null;
}
