/**
 * Source extraction for the Video Factory.
 *
 * Pulls usable release text out of a pasted URL (or a URL embedded in pasted
 * notes) so the content generator has real material to work from. YouTube watch
 * pages are handled specially — a plain fetch of a YouTube page has no visible
 * transcript/description in the stripped HTML, so we parse the video title and
 * `shortDescription` out of the embedded player JSON instead.
 */

export interface Extraction {
  releaseTitle?: string;
  releaseText: string;
  chars: number;
  sources: string[];
  warning?: string;
}

function decodeEntities(v: string) {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

function stripHtml(html: string) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, keys: string[]): string {
  for (const key of keys) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${key}["']`, "i");
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]).trim();
  }
  return "";
}

function youtubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchText(url: string, ms = 9000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a JS/JSON string literal value (already without surrounding quotes). */
function unescapeJson(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\u0026/g, "&");
  }
}

async function extractYouTube(url: string, id: string): Promise<{ title?: string; text: string }> {
  const html = await fetchText(`https://www.youtube.com/watch?v=${id}&hl=en`);
  if (html) {
    const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    const titleMatch =
      html.match(/"videoDetails":\{[^}]*?"title":"((?:[^"\\]|\\.)*)"/) ||
      html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const desc = descMatch ? unescapeJson(descMatch[1]) : "";
    const title = titleMatch ? unescapeJson(titleMatch[1]) : "";
    if (desc || title) {
      return { title: title || undefined, text: [title, desc].filter(Boolean).join("\n\n") };
    }
  }
  // Fallback: oEmbed gives at least the title + author.
  const oembed = await fetchText(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
  if (oembed) {
    try {
      const j = JSON.parse(oembed) as { title?: string; author_name?: string };
      const title = j.title || "";
      return { title: title || undefined, text: [title, j.author_name].filter(Boolean).join(" — ") };
    } catch {
      /* ignore */
    }
  }
  return { text: "" };
}

async function extractGeneric(url: string): Promise<{ title?: string; text: string }> {
  const html = await fetchText(url);
  if (!html) return { text: "" };
  const title = metaContent(html, ["og:title", "twitter:title"]) || (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  const desc = metaContent(html, ["description", "og:description", "twitter:description"]);
  const body = stripHtml(html);
  return { title: title || undefined, text: [title, desc, body].filter(Boolean).join("\n\n").slice(0, 18000) };
}

function urlsIn(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"')]+/gi) ?? [])].map((u) => u.replace(/[),.;]+$/, ""));
}

/**
 * Build release text from an explicit URL plus any URLs / notes pasted in text.
 * Returns diagnostics (chars, sources, warning) so the UI can tell the user
 * exactly what was read rather than silently producing generic output.
 */
export async function extractSource(input: { url?: string; text?: string }): Promise<Extraction> {
  const pastedText = (input.text ?? "").trim();
  const candidateUrls = [
    ...(input.url ? [input.url.trim()] : []),
    ...urlsIn(pastedText)
  ].filter((u, i, a) => u && a.indexOf(u) === i);

  const parts: string[] = [];
  const sources: string[] = [];
  let title: string | undefined;

  for (const url of candidateUrls.slice(0, 3)) {
    const id = youtubeId(url);
    const extracted = id ? await extractYouTube(url, id) : await extractGeneric(url);
    if (extracted.text) {
      parts.push(extracted.text);
      sources.push(url);
      if (!title && extracted.title) title = extracted.title;
    }
  }

  // Pasted prose that is not just a bare URL is real material too.
  const proseOnly = pastedText.replace(/https?:\/\/[^\s<>"')]+/gi, "").trim();
  if (proseOnly.length > 0) parts.unshift(pastedText);

  const releaseText = parts.join("\n\n").slice(0, 20000);
  let warning: string | undefined;
  if (candidateUrls.length && sources.length === 0) {
    warning =
      "Couldn't read that link (the page blocks server fetching or has no readable text). Paste the release notes directly for accurate output.";
  } else if (releaseText.length < 120) {
    warning = "Very little text was extracted — output may be generic. Paste more of the release notes for sharper results.";
  }

  return { releaseTitle: title, releaseText, chars: releaseText.length, sources, warning };
}
