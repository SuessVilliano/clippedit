# Codex Master Prompt

You are building **Clipped It**, a production-quality real-time livestream intelligence platform.

Before changing code:
1. Read README.md.
2. Read docs/PRD.md.
3. Read docs/ARCHITECTURE.md.
4. Read docs/RIGHTS_AND_SAFETY.md.
5. Inspect the existing repository.
6. Make the smallest coherent implementation that advances the current milestone.

## Product rules
- Separate public metadata intelligence from privileged media processing.
- Never add arbitrary third-party video downloading.
- Prefer official Twitch and Kick APIs over scraping.
- Keep platform-specific payloads behind adapter interfaces.
- Store raw source payloads alongside normalized fields.
- Every stream/clip metric shown in the UI must include freshness/observation time.
- Every media object must have a rights mode.
- AI may enrich records but must not be required for basic ingest/scoring.
- TypeScript strict mode.
- Validate external API payloads with Zod.
- Idempotent workers.
- Handle API errors/rate limits explicitly.
- Add tests for scoring.
- Do not hard-code secrets.

## Milestone 1
Implement:
- Supabase schema
- Twitch adapter
- Kick adapter
- watchlist CRUD
- stream ingest worker
- stream snapshots
- momentum scoring
- `/live` dashboard
- creator detail page
- mock/dev mode when API credentials are absent

## UI
Premium dark command-center aesthetic; clean typography; information dense but not cluttered; Bloomberg/terminal inspiration without copying; responsive mobile layout. Momentum and acceleration are the strongest signals.

## Live card fields
Platform, creator, avatar if available, title, category, viewers, 5m growth, 15m growth, momentum, live duration, observed-at timestamp.

## Data integrity
When no previous snapshot exists, history-dependent components must be null/neutral rather than fabricated.

## Tests
Cover zero-viewer baseline, tiny-stream percentage spikes, declining stream, stable large stream, rapidly accelerating medium stream, and stale observations.

After each task, explain files changed, migrations required, environment variables needed, and remaining blockers.
