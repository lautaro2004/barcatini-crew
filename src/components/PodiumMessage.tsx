/**
 * Mensaje de expectativa al llegar al podio. Se revela con el scroll (timeline de PodiumScene).
 * Tipografía display en mayúsculas, sin caja ni tarjeta: vive sobre la escena, abajo, lejos de la lona.
 */
export default function PodiumMessage() {
  return (
    <div data-pm="root" className="pointer-events-none absolute inset-x-0 bottom-[11svh] z-[14] flex flex-col items-center px-[6vw] text-center opacity-0 max-md:bottom-[9svh]">
      <p data-pm="tag" className="tech mb-3 text-[0.68rem] text-[#e0141f]">
        SORTEO <span className="mx-2 text-[#eef3f8]/50">/</span> <span className="text-[#eef3f8]/80">UN AUTO + UNA MOTO</span>
      </p>
      <div className="-mt-[0.22em] overflow-hidden pb-[0.08em] pt-[0.22em]">
        <h2 data-pm="l1" className="font-display text-[clamp(2.3rem,7.2vw,7.4rem)] font-black uppercase leading-[0.86] tracking-[0.005em] text-[#eef3f8]">
          El misterio
        </h2>
      </div>
      <div className="-mt-[0.22em] overflow-hidden pb-[0.1em] pt-[0.22em]">
        <h2 data-pm="l2" className="font-display text-[clamp(1.6rem,5vw,5.2rem)] font-black uppercase leading-[0.9] tracking-[0.01em] text-[#eef3f8]">
          se revelará <span className="text-[#e0141f]">en el evento</span>
        </h2>
      </div>
      <span data-pm="line" className="mt-4 block h-px w-28 origin-center bg-[#e0141f]" />
      <p data-pm="sub" className="tech mt-4 text-[0.74rem] tracking-[0.2em] text-[#eef3f8]/85 max-md:text-[0.6rem]">
        BAJO ESTAS LONAS, EL AUTO Y LA MOTO QUE SE SORTEAN
      </p>
      <p data-pm="note" className="tech mt-2 text-[0.62rem] tracking-[0.32em] text-[#eef3f8]/55 max-md:text-[0.52rem]">
        UNA EXPERIENCIA. UNA NOCHE. UNA REVELACIÓN.
      </p>
    </div>
  );
}
