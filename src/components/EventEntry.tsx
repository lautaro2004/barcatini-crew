"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EVENT, SPONSORS } from "@/config";
import { guests } from "@/data/guests";

/**
 * FASE 4 — INFORMACIÓN DEL EVENTO (#evento)
 * Continúa sobre el mismo fondo oscuro al que se funde el podio. Todo el contenido sale de
 * `EVENT` y `SPONSORS` (src/config.ts) y de `guests` (src/data/guests.ts).
 */
export default function EventEntry() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" } },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-line]").forEach((el) => {
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none reverse" } });
      });
      gsap.to("[data-ghost]", { yPercent: -18, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  const Title = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div data-reveal className="mb-10 md:mb-14">
      <p className="tech text-[0.68rem] text-[#e0141f]">{k}</p>
      <h2 className="font-display mt-3 text-[clamp(2.2rem,6vw,5.2rem)] font-black uppercase leading-[0.9] text-[#eef3f8]">{children}</h2>
      <span data-line className="mt-5 block h-px w-24 origin-left bg-[#e0141f]" />
    </div>
  );

  return (
    <section ref={root} id="evento" data-phase="4" className="relative overflow-hidden bg-[#05070c] text-[#eef3f8]">
      {/* ───────── HERO ───────── */}
      <div className="relative flex min-h-svh flex-col justify-center px-[6vw] pb-24 pt-32">
        <p
          data-ghost
          aria-hidden
          className="font-display pointer-events-none absolute -right-[2vw] top-[8svh] select-none font-black leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgba(238,243,248,0.09)] text-[clamp(10rem,38vw,38rem)]"
        >
          15
        </p>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(224,20,31,0.12),transparent_55%),radial-gradient(ellipse_at_85%_75%,rgba(120,60,255,0.1),transparent_50%)]" />
        <div className="relative mx-auto w-full max-w-6xl">
          <p data-reveal className="tech text-[0.7rem] text-[#e0141f]">Vuelve · Segunda edición</p>
          <h1 data-reveal className="font-display mt-4 text-[clamp(3.6rem,15vw,13rem)] font-black uppercase leading-[0.82] tracking-[0.005em]">
            Barcatini
            <br />
            <span className="text-[#e0141f]">Crew</span>
          </h1>
          <p data-reveal className="tech mt-6 text-[0.8rem] tracking-[0.34em] text-[#eef3f8]/75">{EVENT.subtitle}</p>

          <dl data-reveal className="mt-14 grid max-w-4xl grid-cols-1 gap-8 border-t border-white/15 pt-8 md:grid-cols-3">
            <div>
              <dt className="tech text-[0.58rem] text-[#eef3f8]/45">Fecha</dt>
              <dd className="font-display mt-2 text-[clamp(1.6rem,3vw,2.6rem)] font-bold uppercase leading-none">{EVENT.dateLong}</dd>
            </div>
            <div>
              <dt className="tech text-[0.58rem] text-[#eef3f8]/45">Horario</dt>
              <dd className="font-display mt-2 text-[clamp(1.6rem,3vw,2.6rem)] font-bold uppercase leading-none">{EVENT.time}</dd>
            </div>
            <div>
              <dt className="tech text-[0.58rem] text-[#eef3f8]/45">Lugar</dt>
              <dd className="font-display mt-2 text-[clamp(1.6rem,3vw,2.6rem)] font-bold uppercase leading-none">{EVENT.venue}</dd>
              <dd className="tech mt-2 text-[0.64rem] text-[#eef3f8]/55">{EVENT.address}</dd>
            </div>
          </dl>

          <div data-reveal className="mt-12 flex flex-wrap items-center gap-4">
            <a href={EVENT.ticketsUrl} target="_blank" rel="noopener noreferrer" className="tech bg-[#e0141f] px-8 py-4 text-[0.74rem] text-white transition-colors hover:bg-[#ff2a38]">
              Comprar entradas
            </a>
            <a href={EVENT.mapsUrl} target="_blank" rel="noopener noreferrer" className="tech border border-white/30 px-8 py-4 text-[0.74rem] transition-colors hover:border-[#e0141f] hover:text-[#e0141f]">
              Cómo llegar
            </a>
          </div>
        </div>
      </div>

      {/* ───────── SOBRE EL EVENTO ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Title k="01 / Sobre el evento">Una jornada para los fierros, los amigos y la familia</Title>
          <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-20">
            <div data-reveal className="space-y-5 text-[1.02rem] leading-relaxed text-[#eef3f8]/75">
              <p>Después de una primera edición increíble, nos volvemos a encontrar para vivir un día entero dedicado a los fierros, los amigos y la familia.</p>
              <p>Una experiencia para disfrutar durante todo el día con autos seleccionados y personalizados, proyectos increíbles, música, stands, marcas, actividades y muchas sorpresas junto a toda la comunidad de Barcatini.</p>
              <p className="text-[#eef3f8]">Barcatini Crew no es solamente un encuentro de autos. Es el lugar donde nos encontramos todos los que compartimos la misma pasión.</p>
            </div>
            <div data-reveal className="relative border border-[#e0141f]/50 p-8 md:p-10">
              <p className="tech text-[0.62rem] text-[#e0141f]">Y esta vez vamos por más</p>
              <p className="font-display mt-4 text-[clamp(2.4rem,5vw,4.4rem)] font-black uppercase leading-[0.9]">
                Sorteamos
                <br />
                un auto <span className="text-[#e0141f]">+</span> una moto
              </p>
              <p className="mt-5 text-[0.95rem] leading-relaxed text-[#eef3f8]/70">Entre quienes nos acompañen en el evento. Queremos que esta edición sea una verdadera fiesta para la comunidad y que algunos se vuelvan a casa con premios inolvidables.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────── QUÉ VAS A ENCONTRAR ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Title k="02 / Qué vas a encontrar">Todo el día, todo en un lugar</Title>
          <ol className="border-t border-white/12">
            {EVENT.highlights.map((h, i) => (
              <li key={h} data-reveal className="group flex items-baseline gap-6 border-b border-white/12 py-5 md:py-6">
                <span className="tech w-10 shrink-0 text-[0.7rem] text-[#e0141f]">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[clamp(1.3rem,3vw,2.5rem)] font-bold uppercase leading-none transition-transform duration-300 group-hover:translate-x-2">{h}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ───────── ENTRADAS ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Title k="03 / Entradas">Asegurá tu lugar</Title>
          <ul className="border-t border-white/12">
            {EVENT.tickets.map((t) => (
              <li key={t.name} data-reveal>
                <a href={EVENT.ticketsUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-6 border-b border-white/12 py-6 transition-colors hover:bg-white/[0.03]">
                  <span>
                    <span className="font-display block text-[clamp(1.5rem,3.2vw,2.6rem)] font-bold uppercase leading-none">{t.name}</span>
                    {t.note && <span className="tech mt-2 block text-[0.6rem] text-[#eef3f8]/45">{t.note}</span>}
                  </span>
                  <span className="flex items-center gap-6">
                    <span className="font-display text-[clamp(1.5rem,3.2vw,2.6rem)] font-black text-[#eef3f8]">{t.price}</span>
                    <span className="tech hidden border border-white/25 px-4 py-2 text-[0.6rem] transition-colors group-hover:border-[#e0141f] group-hover:bg-[#e0141f] sm:block">Comprar</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div data-reveal className="mt-14 grid gap-6 md:grid-cols-[auto_1fr] md:gap-14">
            <p className="tech text-[0.64rem] text-[#e0141f]">Ingresos especiales · gratis</p>
            <ul className="space-y-2">
              {EVENT.freeEntry.map((f) => (
                <li key={f.who} className="text-[0.98rem] text-[#eef3f8]/80">
                  <span className="text-[#eef3f8]">{f.who}</span> <span className="text-[#eef3f8]/55">· {f.how}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ───────── INVITADOS ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Title k="04 / Invitados y participantes">Los fierros confirmados</Title>
          <div className="grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {guests.map((g) => (
              <figure key={g.id} data-reveal>
                <div className="relative flex h-44 items-end justify-center">
                  <div className="pointer-events-none absolute bottom-1 left-[8%] right-[8%] h-6 rounded-[50%] bg-black/80 blur-md" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image} alt={`${g.brand} ${g.model}`.trim()} loading="lazy" className="relative max-h-full w-auto max-w-full object-contain" />
                </div>
                <figcaption className="mt-5 border-t border-white/12 pt-4">
                  <p className="tech text-[0.6rem] text-[#e0141f]">GUEST / {g.number}</p>
                  <p className="font-display mt-2 text-[1.5rem] font-bold uppercase leading-none">{[g.brand, g.model].filter(Boolean).join(" · ")}</p>
                  {g.name && <p className="tech mt-2 text-[0.64rem] text-[#eef3f8]/70">{g.name}</p>}
                  {g.instagram && <p className="tech mt-1 text-[0.6rem] text-[#eef3f8]/50">{g.instagram}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
          <p data-reveal className="tech mt-12 text-[0.62rem] text-[#eef3f8]/45">Y se siguen sumando · más invitados por confirmar</p>
        </div>
      </div>

      {/* ───────── SPONSORS ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <Title k="05 / Sponsors">Nos acompañan</Title>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
            {SPONSORS.map((s) => (
              <figure key={s.id} data-reveal className="group overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image && <img src={s.image} alt={s.label} loading="lazy" className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.04]" />}
              </figure>
            ))}
          </div>
        </div>
      </div>

      {/* ───────── UBICACIÓN + REDES ───────── */}
      <div className="relative px-[6vw] py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
          <div>
            <Title k="06 / Ubicación">{EVENT.venue}</Title>
            <p data-reveal className="text-[1.05rem] text-[#eef3f8]/80">{EVENT.address}</p>
            <p data-reveal className="mt-1 text-[0.95rem] text-[#eef3f8]/50">Tortuguitas, Provincia de Buenos Aires, Argentina</p>
            <a data-reveal href={EVENT.mapsUrl} target="_blank" rel="noopener noreferrer" className="tech mt-8 inline-block border border-white/30 px-7 py-3 text-[0.7rem] transition-colors hover:border-[#e0141f] hover:text-[#e0141f]">
              Abrir en Google Maps
            </a>
          </div>
          <div>
            <Title k="07 / Seguinos">Antes, durante y después</Title>
            <div className="flex flex-col gap-3">
              {EVENT.instagram.map((l) => (
                <a key={l.url} data-reveal href={l.url} target="_blank" rel="noopener noreferrer" className="group flex items-baseline justify-between border-b border-white/12 py-4">
                  <span className="font-display text-[clamp(1.6rem,3.4vw,2.8rem)] font-bold uppercase leading-none transition-colors group-hover:text-[#e0141f]">{l.label}</span>
                  <span className="tech text-[0.58rem] text-[#eef3f8]/45">{l.note}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ───────── CTA FINAL ───────── */}
      <div className="relative px-[6vw] py-28 text-center md:py-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(224,20,31,0.16),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl">
          <p data-reveal className="tech text-[0.66rem] text-[#e0141f]">Nos vemos el 15 de noviembre</p>
          <p data-reveal className="font-display mt-4 text-[clamp(2.6rem,8vw,7rem)] font-black uppercase leading-[0.88]">Fierros · Familia · Pasión</p>
          <a data-reveal href={EVENT.ticketsUrl} target="_blank" rel="noopener noreferrer" className="tech mt-12 inline-block bg-[#e0141f] px-10 py-5 text-[0.78rem] text-white transition-colors hover:bg-[#ff2a38]">
            Comprar entradas
          </a>
        </div>
      </div>

      {/* ───────── FOOTER ───────── */}
      <footer className="relative border-t border-white/10 px-[6vw] pb-10 pt-14">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-[2rem] font-black uppercase leading-none">
              Barcatini <span className="text-[#e0141f]">Crew</span>
            </p>
            <p className="tech mt-3 text-[0.6rem] text-[#eef3f8]/55">{EVENT.subtitle}</p>
            <p className="mt-6 max-w-sm text-[0.82rem] leading-relaxed text-[#eef3f8]/50">
              {EVENT.dateLong} · {EVENT.time}
              <br />
              {EVENT.venue} · {EVENT.address}
            </p>
          </div>
          <div>
            <p className="tech text-[0.58rem] text-[#eef3f8]/40">Evento</p>
            <ul className="mt-4 space-y-2 text-[0.88rem] text-[#eef3f8]/75">
              <li><a className="hover:text-[#e0141f]" href={EVENT.ticketsUrl} target="_blank" rel="noopener noreferrer">Entradas</a></li>
              <li><a className="hover:text-[#e0141f]" href={EVENT.mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a></li>
              <li><a className="hover:text-[#e0141f]" href="#evento">Volver al inicio de la info</a></li>
            </ul>
          </div>
          <div>
            <p className="tech text-[0.58rem] text-[#eef3f8]/40">Redes</p>
            <ul className="mt-4 space-y-2 text-[0.88rem] text-[#eef3f8]/75">
              {EVENT.instagram.map((l) => (
                <li key={l.url}><a className="hover:text-[#e0141f]" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-6xl border-t border-white/10 pt-6">
          <p className="text-[0.74rem] leading-relaxed text-[#eef3f8]/40">{EVENT.legal}</p>
          <p className="tech mt-4 text-[0.55rem] text-[#eef3f8]/30">
            © {new Date().getFullYear()} Barcatini Crew · Venta de entradas a través de Flashpass
          </p>
        </div>
      </footer>
    </section>
  );
}
