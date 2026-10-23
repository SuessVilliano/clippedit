"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClipsPayload, DashboardPayload, MomentsPayload } from "@/lib/api-data";
import { relativeTime } from "@/lib/format";
import { ClipCardView, MomentCardView, StreamCardView } from "@/components/Cards";
import { GridSkeleton } from "@/components/Skeletons";

type AnyPayload = DashboardPayload | ClipsPayload | MomentsPayload;
type Variant = "stream" | "clip" | "moment";
type FeedItem = DashboardPayload["streams"][number] | ClipsPayload["clips"][number] | MomentsPayload["moments"][number];

function items(payload: AnyPayload, variant: Variant): FeedItem[] {
  if (variant === "stream") return (payload as DashboardPayload).streams ?? [];
  if (variant === "clip") return (payload as ClipsPayload).clips ?? [];
  return (payload as MomentsPayload).moments ?? [];
}

function textFor(item: FeedItem) {
  const x = item as unknown as Record<string, unknown>;
  return [x.title, x.displayName, x.creator, x.category, x.subtitle, x.reason, x.platform]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Feed({ initial, endpoint, variant, title, subtitle }: { initial: AnyPayload; endpoint: string; variant: Variant; title: string; subtitle: string }) {
  const [payload, setPayload] = useState<AnyPayload>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("default");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) setPayload(await res.json());
    } finally {
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  const raw = items(payload, variant);
  const platforms = Array.from(new Set(raw.map((item) => (item as { platform: string }).platform)));
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = raw.filter((item) => {
      const x = item as unknown as Record<string, unknown>;
      if (platform !== "all" && x.platform !== platform) return false;
      return !q || textFor(item).includes(q);
    });
    if (sort === "default") return filtered;
    return [...filtered].sort((a, b) => {
      const x = a as unknown as Record<string, number | null | undefined>;
      const y = b as unknown as Record<string, number | null | undefined>;
      if (sort === "score") return (y.score ?? y.momentum ?? 0) - (x.score ?? x.momentum ?? 0);
      if (sort === "audience") return (y.viewers ?? y.views ?? 0) - (x.viewers ?? x.views ?? 0);
      if (sort === "velocity") return (y.viewsPerHour ?? 0) - (x.viewsPerHour ?? 0);
      if (sort === "newest") return (x.ageHours ?? 9999) - (y.ageHours ?? 9999);
      return 0;
    });
  }, [raw, query, platform, sort]);

  const live = payload.mode !== "unconfigured";
  const hasFilters = Boolean(query || platform !== "all" || sort !== "default");

  return (
    <main className="container">
      <div className="page-head"><h1>{title}</h1><p>{subtitle}</p></div>
      {payload.note ? <div className={`banner ${payload.mode}`}><span className="ico">{payload.mode === "unconfigured" ? "🔌" : "ⓘ"}</span><span>{payload.note}</span></div> : null}
      <div className="metabar">
        {live ? <span className="live-tag"><span className="live-dot" /> LIVE</span> : <span>Offline</span>}
        <span>·</span><span>{list.length} of {raw.length} results</span><span>·</span>
        <span>{payload.mode === "database" ? "history-aware" : payload.mode === "preview" ? "real-time preview" : "not configured"}</span>
        <span>·</span><span>updated {relativeTime(payload.generatedAt)}</span>
        <button className={`refresh-btn ${refreshing ? "spin" : ""}`} onClick={refresh} aria-label="Fetch now"><RefreshIcon /> Fetch now</button>
      </div>
      <div className="card" style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creator, title, category…" aria-label="Search" style={{ flex: "1 1 320px", padding: "11px 13px", borderRadius: 10 }} />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform" style={{ padding: "11px 13px", borderRadius: 10 }}>
            <option value="all">All platforms</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" style={{ padding: "11px 13px", borderRadius: 10 }}>
            <option value="default">Recommended</option>
            <option value="score">Highest momentum</option>
            <option value="audience">Largest audience</option>
            {variant === "clip" ? <option value="velocity">Fastest views/hour</option> : null}
            {variant === "clip" ? <option value="newest">Newest</option> : null}
          </select>
          {hasFilters ? <button className="btn" type="button" onClick={() => { setQuery(""); setPlatform("all"); setSort("default"); }}>Clear</button> : null}
        </div>
      </div>
      {list.length === 0 ? (
        refreshing ? <GridSkeleton /> : <div className="empty"><h3>No matches</h3><p>{raw.length ? "Try clearing your search or filters." : payload.mode === "unconfigured" ? "Connect Twitch or Kick in Settings, then press Fetch now." : "No results in this snapshot."}</p></div>
      ) : (
        <div className="grid">
          {variant === "stream" && (list as DashboardPayload["streams"]).map((s, i) => <StreamCardView key={s.id} s={s} index={i} />)}
          {variant === "clip" && (list as ClipsPayload["clips"]).map((c, i) => <ClipCardView key={c.id} c={c} index={i} />)}
          {variant === "moment" && (list as MomentsPayload["moments"]).map((m, i) => <MomentCardView key={m.id} m={m} index={i} />)}
        </div>
      )}
    </main>
  );
}
