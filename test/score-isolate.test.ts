import { describe, expect, it } from "vitest";
import { autoBand } from "../src/lib/band-detect";
import { isolateScore } from "../src/lib/score-isolate";
import { makeBandImage, makeScreenshot } from "./fixtures";

/** Inclusive overlap test between two rectangles. */
function overlaps(
	a: { x: number; y: number; w: number; h: number },
	b: { x: number; y: number; w: number; h: number },
): boolean {
	return (
		a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
	);
}

describe("isolateScore", () => {
	it("returns the bottom-right score number, excluding name/rank/avatar", () => {
		const { img, w, h, layout } = makeBandImage();
		const box = isolateScore(img, { x: 0, y: 0, w, h }, [68, 153, 221]);

		expect(box).not.toBeNull();
		if (!box) return;

		// Tight around the score run (pad = 4 on each side).
		expect(box.x).toBeGreaterThanOrEqual(layout.score.x - 6);
		expect(box.x).toBeLessThanOrEqual(layout.score.x + 6);
		expect(box.y).toBeGreaterThanOrEqual(layout.score.y - 6);
		expect(box.w).toBeGreaterThanOrEqual(200); // a wide multi-digit number

		// Lives in the right zone (the tall rank on the left is excluded).
		expect(box.x).toBeGreaterThanOrEqual(Math.floor(w * 0.35));

		// Does not bleed up into the name row.
		expect(overlaps(box, layout.name)).toBe(false);
	});

	it("returns null when the band has no ink in the right zone", () => {
		const { img, w, h } = makeBandImage();
		// A right zone starting past all ink → nothing to find.
		const box = isolateScore(img, { x: 0, y: 0, w, h }, [68, 153, 221], {
			rstart: 0.99,
			inktol: 55,
			satMax: 0.45,
		});
		expect(box).toBeNull();
	});
});

describe("autoBand", () => {
	it("finds the blue band's bounding box on a full screenshot", () => {
		const { img, band } = makeScreenshot();
		const result = autoBand(img);

		expect(result).not.toBeNull();
		if (!result) return;

		// Background colour is recognised as the highlight blue.
		expect(result.bg[2]).toBeGreaterThan(result.bg[0]); // blue dominates red

		// The detected rect covers the painted band (allow a few px of slack
		// from downscale rounding).
		expect(result.rect.x).toBeLessThanOrEqual(band.x + 6);
		expect(result.rect.y).toBeLessThanOrEqual(band.y + 6);
		expect(result.rect.x + result.rect.w).toBeGreaterThanOrEqual(
			band.x + band.w - 6,
		);
		expect(result.rect.y + result.rect.h).toBeGreaterThanOrEqual(
			band.y + band.h - 6,
		);
	});
});

describe("autoBand + isolateScore end to end", () => {
	it("locates the score within the auto-detected band", () => {
		const { img, layout } = makeScreenshot();
		const detected = autoBand(img);
		expect(detected).not.toBeNull();
		if (!detected) return;

		const box = isolateScore(img, detected.rect, detected.bg);
		expect(box).not.toBeNull();
		if (!box) return;

		// The score box overlaps the painted score and not the name row.
		expect(overlaps(box, layout.score)).toBe(true);
		expect(overlaps(box, layout.name)).toBe(false);
	});
});
