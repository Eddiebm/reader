import { create } from "zustand";
import { persist } from "zustand/middleware";

import { chunkText } from "@/lib/chunker";
import { appendReadChunk } from "@/lib/history";
import type { ConversationTurn, ReadChunk } from "@/lib/types";

export type UiMode = "idle" | "reading" | "listening" | "processing";

type ReadingStore = {
  documentTitle: string;
  fullText: string;
  chunks: string[];
  currentIndex: number;
  playSession: number;
  isPlaying: boolean;
  uiMode: UiMode;
  readHistory: ReadChunk[];
  conversation: ConversationTurn[];
  lastTranscript: string;
  lastAssistantRaw: string;
  preferredVoice: string;

  setPreferredVoice: (voice: string) => void;
  loadDocument: (title: string, fullText: string) => void;
  setChunks: (chunks: string[]) => void;
  setCurrentIndex: (idx: number) => void;
  bumpPlaySession: () => number;
  setIsPlaying: (v: boolean) => void;
  setUiMode: (m: UiMode) => void;
  pushReadHistory: (entry: ReadChunk) => void;
  appendConversation: (turn: ConversationTurn) => void;
  setLastTranscript: (t: string) => void;
  setLastAssistantRaw: (t: string) => void;
  resetSessionKeepDoc: () => void;
};

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set, get) => ({
      documentTitle: "",
      fullText: "",
      chunks: [],
      currentIndex: 0,
      playSession: 0,
      isPlaying: false,
      uiMode: "idle",
      readHistory: [],
      conversation: [],
      lastTranscript: "",
      lastAssistantRaw: "",
      preferredVoice: "onyx",

      setPreferredVoice: (voice) => set({ preferredVoice: voice }),

      loadDocument: (title, fullText) => {
        const chunks = chunkText(fullText);
        set({
          documentTitle: title,
          fullText,
          chunks,
          currentIndex: 0,
          readHistory: [],
          conversation: [],
          lastTranscript: "",
          lastAssistantRaw: "",
          isPlaying: false,
          uiMode: "idle",
        });
      },

      setChunks: (chunks) => set({ chunks }),

      setCurrentIndex: (idx) =>
        set({
          currentIndex: Math.max(0, Math.min(idx, Math.max(0, get().chunks.length - 1))),
        }),

      bumpPlaySession: () => {
        const next = get().playSession + 1;
        set({ playSession: next });
        return next;
      },

      setIsPlaying: (v) => set({ isPlaying: v }),

      setUiMode: (m) => set({ uiMode: m }),

      pushReadHistory: (entry) =>
        set((s) => ({ readHistory: appendReadChunk(s.readHistory, entry) })),

      appendConversation: (turn) =>
        set((s) => ({ conversation: [...s.conversation, turn] })),

      setLastTranscript: (t) => set({ lastTranscript: t }),

      setLastAssistantRaw: (t) => set({ lastAssistantRaw: t }),

      resetSessionKeepDoc: () =>
        set({
          currentIndex: 0,
          readHistory: [],
          conversation: [],
          lastTranscript: "",
          lastAssistantRaw: "",
          isPlaying: false,
          uiMode: "idle",
          playSession: get().playSession + 1,
        }),
    }),
    {
      name: "reader-phase-one",
      partialize: (s) => ({
        documentTitle: s.documentTitle,
        fullText: s.fullText,
        preferredVoice: s.preferredVoice,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ReadingStore>;
        const fullText = p.fullText ?? "";
        const chunks = fullText ? chunkText(fullText) : [];
        return {
          ...current,
          ...p,
          chunks,
          currentIndex: 0,
          readHistory: [],
          conversation: [],
          lastTranscript: "",
          lastAssistantRaw: "",
          isPlaying: false,
          uiMode: "idle",
        };
      },
    },
  ),
);
