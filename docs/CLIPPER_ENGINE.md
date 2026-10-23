# Clipped It: clipper engine rollout

Research and implementation baseline: October 23, 2026.

## Decision

Build the discovery, education, assignments, review and earnings operations around a proven clipping engine first. Use an Opus integration for long-form clipping when API access and commercial terms are confirmed. Keep a manual editor handoff usable immediately. Add native editing capabilities incrementally after measuring demand and costs. Treat Perplexity as an optional research layer; confirm whether the requested video competitor was actually a different product.

## What this increment implements

- /discover: YouTube creator search, creator videos ordered by view count or date, and regional most-popular videos. Uses official Data API metadata. YOUTUBE_API_KEY is server-only; without it, the page explains the manual workflow. The displayed creator results are search matches, not an invented global creator ranking. A creator search returns up to 24 matching videos, not an exhaustive channel archive.
- /studio: selected video link, editing brief, rights confirmation and a copyable manual handoff to an external editor. No rendering job, billing or export is claimed.
- /earn: opportunity directory with Content Rewards and Whop links, direct retainer and commissioned/affiliate models. No scraped or fabricated campaign inventory.
- /academy: six-step clipper playbook plus instructions for a small paid team pilot.
- Navigation and landing page now expose the clipping business workflow.
- Existing clip actions lead to Studio instead of showing a nonexistent queued job.

Not yet implemented: account onboarding, tenant roles, persisted assignments, integrated rendering/export, publishing OAuth, credit purchases, earnings verification, payroll or payouts. Nothing has been deployed by this change.

## Competitor capability plan

| Capability | Initial route | Later work |
| --- | --- | --- |
| Popular creator/source discovery | YouTube Data API plus existing Twitch/Kick discovery | Saved creators, authorized source libraries, topic research |
| Highlight selection, captions, reframing | Manual Opus handoff | Server-side Opus adapter and durable jobs |
| Transcript editing, templates, export | Existing editor account | Embedded/native workflow only if API and licensing support it |
| Voiceovers, audio enhancement, B-roll | Existing Opus/Crayo tools | Provider adapters with per-feature costs and consent |
| Faceless stories, text videos, generated media | External Crayo workflow | Prioritize only when demanded by paying users |
| Social publishing and scheduling | Manual post + submission | Destination OAuth, human approval, durable publish queue |
| Opportunities and payouts | External campaign/client agreement | Recorded terms, submission URLs, verified settlement imports |
| Teams and training | Playbook + shared tracker | Accounts, roles, claims, deadlines, QA and compensation ledger |

A marketing claim of full Crayo/Opus parity would be inaccurate today. API integration does not automatically grant access to every editor UI feature or the right to resell the service; confirm provider agreement and costs first.

## Revenue model

1. Managed clipping service: acquire creators/brands with their own footage and recurring editing needs. Sell a scoped monthly package with delivery count, revision limit and approval SLA. Pay clippers under an agreed compensation model.
2. Paid campaign participation: choose eligible campaigns and authorized footage; record rules and actual settled earnings. View-based revenue is variable and capped.
3. SaaS: offer the academy/discovery entry point, then editing credits and team subscriptions after usage and cost measurement. Do not charge workers merely to access promised work.
4. Affiliate/brand commissions and owned-channel revenue: secondary income; use authorized content, required disclosures and platform eligibility. YouTube reused-content rules apply separately from copyright permission.

Price credits from measured ingestion/transcription/render/storage/egress costs. Reserve credits atomically on job creation; settle once on success; release or reconcile failures. Deduplicate provider submissions and payment webhooks. Never count a retry as another successful export. Keep customer credit balances separate from worker compensation and external campaign estimates.

Contribution margin = settled client/campaign receipts - clipper pay - rendering/tools - processing/platform fees - revisions/refunds and operations.

Do not assign SaaS prices or promise income until the pilot provides actual costs and acceptance rates.

## Paid pilot

Start with one niche, a small cohort, one clear brief and paid sample edits. Use an approved source library. Record clipper, campaign/client, source permission, due date, reviewer, rejection reason, public post URL, eligible views, estimated rewards, settled receipts and worker payment separately. Review every first edit. Scale after repeatable acceptance and positive contribution margin, rather than raw view counts.

## Engineering sequence

1. Configure and verify YouTube discovery; restrict the key to the YouTube Data API and add distributed quota controls before opening search to a large audience.
2. Add authenticated workspaces and roles; persist assignments and source licenses with access controls. Require commercial-use scope and campaign requirements.
3. Confirm Opus API terms/key, implement a server-only provider adapter, durable queue, idempotency, callbacks/polling and output review. Keep provider errors and keys out of the client. Do not add a public unauthenticated paid-render endpoint.
4. Persist external submissions and settled revenue, with evidence and reconciliation. No payout estimates presented as cash balances.
5. Add destination OAuth and approved publishing, then metered billing and credit ledger.
6. Add recruitment/application flow, QA dashboard and compensation administration.

## Verification and limits

TypeScript and existing tests pass at the initial checkpoint. Add request-level tests for channel sorting and provider failures. Real YouTube responses require a configured key; do not substitute example views as live data. Rendering cannot be tested until an editor/API account is connected. Production activation requires deployment and runtime configuration.

## Sources

- Crayo capabilities: https://crayo.ai/
- Opus capabilities: https://www.opus.pro/
- Opus API and sample clip-project request: https://www.opus.pro/api
- YouTube creator/video search: https://developers.google.com/youtube/data/reference/rest/v3/search/list
- YouTube video statistics and popular chart: https://developers.google.com/youtube/data/reference/rest/v3/videos/list
- Content Rewards campaigns: https://contentrewards.com/creators
- Current creator terms and relationship to the earlier Whop experience: https://contentrewards.com/terms
- YouTube monetization/reused content: https://support.google.com/youtube/answer/1311392

Whop listings can overlap with Content Rewards. Verify each campaign's actual payer; do not count listing aggregators as additional income sources. Current Content Rewards terms identify a 10% creator fee on CPM, with different treatment for some per-post/retainer campaigns; capture the actual applicable terms per campaign. Avoid hardcoding changing rates or fees into a revenue promise.

## Elevate launch increment

- Reconciled with origin/main through 38a5c48; preserves Library, Spy, Release Spy, Video Factory and source settings.
- Elevate Clippers public landing page and global Clip Coach. Coach uses AI Gateway when available, with explicit guided fallback. It can prepare Studio links and explain the workflow; it cannot render or publish autonomously.
- Studio calls the official Opus create-project and exportable-clips endpoints with a user-provided API key held only in page memory. Requires source rights and credit confirmation. No company key configured.
- Private accounts, team hiring/assignment persistence, company billing, automatic publishing and payouts remain future work. Rendering integration requires a user's API-enabled Opus plan and credits.
