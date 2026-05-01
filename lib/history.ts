import type { ReadChunk } from "@/lib/types";

export function appendReadChunk(history: ReadChunk[], entry: ReadChunk): ReadChunk[] {
  const last = history[history.length - 1];
  if (last && last.idx === entry.idx && last.text === entry.text) return history;
  return [...history, entry];
}
