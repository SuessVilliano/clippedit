# Rights, Platform Rules, and Content Safety

This is product design guidance, not legal advice.

## Core rule
**Publicly viewable does not equal authorized for download, transformation, or commercial reposting.**

Separate these modes:
- **Discovery** — lawful public metadata and official APIs.
- **Embed** — platform-supported player/embed with attribution.
- **Creator-authorized processing** — connected creator grants required scopes/rights.
- **Licensed content** — separate contractual permission.
- **Editorial use** — commentary/reporting/criticism/analysis subject to review.

## Rights fields
Every media object should track:
- `rights_mode`: metadata_only, official_embed, creator_authorized, licensed, editorial_review, blocked
- `authorization_connection_id`
- `license_reference`
- `source_attribution`
- `processing_allowed`
- `commercial_use_allowed`
- expiration where relevant

## Block by default
Do not strip watermarks, auto-download arbitrary third-party streams, auto-repost clips as owned, fabricate quotes, bypass access controls, or evade rate limits.

## Creator connections
Record platform, creator ID, granted scopes, token expiry, authorization time, revocation, and every privileged media action with scope used.

## Takedowns
Support creator/source reports, admin blocklists, fast disable, audit logs, and removal of Clipped It-controlled derivative assets.

## Editorial integrity
AI summaries must remain linked to supporting source records. Low-confidence claims should be flagged and speculation must not be turned into factual headlines.
