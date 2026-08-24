# Opus + TradeHybrid.tv Integration

## Goal
Use Clipped It as the intelligence and orchestration layer. Do not make Opus or TradeHybrid.tv required for the first monitoring MVP.

## Own livestream flow
OBS/livestream → Kick/Twitch/YouTube → Clipped It detects marked/high-scoring moments → authorized recording/VOD reference → Opus processing → human approval → YouTube Shorts/TikTok/Reels/X/TradeHybrid.tv.

## Connected creator flow
Creator OAuth/authorization → Clipped It → authorized clip/export workflow → Opus → approval → destinations.

## Third-party discovery
Public metadata → Clipped It ranking → official embed/source link → editorial queue. Do not automatically pipe third-party public content into Opus merely because it is viewable.

## Clip markers
Support OBS hotkeys, Stream Deck/webhooks, chat commands, and transcript markers such as “clip that.” Store stream ID, timestamp, marker type, note, and user.

## TradeHybrid.tv programming
Potential channels:
- TradeHybrid Live
- AI / Build Mode
- Market Recaps
- The Command Center
- Weekly Trend Rundown
- Best authorized clips
- After Hours

## Publishing payload
```json
{
  "asset_id": "uuid",
  "title": "Example",
  "description": "Example",
  "source_type": "owned_or_authorized",
  "video_url": "signed-or-hosted-url",
  "thumbnail_url": "https://...",
  "tags": ["ai", "trading"],
  "publish_at": null,
  "rights": {
    "mode": "creator_authorized",
    "commercial_use_allowed": true
  }
}
```
TradeHybrid.tv consumes only approved assets.
