"use client";

import type { UiMode } from "@/store/reading";

type Props = {
  uiMode: UiMode;
  listening: boolean;
  speechSupported: boolean;
  onPress: () => void;
};

function label(uiMode: UiMode, listening: boolean): string {
  if (!listening) {
    if (uiMode === "reading") return "Interrupt — listen";
    if (uiMode === "processing") return "Processing…";
    return "Listen";
  }
  return "Stop listening";
}

export function MicButton({ uiMode, listening, speechSupported, onPress }: Props) {
  const disabled = uiMode === "processing" || !speechSupported;
  const ring =
    uiMode === "reading"
      ? "bg-gold ring-gold/40"
      : listening
        ? "bg-red-600 ring-red-400/50"
        : uiMode === "processing"
          ? "bg-indigo-600 ring-indigo-400/50"
          : "bg-stone-600 ring-stone-500/40";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        aria-label={label(uiMode, listening)}
        onClick={onPress}
        className={`flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full ring-4 ring-offset-4 ring-offset-ink shadow-lg transition-colors ${ring} ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-110 active:brightness-95"
        }`}
      >
        <span className="font-ui text-xs font-semibold uppercase tracking-wider text-white">
          {listening ? "MIC" : uiMode === "reading" ? "STOP" : "MIC"}
        </span>
      </button>
      <p className="max-w-xs text-center font-ui text-sm text-stone-300">{label(uiMode, listening)}</p>
      {!speechSupported ? (
        <p className="max-w-md text-center font-ui text-xs text-amber-400">
          Speech recognition needs Safari or Chrome on this device (Web Speech API). Phase two will add Deepgram.
        </p>
      ) : null}
    </div>
  );
}
