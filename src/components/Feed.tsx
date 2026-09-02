"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ClipsPayload,
  DashboardPayload,
  MomentsPayload
} from "@/lib/api-data";
import { relativeTime } from "@/lib/format";
import { ClipCardView, MomentCardView, StreamCardView } from "@/components/Cards";
import { GridSkeleton } from "@/components/Skeletons";

type AnyPayload = DashboardPayload | ClipsPayload | MomentsPayload;
type Variant = "stream" | "clip" | "moment";

function items(payload: AnyPayload, variant: Variant): unknown[] {
  if (variant === "stream") return (payload as DashboardPayload).streams ?? [];
  if (variant === "clip") return (payload as ClipsPayload).clips ?? [];
  return (payload as MomentsPayload).moments ?? [];
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Feed({
  initial,
  endpoint,
  variant,
  title,
  subtitle
}: {
  initial: AnyPayload;
  endpoint: string;
  variant: Variant;
  title: string;
  subtitle: string;
}) {
  const [payload, setPayload] = useState<AnyPayload>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) setPayload(await res.json());
    } catch {
      /* keep previous data on failure */
    } finally {
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  const list = items(payload, variant);
  const live = payload.mode !== "unconfigured";

  return (
    <main className="container">
      <div className="page-head">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {payload.note ? (
        <div className={`banner ${payload.mode}`}>
          <span className="ico">{payload.mode === "unconfigured" ? "🔌" : "ⓘ"}</span>
          <span>{payload.note}</span>
        </div>
      ) : null}

      <div className="metabar">
        {live ? (
          <span className="live-tag">
            <span className="live-dot" /> LIVE
          </span>
        ) : (
          <span>Offline</span>
        )}
        <span>·</span>
        <span>{list.length} results</span>
        <span>·</span>
        <span>
          {payload.mode === "database"
            ? "history-aware"
            : payload.mode === "preview"
              ? "real-time preview"
              : "not configured"}
        </span>
        <span>·</span>
        <span>updated {relativeTime(payload.generatedAt)}</span>
        <button
          className={`refresh-btn ${refreshing ? "spin" : ""}`}
          onClick={refresh}
          aria-label="Refresh"
        >
          <RefreshIcon /> Fetch now
        </button>
      </div>

      {list.length === 0 ? (
        refreshing ? (
          <GridSkeleton />
        ) : (
          <div className="empty">
            <h3>Nothing here yet</h3>
            <p>
              {payload.mode === "unconfigured"
                ? "Connect Twitch or Kick in Settings, then press Fetch now."
                : "No results in the current fetch — try again when you want a new snapshot."}
            </p>
          </div>
        )
      ) : (
        <div className="grid">
          {variant === "stream" &&
            (list as DashboardPayload["streams"]).map((s, i) => (
              <StreamCardView key={s.id} s={s} index={i} />
            ))}
          {variant === "clip" &&
            (list as ClipsPayload["clips"]).map((c, i) => (
              <ClipCardView key={c.id} c={c} index={i} />
            ))}
          {variant === "moment" &&
            (list as MomentsPayload["moments"]).map((m, i) => (
              <MomentCardView key={m.id} m={m} index={i} />
            ))}
        </div>
      )}
    </main>
  );
}
