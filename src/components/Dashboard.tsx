import type { DashboardPayload, StreamCard } from "@/lib/api-data";

function formatNumber(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function relativeTime(iso: string | null): string {
  if (!iso) return "unknown";
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function Growth({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="value">—</span>;
  const up = pct >= 0;
  return (
    <span className={`value ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Card({ s, metric }: { s: StreamCard; metric: "momentum" | "viewers" }) {
  const watchUrl =
    s.platform === "twitch" && s.login
      ? `https://twitch.tv/${s.login}`
      : s.platform === "kick" && s.login
        ? `https://kick.com/${s.login}`
        : undefined;

  return (
    <article className="card">
      <div className="top">
        {/* Avatars come from platform CDNs; plain img keeps this a pure RSC. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="avatar"
          src={s.avatarUrl ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
        />
        <div style={{ minWidth: 0 }}>
          <div className="name">
            {watchUrl ? (
              <a href={watchUrl} target="_blank" rel="noreferrer">
                {s.displayName}
              </a>
            ) : (
              s.displayName
            )}
          </div>
          <div className="sub">
            {s.category ?? "—"} · {relativeTime(s.observedAt)}
          </div>
        </div>
        <span className="pill" style={{ marginLeft: "auto" }}>
          <span className="dot" /> {s.platform}
        </span>
      </div>

      {s.title ? <div className="title">{s.title}</div> : null}

      <div className="stats">
        <div className="stat">
          <div className="label">Viewers</div>
          <div className="value">{formatNumber(s.viewers)}</div>
        </div>
        <div className="stat">
          <div className="label">Momentum</div>
          <div className="value">{s.momentum ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="label">5m growth</div>
          <Growth pct={s.growth5mPct} />
        </div>
      </div>
    </article>
  );
}

export function Dashboard({
  payload,
  title,
  subtitle,
  metric = "momentum"
}: {
  payload: DashboardPayload;
  title: string;
  subtitle: string;
  metric?: "momentum" | "viewers";
}) {
  return (
    <main className="container">
      <div className="page-head">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {payload.note ? (
        <div className={`banner ${payload.mode}`}>
          <span>ⓘ</span>
          <span>{payload.note}</span>
        </div>
      ) : null}

      <div className="meta">
        <span>
          Source:{" "}
          {payload.mode === "database"
            ? "live database"
            : payload.mode === "preview"
              ? "Twitch preview"
              : "not configured"}
        </span>
        <span>Platforms: {payload.configured.platforms.join(", ") || "none"}</span>
        <span>Updated {relativeTime(payload.generatedAt)}</span>
        <span>{payload.streams.length} streams</span>
      </div>

      {payload.streams.length === 0 ? (
        <div className="empty">
          No live streams to show yet.
          {payload.mode === "unconfigured"
            ? " Add credentials in your environment to begin."
            : " Check back once an ingest cycle has run."}
        </div>
      ) : (
        <div className="grid">
          {payload.streams.map((s) => (
            <Card key={s.id} s={s} metric={metric} />
          ))}
        </div>
      )}
    </main>
  );
}
