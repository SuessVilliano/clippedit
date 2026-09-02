"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const [twitchId, setTwitchId] = useState("");
  const [twitchSecret, setTwitchSecret] = useState("");
  const [kickId, setKickId] = useState("");
  const [kickSecret, setKickSecret] = useState("");
  const [status, setStatus] = useState("Checking connections…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/sources", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const connected = [
          data.twitch?.connected ? "Twitch connected" : "Twitch not connected",
          data.kick?.connected ? "Kick connected" : "Kick not connected"
        ];
        setStatus(connected.join(" · "));
      })
      .catch(() => setStatus("Unable to check source status."));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("Saving securely…");
    try {
      const res = await fetch("/api/settings/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          twitch:
            twitchId && twitchSecret
              ? { clientId: twitchId, clientSecret: twitchSecret }
              : undefined,
          kick:
            kickId && kickSecret
              ? { clientId: kickId, clientSecret: kickSecret }
              : undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to save credentials");
      setTwitchSecret("");
      setKickSecret("");
      setStatus("Saved. Your next Live, Trending, Clips, or Radar fetch will use these sources.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save credentials.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    await fetch("/api/settings/sources", { method: "DELETE" });
    setTwitchId("");
    setTwitchSecret("");
    setKickId("");
    setKickSecret("");
    setStatus("Saved browser source credentials cleared.");
  }

  return (
    <main className="page-shell" style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 100px" }}>
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow">DATA SOURCES</p>
        <h1 style={{ fontSize: 42, margin: "8px 0 12px" }}>Connect Twitch & Kick</h1>
        <p style={{ opacity: 0.72, maxWidth: 720 }}>
          Add your API application credentials here once, then use Clipped It on demand. Secrets are encrypted server-side and stored in an HTTP-only cookie for this browser.
        </p>
      </div>

      <form onSubmit={save} style={{ display: "grid", gap: 22 }}>
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Twitch</h2>
          <p style={{ opacity: 0.65 }}>Create an app in the Twitch Developer Console and paste the Client ID and Client Secret.</p>
          <div style={{ display: "grid", gap: 12 }}>
            <input aria-label="Twitch Client ID" placeholder="Twitch Client ID" value={twitchId} onChange={(e) => setTwitchId(e.target.value)} style={{ padding: 14, borderRadius: 10 }} />
            <input aria-label="Twitch Client Secret" type="password" placeholder="Twitch Client Secret" value={twitchSecret} onChange={(e) => setTwitchSecret(e.target.value)} style={{ padding: 14, borderRadius: 10 }} />
          </div>
        </section>

        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Kick</h2>
          <p style={{ opacity: 0.65 }}>Paste your Kick application Client ID and Client Secret.</p>
          <div style={{ display: "grid", gap: 12 }}>
            <input aria-label="Kick Client ID" placeholder="Kick Client ID" value={kickId} onChange={(e) => setKickId(e.target.value)} style={{ padding: 14, borderRadius: 10 }} />
            <input aria-label="Kick Client Secret" type="password" placeholder="Kick Client Secret" value={kickSecret} onChange={(e) => setKickSecret(e.target.value)} style={{ padding: 14, borderRadius: 10 }} />
          </div>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "12px 18px" }}>
            {saving ? "Saving…" : "Save Sources"}
          </button>
          <button type="button" onClick={clear} style={{ padding: "12px 18px", borderRadius: 10 }}>
            Clear Saved Sources
          </button>
        </div>
      </form>

      <div className="card" style={{ padding: 18, marginTop: 24 }}>
        <strong>Connection status</strong>
        <p style={{ marginBottom: 0, opacity: 0.75 }}>{status}</p>
      </div>
    </main>
  );
}
