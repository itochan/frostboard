import { autoBand } from "../lib/band-detect";
import { bandFromSeed } from "../lib/eyedropper";
import { isolateScore } from "../lib/score-isolate";
import type { ImageLike } from "../lib/types";
import type { DetectRequest, DetectResponse } from "./protocol";

// Structural typing of the dedicated worker scope, to avoid pulling in the
// webworker lib (which conflicts with the project's DOM lib).
const ctx = self as unknown as {
	onmessage: ((e: MessageEvent<DetectRequest>) => void) | null;
	postMessage: (message: DetectResponse) => void;
};

// The image pixels are sent once per loaded image and reused for every request.
let image: ImageLike | null = null;

ctx.onmessage = (e: MessageEvent<DetectRequest>) => {
	const msg = e.data;
	switch (msg.kind) {
		case "setImage":
			image = { data: msg.data, width: msg.width, height: msg.height };
			ctx.postMessage({ id: msg.id, ack: true });
			return;
		case "auto": {
			const r = image ? autoBand(image) : null;
			ctx.postMessage({ id: msg.id, band: r?.rect ?? null, bg: r?.bg ?? null });
			return;
		}
		case "pick": {
			const r = image ? bandFromSeed(image, msg.x, msg.y) : null;
			ctx.postMessage({ id: msg.id, band: r?.rect ?? null, bg: r?.bg ?? null });
			return;
		}
		case "isolate": {
			const sel = image
				? isolateScore(image, msg.band, msg.bg, msg.params)
				: null;
			ctx.postMessage({ id: msg.id, sel });
			return;
		}
	}
};
