"use client";

import { ConversationLayer } from "@/components/ConversationLayer";
import { MicButton } from "@/components/MicButton";
import { ProgressBar } from "@/components/ProgressBar";
import { TextDisplay } from "@/components/TextDisplay";
import { useConversation } from "@/hooks/useConversation";
import { useReadingLoop } from "@/hooks/useReadingLoop";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useReadingStore } from "@/store/reading";

export function ReadingEngine() {
  const chunks = useReadingStore((s) => s.chunks);
  const currentIndex = useReadingStore((s) => s.currentIndex);
  const uiMode = useReadingStore((s) => s.uiMode);
  const isPlaying = useReadingStore((s) => s.isPlaying);
  const documentTitle = useReadingStore((s) => s.documentTitle);
  const lastTranscript = useReadingStore((s) => s.lastTranscript);
  const lastAssistantRaw = useReadingStore((s) => s.lastAssistantRaw);
  const conversation = useReadingStore((s) => s.conversation);
  const setUiMode = useReadingStore((s) => s.setUiMode);

  const { beginReadingFrom, pauseOrInterrupt } = useReadingLoop();

  const { handleFinalSpeech } = useConversation({ beginReadingFrom, pauseOrInterrupt });

  const onFinal = (text: string) => {
    void handleFinalSpeech(text);
  };

  const { supported, listening, start, stop } = useSpeechRecognition(onFinal);

  const toggleMic = () => {
    if (uiMode === "processing") return;
    if (listening) {
      stop();
      const playing = useReadingStore.getState().isPlaying;
      setUiMode(playing ? "reading" : "idle");
      return;
    }
    if (useReadingStore.getState().isPlaying) {
      pauseOrInterrupt();
    }
    setUiMode("listening");
    start();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-ui text-xs uppercase tracking-wide text-stone-500">Document</p>
          <h1 className="mt-1 font-reading text-3xl text-stone-100">{documentTitle || "Untitled"}</h1>
          <p className="mt-2 font-ui text-sm text-stone-400">
            Mode:{" "}
            <span className="text-gold">
              {uiMode === "reading"
                ? "Reading aloud"
                : uiMode === "listening"
                  ? "Listening"
                  : uiMode === "processing"
                    ? "Thinking / TTS"
                    : "Idle"}
            </span>
            {isPlaying ? <span className="text-stone-500"> · audio playing</span> : null}
          </p>
        </div>
        <MicButton
          uiMode={uiMode}
          listening={listening}
          speechSupported={supported}
          onPress={toggleMic}
        />
      </header>

      {isPlaying ? (
        <div className="flex items-center gap-2 font-ui text-xs text-stone-500" aria-hidden>
          <span className="inline-flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-3 w-1 animate-pulse rounded bg-gold/80"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          Playing — waveform indicator for Eddie
        </div>
      ) : null}

      <ProgressBar current={currentIndex} total={chunks.length} />

      <TextDisplay chunks={chunks} index={currentIndex} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-800 bg-panel p-4">
          <p className="font-ui text-xs uppercase tracking-wide text-stone-500">Last heard (Dr. Houchen)</p>
          <p className="mt-2 font-reading text-lg text-stone-100">{lastTranscript || "—"}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-panel p-4">
          <p className="font-ui text-xs uppercase tracking-wide text-stone-500">Last model reply (raw)</p>
          <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-reading text-sm text-stone-200">
            {lastAssistantRaw || "—"}
          </p>
        </div>
      </div>

      <ConversationLayer turns={conversation} />

      <div className="flex flex-wrap gap-3 border-t border-stone-800 pt-6">
        <button
          type="button"
          className="rounded-lg bg-gold px-4 py-3 font-ui text-sm font-semibold uppercase tracking-wide text-ink hover:bg-gold/90 disabled:opacity-40"
          disabled={!chunks.length || listening || uiMode === "processing"}
          onClick={() => void beginReadingFrom(currentIndex)}
        >
          Play from here
        </button>
        <button
          type="button"
          className="rounded-lg border border-stone-600 px-4 py-3 font-ui text-sm uppercase tracking-wide text-stone-200 hover:border-gold hover:text-gold disabled:opacity-40"
          disabled={!isPlaying && uiMode !== "reading"}
          onClick={() => {
            pauseOrInterrupt();
            setUiMode("idle");
          }}
        >
          Pause
        </button>
      </div>
    </div>
  );
}
