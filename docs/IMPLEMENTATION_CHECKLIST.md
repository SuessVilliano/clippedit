# Implementation Checklist

## Repo
- [ ] Install dependencies
- [ ] Configure lint/test
- [ ] Add CI
- [ ] Configure environment handling

## Database
- [ ] Create Supabase project
- [ ] Apply schema
- [ ] Add RLS policies
- [ ] Add indexes after profiling
- [ ] Seed topics/platform data

## Twitch
- [ ] Register application
- [ ] App token flow
- [ ] Live stream adapter
- [ ] Clip adapter
- [ ] Rate limiter
- [ ] API mocks/tests

## Kick
- [ ] Register developer app
- [ ] OAuth/token flow
- [ ] Live stream adapter
- [ ] Stats integration
- [ ] Event subscriptions where useful
- [ ] Rate limiter
- [ ] API mocks/tests

## Workers
- [ ] Watchlist scheduler
- [ ] Stream upsert
- [ ] Snapshots
- [ ] Offline detection
- [ ] Scoring
- [ ] Clip refresh
- [ ] Alerts

## UI
- [ ] Live
- [ ] Trending
- [ ] Emerging
- [ ] Creator detail
- [ ] Watchlists
- [ ] Alerts
- [ ] Freshness/error states

## AI
- [ ] Topic taxonomy
- [ ] Structured extraction
- [ ] Entity normalization
- [ ] Story clustering
- [ ] Confidence model
- [ ] Cost limits

## Rights
- [ ] Rights mode in DB
- [ ] Creator connection scopes
- [ ] Privileged-action audit log
- [ ] Takedown/report flow
- [ ] No arbitrary media downloading

## Integrations
- [ ] Opus
- [ ] TradeHybrid.tv
- [ ] Social publishing
- [ ] Analytics feedback

## Production
- [ ] Observability
- [ ] Error tracking
- [ ] Backups
- [ ] Retention policy
- [ ] Privacy policy
- [ ] Terms
