"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KANBAN_COLUMNS, statusLabel, type JobStatus } from "@/lib/video-factory/status";
import { VideoFactoryTryIt } from "@/components/VideoFactoryTryIt";

type Job = {
  id: string;
  source_url: string;
  title: string;
  status: JobStatus;
  content_package: { shorts?: Array<{ selectedTitle?: string; title?: string }> } | Record<string, never>;
  created_at: string;
};

export default function VideoFactoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("Loading the Video Factory…");

  useEffect(() => {
    fetch("/api/video-factory/jobs", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error || "Could not load jobs");
        setJobs(body.items || []);
        setMessage(
          body.warning ||
            (body.items?.length
              ? "Each Release Radar drop becomes 3 faceless Shorts — review, then approve."
              : "No jobs yet. Send a Release Radar package over from the Release Queue.")
        );
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not load jobs"));
  }, []);

  const shortCount = (job: Job) =>
    Array.isArray((job.content_package as { shorts?: unknown[] })?.shorts)
      ? (job.content_package as { shorts: unknown[] }).shorts.length
      : 0;

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">CLIPPED IT · VIDEO FACTORY</p>
        <h1>Video Factory</h1>
        <p>
          HighLevel Release Radar → scripts, thumbnails, voice, screen footage, and a finished vertical —
          held here for review before anything is published.
        </p>
      </div>

      <VideoFactoryTryIt />

      <div className="banner preview" style={{ marginBottom: 18 }}>
        <span className="ico">⌁</span>
        <span>{message}</span>
      </div>

      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
        {KANBAN_COLUMNS.map((col) => {
          const columnJobs = jobs.filter((j) => col.key.includes(j.status));
          return (
            <section
              key={col.label}
              style={{
                minWidth: 260,
                flex: "0 0 260px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 12
              }}
            >
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>{col.label}</strong>
                <span className="pill">{columnJobs.length}</span>
              </header>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {columnJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/video-factory/${job.id}`}
                    className="card"
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div className="card-body">
                      <div className="card-title" style={{ fontWeight: 800, fontSize: 14 }}>
                        {job.title}
                      </div>
                      <div className="card-sub" style={{ marginTop: 6 }}>
                        {new Date(job.created_at).toLocaleDateString()} ·{" "}
                        {shortCount(job) ? `${shortCount(job)} Shorts` : "content pending"}
                      </div>
                      <div className="pill" style={{ marginTop: 8 }}>
                        ⚡ {statusLabel(job.status)}
                      </div>
                    </div>
                  </Link>
                ))}
                {columnJobs.length === 0 ? (
                  <p className="card-sub" style={{ opacity: 0.5, fontSize: 12 }}>—</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
