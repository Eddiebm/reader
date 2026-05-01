"use client";

type Props = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round(((current + 1) / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between font-ui text-xs uppercase tracking-wide text-stone-400">
        <span>
          Chunk {total ? current + 1 : 0} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-stone-800">
        <div
          className="h-2 rounded-full bg-gold transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
