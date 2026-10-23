"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLibraryItems,
  removeLibraryItem,
  subscribeLibraryChanged,
  type LibraryBucket,
  type LibraryItem
} from "@/lib/library";

const tabs: Array<[LibraryBucket, string]> = [
  ["favorite", "Favorites"],
  ["later", "Save for Later"],
  ["production", "Production Queue"]
];

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [tab, setTab] = useState<LibraryBucket>("favorite");
  const [query, setQuery] = useState("");

  function sync() {
    setItems(getLibraryItems());
  }

  useEffect(() => {
    sync();
    return subscribeLibraryChanged(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (item.bucket !== tab) return false;
      if (!q) return true;
      return [item.title, item.creator, item.category, item.platform]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, tab]);

  const counts = Object.fromEntries(
    tabs.map(([bucket]) => [bucket, items.filter((i) => i.bucket === bucket).length])
  ) as Record<LibraryBucket, number>;

  return (
    <main className="container">
      <div className="page-head">
        <h1>Library</h1>
        <p>Your organized content workspace — favorites, saved research, and clips queued for production.</p>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {tabs.map(([bucket, label]) => (
            <button
              key={bucket}
              type="button"
              className={tab === bucket ? "btn primary" : "btn"}
              onClick={() => setTab(bucket)}
            >
              {label} · {counts[bucket]}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library…"
            aria-label="Search library"
            style={{ marginLeft: "auto", minWidth: 240, padding: "11px 13px", borderRadius: 10 }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p>
            {tab === "favorite"
              ? "Star standout streams and clips to build your shortlist."
              : tab === "later"
                ? "Use + Later when you want to come back without losing a find."
                : "Use Produce / Clip it and confirm rights to send content into this queue."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((item) => (
            <article className="card" key={`${item.bucket}:${item.id}`} style={{ padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
                <div style={{ width: 112, aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,.04)" }}>
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                  ) : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <span className={`badge plat ${item.platform}`}>{item.platform}</span>
                    <span className="card-sub">{item.kind}</span>
                    {item.rights ? <span className="pill">{item.rights}</span> : null}
                  </div>
                  <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong>
                  <div className="card-sub">
                    {[item.creator, item.category, item.metric].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {item.url ? (
                    <a className="btn" href={item.url} target="_blank" rel="noreferrer">Open</a>
                  ) : null}
                  <button className="btn" type="button" onClick={() => removeLibraryItem(item.id, item.bucket)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
