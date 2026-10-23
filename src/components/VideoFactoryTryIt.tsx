"use client";

import { useState } from "react";
import { ThumbnailButton } from "@/components/ThumbnailButton";
import type { ContentPackage, ShortPackage } from "@/lib/video-factory/types";

/**
 * Zero-setup "Try it" panel: generate the full 3-Short content package from a
 * pasted release (or URL) with no Supabase and no keys beyond the LLM key the
 * app already uses. Renders scripts, social posts, and thumbnail concepts, and
 * can render a real thumbnail image when an image provider is configured.
 */

function Copy({ label, text }: { label: string; text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        } catch {
          setOk(false);
        }
      }}
    >
      {ok ? "Copied ✓" : label}
    </button>
  );
}

function ShortCard({ short }: { short: ShortPackage }) {
  return (
    <article className="card">
      <div className="card-body">
        <div className="card-sub">Short {short.index} · ≈{short.estimatedDurationSeconds}s</div>
        <div className="card-title" style={{ fontWeight: 800, marginTop: 4 }}>{short.selectedTitle}</div>
        <p className="card-sub" style={{ marginTop: 8 }}><strong>Hook:</strong> {short.hook}</p>

        <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{short.voiceoverScript}</p>
        <div className="card-actions"><Copy label="Copy script" text={short.voiceoverScript} /></div>

        <div style={{ marginTop: 12 }}>
          <strong>Thumbnail:</strong> <span className="pill">{short.thumbnail.selectedText}</span>
          <p className="card-sub" style={{ marginTop: 6 }}>{short.thumbnail.imagePrompt}</p>
          <ThumbnailButton prompt={short.thumbnail.imagePrompt} />
        </div>

        {short.socialPosts?.length ? (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer" }}>Social posts ({short.socialPosts.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {short.socialPosts.map((p, i) => (
                <div key={i}>
                  <div className="pill" style={{ textTransform: "uppercase" }}>{p.platform}</div>
                  <p className="card-sub" style={{ whiteSpace: "pre-wrap" }}>{p.caption}</p>
                  <Copy label={`Copy ${p.platform}`} text={`${p.caption}${p.hashtags?.length ? "\n\n" + p.hashtags.join(" ") : ""}`} />
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function VideoFactoryTryIt() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [pack, setPack] = useState<ContentPackage | null>(null);
  const [mode, setMode] = useState<string>("");
  const [extraction, setExtraction] = useState<{ chars: number; sources: string[]; warning?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/video-factory/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseTitle: title, releaseText: text, url })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Generation failed");
      setPack(body.package);
      setMode(body.mode);
      setExtraction(body.extraction ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 18
      }}
    >
      <h2 style={{ fontSize: 15, margin: "0 0 4px" }}>⚡ Try it now — no setup</h2>
      <p className="card-sub" style={{ marginTop: 0 }}>
        Paste a HighLevel update (title + notes) or a link. Get 3 Shorts with scripts, social posts, and thumbnail
        concepts instantly. Nothing is saved — this proves the engine before you wire the database.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        <input
          className="input"
          placeholder="Release title (e.g. GoHighLevel AI Studio just got a massive upgrade)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        <textarea
          className="input"
          placeholder="Paste the release notes / what changed (optional but gives sharper scripts)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={inputStyle}
        />
        <input
          className="input"
          placeholder="…or a public URL to fetch (blog post, release page)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />
        <div className="card-actions">
          <button className="btn primary" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate 3 Shorts"}
          </button>
          {mode ? <span className="pill">{mode === "ai" ? "AI-written" : "template"}</span> : null}
          {extraction ? <span className="pill">read {extraction.chars} chars{extraction.sources.length ? ` · ${extraction.sources.length} link(s)` : ""}</span> : null}
        </div>
        {error ? <p className="card-sub" style={{ color: "#ff8080" }}>{error}</p> : null}
        {extraction?.warning ? (
          <p className="card-sub" style={{ color: "#ffc266" }}>⚠ {extraction.warning}</p>
        ) : null}
        {mode === "template" ? (
          <p className="card-sub" style={{ color: "#ffc266" }}>
            ⚠ Template mode — this deployment has no <code>LLM_API_KEY</code>, so copy is generic boilerplate, not written from your release. Add the key in Vercel for real per-release scripts.
          </p>
        ) : null}
      </div>

      {pack ? (
        <div style={{ marginTop: 16 }}>
          <p className="card-sub"><strong>{pack.releaseTitle}</strong> — {pack.coreThesis}</p>
          <div className="grid" style={{ marginTop: 10 }}>
            {pack.shorts.map((s) => (
              <ShortCard key={s.index} short={s} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "inherit",
  font: "inherit"
};
