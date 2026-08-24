# Alert Rules

## Viewer breakout
```json
{
  "type": "stream_viewer_growth",
  "window_minutes": 15,
  "growth_pct_gte": 200,
  "minimum_viewers": 250
}
```

## Absolute threshold
```json
{
  "type": "stream_viewers",
  "viewers_gte": 1000
}
```

## Clip velocity
```json
{
  "type": "clip_velocity",
  "views_per_hour_gte": 5000,
  "minimum_age_minutes": 10
}
```

## Multi-creator topic
```json
{
  "type": "topic_spread",
  "distinct_creators_gte": 3,
  "window_minutes": 30,
  "topic": "openai"
}
```

## Anti-spam
Every rule needs cooldown, dedupe key, minimum freshness, and threshold-crossing behavior instead of firing every poll.

## Future destinations
In-app, email, Slack/Discord, webhook, push, and VITURE/operator overlay.
