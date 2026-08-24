# Technical Architecture

## Principles
1. Platform adapters isolate API differences.
2. Store normalized objects plus raw payloads.
3. Time-series snapshots are append-only.
4. Scoring is deterministic before AI enrichment.
5. Rights state is first-class data.
6. Public discovery and authorized media processing stay separate.

## Services
- **Next.js web app** — dashboard and APIs.
- **Ingest workers** — Twitch/Kick live streams, clip metadata, snapshots, state changes.
- **Scoring worker** — viewer momentum, anomaly, clip velocity, breakout score.
- **AI enrichment worker** — topics, entities, summaries, clustering.
- **Alert worker** — evaluates user rules.

## Platform adapter
```ts
interface PlatformAdapter {
  platform: "twitch" | "kick";
  getLiveStreams(input: LiveQuery): Promise<NormalizedStream[]>;
  getPublicClips?(input: ClipQuery): Promise<NormalizedClip[]>;
}
```

## Polling
- Live watchlist creators: target ~1 minute when API budgets permit.
- Offline creators: ~5 minutes.
- Broader niche discovery: 5–15 minutes.
- Prefer official event/webhook subscriptions for state transitions where available.

## Jobs
- `platform.twitch.refresh-live`
- `platform.kick.refresh-live`
- `platform.twitch.refresh-clips`
- `scoring.recalculate-stream`
- `scoring.recalculate-clip`
- `ai.enrich-stream`
- `ai.enrich-clip`
- `story.cluster`
- `alert.evaluate`

## Security
Secrets and OAuth tokens server-side only, encrypted refresh tokens, RLS for user-owned records, explicit scope logging for privileged media actions.

## Observability
Track API requests/errors/rate limits, ingest delay, status transitions, scoring latency, enrichment cost, and alerts emitted.
