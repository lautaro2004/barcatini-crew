import { EVENT } from "@/config";

/**
 * Links de Instagram "debajo del grafiti". La posición la calcula SponsorWall cada frame
 * (proyecta el punto de la pared a pantalla) y la visibilidad la maneja la timeline
 * (CarShowcaseScene) con la pausa frente al grafiti.
 */
export default function GraffitiLinks() {
  return (
    <div data-gl className="pointer-events-none absolute inset-0 z-[16] invisible opacity-0">
      <div data-gl-pos className="absolute left-0 top-0 will-change-transform">
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          <span className="tech block h-px w-16 bg-[#a24bff]" />
          <p className="tech text-[0.58rem] tracking-[0.34em] text-[#eef3f8]/55">SEGUINOS</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {EVENT.instagram.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="tech pointer-events-auto group flex flex-col items-center text-[0.8rem] text-[#eef3f8] transition-colors hover:text-[#ff3a4a] max-md:text-[0.7rem]"
              >
                <span className="border-b border-transparent pb-0.5 group-hover:border-[#ff3a4a]">{l.label}</span>
                <span className="text-[0.52rem] tracking-[0.3em] opacity-50">{l.note}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
