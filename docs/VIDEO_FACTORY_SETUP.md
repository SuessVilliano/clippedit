# Video Factory — Setup & Next Steps

What's built so far, and exactly what you need to do to see it working end to end.

## What works right now (in this PR)

- **Video Factory board** at `/video-factory` (Kanban by status).
- **Send to Video Factory** button on the Release Queue → creates a `video_job`
  (idempotent — no duplicates).
- **Generate content** on a job → produces 3 faceless Shorts: title options,
  hook, a first-person **voiceover script you record in your own voice**, CTA,
  descriptions, hashtags, a **thumbnail concept + image prompt**, a visual
  timeline, **screen-capture requirements**, and **per-platform social posts**
  (YouTube / IG / FB / TikTok / X) — all copy-ready for GHL.
- **Short detail screen** at `/video-factory/[jobId]/short/[index]` with
  copy buttons for scripts, descriptions, image prompts, and each social post.

All of this works **with no new keys** using the deterministic template. With
your LLM key it writes far better copy (same key Release Spy already uses).

## Step 0 — Prove it right now (no setup, no keys)

On the live app, open **/video-factory** → the **"Try it now"** panel at the top.
Paste a HighLevel update title + notes (or a public URL to fetch) → **Generate 3
Shorts**. You immediately see scripts, social posts, and thumbnail concepts.
Nothing is saved — this needs no migration and no keys (it uses the LLM key the
app already has for sharper copy; without it you still get the full structure).

To render a **real thumbnail image** from the concept, set `OPENAI_API_KEY` and
click **Render thumbnail** on any Short. That's the only key needed for images.

The steps below are for the *persistent, automated* pipeline (jobs saved, the
Release watcher auto-creating them). Do them once you're happy with Step 0.

## Step 1 — Run the database migration (required for saved jobs)

The new tables live in `supabase/migrations/20260910_video_factory.sql`.
Apply it to your Supabase project (any one of these):

- Supabase Dashboard → SQL Editor → paste the file → Run, **or**
- `supabase db push` if you use the Supabase CLI, **or**
- psql: `psql "$SUPABASE_DB_URL" -f supabase/migrations/20260910_video_factory.sql`

It only **adds** tables (`video_jobs`, `video_assets`, `video_renders`,
`provider_runs`, `publication_jobs`) — nothing existing is changed.

## Step 2 — Env vars

Already set for the app today (keep as-is): `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and the Release Spy LLM keys
(`LLM_API_KEY` / `LLM_API_URL` / `LLM_MODEL`) — the content generator reuses these.

Add when you want the matching capability (all optional for now):

| Var | Needed for | Status |
| --- | --- | --- |
| `LLM_API_KEY` | Best-quality scripts/social (else template) | you likely have this |
| `OPENAI_API_KEY` + `OPENAI_TTS_MODEL`/`OPENAI_TTS_VOICE` | TTS **fallback** voice | optional — your own voice is primary |
| `OPENAI_API_KEY` | Thumbnail **image** generation (next build) | optional |
| `SV_ENGINE_URL` + `SV_ENGINE_TOKEN` | VoxCPM voice / HeyGen avatar / b-roll / ffmpeg render via the engine | needed for auto voice + render |
| `OPENART_API_KEY`/`_URL`, `HIGGSFIELD_API_KEY`/`_URL` | AI stills / cinematic b-roll | leave blank until their APIs are confirmed |

`VIDEO_FACTORY_ENABLED` defaults on; set to `false` to hide the feature.

## Step 3 — Try it

1. Open **Release Queue** → click **Send to Video Factory** on a release.
2. Open **Video Factory** → click the new card → **Generate content**.
3. Open a Short → read/copy the script, thumbnail prompt, and social posts.

## 🔴 Step 4 — Rotate the leaked engine secrets (do this regardless)

`sv-content-engine/SV_ENGINE_MEMORY.md` has committed live keys (fal.ai + GHL
PIT token). Rotate both at fal.ai and HighLevel. I can scrub them from the file
into env vars on request — but rotation is the real fix since they're in git
history.

## What's still manual / not built yet

- **Voice audio**, **thumbnail image files**, **AI b-roll**, and the **final
  render** are not generated yet — those are the next builds (voice/thumbnail/
  b-roll workers → engine render). Today you get the full *plan + copy*, you
  record and assemble.
- **Publishing** is intentionally off (review-first). `publication_jobs` exists
  for when we turn on GHL Social Planner / YouTube.
- **Screen-recording upload slots** appear on the Short screen next build.

## Next step I recommend

Run Step 1 (migration) + Step 4 (rotate keys), then tell me to wire the
**engine worker** (`SV_ENGINE_URL`) so voice + render run automatically, or the
**OpenAI thumbnail image** worker so thumbnails render in-app. Either is the next
increment.
