"use client";

type Props = {
  chunks: string[];
  index: number;
};

export function TextDisplay({ chunks, index }: Props) {
  const prev = index > 0 ? chunks[index - 1] : "";
  const cur = chunks[index] ?? "";
  const next = index < chunks.length - 1 ? chunks[index + 1] : "";

  return (
    <div className="space-y-6 rounded-xl border border-stone-800 bg-panel p-6">
      <div>
        <p className="font-ui text-xs uppercase tracking-wide text-stone-500">Previous</p>
        <p className="mt-1 font-reading text-lg leading-relaxed text-stone-500 line-clamp-4">{prev || "—"}</p>
      </div>
      <div>
        <p className="font-ui text-xs uppercase tracking-wide text-goldMuted">Current (playing)</p>
        <p className="mt-2 min-h-[4rem] font-reading text-[28px] leading-snug text-stone-100">{cur || "—"}</p>
      </div>
      <div>
        <p className="font-ui text-xs uppercase tracking-wide text-stone-500">Next</p>
        <p className="mt-1 font-reading text-lg leading-relaxed text-stone-500 line-clamp-4">{next || "—"}</p>
      </div>
    </div>
  );
}
