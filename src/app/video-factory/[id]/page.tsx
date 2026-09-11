"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { statusLabel } from "@/lib/video-factory/status";

type Short = { index?: number; selectedTitle?: string; title?: string; hook?: string; voiceoverScript?: string };
type Job = {
  id: string;
  title: string;
  status: string;
  source_url: string;
  content_package: { coreThesis?: string; shorts?: Short[] } | Record<string, never>;
};

export default function VideoFactoryJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("Loading job…");
  const [busy, setBusy] = useState(false);

  function load() {
    return fetch(`/api/video-factory/jobs/${id}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error || "Could not load job");
        setJob(body.job);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not load job"));
  }

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/video-factory/jobs/${id}/process`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Generation failed");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!job) {
    return (
      <main className="container">
        <div className="banner preview" style={{ marginTop: 24 }}>
          <span className="ico">⌁</span>
          <span>{message}</span>
        </div>
      </main>
    );
  }

  const pack = job.content_package as { coreThesis?: string; shorts?: Short[] };
  const shorts = Array.isArray(pack?.shorts) ? pack.shorts : [];

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">
          <Link href="/video-factory" style={{ color: "inherit" }}>
            ← Video Factory
          </Link>
        </p>
        <h1>{job.title}</h1>
        <div className="pill" style={{ marginTop: 6 }}>⚡ {statusLabel(job.status)}</div>
        {pack?.coreThesis ? <p style={{ marginTop: 10 }}>{pack.coreThesis}</p> : null}
        <div className="card-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : shorts.length ? "Regenerate content" : "Generate content"}
          </button>
          <a className="btn" href={job.source_url} target="_blank" rel="noreferrer">Source</a>
        </div>
      </div>

      {shorts.length ? (
        <div className="grid">
          {shorts.map((s, i) => (
            <article className="card" key={s.index ?? i}>
              <div className="card-body">
                <div className="card-sub">Short {s.index ?? i + 1}</div>
                <div className="card-title" style={{ fontWeight: 800, marginTop: 4 }}>
                  {s.selectedTitle || s.title || "Untitled"}
                </div>
                {s.hook ? <p className="card-sub" style={{ marginTop: 8 }}>{s.hook}</p> : null}
                <Link className="btn" href={`/video-factory/${job.id}/short/${s.index ?? i + 1}`} style={{ marginTop: 12 }}>
                  Open Short
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="banner preview">
          <span className="ico">⌁</span>
          <span>No content package yet — this job is still in “{statusLabel(job.status)}”.</span>
        </div>
      )}
    </main>
  );
}
