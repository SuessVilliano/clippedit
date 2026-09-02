"use client";

import type { ClipCard, Moment, StreamCard } from "@/lib/api-data";
import { formatNumber, relativeTime } from "@/lib/format";
import { ClipButton } from "@/components/ClipButton";
import { LibraryActions } from "@/components/LibraryActions";

function Thumb({ src, alt, overlay }: { src: string | null; alt: string; overlay?: React.ReactNode }) {
  return (
    <div className="thumb-wrap">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "var(--grad-brand)", opacity: 0.12 }} />
      )}
      <div className="thumb-grad" />
      {overlay}
    </div>
  );
}

function velocityInsight(c: ClipCard) {
  const vph = c.viewsPerHour ?? 0;
  const views = c.views ?? 0;
  const age = c.ageHours ?? 24;
  const velocityShare = views > 0 ? Math.min(1, vph / views) : 0;
  const recency = Math.max(0, 1 - age / 24);
  const score = Math.round(Math.min(100, Math.log10(vph + 1) * 18 + velocityShare * 35 + recency * 20));
  const label = score >= 85 ? "Exploding" : score >= 70 ? "Breaking out" : score >= 55 ? "Rising fast" : score >= 35 ? "Active" : "Steady";
  return { score, label };
}

export function StreamCardView({ s, index = 0 }: { s: StreamCard; index?: number }) {
  const item = {
    id: s.id,
    kind: "stream" as const,
    platform: s.platform,
    title: s.title || s.displayName,
    creator: s.displayName,
    category: s.category,
    url: s.url,
    thumbnailUrl: s.thumbnailUrl,
    metric: `${formatNumber(s.viewers)} watching`,
    score: s.momentum
  };
  return (
    <article className="card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
      <Thumb
        src={s.thumbnailUrl}
        alt={s.displayName}
        overlay={
          <>
            <span className="badge live"><span className="live-dot" /> LIVE</span>
            <span className={`badge plat ${s.platform}`}>{s.platform}</span>
            <span className="badge viewers">{formatNumber(s.viewers)} watching</span>
          </>
        }
      />
      <div className="card-body">
        <div className="card-head">
          {s.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={s.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : <div className="avatar" />}
          <div style={{ minWidth: 0 }}>
            <div className="card-name">{s.displayName}</div>
            <div className="card-sub">{s.category ?? "—"} · {relativeTime(s.observedAt)}</div>
          </div>
        </div>
        {s.title ? <div className="card-title">{s.title}</div> : null}
        <div className="meter">
          <div className="meter-track"><div className="meter-fill" style={{ width: `${s.momentum ?? 0}%` }} /></div>
          <span className="meter-num">{s.momentum ?? "—"}</span>
        </div>
        <div className="stats">
          <div className="stat"><div className="label">Viewers</div><div className="value">{formatNumber(s.viewers)}</div></div>
          <div className="stat"><div className="label">5m growth</div><div className={`value ${(s.growth5mPct ?? 0) >= 0 ? "up" : "down"}`}>{s.growth5mPct == null ? "—" : `${s.growth5mPct >= 0 ? "▲" : "▼"} ${Math.abs(s.growth5mPct).toFixed(0)}%`}</div></div>
          <div className="stat"><div className="label">Momentum</div><div className="value">{s.momentum ?? "—"}/100</div></div>
        </div>
        <LibraryActions item={item} />
        <div className="card-actions">
          {s.url ? <a className="btn" href={s.url} target="_blank" rel="noreferrer">Watch</a> : null}
          <ClipButton target={{ id: s.id, title: s.title || s.displayName, platform: s.platform, creator: s.displayName, category: s.category, url: s.url, thumbnailUrl: s.thumbnailUrl, metric: `${formatNumber(s.viewers)} watching`, score: s.momentum, kind: "live" }} />
        </div>
      </div>
    </article>
  );
}

export function ClipCardView({ c, index = 0 }: { c: ClipCard; index?: number }) {
  const heat = velocityInsight(c);
  const item = {
    id: c.id,
    kind: "clip" as const,
    platform: c.platform,
    title: c.title ?? "Untitled clip",
    creator: c.creator,
    url: c.url,
    thumbnailUrl: c.thumbnailUrl,
    metric: `${formatNumber(c.viewsPerHour)} views/hr`,
    score: heat.score
  };
  return (
    <article className="card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
      <Thumb
        src={c.thumbnailUrl}
        alt={c.title ?? "clip"}
        overlay={
          <>
            {index < 3 ? <span className="badge rank">#{index + 1}</span> : null}
            <span className={`badge plat ${c.platform}`}>{c.platform}</span>
            <span className="badge viewers">{formatNumber(c.views)} views</span>
          </>
        }
      />
      <div className="card-body">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="pill">⚡ {heat.label}</span>
          <span className="card-sub">Heat {heat.score}/100</span>
        </div>
        <div className="card-title" style={{ WebkitLineClamp: 2, opacity: 1, fontWeight: 600 }}>{c.title ?? "Untitled clip"}</div>
        <div className="card-sub">{c.creator ? `by ${c.creator}` : "—"}{c.ageHours != null ? ` · ${c.ageHours}h old` : ""}</div>
        <div className="stats">
          <div className="stat"><div className="label">Views/hr</div><div className="value up">{formatNumber(c.viewsPerHour)}</div></div>
          <div className="stat"><div className="label">Total views</div><div className="value">{formatNumber(c.views)}</div></div>
          <div className="stat"><div className="label">Age</div><div className="value">{c.ageHours == null ? "—" : `${c.ageHours}h`}</div></div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginTop: 8 }}>
          {heat.score >= 70 ? "High velocity relative to age — prioritize for review before the window cools." : "Useful discovery signal; compare creator relevance and context before producing."}
        </div>
        <LibraryActions item={item} />
        <div className="card-actions">
          {c.url ? <a className="btn" href={c.url} target="_blank" rel="noreferrer">Open</a> : null}
          <ClipButton target={{ id: c.id, title: c.title ?? "Clip", platform: c.platform, creator: c.creator, url: c.url, thumbnailUrl: c.thumbnailUrl, metric: `${formatNumber(c.viewsPerHour)} views/hr`, score: heat.score, kind: "clip" }} label="Produce" />
        </div>
      </div>
    </article>
  );
}

export function MomentCardView({ m, index = 0 }: { m: Moment; index?: number }) {
  const item = {
    id: m.id,
    kind: "moment" as const,
    platform: m.platform,
    title: m.title,
    creator: m.subtitle,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    metric: m.metric,
    score: m.score
  };
  return (
    <article className="card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
      <Thumb
        src={m.thumbnailUrl}
        alt={m.title}
        overlay={
          <>
            <span className="badge live" style={m.kind === "clip" ? { background: "rgba(56,189,248,0.9)" } : undefined}>{m.kind === "live" ? <><span className="live-dot" /> LIVE NOW</> : "TRENDING CLIP"}</span>
            <span className={`badge plat ${m.platform}`}>{m.platform}</span>
            <span className="badge viewers">{m.metric}</span>
          </>
        }
      />
      <div className="card-body">
        <div className="card-title" style={{ opacity: 1, fontWeight: 600 }}>{m.title}</div>
        {m.subtitle ? <div className="card-sub">{m.subtitle}</div> : null}
        <div className="meter"><div className="meter-track"><div className="meter-fill" style={{ width: `${m.score}%` }} /></div><span className="meter-num">{m.score}</span></div>
        <div className="pill" style={{ alignSelf: "flex-start" }}>⚡ {m.reason}</div>
        <LibraryActions item={item} />
        <div className="card-actions" style={{ marginTop: 10 }}>
          {m.url ? <a className="btn" href={m.url} target="_blank" rel="noreferrer">{m.kind === "live" ? "Watch live" : "Open clip"}</a> : null}
          <ClipButton target={{ id: m.id, title: m.title, platform: m.platform, creator: m.subtitle, url: m.url, thumbnailUrl: m.thumbnailUrl, metric: m.metric, score: m.score, kind: m.kind }} />
        </div>
      </div>
    </article>
  );
}
