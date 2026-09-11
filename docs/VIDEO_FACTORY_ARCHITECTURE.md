# Clipped It — Video Factory V1 Architecture

**Status:** V1 design / merge contract (approved direction: *hybrid brain + worker*).
**Scope:** How `clippedit` (this repo) and `sv-content-engine` (the Python engine)
combine into one Video Factory without rebuilding either. This is the plan we
align on **before** writing production code.

---

## 1. The two repos, and why we do NOT literally merge them

We have two mature codebases that do different jobs on different runtimes:

| | `clippedit` (this repo) | `sv-content-engine` |
|---|---|---|
| Stack | Next.js 15 / React 19 / TypeScript | Python 3 / Flask |
| Runtime | Vercel (serverless, cloud, always-on) | Local-first (Mac + GPU: ComfyUI, VoxCPM, ffmpeg) |
| Storage | Supabase (Postgres) | Local filesystem + Cloudflare R2 + Google Drive |
| Strength | **Discover + Understand + Review**: Release Radar detection, dedupe, LLM content packages, review UI, cron | **Create + Assemble**: voice (VoxCPM), avatar (HeyGen), b-roll (ComfyUI / fal Kling·Seedance·Veo), **ffmpeg render**, beat-synced music edits, GHL Social Planner posting |

A literal merge (Python inside the Next repo, or vice-versa) does not work and is
not desirable:

- **Vercel cannot run the engine.** ComfyUI, VoxCPM, whisper/librosa, and
  long ffmpeg renders need a GPU box that stays up. Vercel functions time out
  and have no GPU. So the render engine must live where it already lives.
- **Both are already good at their half.** `clippedit` is the clean cloud
  command center + review UI the master prompt describes. `sv-content-engine`
  already *is* the renderer the master prompt says we still need to build
  (ffmpeg assemble + VoxCPM voice + HeyGen avatar + beat edits), and it's free
  and local. Rebuilding that in TypeScript/Remotion would duplicate working,
  paid-for capability and throw away the HeyGen + local-voice investment.

So the "merge" is an **integration contract**, not a code transplant:

```
          ┌───────────────────────── clippedit (cloud, this repo) ──────────────────────────┐
          │  DISCOVER            UNDERSTAND            STRATEGIZE           REVIEW            │
          │  Release Radar  →    LLM content    →      Video Factory   →    Kanban + Short    │
          │  watcher/cron        package gen           orchestrator         detail UI         │
          │  (already built)     (extends Release Spy)  (new)               (new)             │
          └───────────────┬──────────────────────────────────────────────────┬──────────────┘
                          │ job spec (HTTP + shared job schema in Supabase)    │ status/assets
                          ▼                                                    ▲
          ┌───────────────────────── sv-content-engine (worker, GPU box) ─────────────────────┐
          │  CREATE                                   ASSEMBLE                                 │
          │  VoxCPM voice · HeyGen avatar ·           ffmpeg render (+ optional Remotion) ·    │
          │  ComfyUI/fal b-roll · captions            beat-synced music · looks/filters        │
          └───────────────────────────────────────────────────────────────────────────────────┘
                          │ finished MP4 + thumbnail (R2 / Drive / Supabase Storage)
                          ▼
          ┌───────────────────────── clippedit ── REVIEW → APPROVE → DISTRIBUTE ──────────────┐
          │  Ready for Review → human Approve → (later) GHL Social Planner / YouTube / Meta    │
          └───────────────────────────────────────────────────────────────────────────────────┘
```

**Roles (locked):**
- `clippedit` = orchestration, job state, content brain, review UI. **Never renders video itself in V1.**
- `sv-content-engine` = generation + render worker, reached over HTTP. It is exposed to `clippedit` through the master prompt's **provider interfaces** (`VoiceProvider`, `ImageProvider`, `VideoProvider`, `RenderProvider`) — the engine is simply the *default implementation* of those providers.
- Supabase = shared job/asset/state store (source of truth for status).
- Cloud fallbacks (OpenAI TTS, OpenAI images) exist so V1 still produces a Short when the engine box is offline — **AI b-roll and avatar are enhancements, never blockers** (master prompt §23).

---

## 2. The provider mapping (master prompt §4 → what actually exists)

The master prompt lists candidate providers. Here is how each maps to reality so
we do not invent endpoints (master prompt §29):

| Interface | Primary (default) | Fallback | Status today |
|---|---|---|---|
| `VoiceProvider` | **SV Engine → VoxCPM** (`POST /api/voice` on engine; local, $0) | **OpenAI TTS** (cloud, verifiable API) | VoxCPM works in engine; OpenAI TTS is a thin adapter to build |
| `ImageProvider` (thumbnail/stills) | **OpenAI images** (cloud, verifiable) | SV Engine still frames | OpenAI adapter to build; **OpenArt = adapter skeleton only until its API is confirmed** |
| `VideoProvider` (AI b-roll) | **SV Engine → ComfyUI/fal** (Kling·Seedance·Veo, async) | none (skip cleanly) | Engine already routes these; **Higgsfield = adapter skeleton only until its API is confirmed** |
| `AvatarProvider` (hook/CTA only) | **SV Engine → HeyGen** | skip | Engine has HeyGen wired (opt-in, `SV_ENABLE_AVATAR=1`) — *not yet validated end-to-end* |
| `RenderProvider` | **SV Engine → ffmpeg** (already assembles finished verticals) | Remotion (optional, later) | ffmpeg path exists in engine; **Remotion is deferred, not required for V1** |

> **Decision that follows from your note ("we won't need ElevenLabs, we have
> HeyGen and a free on-computer voice tool"):** ElevenLabs is dropped from V1.
> Voice = VoxCPM (engine) with OpenAI TTS as the only cloud fallback. Avatar =
> HeyGen (engine). Remotion becomes an *optional* second renderer, not the V1
> requirement — the engine's ffmpeg assembler is the V1 renderer.

---

## 3. Shared job schema (Supabase — the source of truth)

New tables in `clippedit`'s Supabase (added by migration, non-destructive — the
existing `release_content_queue`, `clips`, `streams`, etc. are untouched). These
match the master prompt §2 with the hybrid model folded in.

- **`video_jobs`** — one per Release Radar episode. `release_queue_id` (→
  `release_content_queue.id`, nullable), `source_type`, `source_url` (idempotency
  key), `title`, `status` (state machine §4), `priority`, `content_package`
  (jsonb, schema §5), `selected_short_index`, `error_message`, `retry_count`,
  timestamps.
- **`video_assets`** — one row per generated asset per short. `video_job_id`,
  `short_index`, `asset_type` (`voiceover|thumbnail|broll_video|broll_image|screen_recording|captions|render|avatar_clip`),
  `provider` (e.g. `sv-engine:voxcpm`, `openai:tts`), `provider_job_id`,
  `status`, `source_url`, `storage_path`, `mime_type`, `duration_seconds`,
  `metadata` jsonb, `error_message`, timestamps.
- **`video_renders`** — one per rendered short. `render_engine`
  (`sv-engine:ffmpeg` | `remotion`), `status`, `output_url`, `storage_path`,
  `width` (1080), `height` (1920), `fps` (30), `metadata`, timestamps.
- **`provider_runs`** — cost/telemetry ledger (master prompt §19). `provider`,
  `operation`, `request_payload`, `response_payload`, `status`, `cost_estimate`,
  `started_at`, `completed_at`, `error_message`.
- **`publication_jobs`** — built now, publishing disabled in V1 (master prompt
  §18). `platform`, `account_id`, `status`, `title`, `description`,
  `scheduled_at`, `published_at`, `external_post_id`, `external_url`, `metadata`.

Foreign keys cascade from `video_jobs`; safe indexes on
`video_jobs(status, created_at desc)`, `video_assets(video_job_id, short_index)`,
`provider_runs(video_job_id)`. Idempotency: `video_jobs.source_url` unique (mirrors
`release_content_queue.source_url unique`) so the watcher never creates duplicate
jobs (master prompt §17).

---

## 4. Job state machine (master prompt §3)

```
detected → content_generating → content_ready
        → voice_generating → assets_generating
        → waiting_for_screen_capture   (if required screen footage missing)
        → ready_to_render → rendering → ready_for_review
        → approved → scheduled → published
        → failed   (recoverable; retry_count preserved, never destroys the job)
```

Asset states: `queued → generating → ready | failed | skipped`.
Helper module `src/lib/video-factory/status.ts` owns these constants and the
legal-transition table so status strings are never scattered as literals.
**Review-first safety (§18):** nothing advances past `ready_for_review` without a
human clicking Approve. Never auto-advance a job that has provider errors, no
valid source, or missing required visual assets.

---

## 5. Content package schema (master prompt §1)

Generated by `src/lib/video-factory/content.ts`, validated with **Zod**, stored
in `video_jobs.content_package`. It is the strict shape from the master prompt —
`contentId`, `releaseTitle`, `coreThesis`, `targetAudience`, `shorts[]` (3 by
default, each with `titleOptions[5]`, `selectedTitle`, `hook`, `voiceoverScript`,
`cta`, `descriptionOptions[3]`, `selectedDescription`, `hashtags[]`, `thumbnail{}`,
`visualPlan[]`, `brollPrompts[]`, `screenCaptureRequirements[]`, `captionStyle`,
`estimatedDurationSeconds`), plus `longForm{}`.

This **extends** the existing Release Spy generator (`src/app/api/release-spy/route.ts`),
reusing its LLM plumbing (`LLM_API_KEY` / `LLM_API_URL` / `LLM_MODEL`) and its
deterministic fallback. The current Release Spy output (headline/thesis/angles/
shorts/longForm/captions/production) is a subset — the Video Factory schema is the
richer, per-short-structured superset. The content rules (§ "IMPORTANT CONTENT
RULES": no invented HighLevel capabilities, no confidential/affiliate data, no
auto affiliate link) are baked into the system prompt.

---

## 6. HTTP contract: clippedit ↔ SV Engine worker

`clippedit` talks to the engine exactly the way the engine's own dashboard does
(it already exposes `/api/command`, `/api/job/<id>`, `/api/voice`, `/api/edit`,
`/api/approve`, `/api/schedule-post`, `stream/*`). V1 adds a thin, **authenticated**
job endpoint on the engine and a client adapter in clippedit.

**clippedit side** — `src/lib/video-factory/providers/*` call the engine base URL:

```
SV_ENGINE_URL   = https://<your-engine-box-or-tunnel>     # e.g. Cloudflare Tunnel to the Mac
SV_ENGINE_TOKEN = <shared secret>                          # sent as X-SV-Token (engine already supports this)
```

Because the engine is local-first, clippedit must treat it as **optionally
reachable**: if `SV_ENGINE_URL` is unset or the health check fails, providers
report `not configured`, the step is skipped or routed to a cloud fallback, and
the job waits for retry — never crashes (master prompt §23, §5).

**engine side** — one new authenticated route family (built during implementation,
mirroring the existing job model in `engine.py`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | reachability + which capabilities are online (VoxCPM, ComfyUI, HeyGen, ffmpeg) |
| `POST` | `/api/vf/voice` | `{jobId, shortIndex, script, voice}` → `{providerJobId, status}` |
| `POST` | `/api/vf/broll` | `{jobId, shortIndex, prompt, kind}` → `{providerJobId, status}` (async) |
| `POST` | `/api/vf/render` | `{jobId, shortIndex, renderSpec}` → `{providerJobId, status}` (async) |
| `GET` | `/api/vf/status/<providerJobId>` | `{status, outputUrl?, error?}` |
| `POST` | `/api/vf/webhook` (optional) | engine → clippedit callback when a long job finishes |

Assets land in R2/Drive/Supabase Storage; the engine returns a URL (signed where
needed), clippedit records it in `video_assets`/`video_renders`. Long jobs are
**async**: clippedit stores `provider_job_id`, returns, and polls on the next
worker tick — no long-running Vercel request (master prompt §8, §10, §15).

---

## 7. Storage

Supabase Storage bucket `video-factory` for anything clippedit owns, path
`video-factory/{jobId}/short-{n}/{voice|images|video|screen|captions|render|thumbnail}/`
(master prompt §22). Engine-produced masters can stay in R2/Drive and be
referenced by URL — clippedit does not need to re-host them, only to know their
signed URL for the review player. Service-role keys stay server-only; browser
uses signed URLs.

---

## 8. Release watcher integration (master prompt §17)

Extend, don't replace, the existing flow in
`src/app/api/cron/release-watch/route.ts`:

```
YouTube Release Radar (RSS)
  → Release Spy generation (existing)
  → release_content_queue upsert (existing)
  → NEW: create video_job (idempotent on source_url) in status=detected
  → NEW: enqueue content-package generation (→ content_ready)
```

A new cron/worker endpoint `POST /api/cron/video-factory` (guarded by
`CRON_SECRET`, like the others in `vercel.json`) advances jobs one resumable step
per tick: generate content → request voice → request b-roll → evaluate screen
capture → request render → mark `ready_for_review`. Idempotent and re-entrant so a
tick can safely re-run.

---

## 9. Env vars introduced (full list in VIDEO_FACTORY_SETUP.md when built)

```
VIDEO_FACTORY_ENABLED=true
NEXT_PUBLIC_VIDEO_FACTORY_ENABLED=true

# Content brain reuses existing LLM_API_KEY / LLM_API_URL / LLM_MODEL

# Voice
VOICE_PROVIDER=sv-engine            # sv-engine | openai
OPENAI_API_KEY=                     # fallback voice + images
OPENAI_TTS_MODEL=
OPENAI_TTS_VOICE=

# Image / thumbnail
IMAGE_PROVIDER=openai               # openai | openart(skeleton) | sv-engine
OPENART_API_KEY=                    # blank until API confirmed
OPENART_API_URL=

# AI b-roll (all via engine in V1)
VIDEO_PROVIDER=sv-engine            # sv-engine | higgsfield(skeleton)
HIGGSFIELD_API_KEY=                 # blank until API confirmed
HIGGSFIELD_API_URL=

# Render
RENDER_PROVIDER=sv-engine           # sv-engine(ffmpeg) | remotion(optional)

# The engine worker
SV_ENGINE_URL=
SV_ENGINE_TOKEN=
```

No private key is ever exposed client-side; only `NEXT_PUBLIC_VIDEO_FACTORY_ENABLED`
crosses to the browser.

---

## 10. Build order (maps master prompt §26 onto the hybrid)

- **Phase A — foundation (this repo):** Supabase migration (§3 tables), TS types,
  `status.ts` state machine, Video Factory UI shell + Kanban route `/video-factory`,
  "create job from Release Queue" action. *No provider calls yet.*
- **Phase B — content + voice + thumbnail:** `content.ts` (Zod-validated §5
  package) extending Release Spy; `VoiceProvider` (SV Engine primary, OpenAI TTS
  fallback); `ImageProvider` (OpenAI); asset storage + asset UI; Short detail
  screen `/video-factory/[jobId]/short/[index]`.
- **Phase C — b-roll + screen capture:** `VideoProvider` via engine (async poll);
  manual screen-recording upload workflow + "Screen Capture Needed" UI; visual
  timeline from `visualPlan`.
- **Phase D — render:** wire `RenderProvider` to the engine's ffmpeg assembler;
  preview finished vertical in the review UI. (Remotion optional, later.)
- **Phase E — hardening:** retries, `provider_runs` logging, cost caps
  (§19 defaults: 1 voice + 1 thumbnail + max 2 b-roll clips + max 2 stills per
  short), polish, tests (§31).

Do **not** skip Phase A architecture to chase provider APIs.

---

## 11. Security — must-fix before we build (found during inspection)

`sv-content-engine/SV_ENGINE_MEMORY.md` currently has **live secrets committed to
git**:

- `fal_api_key: d8d27e53-…:12c01f9…`
- `GHL pit_token: pit-33dcb1f3-…` (+ `location_id`)

The engine's own `STUDIO.md` says any committed key should be rotated. Before the
engine is exposed to clippedit over the network, we should: (1) move these to env
vars / `.env` (already gitignored), (2) scrub them from the tracked doc, and
(3) **you rotate them** at fal.ai and HighLevel (rotation must be done by you —
removing from git history does not un-leak an already-pushed key). This is tracked
as the first task of the engine-side work.

---

## 12. What stays manual in V1 (by design)

- Logged-in HighLevel screen recordings (you upload; the UI tells you exactly what
  to capture — master prompt §9, §24).
- Final Approve on every short (§18).
- Publishing (built as `publication_jobs` but not enabled — §18).
- HeyGen avatar is opt-in and unvalidated end-to-end; test one short before batch.
- Engine box must be running/reachable for local voice + b-roll + render; cloud
  fallbacks cover voice + thumbnail when it is not.
