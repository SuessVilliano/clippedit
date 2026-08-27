export function CardSkeleton() {
  return (
    <div className="skel-card">
      <div className="skel skel-thumb" style={{ borderRadius: 0 }} />
      <div className="skel skel-line" style={{ width: "60%", marginTop: 14 }} />
      <div className="skel skel-line" style={{ width: "85%" }} />
      <div className="skel skel-line" style={{ width: "40%", marginBottom: 16 }} />
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <main className="container">
      <div className="page-head">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="metabar">
        <span className="skel" style={{ width: 120, height: 14 }} />
      </div>
      <GridSkeleton />
    </main>
  );
}
