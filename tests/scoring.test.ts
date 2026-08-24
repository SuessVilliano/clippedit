import { describe, expect, it } from "vitest";
import { calculateMomentum, calculateClipViewsPerHour } from "../src/lib/scoring";

describe("calculateMomentum", () => {
  it("handles missing history without fabricating growth", () => {
    const r = calculateMomentum({ viewersNow: 100 });
    expect(r.growth5mPct).toBeNull();
    expect(r.growth15mPct).toBeNull();
  });

  it("marks stale observations", () => {
    const r = calculateMomentum({
      viewersNow: 1000,
      viewers5mAgo: 500,
      observationAgeSeconds: 181
    });
    expect(r.stale).toBe(true);
    expect(r.score).toBe(0);
  });

  it("rewards rapid medium-stream acceleration", () => {
    const fast = calculateMomentum({
      viewersNow: 1200,
      viewers5mAgo: 700,
      viewers15mAgo: 400,
      creatorMedianViewers: 350
    });
    const flat = calculateMomentum({
      viewersNow: 1500,
      viewers5mAgo: 1480,
      viewers15mAgo: 1450,
      creatorMedianViewers: 1400
    });
    expect(fast.score).toBeGreaterThan(flat.score);
  });

  it("does not let tiny percentage growth automatically dominate meaningful reach", () => {
    const tiny = calculateMomentum({
      viewersNow: 10,
      viewers5mAgo: 2,
      viewers15mAgo: 2,
      creatorMedianViewers: 3
    });
    const major = calculateMomentum({
      viewersNow: 12000,
      viewers5mAgo: 5000,
      viewers15mAgo: 4000,
      creatorMedianViewers: 4500
    });
    expect(major.score).toBeGreaterThan(tiny.score);
  });
});

describe("calculateClipViewsPerHour", () => {
  it("uses a floor for very new clips", () => {
    const now = new Date("2026-08-24T12:00:00Z");
    const created = new Date("2026-08-24T11:55:00Z");
    expect(calculateClipViewsPerHour(1000, created, now)).toBe(4000);
  });
});
