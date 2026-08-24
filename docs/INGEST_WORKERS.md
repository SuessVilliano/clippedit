# Ingest Workers

## Twitch
Use official Helix endpoints.

### Live streams
Use `GET /helix/streams` and normalize stream ID, creator ID/login/name, category, title, viewer count, start time, language, tags, and observation time.

### Clips
Use `GET /helix/clips` with broadcaster/category and date-window filters where applicable. Persist clip ID, creator, title, created time, duration, view count, source/embed/thumbnail fields supplied by Twitch, raw payload, and observation time.

Treat clip creation/download as privileged operations requiring the correct user/broadcaster/editor authorization.

## Kick
Use the official Kick Developer Public API for livestreams, livestream statistics, users/channels/categories, and event subscriptions where supported. Keep all Kick schema assumptions isolated in the adapter.

## Scheduler
```ts
for each platform:
  creators = activeWatchlistCreators(platform)
  live = platform.getLiveStreams(creators)
  for stream in live:
    upsertStream(stream)
    appendStreamSnapshot(stream)
    calculateMomentum(stream)
  markMissingPreviouslyLiveStreamsOffline()
```

## Idempotency
Use deterministic uniqueness such as `(stream_id, captured_at_bucket)` and `(clip_id, captured_at_bucket)` so retries are safe.

## Rate limits
Do not hard-code assumptions. Add per-platform limiting, response-header handling, exponential backoff, jitter, and logging.

## Freshness
Every UI metric must expose `last observed at` and never present stale snapshots as genuinely real-time.
