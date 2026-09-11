"use client";

import { useState } from "react";

/**
 * Renders a thumbnail from an image prompt via /api/video-factory/thumbnail.
 * Shows the generated image inline (data URI). Degrades with a clear message
 * when no image provider key is configured.
 */
export function ThumbnailButton({ prompt, aspect = "16:9" }: { prompt: string; aspect?: "16:9" | "9:16" | "1:1" }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function render() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/video-factory/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Thumbnail failed");
      setUrl(body.url);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thumbnail failed");
      setState("error");
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn" onClick={render} disabled={state === "loading"}>
        {state === "loading" ? "Rendering…" : url ? "Re-render thumbnail" : "Render thumbnail"}
      </button>
      {error ? <p className="card-sub" style={{ color: "#ff8080", marginTop: 6 }}>{error}</p> : null}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Generated thumbnail"
          style={{ display: "block", width: "100%", borderRadius: 10, marginTop: 10, border: "1px solid rgba(255,255,255,0.1)" }}
        />
      ) : null}
    </div>
  );
}
