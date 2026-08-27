import Link from "next/link";

const modules: Array<[string, string, string]> = [
  ["/live", "LIVE RADAR", "Who is live and accelerating right now."],
  ["/trending", "TRENDING", "Top streams and clips by velocity."],
  [
    "/emerging",
    "EMERGING",
    "Small signals becoming large before the leaderboard catches up."
  ],
  [
    "/trending",
    "STORIES",
    "AI-assisted clusters connecting related moments across creators."
  ]
];

export default function HomePage() {
  return (
    <main className="container">
      <p style={{ letterSpacing: 4, opacity: 0.55, marginTop: 32 }}>CLIPPED IT</p>
      <h1 style={{ fontSize: 56, maxWidth: 850, lineHeight: 1.02, margin: "8px 0" }}>
        Real-time intelligence for livestream culture.
      </h1>
      <p style={{ maxWidth: 720, opacity: 0.7, fontSize: 20 }}>
        Detect breakout streams, fast-moving clips, and emerging stories before
        total-view leaderboards catch up.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link
          href="/live"
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            background: "var(--accent)",
            color: "#04120c",
            fontWeight: 600
          }}
        >
          Open Live Radar →
        </Link>
        <Link
          href="/trending"
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            color: "var(--text)"
          }}
        >
          See Trending
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginTop: 48
        }}
      >
        {modules.map(([href, title, description]) => (
          <Link
            key={title}
            href={href}
            className="card"
            style={{ borderRadius: 16, padding: 24 }}
          >
            <strong>{title}</strong>
            <p style={{ opacity: 0.62, margin: "8px 0 0" }}>{description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
