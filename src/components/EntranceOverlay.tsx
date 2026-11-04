import { EVENT } from "@/config";

/** Textos HTML de la escena 1. Los anima EntranceScene.timeline() vía data-attrs. */
export default function EntranceOverlay() {
  return (
    <>
      <div
        data-title
        className="pointer-events-none absolute inset-x-0 top-[7svh] z-20 flex flex-col items-center px-[4vw] will-change-transform"
      >
        <p data-meta className="tech mb-[2.2svh] text-[clamp(0.55rem,1.1vw,0.9rem)] text-[#cfd8e2]/80">
          {EVENT.venue} <span className="mx-2 text-[#e0141f]">/</span> Estacionamiento · Nivel −1
        </p>
        <h1 className="title-main">{EVENT.name}</h1>
        <p className="title-sub mt-[1.6svh] flex items-center gap-[1.2em] pl-[0.62em]">
          <span aria-hidden className="inline-block h-[0.14em] w-[2.6em] -skew-x-[30deg] bg-[#e0141f]" />
          {EVENT.subtitle}
          <span aria-hidden className="inline-block h-[0.14em] w-[2.6em] -skew-x-[30deg] bg-[#e0141f]" />
        </p>
      </div>

      <div
        data-hint
        className="pointer-events-none absolute inset-x-0 bottom-[4.5svh] z-20 flex flex-col items-center gap-2"
      >
        <span className="tech text-[clamp(0.62rem,1vw,0.8rem)]">Scroll to enter</span>
        <span className="bob block text-xl leading-none text-[#e0141f]">↓</span>
      </div>
    </>
  );
}
