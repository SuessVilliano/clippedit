# Clipped It — Livestream Intelligence

A real-time livestream intelligence, trend detection, and rights-aware media platform. The MVP web app (Next.js 15 + Supabase) is wired and runs today; the docs below capture the full product vision.

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in what you have (see below)
npm run dev                  # http://localhost:3000
npm test                     # scoring unit tests
npm run build                # production build
```

The app runs in three modes and degrades gracefully — it never crashes on missing keys:

| Mode | When | What you get |
| --- | --- | --- |
| **unconfigured** | no keys | Live UI with clear "add credentials" prompts |
| **preview** | `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` set | Real top Twitch streams, ranked by reach-based momentum (no history yet) |
| **database** | Supabase also configured + ingest run | Full momentum history, emerging detection, offline reconciliation |

### Going live (checklist)

1. **Twitch** — register an app at <https://dev.twitch.tv/console>, set `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`. Public reads use the app (client-credentials) token; no user login required.
2. **Supabase** — create a project, apply `supabase/schema.sql`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Ingest** — set `CRON_SECRET`. The scheduled worker lives at `GET /api/cron/ingest` (auth: `Authorization: Bearer $CRON_SECRET`). `vercel.json` schedules it daily (Hobby-plan limit); upgrade to Pro and raise the frequency for fresher history. Live viewing does not depend on the cron — the dashboards read Twitch in real time on each request; the cron only accumulates momentum **history**. Trigger a snapshot manually anytime with `curl "$URL/api/cron/ingest?secret=$CRON_SECRET"`.
4. **Kick** (optional) — set `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET`; the adapter is isolated and failures are contained per-platform.
5. **Deploy** — push to Vercel (or any Node host). Add the same env vars in the host dashboard.

### Routes

- `/` landing · `/live` Live Radar · `/trending` Trending · `/emerging` Emerging
- `GET /api/live` · `GET /api/trending` · `GET /api/emerging` — dashboard JSON
- `GET|POST /api/cron/ingest` — scheduled ingest (secret-protected)

---

*Original build-kit overview follows.*

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
