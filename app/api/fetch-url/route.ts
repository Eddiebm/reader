import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { NextResponse } from "next/server";
import { BlockedUrlError, fetchPublicUrl } from "@/lib/safe-fetch";

export const runtime = "nodejs";

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Only http(s) URLs are allowed." }, { status: 400 });
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);

  let html: string;
  try {
    // Public addresses only, every redirect re-checked: this route returns the page's text.
    const res = await fetchPublicUrl(url.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReaderPhaseOne/0.1; +https://vercel.com) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
  } catch (e) {
    clearTimeout(t);
    if (e instanceof BlockedUrlError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Fetch failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(t);
  }

  const dom = new JSDOM(html, { url: url.toString() });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text = (article?.textContent ?? dom.window.document.body?.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const title = article?.title?.trim() || url.hostname;
  const words = countWords(text);
  const paywallHint = words > 0 && words < 200;

  return NextResponse.json({
    title,
    text,
    wordCount: words,
    paywallHint,
    hint:
      paywallHint
        ? "Extracted text is short — the page may be paywalled or mostly boilerplate. Try pasting the article directly."
        : undefined,
  });
}
