"use client";

import { useEffect, useState } from "react";

type QueueItem = {
  id: string;
  source_url: string;
  source_title: string;
  source_name: string;
  content_package: any;
  generator_mode: string;
  status: string;
  detected_at: string;
  generated_at: string | null;
};

export default function ReleaseQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [message, setMessage] = useState("Loading automated Release Radar packages…");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, { jobId?: string; error?: string }>>({});

  async function sendToFactory(releaseQueueId: string) {
    setSending(releaseQueueId);
    try {
      const res = await fetch("/api/video-factory/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseQueueId })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not create job");
      setSent((prev) => ({ ...prev, [releaseQueueId]: { jobId: body.job?.id } }));
    } catch (e) {
      setSent((prev) => ({ ...prev, [releaseQueueId]: { error: e instanceof Error ? e.message : "error" } }));
    } finally {
      setSending(null);
    }
  }

  useEffect(() => {
    fetch("/api/release-queue", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error || "Could not load release queue");
        setItems(body.items || []);
        setMessage(body.warning || (body.items?.length ? "Release Watcher is creating packages automatically." : "No releases have been queued yet."));
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not load release queue"));
  }, []);

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">AUTOMATED RELEASE WATCHER</p>
        <h1>Release Queue</h1>
        <p>Clipped It watches HighLevel Release Radar, detects new posts, generates faceless content packages, and holds them here for review and production.</p>
      </div>

      <div className="banner preview" style={{ marginBottom: 18 }}><span className="ico">⌁</span><span>{message}</span></div>

      <div className="grid">
        {items.map((item) => {
          const pack = item.content_package || {};
          return (
            <article className="card" key={item.id}>
              <div className="card-body">
                <div className="card-sub">{item.source_name} · {new Date(item.detected_at).toLocaleString()}</div>
                <div className="card-title" style={{ opacity: 1, fontWeight: 800, marginTop: 6 }}>{pack.headline || item.source_title}</div>
                <p className="card-sub" style={{ marginTop: 8 }}>{pack.thesis || "Content package generated automatically."}</p>
                <div className="pill" style={{ marginTop: 10 }}>⚡ {item.status.replaceAll("_", " ")} · {item.generator_mode}</div>
                {Array.isArray(pack.shorts) && pack.shorts.length ? (
                  <div style={{ marginTop: 14 }}>
                    <strong>{pack.shorts.length} Shorts ready</strong>
                    <div className="card-sub">{pack.shorts.map((s: any) => s.title).join(" · ")}</div>
                  </div>
                ) : null}
                <div className="card-actions" style={{ marginTop: 14 }}>
                  <a className="btn" href={item.source_url} target="_blank" rel="noreferrer">Source</a>
                  <a className="btn" href="/release-spy">Open Release Spy</a>
                  {sent[item.id] ? (
                    sent[item.id].jobId ? (
                      <a className="btn primary" href={`/video-factory/${sent[item.id].jobId}`}>Open in Factory →</a>
                    ) : (
                      <span className="pill">⚠ {sent[item.id].error}</span>
                    )
                  ) : (
                    <button
                      className="btn primary"
                      onClick={() => sendToFactory(item.id)}
                      disabled={sending === item.id}
                    >
                      {sending === item.id ? "Sending…" : "Send to Video Factory"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
