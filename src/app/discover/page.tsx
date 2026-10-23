"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { YouTubeCreator, YouTubeVideo } from "@/lib/youtube";
export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [creators, setCreators] = useState<YouTubeCreator[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [creator, setCreator] = useState<YouTubeCreator | null>(null);
  const [order, setOrder] = useState("viewCount");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const version = useRef(0);
  async function load(q = "", channel: YouTubeCreator | null = null, sort = order) {
    const request = ++version.current;
    setBusy(true); setError(""); setVideos([]); setCreators([]); setCreator(channel);
    try {
      const response = await fetch(`/api/youtube?${new URLSearchParams({ q, channelId: channel?.id ?? "", order: sort })}`);
      const data = await response.json();
      if (request !== version.current) return;
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setConfigured(data.configured); setCreators(data.creators); setVideos(data.videos);
    } catch (e) { if (request === version.current) setError(e instanceof Error ? e.message : "Search failed."); }
    finally { if (request === version.current) setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  return <main className="container">
    <section className="hero"><span className="eyebrow">Discover → produce → earn</span><h1>Find your next <span className="grad-text">great clip.</span></h1><p>Search YouTube creators, explore their most popular videos, and choose a source for your next edit.</p></section>
    <form className="work-form" onSubmit={e => { e.preventDefault(); void load(query); }}>
      <label htmlFor="creator-search">Find a creator</label><div className="work-row"><input id="creator-search" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Creator or channel name" required /><button className="btn primary" disabled={busy}>Search creators</button><button className="btn" type="button" disabled={busy} onClick={() => { setQuery(""); void load(); }}>Popular now</button></div>
    </form>
    {!configured && <div className="banner">YouTube search is coming online. For now, find a creator on YouTube, open Videos → Popular, and paste your chosen link into Studio. <Link href="/studio">Open Studio →</Link></div>}
    {error && <p role="alert" className="banner">{error}</p>}
    <div aria-live="polite">{busy ? <p>Searching YouTube…</p> : null}</div>
    {creators.length > 0 && <div className="feature-grid">{creators.map(c => <button className="feature" key={c.id} onClick={() => void load("", c)}><strong>{c.title}</strong><p>View most popular videos →</p></button>)}</div>}
    {creator && <div className="section-head"><h2>{creator.title}</h2><label>Sort videos <select value={order} onChange={e => { setOrder(e.target.value); void load("", creator, e.target.value); }}><option value="viewCount">Most popular</option><option value="date">Newest</option></select></label></div>}
    {!busy && configured && !error && creators.length === 0 && videos.length === 0 && <p>No results. Try another creator name.</p>}
    <div className="grid">{videos.map(v => <article className="feature" key={v.id}>{v.thumbnail && <img className="source-thumb" src={v.thumbnail} alt="" />}<p>{v.creator} · {v.views.toLocaleString()} views</p><h3>{v.title}</h3><div className="work-row"><a className="btn" href={v.url} target="_blank" rel="noreferrer">Watch source</a><Link className="btn primary" href={`/studio?source=${encodeURIComponent(v.url)}`}>Choose video →</Link></div></article>)}</div>
  </main>;
}
