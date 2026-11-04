"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Engine } from "@/experience/engine";
import { TravelPlan } from "@/experience/travel";
import { bus } from "@/experience/bus";
import { floorY } from "@/experience/layout";
import { layoutGallery } from "@/experience/gallery";
import { guests } from "@/data/guests";
import { loadFonts } from "@/experience/textures";
import type { Quality, SceneModule, TimelineContext } from "@/experience/types";
import type { Leg } from "@/experience/travel";
import { EntranceScene } from "@/experience/scenes/EntranceScene";
import { ParkingDescentScene } from "@/experience/scenes/ParkingDescentScene";
import { SponsorWall } from "@/experience/scenes/SponsorWall";
import { CarShowcaseScene } from "@/experience/scenes/CarShowcaseScene";
import { PodiumScene } from "@/experience/scenes/PodiumScene";
import GuestInfo from "./GuestInfo";
import PodiumMessage from "./PodiumMessage";
import GraffitiLinks from "./GraffitiLinks";
import EntranceOverlay from "./EntranceOverlay";
import Hud from "./Hud";
import AmbientAudio from "./AmbientAudio";
import { bindAudioToScroll } from "@/audio/scrollSync";

/**
 * Registro de escenas, en orden de aparición.
 * Para sumar una escena nueva: crear su SceneModule y agregarla acá (+ un tramo
 * de viaje en `legs` si la cámara avanza más).
 */
const SCENES: SceneModule[] = [EntranceScene, ParkingDescentScene, SponsorWall, CarShowcaseScene, PodiumScene];

export default function ScrollExperience() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const gallery = useMemo(() => layoutGallery(guests, portrait), [portrait]);

  useEffect(() => {
    let cancelled = false;
    let engine: Engine | undefined;
    let tl: gsap.core.Timeline | undefined;
    let ro: ResizeObserver | undefined;
    let tick: (() => void) | undefined;
    let unbindAudio: (() => void) | undefined;

    (async () => {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      await loadFonts();
      if (cancelled || !root.current || !stage.current || !canvas.current) return;

      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const low =
        matchMedia("(pointer: coarse)").matches ||
        innerWidth < 820 ||
        (nav.deviceMemory ?? 8) <= 4 ||
        (navigator.hardwareConcurrency ?? 8) <= 4;
      const quality: Quality = {
        low,
        bloom: !low,
        followLights: low ? 3 : 5,
        pixelRatio: Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2),
        reduced,
      };
      bus.reduced = reduced;

      const isPortrait = innerWidth < innerHeight;
      const gal = layoutGallery(guests, isPortrait);
      setPortrait(isPortrait);
      const extra = [...gal.slots.flatMap((s) => s.approach), ...gal.bridge, ...gal.podiumPath];
      try {
        engine = new Engine(canvas.current, quality, gal, extra);
      } catch (e) {
        console.error("WebGL no disponible", e);
        setFailed(true);
        setReady(true);
        return;
      }
      const eng = engine;
      SCENES.forEach((s) => eng.add(s));

      const resize = () => {
        const r = stage.current!.getBoundingClientRect();
        eng.resize(Math.max(1, r.width), Math.max(1, r.height));
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(stage.current);

      /* ---- viaje de cámara: arranca, cruza, frena ---- */
      const total = eng.path.length;
      const base = eng.path.baseLength;
      const legs: Leg[] = [
        { to: 24, kind: "in" },
        { to: base - 18, kind: "cruise" },
        { to: base, kind: "out" },
      ];
      // retrato (móvil): el ancho no alcanza para toda la pared → pausa donde la cámara la recorre de lado a lado
      if (typeof window !== "undefined" && window.innerWidth < window.innerHeight) legs.push({ hold: reduced ? 3 : 6, label: "wall" });
      // recorrido de la galería: por invitado → arranca, cruza (pasa la columna), frena, pausa
      const GV = 5.2; // m por unidad de timeline
      let prev = base;
      const stops: number[] = [];
      gal.slots.forEach((s, i) => {
        const d = eng.path.distOf(s.stop, prev + 1);
        stops.push(d);
        const D = d - prev;
        if (i === 0) {
          // al alejarse de los sponsors, pausa frente al grafiti (con los links de Instagram)
          legs.push({ to: prev + D * 0.14, kind: "in", speed: GV, label: "g0-a" });
          legs.push({ to: prev + D * 0.26, kind: "out", speed: GV, label: "g0-s" });
          legs.push({ hold: reduced ? 1.4 : 2.2, label: "g0-gw" });
          legs.push({ to: prev + D * 0.4, kind: "in", speed: GV, label: "g0-a2" });
          legs.push({ to: prev + D * 0.72, kind: "cruise", speed: GV, label: "g0-b" });
          legs.push({ to: d, kind: "out", speed: GV, label: "g0-c" });
        } else {
          const a = prev + D * 0.3, b = prev + D * 0.7;
          legs.push({ to: a, kind: "in", speed: GV, label: `g${i}-a` });
          legs.push({ to: b, kind: "cruise", speed: GV, label: `g${i}-b` });
          legs.push({ to: d, kind: "out", speed: GV, label: `g${i}-c` });
        }
        legs.push({ hold: reduced ? 1.6 : 2.6, label: `g${i}-hold` });
        prev = d;
      });
      if (gal.slots.length) {
        // arranca → cruza → frena (tres tramos con velocidades que coinciden)
        const seq = (from: number, to: number, label: string) => {
          const D = to - from;
          legs.push({ to: from + D * 0.3, kind: "in", speed: GV, label: `${label}-a` });
          legs.push({ to: from + D * 0.7, kind: "cruise", speed: GV, label: `${label}-b` });
          legs.push({ to: to, kind: "out", speed: GV, label: `${label}-c` });
        };
        // del último invitado hacia el centro: abandona el pasillo lateral
        const dP1 = eng.path.distOf(gal.bridgeStop, prev + 1);
        seq(prev, dP1, "bridge");
        legs.push({ hold: reduced ? 1.4 : 2.2, label: "p1-hold" });
        // rodeo hacia el 3/4 frontal del podio
        const dP2 = eng.path.distOf(gal.podiumStop, dP1 + 1);
        seq(dP1, dP2, "pa");
        legs.push({ hold: reduced ? 2.2 : 3.4, label: "p2-hold" });
        legs.push({ hold: 1.8, label: "p-exit" });
        stops.push(dP1, dP2);
      }
      const travel = new TravelPlan(legs, 13);
      const marks: TimelineContext["marks"] = {};
      Object.entries(travel.byLabel).forEach(([k, v]) => (marks[k] = { t0: v.t0, dur: v.dur }));

      if (location.search.includes("debug")) (window as unknown as Record<string, unknown>).__tl = { marks, duration: travel.duration, eng };

      const perUnit = reduced ? 34 : low ? 54 : 64; // % de alto de pantalla por unidad de timeline
      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${Math.round((travel.duration * perUnit) / 100 * window.innerHeight)}`,
          pin: stage.current,
          scrub: reduced ? true : 1.0,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            bus.progress = self.progress;
          },
        },
      });
      travel.build(tl, eng.rig);

      const tctx: TimelineContext = {
        rig: eng.rig,
        travel,
        at: (m) => travel.at(m),
        span: (a, b) => travel.at(b) - travel.at(a),
        q: (sel) => root.current!.querySelector(sel) as never,
        reduced,
        baseLength: base,
        gallery: gal,
        marks,
      };
      eng.modules.forEach((m) => m.timeline?.(tl!, tctx));

      /* ---- capa de cámara: barras de cinemascope + HUD ---- */
      const bars = root.current.querySelectorAll("[data-bar]");
      tl.to(bars, { scaleY: 1, duration: tctx.span(0, 30), ease: "power1.inOut" }, tctx.at(0));
      const chapter = root.current.querySelector("[data-hud-chapter]");
      const logo = root.current.querySelector("[data-hud-logo]");
      const rail = root.current.querySelector("[data-hud-rail]");
      tl.to([logo, chapter, rail], { opacity: 1, duration: tctx.span(8, 26), ease: "power1.out" }, tctx.at(16));
      tl.set({}, {}, travel.duration); // asegura la duración total

      const label = root.current.querySelector("[data-hud-label]");
      const depth = root.current.querySelector("[data-hud-depth]");
      const fill = root.current.querySelector("[data-hud-fill]") as HTMLElement | null;
      let lastLabel = "";
      tick = () => {
        const d = eng.rig.dist;
        bus.dist = d;
        const text = d < 24 ? "Nivel 0 · Acceso" : d < base - 40 ? "Rampa · Descenso" : d < base + 2 ? "Nivel −1 · Partners" : d < (stops[stops.length - 3] ?? Infinity) + 2 ? "Nivel −1 · Showcase" : "Nivel −1 · Centro";
        if (text !== lastLabel && label) { label.textContent = text; lastLabel = text; }
        const z = eng.path.zAt(d);
        if (depth) depth.textContent = (-floorY(z)).toFixed(1);
        if (fill) fill.style.transform = `scaleY(${Math.min(1, d / total)})`;
      };
      gsap.ticker.add(tick);

      const splits = gal.slots.length ? [travel.byLabel["g0-a"].t0 / travel.duration, travel.byLabel["bridge-a"].t0 / travel.duration] : [1];
      unbindAudio = bindAudioToScroll(root.current, splits);
      eng.start();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      setReady(true);
    })();

    return () => {
      cancelled = true;
      unbindAudio?.();
      if (tick) gsap.ticker.remove(tick);
      ro?.disconnect();
      tl?.scrollTrigger?.kill();
      tl?.kill();
      engine?.dispose();
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <div ref={stage} className="relative h-svh w-full overflow-hidden bg-[#05070c]">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />

        <div className="vignette pointer-events-none absolute inset-0 z-10" />
        <div className="grain pointer-events-none absolute -inset-[10%] z-10" />

        {/* cinemascope */}
        <div data-bar className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-[5.5svh] origin-top scale-y-0 bg-black" />
        <div data-bar className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[5.5svh] origin-bottom scale-y-0 bg-black" />

        <EntranceOverlay />
        <GuestInfo slots={gallery.slots} />
        <PodiumMessage />
        <GraffitiLinks />
        <Hud />
        <AmbientAudio />

        {/* transición hacia la sección informativa (Fase 4): la escena se oscurece al final del recorrido */}
        <div data-fade className="pointer-events-none absolute inset-0 z-[45] bg-[#05070c] opacity-0" />

        {failed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#05070c] p-8 text-center">
            <p className="tech text-xs opacity-70">Tu dispositivo no puede mostrar la escena 3D (WebGL).</p>
          </div>
        )}

        <div
          className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#05070c] transition-opacity duration-1000 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="tech text-[0.65rem] opacity-60">Cargando nivel −1</p>
        </div>
      </div>
    </div>
  );
}
