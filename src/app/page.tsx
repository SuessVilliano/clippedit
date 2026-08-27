import Link from "next/link";
import { getLiveData } from "@/lib/api-data";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const features: Array<[string, string, string]> = [
  ["📡", "Cross-platform radar", "Twitch and Kick in one live view — who's breaking out right now, ranked by momentum instead of raw totals."],
  ["✂️", "Most clipped", "The clips gaining views fastest across the hottest categories, so you catch what's spreading while it's still spreading."],
  ["🎯", "Clip Radar", "Smart moments to clip — live breakouts to capture and viral clips to ride — scored from current momentum and velocity."],
  ["🛡️", "Rights-aware", "Every export runs through an authorization gate. Your content and licensed content only — never blind reposting."]
];

export default async function HomePage() {
  const live = await getLiveData();
  const top = [...live.streams]
    .sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0))
    .slice(0, 12);
  const totalViewers = live.streams.reduce((sum, s) => sum + (s.viewers ?? 0), 0);

  return (
    <main className="container">
      <section className="hero">
        <span className="eyebrow">
          <span className="live-dot" /> Real-time livestream intelligence
        </span>
        <h1>
          Catch the moment <span className="grad-text">before it breaks.</span>
        </h1>
        <p>
          Clipped It watches Twitch and Kick in real time — detecting breakout
          streams, the most-clipped moments, and emerging stories before the
          leaderboards catch up. Then it hands you the best moments to clip.
        </p>
        <div className="hero-cta">
          <Link href="/radar" className="cta primary">
            Open Clip Radar →
          </Link>
          <Link href="/live" className="cta ghost">
            See who's live
          </Link>
        </div>

        <div className="ticker-wrap">
          <div className="ticker-head">
            {live.mode === "unconfigured" ? (
              <>Live ticker · connect a platform to light this up</>
            ) : (
              <>
                <span className="live-dot" /> Live now ·{" "}
                {formatNumber(totalViewers)} watching across {top.length}+ streams
              </>
            )}
          </div>
          <div className="ticker">
            {top.length === 0 ? (
              <div className="ticker-item" style={{ color: "var(--muted)" }}>
                Add Twitch credentials to stream real-time data →
              </div>
            ) : (
              top.map((s) => (
                <div key={s.id} className="ticker-item">
                  <span className={`badge plat ${s.platform}`} style={{ position: "static" }}>
                    {s.platform}
                  </span>
                  <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.displayName}
                  </span>
                  <span className="tv">{formatNumber(s.viewers)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2 style={{ fontSize: 24 }}>Built to find what's next</h2>
        <Link href="/trending">Explore trending →</Link>
      </div>
      <div className="feature-grid">
        {features.map(([icon, title, desc], i) => (
          <div className="feature" key={title} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="fi">{icon}</div>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2 style={{ fontSize: 24 }}>From signal to finished clip</h2>
      </div>
      <div className="feature-grid">
        {[
          ["1", "Detect", "Momentum + velocity scoring surfaces the streams and clips breaking out across platforms right now."],
          ["2", "Decide", "Clip Radar ranks the exact moments worth clipping, blending live breakouts with clips already going viral."],
          ["3", "Produce", "Confirm your rights, then send the moment to production — cut, caption, reframe, export. You control every step."]
        ].map(([n, title, desc], i) => (
          <div className="feature" key={title} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="fi" style={{ background: "var(--grad-brand)", color: "#06131a", fontWeight: 700 }}>
              {n}
            </div>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
