import { PENDING_LABEL, SHOW_PENDING } from "@/data/guests";
import type { GuestSlot } from "@/experience/gallery";

/**
 * Información editorial de cada invitado. Se genera desde la lista de invitados:
 * una capa por bahía, que la timeline (CarShowcaseScene) revela con el scroll.
 * Campos vacíos no se muestran; el nombre pendiente usa PENDING_LABEL (data/guests.ts).
 * Los estados iniciales (ocultos) los fija la propia timeline.
 */
export default function GuestInfo({ slots }: { slots: GuestSlot[] }) {
  return (
    <>
      {slots.map((s, i) => {
        const g = s.guest;
        const name = g.name.trim();
        const hasName = name.length > 0;
        const right = s.side === "right";
        const modelLine = [g.brand, g.model].filter((v) => v.trim()).join(" ");
        return (
          <div
            key={g.id}
            data-guest={i}
            data-side={s.side}
            aria-label={`Invitado ${g.number}`}
            className="pointer-events-none absolute inset-0 z-[14] opacity-0"
          >
            {/* número fantasma, enorme, detrás del texto */}
            <p
              data-g="ghost"
              aria-hidden
              className={`font-display absolute bottom-[7svh] select-none font-black leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgba(238,243,248,0.16)] max-md:bottom-auto max-md:top-[9svh] ${
                right ? "right-[2.5vw] max-md:right-auto max-md:left-[5vw]" : "left-[2.5vw]"
              } text-[clamp(7rem,24vw,24rem)] max-md:text-[clamp(5rem,30vw,9rem)]`}
            >
              {g.number}
            </p>

            <div
              className={`absolute bottom-[17svh] flex w-[min(40vw,36rem)] flex-col gap-3 max-md:bottom-[13svh] max-md:w-[88vw] max-md:gap-2 ${
                right ? "right-[4.5vw] items-end text-right max-md:right-auto max-md:left-[6vw] max-md:items-start max-md:text-left" : "left-[4.5vw] items-start text-left max-md:left-[6vw]"
              }`}
            >
              <p data-g="tag" className="tech flex items-center gap-3 text-[0.72rem] text-[#eef3f8]">
                <span>GUEST</span>
                <span className="text-[#e0141f]">/</span>
                <span className="opacity-90">{g.number}</span>
              </p>
              <span data-g="line" className={`block h-px w-24 bg-[#e0141f] ${right ? "origin-right max-md:origin-left" : "origin-left"}`} />

              <div className="-mt-[0.22em] overflow-hidden pb-[0.12em] pt-[0.22em]">
                <h2
                  data-g="name"
                  className={`font-display font-black uppercase leading-[0.88] tracking-[0.005em] ${
                    hasName ? "text-[clamp(2.4rem,6.2vw,6.4rem)] text-[#eef3f8]" : "text-[clamp(1.5rem,3.1vw,3.2rem)] text-[#eef3f8]/70"
                  }`}
                >
                  {hasName ? name : SHOW_PENDING ? PENDING_LABEL : " "}
                </h2>
              </div>

              {modelLine && (
                <div className="overflow-hidden">
                  <p data-g="model" className="font-display text-[clamp(1.1rem,2.1vw,2.2rem)] font-bold uppercase leading-none tracking-[0.06em] text-[#eef3f8]">
                    {g.brand && <span>{g.brand}</span>}
                    {g.model && <span className="text-[#e0141f]"> — </span>}
                    {g.model && <span className="text-[#eef3f8]/85">{g.model}</span>}
                  </p>
                </div>
              )}

              {g.instagram.trim() && (
                <p data-g="ig" className="tech text-[0.78rem] text-[#eef3f8]/80">
                  <span className="mr-2 text-[0.6rem] opacity-50">INSTAGRAM</span>
                  {g.instagram.startsWith("@") ? g.instagram : `@${g.instagram}`}
                </p>
              )}

              {g.description.trim() && (
                <p data-g="desc" className="tech max-w-[28rem] text-[0.7rem] normal-case leading-relaxed text-[#eef3f8]/60">
                  {g.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
