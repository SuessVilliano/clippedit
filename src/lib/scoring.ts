export interface MomentumInput {
  viewersNow: number;
  viewers5mAgo?: number | null;
  viewers15mAgo?: number | null;
  creatorMedianViewers?: number | null;
  observationAgeSeconds?: number;
}

export interface MomentumResult {
  growth5mPct: number | null;
  growth15mPct: number | null;
  audienceRatio: number | null;
  score: number;
  stale: boolean;
}

const clamp = (x: number, min: number, max: number) =>
  Math.min(max, Math.max(min, x));

const growthPct = (now: number, prev?: number | null) => {
  if (prev == null) return null;
  return ((now - prev) / Math.max(prev, 1)) * 100;
};

const normalize = (x: number, min: number, max: number) =>
  clamp((x - min) / (max - min), 0, 1);

export function calculateMomentum(input: MomentumInput): MomentumResult {
  const stale = (input.observationAgeSeconds ?? 0) > 180;
  if (stale) {
    return {
      growth5mPct: null,
      growth15mPct: null,
      audienceRatio: null,
      score: 0,
      stale: true
    };
  }

  const growth5 = growthPct(input.viewersNow, input.viewers5mAgo);
  const growth15 = growthPct(input.viewersNow, input.viewers15mAgo);
  const ratio =
    input.creatorMedianViewers && input.creatorMedianViewers > 0
      ? input.viewersNow / input.creatorMedianViewers
      : null;

  const parts: Array<[number, number]> = [];

  if (growth5 != null) {
    parts.push([0.25, normalize(clamp(growth5, -100, 500), -100, 500)]);
  }
  if (growth15 != null) {
    parts.push([0.20, normalize(clamp(growth15, -100, 500), -100, 500)]);
  }
  if (ratio != null) {
    parts.push([0.20, normalize(clamp(ratio, 0, 10), 0, 10)]);
  }

  // Absolute reach carries the largest single weight so that meaningful
  // audience wins over a large percentage spike on a tiny stream.
  const absoluteReach = Math.log10(input.viewersNow + 10);
  parts.push([0.35, normalize(absoluteReach, 1, 5)]);

  const totalWeight = parts.reduce((sum, [w]) => sum + w, 0);
  const weighted = parts.reduce((sum, [w, v]) => sum + w * v, 0);

  return {
    growth5mPct: growth5,
    growth15mPct: growth15,
    audienceRatio: ratio,
    score: Math.round((weighted / Math.max(totalWeight, 0.0001)) * 100),
    stale: false
  };
}

export function calculateClipViewsPerHour(
  views: number,
  createdAt: Date,
  now = new Date()
) {
  const ageHours = Math.max(
    (now.getTime() - createdAt.getTime()) / 3_600_000,
    0.25
  );
  return views / ageHours;
}
