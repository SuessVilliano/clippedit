"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ClipsPayload, DashboardPayload } from "@/lib/api-data";
import { upsertLibraryItem } from "@/lib/library";

type SpyResult = {
  id: string;
  kind: "clip" | "stream";
  platform: string;
  title: string;
  creator: string | null;
  category: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  score: number;
  relevance: number;
  momentum: number;
  reason: string;
  metric: string;
};

const NICHE_PRESETS: Array<{ match: RegExp; keywords: string[] }> = [
  {
    match: /(prop firm|funded account|futures|forex|day trad|trading)/i,
    keywords: ["prop firm", "funded", "futures", "forex", "trading", "trader", "nasdaq", "nq", "gold", "risk", "payout", "challenge", "account", "market"]
  },
  {
    match: /(life insurance|financial literacy|iul|annuity|retirement|wealth)/i,
    keywords: ["life insurance", "financial literacy", "iul", "annuity", "retirement", "wealth", "money", "finance", "saving", "investing", "legacy", "tax", "income"]
  },
  {
    match: /(ai|automation|saas|agency|gohighlevel|marketing)/i,
    keywords: ["ai", "automation", "agency", "marketing", "saas", "lead", "sales", "crm", "content", "business", "growth"]
  }
];

function keywordsFor(prompt: string) {
  const preset = NICHE_PRESETS.find((p) => p.match.test(prompt));
  const extra = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["want", "more", "with", "that", "this", "from", "find", "clips", "content", "users", "clients"].includes(w));
  return Array.from(new Set([...(preset?.keywords ?? []), ...extra])).slice(0, 24);
}

function relevance(text: string, keywords: string[]) {
  const haystack = text.toLowerCase();
  const matches = keywords.filter((k) => haystack.includes(k)).length;
  return Math.min(100, Math.round((matches / Math.max(3, keywords.length * 0.35)) * 100));
}

export default function SpyPage() {
  const [prompt, setPrompt] = useState("I run a prop firm and want more qualified traders and funded-account clients. Find engaging trading content I can learn from and turn into high-performing clips.");
  const [results, setResults] = useState<SpyResult[]>([]);
  const [summary, setSummary] = useState("Tell Clip Spy what you sell, who you want to reach, and the outcome you want.");
  const [running, setRunning] = useState(false);

  const keywords = useMemo(() => keywordsFor(prompt), [prompt]);

  async function runSpy(e?: FormEvent) {
    e?.preventDefault();
    setRunning(true);
    setSummary("Scanning current Twitch/Kick clips and live momentum against your business goal…");
    try {
      const [clipsRes, trendingRes] = await Promise.all([
        fetch("/api/clips", { cache: "no-store" }),
        fetch("/api/trending", { cache: "no-store" })
      ]);
      const clips = clipsRes.ok ? ((await clipsRes.json()) as ClipsPayload).clips ?? [] : [];
      const streams = trendingRes.ok ? ((await trendingRes.json()) as DashboardPayload).streams ?? [] : [];

      const clipResults: SpyResult[] = clips.map((c) => {
        const rel = relevance([c.title, c.creator].filter(Boolean).join(" "), keywords);
        const velocity = Math.min(100, Math.round(((c.viewsPerHour ?? 0) / 3000) * 100));
        const freshness = c.ageHours == null ? 40 : Math.max(0, Math.round(100 - c.ageHours * 4));
        const score = Math.round(rel * 0.5 + velocity * 0.35 + freshness * 0.15);
        return {
          id: c.id,
          kind: "clip",
          platform: c.platform,
          title: c.title ?? "Untitled clip",
          creator: c.creator,
          category: null,
          url: c.url,
          thumbnailUrl: c.thumbnailUrl,
          score,
          relevance: rel,
          momentum: velocity,
          reason: rel >= 60 ? "Strong niche match with current velocity" : velocity >= 70 ? "High velocity with adjacent audience potential" : "Early signal worth monitoring",
          metric: `${Math.round(c.viewsPerHour ?? 0).toLocaleString()} views/hr`
        };
      });

      const streamResults: SpyResult[] = streams.map((s) => {
        const rel = relevance([s.title, s.displayName, s.category].filter(Boolean).join(" "), keywords);
        const momentum = Math.round(s.momentum ?? 0);
        const score = Math.round(rel * 0.55 + momentum * 0.45);
        return {
          id: s.id,
          kind: "stream",
          platform: s.platform,
          title: s.title || s.displayName,
          creator: s.displayName,
          category: s.category,
          url: s.url,
          thumbnailUrl: s.thumbnailUrl,
          score,
          relevance: rel,
          momentum,
          reason: rel >= 60 && momentum >= 60 ? "Audience-fit breakout happening live" : rel >= 60 ? "Strong niche match; watch for breakout" : "Adjacent trend with reusable hook potential",
          metric: `${(s.viewers ?? 0).toLocaleString()} watching`
        };
      });

      const ranked = [...clipResults, ...streamResults]
        .filter((r) => r.relevance >= 18 || r.momentum >= 65)
        .sort((a, b) => b.score - a.score)
        .slice(0, 24);

      setResults(ranked);
      setSummary(
        ranked.length
          ? `Clip Spy found ${ranked.length} current opportunities. The highest scores combine niche relevance with momentum/velocity so you can prioritize what is most likely to fit your audience instead of simply copying the biggest creator.`
          : "No strong niche matches surfaced in this snapshot. Refine the brief or fetch again later."
      );
    } catch (error) {
      setSummary(error instanceof Error ? error.message : "Clip Spy could not complete this scan.");
    } finally {
      setRunning(false);
    }
  }

  function save(item: SpyResult, bucket: "favorite" | "later") {
    upsertLibraryItem(
      {
        id: item.id,
        kind: item.kind === "stream" ? "stream" : "clip",
        platform: item.platform,
        title: item.title,
        creator: item.creator,
        category: item.category,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        metric: `Spy ${item.score}/100 · ${item.metric}`,
        score: item.score
      },
      bucket
    );
  }

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">CLIP SPY</p>
        <h1>Tell the agent what growth looks like.</h1>
        <p>Clip Spy translates a business goal into a content watch plan, scans current discovery data, and ranks opportunities by audience fit plus momentum.</p>
      </div>

      <form onSubmit={runSpy} className="card" style={{ padding: 18, marginBottom: 18 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          aria-label="Clip Spy brief"
          style={{ width: "100%", padding: 14, borderRadius: 12, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          <button className="btn primary" disabled={running}>{running ? "Spying…" : "Run Clip Spy"}</button>
          <span className="card-sub">Watching: {keywords.slice(0, 10).join(" · ")}</span>
        </div>
      </form>

      <div className="banner preview" style={{ marginBottom: 18 }}><span className="ico">⌁</span><span>{summary}</span></div>

      <div className="grid">
        {results.map((item) => (
          <article className="card" key={`${item.kind}:${item.id}`}>
            <div className="thumb-wrap">
              {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
              <div className="thumb-grad" />
              <span className={`badge plat ${item.platform}`}>{item.platform}</span>
              <span className="badge viewers">Spy {item.score}/100</span>
            </div>
            <div className="card-body">
              <div className="card-title" style={{ opacity: 1, fontWeight: 700 }}>{item.title}</div>
              <div className="card-sub">{[item.creator, item.category, item.metric].filter(Boolean).join(" · ")}</div>
              <div className="stats">
                <div className="stat"><div className="label">Audience fit</div><div className="value up">{item.relevance}</div></div>
                <div className="stat"><div className="label">Momentum</div><div className="value">{item.momentum}</div></div>
              </div>
              <div className="pill">⚡ {item.reason}</div>
              <div className="card-actions" style={{ marginTop: 10 }}>
                {item.url ? <a className="btn" href={item.url} target="_blank" rel="noreferrer">Open</a> : null}
                <button type="button" className="btn" onClick={() => save(item, "favorite")}>★ Favorite</button>
                <button type="button" className="btn primary" onClick={() => save(item, "later")}>Save to workspace</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
