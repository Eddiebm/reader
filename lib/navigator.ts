import type { ReadChunk } from "@/lib/types";

export function navigateBack(current: number, count: number = 1): number {
  return Math.max(0, current - count);
}

export function findInHistory(history: ReadChunk[], query: string): number | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const match = [...history].reverse().find((h) => h.text.toLowerCase().includes(q));
  return match?.idx ?? null;
}

export function fuzzyFind(history: ReadChunk[], query: string): number | null {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (!words.length) return null;
  const match = [...history].reverse().find((h) =>
    words.some((w) => h.text.toLowerCase().includes(w)),
  );
  return match?.idx ?? null;
}
