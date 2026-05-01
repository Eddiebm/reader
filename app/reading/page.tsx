"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ReadingEngine } from "@/components/ReadingEngine";
import { useReadingStore } from "@/store/reading";

export default function ReadingPage() {
  const router = useRouter();
  const chunks = useReadingStore((s) => s.chunks);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useReadingStore.persist;
    if (!api) {
      setHydrated(true);
      return;
    }
    setHydrated(api.hasHydrated());
    const unsub = api.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!chunks.length) {
      router.replace("/content");
    }
  }, [chunks.length, hydrated, router]);

  if (!hydrated || !chunks.length) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-14 font-ui text-stone-400">
        {!hydrated ? "Loading saved session…" : "Redirecting to content…"}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/content" className="font-ui text-sm text-gold hover:underline">
          ← Change document
        </Link>
        <p className="font-ui text-xs uppercase tracking-wide text-stone-500">
          Screen optimized for Eddie · large type · high contrast
        </p>
      </div>
      <ReadingEngine />
    </main>
  );
}
