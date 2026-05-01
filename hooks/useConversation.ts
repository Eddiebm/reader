"use client";

import { useCallback } from "react";

import { parseClaudeAction } from "@/lib/claude-parse";
import { findInHistory, fuzzyFind, navigateBack } from "@/lib/navigator";
import { playBlob, synthesizeSpeech, type TtsVoice } from "@/lib/tts-client";
import { useReadingStore } from "@/store/reading";

type ReadingLoop = {
  beginReadingFrom: (i: number) => Promise<void>;
  pauseOrInterrupt: () => void;
};

export function useConversation(loop: ReadingLoop) {
  const handleFinalSpeech = useCallback(
    async (transcript: string) => {
      const store = useReadingStore.getState();
      store.setLastTranscript(transcript);
      store.appendConversation({ role: "user", content: transcript });
      store.setUiMode("processing");

      const recent = store.readHistory
        .slice(-8)
        .map((h) => h.text)
        .join(" ");

      let rawText = "";
      try {
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentTitle: store.documentTitle,
            currentIndex: store.currentIndex,
            totalChunks: store.chunks.length,
            recentContext: recent,
            history: store.conversation.slice(-40),
            speech: transcript,
          }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Claude request failed");
        }
        rawText = data.text ?? "";
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed.";
        store.appendConversation({ role: "assistant", content: msg });
        store.setLastAssistantRaw(msg);
        store.setUiMode("idle");
        return;
      }

      store.setLastAssistantRaw(rawText);
      const action = parseClaudeAction(rawText);
      const voice = store.preferredVoice as TtsVoice;

      const speak = async (text: string) => {
        const blob = await synthesizeSpeech(text, voice);
        await playBlob(blob);
      };

      try {
        if (action.action === "NAVIGATE") {
          let targetIdx = store.currentIndex;
          if (action.direction === "back") {
            targetIdx = navigateBack(store.currentIndex, action.count ?? 1);
          } else {
            const q = action.query?.trim() ?? "";
            const found = q ? findInHistory(store.readHistory, q) ?? fuzzyFind(store.readHistory, q) : null;
            if (found === null) {
              await speak(
                "I could not find that in what we have read so far. Try a shorter phrase, or go back manually.",
              );
              store.appendConversation({
                role: "assistant",
                content:
                  "Could not find query in read history. " +
                  (action.response || "").slice(0, 500),
              });
              store.setUiMode("idle");
              return;
            }
            targetIdx = found;
          }

          store.setCurrentIndex(targetIdx);
          await speak(action.response);
          store.appendConversation({ role: "assistant", content: rawText });
          await loop.beginReadingFrom(targetIdx);
          return;
        }

        if (action.action === "RESUME") {
          await speak(action.response);
          store.appendConversation({ role: "assistant", content: rawText });
          await loop.beginReadingFrom(store.currentIndex);
          return;
        }

        await speak(action.response);
        store.appendConversation({ role: "assistant", content: rawText });
        store.setUiMode("idle");
      } catch {
        store.setUiMode("idle");
      }
    },
    [loop],
  );

  return { handleFinalSpeech };
}
