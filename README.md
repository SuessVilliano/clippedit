# Clipped It — Codex Build Kit

A Codex-ready product and engineering package for a real-time livestream intelligence, trend detection, creator-authorized clipping, and media distribution platform.

## Core idea

Clipped It monitors public livestream metadata and clip activity across supported platforms, detects breakout moments early, ranks clips and creators by velocity rather than raw totals, clusters related moments into stories, and gives creators/editors a legal, authorization-aware workflow for creating and publishing derivative content.

The platform is intentionally split into two layers:

1. **Intelligence layer** — discover live streams, viewer growth, clip activity, topics, momentum, and emerging stories.
2. **Rights-aware media layer** — embed source content, create clips only where platform/user authorization permits, and support commentary/editorial workflows rather than blind downloading/reposting.

## MVP

- Twitch live ingest
- Kick live ingest
- creator/channel watchlists
- 1/5/15/60 minute viewer-history snapshots
- live momentum score
- public clip discovery where official APIs permit it
- clip velocity score
- topic/entity classification
- duplicate/story clustering
- Live Now dashboard
- Trending dashboard
- Emerging dashboard
- creator profiles
- alert rules
- Supabase/Postgres persistence
- scheduled workers
- API adapters isolated by platform
- rights/authorization state on every media object

## Recommended stack

- Next.js 15+
- TypeScript
- Tailwind CSS
- Supabase/Postgres
- Supabase Auth
- Redis/Upstash for short-lived queues/caches (optional in MVP)
- Inngest / Trigger.dev / cron workers for scheduled ingest
- OpenAI-compatible LLM interface for classification/summarization
- Twitch Helix API
- Kick Developer Public API
- Opus integration as a later creator-authorized export step

## Codex start order

1. Read `docs/PRD.md`.
2. Read `docs/ARCHITECTURE.md`.
3. Apply `supabase/schema.sql`.
4. Implement platform adapters under `src/lib/platforms`.
5. Implement worker loop from `docs/INGEST_WORKERS.md`.
6. Implement scoring functions from `src/lib/scoring.ts`.
7. Build dashboard routes.
8. Add tests.
9. Do not implement automatic third-party video downloading unless the creator/platform authorization explicitly permits it.

## Important

Public accessibility of a video does **not** mean the application has rights to download, transform, or commercially repost it. The product should maintain explicit rights metadata and favor official embeds for discovery/editorial use unless creator authorization exists.

See `docs/RIGHTS_AND_SAFETY.md`.

## Environment variables

Copy `.env.example` to `.env.local`.

## Suggested first milestone

A working dashboard that can answer:

- Who in my watchlist is live right now?
- What is their current viewer count?
- How fast is that count changing?
- Which monitored streams are breaking out?
- What are the top public clips in the monitored universe?
- Which clips are growing fastest relative to their age?
- Which emerging topics are appearing across multiple creators?
