import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14">
      <div>
        <p className="font-ui text-xs uppercase tracking-[0.2em] text-goldMuted">READER · Phase One</p>
        <h1 className="mt-3 font-reading text-4xl text-stone-100">Setup</h1>
        <p className="mt-4 font-reading text-lg leading-relaxed text-stone-400">
          OpenAI and Anthropic keys live only on the server. Add{" "}
          <code className="font-ui text-gold">OPENAI_API_KEY</code> and{" "}
          <code className="font-ui text-gold">ANTHROPIC_API_KEY</code> in Vercel (or{" "}
          <code className="font-ui text-sm text-stone-300">reader-app/.env.local</code> locally). Voice defaults to{" "}
          <span className="text-gold">onyx</span> — change it on the content screen.
        </p>
      </div>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wide text-stone-300">Speech recognition</h2>
        <p className="font-reading text-stone-400 leading-relaxed">
          Phase one uses the Web Speech API (browser-built-in). Use{" "}
          <strong className="text-stone-200">Safari or Chrome</strong> on iPad/desktop. Deepgram arrives in phase two.
        </p>
      </section>

      <section className="rounded-xl border border-stone-800 bg-panel p-6 space-y-4">
        <h2 className="font-ui text-sm uppercase tracking-wide text-stone-300">Flic Bluetooth button</h2>
        <p className="font-reading text-stone-400 leading-relaxed">
          Web Bluetooth needs HTTPS and Chromium (Chrome desktop/Android). It does{" "}
          <strong className="text-stone-200">not</strong> work in iPad Safari. On iPad, use the large on-screen mic — it
          stays visible and high-contrast. Native Flic bridging is out of scope for phase one; see{" "}
          <code className="font-ui text-gold">lib/flic.ts</code>.
        </p>
      </section>

      <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6">
        <h2 className="font-ui text-sm uppercase tracking-wide text-amber-200">Latency</h2>
        <p className="mt-2 font-reading text-stone-300 leading-relaxed">
          Expect roughly 3–5 seconds from end of speech to the start of the assistant reply through OpenAI TTS. A short
          tone plays as soon as the mic engages so silence does not feel like a fault.
        </p>
      </section>

      <Link
        href="/content"
        className="inline-flex w-fit items-center justify-center rounded-lg bg-gold px-6 py-4 font-ui text-sm font-semibold uppercase tracking-wide text-ink hover:bg-gold/90"
      >
        Continue to load content
      </Link>
    </main>
  );
}
