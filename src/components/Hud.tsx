/** Capa de interfaz mínima: marca, capítulo/profundidad y riel de progreso. */
export default function Hud() {
  return (
    <>
      <div data-hud-logo className="tech pointer-events-none absolute left-[3.5vw] top-[3.2svh] z-30 text-[0.7rem] opacity-0">
        <span className="font-display text-[1.5rem] font-black tracking-[0.04em]">BARCATINI</span>
        <span className="ml-3 text-[#e0141f]">/</span>
        <span className="ml-3 opacity-60">Automotive Meet</span>
      </div>

      <div data-hud-chapter className="tech pointer-events-none absolute bottom-[4svh] left-[3.5vw] z-30 text-[0.62rem] opacity-0">
        <p data-hud-label className="text-[#eef3f8]">Nivel 0 · Acceso</p>
        <p className="mt-1 opacity-50">
          Prof. <span data-hud-depth>0.0</span> m
        </p>
      </div>

      <div data-hud-rail className="pointer-events-none absolute right-[3.2vw] top-1/2 z-30 h-[26svh] w-px -translate-y-1/2 bg-white/15 opacity-0">
        <div data-hud-fill className="absolute inset-x-0 top-0 h-full origin-top scale-y-0 bg-[#e0141f]" />
      </div>
    </>
  );
}
