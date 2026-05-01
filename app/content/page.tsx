"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { extractPdfText } from "@/lib/pdf-extract";
import { useReadingStore } from "@/store/reading";

const VOICES = ["onyx", "alloy", "echo", "fable", "nova", "shimmer"] as const;

export default function ContentPage() {
  const router = useRouter();
  const loadDocument = useReadingStore((s) => s.loadDocument);
  const setPreferredVoice = useReadingStore((s) => s.setPreferredVoice);
  const preferredVoice = useReadingStore((s) => s.preferredVoice);

  const [title, setTitle] = useState("Untitled document");
  const [paste, setPaste] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const goReading = () => {
    router.push("/reading");
  };

  const loadText = (t: string, docTitle: string) => {
    loadDocument(docTitle, t);
    setNotice(null);
    goReading();
  };

  const onPasteLoad = () => {
    if (!paste.trim()) {
      setNotice("Paste some text first.");
      return;
    }
    loadText(paste, title || "Pasted document");
  };

  const onPdf = async (file: File | null) => {
    if (!file) return;
    setBusy("pdf");
    setNotice(null);
    try {
      const { text, isScannedLikely } = await extractPdfText(file);
      if (isScannedLikely || text.length < 40) {
        setNotice(
          "This PDF has little or no extractable text (likely scanned pages). Please provide another format or paste the text.",
        );
        setBusy(null);
        return;
      }
      loadText(text, file.name.replace(/\.pdf$/i, "") || title);
    } catch {
      setNotice("Could not read that PDF. Try a smaller file or paste the text.");
    } finally {
      setBusy(null);
    }
  };

  const onFetchUrl = async () => {
    if (!url.trim()) {
      setNotice("Enter a URL.");
      return;
    }
    setBusy("url");
    setNotice(null);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as {
        title?: string;
        text?: string;
        hint?: string;
        error?: string;
        paywallHint?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Fetch failed");
      }
      const text = data.text ?? "";
      if (!text.trim()) {
        setNotice("No article body extracted. Paste the text manually.");
        setBusy(null);
        return;
      }
      if (data.hint) setNotice(data.hint);
      loadText(text, data.title || title);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not fetch URL.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-goldMuted">Load material</p>
          <h1 className="mt-2 font-reading text-4xl text-stone-100">Content</h1>
        </div>
        <Link href="/" className="font-ui text-sm text-gold hover:underline">
          Setup notes
        </Link>
      </div>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-3">
        <label className="font-ui text-xs uppercase tracking-wide text-stone-400">Document title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-ink px-3 py-3 font-reading text-lg text-stone-100 outline-none ring-gold/30 focus:ring-2"
        />
      </section>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-3">
        <label className="font-ui text-xs uppercase tracking-wide text-stone-400">OpenAI TTS voice</label>
        <select
          value={preferredVoice}
          onChange={(e) => setPreferredVoice(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-ink px-3 py-3 font-ui text-sm text-stone-100 outline-none ring-gold/30 focus:ring-2"
        >
          {VOICES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <p className="font-reading text-sm text-stone-500">Default for Dr. Houchen: onyx (deep, measured).</p>
      </section>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wide text-stone-300">Paste text</h2>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={10}
          placeholder="Paste article, grant section, or book excerpt…"
          className="w-full rounded-lg border border-stone-700 bg-ink px-3 py-3 font-reading text-base leading-relaxed text-stone-100 outline-none ring-gold/30 focus:ring-2"
        />
        <button
          type="button"
          disabled={!!busy}
          onClick={onPasteLoad}
          className="rounded-lg bg-gold px-4 py-3 font-ui text-sm font-semibold uppercase tracking-wide text-ink hover:bg-gold/90 disabled:opacity-40"
        >
          Load &amp; go to reading
        </button>
      </section>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wide text-stone-300">PDF upload</h2>
        <p className="font-reading text-sm text-stone-500">
          pdf.js loads from CDN on first use — not bundled. Large PDFs stay client-side only for extraction.
        </p>
        <input
          type="file"
          accept="application/pdf"
          disabled={!!busy}
          onChange={(e) => void onPdf(e.target.files?.[0] ?? null)}
          className="font-ui text-sm text-stone-300 file:mr-4 file:rounded-md file:border-0 file:bg-stone-700 file:px-4 file:py-2 file:text-stone-100"
        />
      </section>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wide text-stone-300">Fetch URL (server-side)</h2>
        <p className="font-reading text-sm text-stone-500">
          HTML is cleaned with Mozilla Readability on the server — never from the browser (avoids CORS).
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-stone-700 bg-ink px-3 py-3 font-ui text-sm text-stone-100 outline-none ring-gold/30 focus:ring-2"
        />
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void onFetchUrl()}
          className="rounded-lg border border-gold/60 px-4 py-3 font-ui text-sm uppercase tracking-wide text-gold hover:bg-gold/10 disabled:opacity-40"
        >
          {busy === "url" ? "Fetching…" : "Fetch & load"}
        </button>
      </section>

      {notice ? (
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 font-reading text-amber-100">
          {notice}
        </div>
      ) : null}

      <button
        type="button"
        onClick={goReading}
        className="w-fit rounded-lg border border-stone-600 px-4 py-3 font-ui text-sm uppercase tracking-wide text-stone-200 hover:border-gold"
      >
        Open reading screen (uses last loaded doc from storage)
      </button>
    </main>
  );
}
