const modules = [
  ["LIVE RADAR", "Who is live and accelerating right now."],
  ["TRENDING", "Top streams and clips by velocity."],
  ["EMERGING", "Small signals becoming large before the leaderboard catches up."],
  ["STORIES", "AI-assisted clusters connecting related moments across creators."]
];

export default function HomePage() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 40 }}>
      <p style={{ letterSpacing: 4, opacity: 0.55 }}>CLIPPED IT</p>
      <h1 style={{ fontSize: 56, maxWidth: 850, lineHeight: 1.02 }}>
        Real-time intelligence for livestream culture.
      </h1>
      <p style={{ maxWidth: 720, opacity: 0.7, fontSize: 20 }}>
        Detect breakout streams, fast-moving clips, and emerging stories before
        total-view leaderboards catch up.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginTop: 48
        }}
      >
        {modules.map(([title, description]) => (
          <section
            key={title}
            style={{
              border: "1px solid #252a31",
              borderRadius: 16,
              padding: 24,
              background: "#0d1014"
            }}
          >
            <strong>{title}</strong>
            <p style={{ opacity: 0.62 }}>{description}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
