"use client";

import { useCallback, useRef } from "react";

import { synthesizeSpeech, type TtsVoice } from "@/lib/tts-client";
import { useReadingStore } from "@/store/reading";

export function useReadingLoop() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      audioRef.current = null;
    }
  }, []);

  const runLoop = useCallback(async (startIdx: number, sessionId: number) => {
    const chunks = useReadingStore.getState().chunks;
    if (!chunks.length || startIdx >= chunks.length) {
      useReadingStore.getState().setIsPlaying(false);
      useReadingStore.getState().setUiMode("idle");
      return;
    }

    let i = startIdx;
    let prefetched: Blob | null = null;
    let prefetchIdx: number | null = null;

    const prefetch = async (idx: number) => {
      if (idx >= chunks.length) return;
      const voice = useReadingStore.getState().preferredVoice as TtsVoice;
      try {
        const blob = await synthesizeSpeech(chunks[idx], voice);
        if (useReadingStore.getState().playSession !== sessionId) return;
        prefetched = blob;
        prefetchIdx = idx;
      } catch {
        prefetched = null;
        prefetchIdx = null;
      }
    };

    while (i < chunks.length) {
      if (useReadingStore.getState().playSession !== sessionId) break;

      let blob: Blob;
      if (prefetchIdx === i && prefetched) {
        blob = prefetched;
        prefetched = null;
        prefetchIdx = null;
      } else {
        try {
          const voice = useReadingStore.getState().preferredVoice as TtsVoice;
          blob = await synthesizeSpeech(chunks[i], voice);
        } catch {
          useReadingStore.getState().setIsPlaying(false);
          useReadingStore.getState().setUiMode("idle");
          break;
        }
      }

      if (useReadingStore.getState().playSession !== sessionId) break;

      useReadingStore.getState().setCurrentIndex(i);
      useReadingStore.getState().pushReadHistory({ idx: i, text: chunks[i] });

      void prefetch(i + 1);

      const url = URL.createObjectURL(blob);
      try {
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            if (audioRef.current === audio) audioRef.current = null;
            reject(new Error("Audio playback failed"));
          };
          void audio.play().catch(reject);
        });
      } catch {
        URL.revokeObjectURL(url);
        break;
      }

      if (useReadingStore.getState().playSession !== sessionId) break;
      i += 1;
    }

    const st = useReadingStore.getState();
    if (st.playSession === sessionId) {
      st.setIsPlaying(false);
      if (st.uiMode === "reading") st.setUiMode("idle");
    }
  }, []);

  const pauseOrInterrupt = useCallback(() => {
    stopAudio();
    useReadingStore.getState().bumpPlaySession();
    useReadingStore.getState().setIsPlaying(false);
  }, [stopAudio]);

  const beginReadingFrom = useCallback(
    async (index: number) => {
      stopAudio();
      const sessionId = useReadingStore.getState().bumpPlaySession();
      useReadingStore.getState().setCurrentIndex(index);
      useReadingStore.getState().setIsPlaying(true);
      useReadingStore.getState().setUiMode("reading");
      await runLoop(index, sessionId);
    },
    [runLoop, stopAudio],
  );

  return { beginReadingFrom, pauseOrInterrupt, stopAudio };
}
