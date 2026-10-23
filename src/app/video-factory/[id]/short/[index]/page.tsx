"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { statusLabel } from "@/lib/video-factory/status";
import { ThumbnailButton } from "@/components/ThumbnailButton";
import type { ContentPackage, ShortPackage } from "@/lib/video-factory/types";

type Job = {
  id: string;
  title: string;
  status: string;
  content_package: ContentPackage | Record<string, never>;
};

function Copyable({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 16,
        marginTop: 16
      }}
    >
      <h2 style={{ fontSize: 15, margin: "0 0 12px" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function ShortDetailPage({ params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("Loading short…");

  useEffect(() => {
    fetch(`/api/video-factory/jobs/${id}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error || "Could not load job");
        setJob(body.job);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Could not load short"));
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

  const pack = job.content_package as ContentPackage;
  const shorts: ShortPackage[] = Array.isArray(pack?.shorts) ? pack.shorts : [];
  const idx = Number(index);
  const short = shorts.find((s) => s.index === idx) || shorts[idx - 1];

  if (!short) {
    return (
      <main className="container">
        <div className="page-head">
          <p className="eyebrow">
            <Link href={`/video-factory/${id}`} style={{ color: "inherit" }}>← Back to job</Link>
          </p>
          <h1>Short {index}</h1>
        </div>
        <div className="banner preview">
          <span className="ico">⌁</span>
          <span>No content for this short yet — generate the content package first (job is “{statusLabel(job.status)}”).</span>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">
          <Link href={`/video-factory/${id}`} style={{ color: "inherit" }}>← {job.title}</Link>
        </p>
        <h1>Short {short.index}: {short.selectedTitle}</h1>
        <div className="card-sub">≈ {short.estimatedDurationSeconds}s · vertical 1080×1920</div>
      </div>

      <Section title="Content">
        <strong>Title options</strong>
        <ul style={{ marginTop: 6 }}>
          {short.titleOptions.map((t, i) => (
            <li key={i} style={{ opacity: t === short.selectedTitle ? 1 : 0.7 }}>
              {t} {t === short.selectedTitle ? "· selected" : ""}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12 }}>
          <strong>Hook</strong>
          <p className="card-sub">{short.hook}</p>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Voiceover script</strong> <span className="card-sub">— record in your own voice over the screen capture</span>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{short.voiceoverScript}</p>
          <div className="card-actions">
            <Copyable label="Copy script" text={short.voiceoverScript} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>CTA</strong>
          <p className="card-sub">{short.cta}</p>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Description</strong>
          <p className="card-sub" style={{ whiteSpace: "pre-wrap" }}>{short.selectedDescription}</p>
          <div className="card-actions">
            <Copyable label="Copy description" text={short.selectedDescription} />
          </div>
        </div>
        {short.hashtags?.length ? (
          <div style={{ marginTop: 12 }}>
            <strong>Hashtags</strong>
            <p className="card-sub">{short.hashtags.join(" ")}</p>
          </div>
        ) : null}
      </Section>

      <Section title="Thumbnail concept">
        <div className="pill" style={{ fontSize: 16, fontWeight: 800 }}>{short.thumbnail.selectedText}</div>
        {short.thumbnail.textOptions?.length ? (
          <p className="card-sub" style={{ marginTop: 8 }}>Alt text: {short.thumbnail.textOptions.join(" · ")}</p>
        ) : null}
        <p className="card-sub" style={{ marginTop: 8 }}><strong>Image prompt:</strong> {short.thumbnail.imagePrompt}</p>
        {short.thumbnail.compositionNotes ? (
          <p className="card-sub" style={{ marginTop: 4 }}><strong>Notes:</strong> {short.thumbnail.compositionNotes}</p>
        ) : null}
        <div className="card-actions">
          <Copyable label="Copy image prompt" text={short.thumbnail.imagePrompt} />
        </div>
        <ThumbnailButton prompt={short.thumbnail.imagePrompt} />
      </Section>

      <Section title="Visual timeline">
        {short.visualPlan?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {short.visualPlan.map((beat, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span className="pill" style={{ minWidth: 74, textAlign: "center" }}>
                  {beat.startSeconds}–{beat.endSeconds}s
                </span>
                <span className="pill" style={{ textTransform: "uppercase", fontSize: 11 }}>{beat.type}</span>
                <span>{beat.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="card-sub">No timeline generated.</p>
        )}
      </Section>

      {short.screenCaptureRequirements?.length ? (
        <Section title="🎥 Screen capture needed">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {short.screenCaptureRequirements.map((req, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <strong>{req.name}</strong> <span className="pill">≈ {req.durationSeconds}s</span>
                  <p className="card-sub" style={{ marginTop: 6 }}>{req.instructions}</p>
                  {req.supportsScriptText ? (
                    <p className="card-sub" style={{ marginTop: 4, opacity: 0.7 }}>Supports: “{req.supportsScriptText}”</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="card-sub" style={{ marginTop: 10, opacity: 0.6 }}>
            Upload slots for your recordings land here in the next build.
          </p>
        </Section>
      ) : null}

      <Section title="Social posts (GHL-ready)">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {short.socialPosts?.map((post, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="pill" style={{ textTransform: "uppercase" }}>{post.platform}</div>
                <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{post.caption}</p>
                {post.hashtags?.length ? <p className="card-sub">{post.hashtags.join(" ")}</p> : null}
                <div className="card-actions">
                  <Copyable
                    label={`Copy ${post.platform} post`}
                    text={`${post.caption}${post.hashtags?.length ? "\n\n" + post.hashtags.join(" ") : ""}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {short.brollPrompts?.length ? (
        <Section title="AI b-roll prompts (optional enhancement)">
          <ul>
            {short.brollPrompts.map((p, i) => (
              <li key={i} className="card-sub">{p}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </main>
  );
}
