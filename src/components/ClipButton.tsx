"use client";

import { useState } from "react";
import { upsertLibraryItem } from "@/lib/library";

interface ClipTarget {
  id?: string;
  title: string;
  platform: string;
  creator?: string | null;
  category?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  metric?: string | null;
  score?: number | null;
  kind: "clip" | "live";
}

export function ClipButton({
  target,
  className = "btn primary",
  label = "Clip it"
}: {
  target: ClipTarget;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? <ClipSheet target={target} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ClipSheet({ target, onClose }: { target: ClipTarget; onClose: () => void }) {
  const [owns, setOwns] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [sent, setSent] = useState(false);
  const cleared = owns || authorized;

  function sendToProduction() {
    if (!cleared) return;
    const rights = owns ? "owned" : "authorized";
    upsertLibraryItem(
      {
        id: target.id ?? `${target.platform}:${target.kind}:${target.url ?? target.title}`,
        kind: target.kind === "live" ? "stream" : "clip",
        platform: target.platform,
        title: target.title,
        creator: target.creator,
        category: target.category,
        url: target.url,
        thumbnailUrl: target.thumbnailUrl,
        metric: target.metric,
        score: target.score
      },
      "production",
      { rights }
    );
    setSent(true);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          <span className={`badge plat ${target.platform}`}>{target.platform}</span>
          {target.kind === "live" ? "Capture live moment" : "Produce from clip"}
        </div>
        <h2>{target.title}</h2>
        {target.creator ? (
          <p style={{ color: "var(--muted)", margin: "2px 0 10px" }}>
            {target.creator}
          </p>
        ) : null}

        {!sent ? (
          <>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Save the source into your production queue once you confirm you own it or have explicit authorization to edit and export it.
            </p>

            <label className="rights-row" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={owns}
                onChange={(e) => {
                  setOwns(e.target.checked);
                  if (e.target.checked) setAuthorized(false);
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>This is my channel / content.</strong>
                <br />
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  You own or control the source stream or clip.
                </span>
              </span>
            </label>

            <label className="rights-row" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => {
                  setAuthorized(e.target.checked);
                  if (e.target.checked) setOwns(false);
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>I have the creator&apos;s authorization.</strong>
                <br />
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  Explicit permission or a license covers this content.
                </span>
              </span>
            </label>

            <div className="rights-row" style={{ alignItems: "center" }}>
              <span className={`rights-badge ${cleared ? "ok" : "no"}`}>
                {cleared ? "Rights confirmed" : "Rights not confirmed"}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {cleared
                  ? "Production queue unlocked"
                  : "You can still favorite or save the source without producing it"}
              </span>
            </div>

            <div className="card-actions" style={{ marginTop: 16 }}>
              {target.url ? (
                <a className="btn" href={target.url} target="_blank" rel="noreferrer">
                  Open source
                </a>
              ) : null}
              <button
                className="btn primary"
                disabled={!cleared}
                style={cleared ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
                onClick={sendToProduction}
              >
                Add to production queue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rights-row" style={{ borderTop: "none" }}>
              <span className="rights-badge ok">Queued</span>
              <span style={{ fontSize: 14 }}>
                Saved to Library → Production Queue.
              </span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              This now persists after you close the modal. The next production layer can attach an editor/render integration to each queued source for trimming, captions, reframing, branding, and export.
            </p>
            <div className="card-actions" style={{ marginTop: 8 }}>
              <a className="btn" href="/library">Open Library</a>
              <button className="btn primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
