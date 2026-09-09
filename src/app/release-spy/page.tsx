"use client";

import { FormEvent, useMemo, useState } from "react";

type ContentPackage = {
  headline: string;
  thesis: string;
  angles: string[];
  shorts: Array<{ title: string; hook: string; script: string; visualPlan: string[]; cta: string }>;
  longForm: { title: string; hook: string; outline: string[]; cta: string };
  captions: string[];
  production: { avatarUse: string; broll: string[]; screenCapture: string[]; opusPrompt: string };
};

const starter = `Paste a HighLevel Release Radar update, changelog, product announcement, or your own notes here. Release Spy will turn it into content angles, Shorts scripts, a long-form outline, shot lists, captions, and an AI-video production brief.`;

export default function ReleaseSpyPage() {
  const [product, setProduct] = useState("HighLevel");
  const [feature, setFeature] = useState("");
  const [releaseText, setReleaseText] = useState("");
  const [audience, setAudience] = useState("Agencies, affiliates, creators, and AI automation builders");
  const [goal, setGoal] = useState("Teach the release, show the practical play, and create demand without hard selling");
  const [tone, setTone] = useState("smart, energetic, practical, no-hype");
  const [result, setResult] = useState<ContentPackage | null>(null);
  const [mode, setMode] = useState<"ai" | "template" | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("Release Spy turns product updates into a faceless content production package.");

  const ready = useMemo(() => releaseText.trim().length > 20, [releaseText]);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    if (!ready) {
      setMessage("Paste enough source material for Release Spy to work from.");
      return;
    }
    setRunning(true);
    setMessage("Breaking the release into hooks, plays, scripts, visuals, and production instructions…");
    try {
      const res = await fetch("/api/release-spy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, feature, releaseText, audience, goal, tone })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Release Spy failed.");
      setResult(json.package);
      setMode(json.mode);
      setMessage(json.mode === "ai" ? "AI content package ready." : "Content package ready using the built-in fallback engine. Add LLM_API_KEY for full AI generation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Release Spy failed.");
    } finally {
      setRunning(false);
    }
  }

  function savePackage() {
    if (!result) return;
    const current = JSON.parse(localStorage.getItem("clippedit.releaseSpy") || "[]") as unknown[];
    current.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), product, feature, releaseText, result });
    localStorage.setItem("clippedit.releaseSpy", JSON.stringify(current.slice(0, 50)));
    setMessage("Saved to this browser's Release Spy workspace.");
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
  }

  return (
    <main className="container">
      <div className="page-head">
        <p className="eyebrow">RELEASE SPY</p>
        <h1>Turn every release into the play.</h1>
        <p>Paste a release once. Get faceless Shorts, long-form structure, screen-recording plans, AI-avatar direction, captions, and an Opus-ready production brief.</p>
      </div>

      <form onSubmit={generate} className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label className="card-sub">Product<input value={product} onChange={(e) => setProduct(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 6 }} /></label>
          <label className="card-sub">Feature / release name<input value={feature} onChange={(e) => setFeature(e.target.value)} placeholder="e.g. Conversation AI update" style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 6 }} /></label>
        </div>
        <label className="card-sub" style={{ display: "block", marginTop: 12 }}>Release notes / source<textarea value={releaseText} onChange={(e) => setReleaseText(e.target.value)} rows={9} placeholder={starter} style={{ width: "100%", padding: 14, borderRadius: 12, resize: "vertical", marginTop: 6 }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 12 }}>
          <label className="card-sub">Audience<input value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 6 }} /></label>
          <label className="card-sub">Goal<input value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 6 }} /></label>
          <label className="card-sub">Tone<input value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 6 }} /></label>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn primary" disabled={running || !ready}>{running ? "Building package…" : "Generate Content Package"}</button>
          {result ? <button type="button" className="btn" onClick={savePackage}>Save package</button> : null}
        </div>
      </form>

      <div className="banner preview" style={{ marginBottom: 18 }}><span className="ico">⌁</span><span>{message}{mode ? ` · ${mode.toUpperCase()} mode` : ""}</span></div>

      {result ? <div style={{ display: "grid", gap: 18 }}>
        <section className="card" style={{ padding: 18 }}>
          <p className="eyebrow">STRATEGY</p>
          <h2 style={{ marginTop: 4 }}>{result.headline}</h2>
          <p>{result.thesis}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{result.angles.map((angle) => <span key={angle} className="pill">{angle}</span>)}</div>
        </section>

        <section>
          <div className="page-head" style={{ marginBottom: 10 }}><p className="eyebrow">SHORTS FACTORY</p><h2>3 ready-to-produce vertical videos</h2></div>
          <div className="grid">
            {result.shorts.map((short, index) => <article className="card" key={`${short.title}-${index}`} style={{ padding: 18 }}>
              <div className="pill">SHORT #{index + 1}</div>
              <h3>{short.title}</h3>
              <p><strong>Hook:</strong> {short.hook}</p>
              <p className="card-sub" style={{ whiteSpace: "pre-wrap" }}>{short.script}</p>
              <div style={{ marginTop: 12 }}><strong>Visual plan</strong><ul>{short.visualPlan.map((shot) => <li key={shot}>{shot}</li>)}</ul></div>
              <p><strong>CTA:</strong> {short.cta}</p>
              <button type="button" className="btn primary" onClick={() => copy(`${short.hook}\n\n${short.script}\n\nCTA: ${short.cta}`)}>Copy script</button>
            </article>)}
          </div>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <p className="eyebrow">WEEKLY LONG FORM</p>
          <h2>{result.longForm.title}</h2>
          <p><strong>Opening:</strong> {result.longForm.hook}</p>
          <ol>{result.longForm.outline.map((item) => <li key={item}>{item}</li>)}</ol>
          <p><strong>CTA:</strong> {result.longForm.cta}</p>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <p className="eyebrow">FACELESS PRODUCTION</p>
          <h2>AI production brief</h2>
          <p><strong>Avatar:</strong> {result.production.avatarUse}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            <div><strong>Screen capture</strong><ul>{result.production.screenCapture.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><strong>AI B-roll</strong><ul>{result.production.broll.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <div className="banner preview" style={{ marginTop: 12 }}><span>{result.production.opusPrompt}</span></div>
          <button type="button" className="btn primary" style={{ marginTop: 10 }} onClick={() => copy(result.production.opusPrompt)}>Copy AI-video prompt</button>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <p className="eyebrow">CAPTIONS</p>
          <div style={{ display: "grid", gap: 10 }}>{result.captions.map((caption) => <div key={caption} className="pill" style={{ justifyContent: "space-between" }}>{caption}<button type="button" className="btn" onClick={() => copy(caption)}>Copy</button></div>)}</div>
        </section>
      </div> : null}
    </main>
  );
}
