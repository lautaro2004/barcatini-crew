"use client";

import { useSyncExternalStore } from "react";
import { audio } from "@/audio/AudioEngine";

/**
 * Botón SOUND ON/OFF. Sólo conversa con el motor de audio (src/audio):
 * empieza siempre apagado y activa el contexto únicamente tras un click.
 */
export default function AmbientAudio() {
  const on = useSyncExternalStore(audio.subscribe, audio.getSnapshot, () => false);
  return (
    <button
      type="button"
      onClick={() => audio.toggle()}
      aria-pressed={on}
      aria-label={on ? "Silenciar audio" : "Activar audio"}
      className="tech absolute right-[3.2vw] top-[3.2svh] z-40 flex cursor-pointer items-center gap-3 border border-white/25 bg-black/35 px-3 py-2 text-[0.62rem] backdrop-blur-sm transition-colors hover:border-[#e0141f]"
    >
      <span className="flex h-3 items-end gap-[3px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className="block h-full w-[2px] origin-bottom bg-[#e0141f]"
            style={{ transform: on ? undefined : "scaleY(0.25)", animation: on ? `eq ${0.7 + i * 0.17}s ease-in-out infinite` : undefined }}
          />
        ))}
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
