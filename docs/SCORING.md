# Scoring Model

## Viewer velocity
`viewer_velocity = (v_now - v_prev) / minutes`

`viewer_growth_pct = ((v_now - v_prev) / max(v_prev, 1)) * 100`

## Baseline anomaly
Maintain creator median, p75/p90, mean/stddev, and typical growth by stream age.

`audience_ratio = v_now / max(creator_median_viewers, 1)`

## Momentum score
Combine 5m growth, 15m growth, creator-relative audience ratio, and absolute reach. Percentage growth alone must not let a tiny 2→10 stream automatically outrank a meaningful 5,000→12,000 breakout.

Suggested weights:
- 30% 5m growth
- 25% 15m growth
- 25% audience ratio
- 20% absolute reach

Scale to 0–100.

## Clip velocity
`age_hours = max(age, 0.25)`

`views_per_hour = view_count / age_hours`

When snapshots exist, prefer delta velocity:

`(views_now - views_previous) / elapsed_hours`

## Clip breakout score
Combine clip velocity percentile, creator-relative performance, source stream momentum, and cross-platform topic spread.

## Emerging score
Favor anomaly strength × velocity acceleration × multi-source confirmation × freshness decay.

## Story confidence
Increase confidence when multiple independent creators discuss the same entity/topic within a tight window and their audience/clip activity accelerates together.
