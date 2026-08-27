"use client";

import { useState } from "react";

interface ClipTarget {
  title: string;
  platform: string;
  creator?: string | null;
  url?: string | null;
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
              Clipped It only produces finished clips from content you own or are
              authorized to use. Public visibility is not permission — confirm your
              rights before exporting.
            </p>

            <label className="rights-row" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={owns}
                onChange={(e) => setOwns(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>This is my channel / content.</strong>
                <br />
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  You own or control the source stream.
                </span>
              </span>
            </label>

            <label className="rights-row" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
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
                  ? "Export unlocked"
                  : "Editorial / commentary embed only until confirmed"}
              </span>
            </div>

            <div className="card-actions" style={{ marginTop: 16 }}>
              {target.url ? (
                <a
                  className="btn"
                  href={target.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                </a>
              ) : null}
              <button
                className="btn primary"
                disabled={!cleared}
                style={cleared ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
                onClick={() => cleared && setSent(true)}
              >
                Send to production
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rights-row" style={{ borderTop: "none" }}>
              <span className="rights-badge ok">Queued</span>
              <span style={{ fontSize: 14 }}>
                Rights confirmed and moment captured.
              </span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              The production pipeline (auto-cut, captions, vertical reframe, export)
              plugs in here. It renders through your connected editor and may use
              rendering credits, so it runs only after you enable it — no content is
              downloaded or reposted without that explicit step.
            </p>
            <div className="card-actions" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
