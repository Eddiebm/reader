"use client";

import type { ConversationTurn } from "@/lib/types";

type Props = {
  turns: ConversationTurn[];
};

export function ConversationLayer({ turns }: Props) {
  return (
    <div className="rounded-xl border border-stone-800 bg-panel">
      <div className="border-b border-stone-800 px-4 py-3 font-ui text-xs uppercase tracking-wide text-stone-400">
        Conversation (Dr. Houchen ↔ companion)
      </div>
      <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-4">
        {turns.length === 0 ? (
          <p className="font-ui text-sm text-stone-500">No turns yet.</p>
        ) : (
          turns.map((t, i) => (
            <div key={`${i}-${t.role}`} className="border-l-2 border-stone-700 pl-3">
              <p className="font-ui text-[11px] uppercase tracking-wide text-goldMuted">{t.role}</p>
              <p className="mt-1 whitespace-pre-wrap font-reading text-base leading-relaxed text-stone-200">
                {t.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
