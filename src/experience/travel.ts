import type { gsap } from "gsap";
import type { Rig } from "./rig";

/**
 * Perfil de viaje: tramos que aceleran, cruzan, frenan o se detienen (hold).
 * Las velocidades de tramos contiguos coinciden, por eso no hay saltos ni
 * "aceleraciones artificiales", tampoco al scrollear hacia atrás.
 *
 * Escena nueva = agregar tramos a `legs`.
 */
export type LegKind = "in" | "cruise" | "out";
export interface MoveLeg { to: number; kind: LegKind; speed?: number; label?: string }
export interface HoldLeg { hold: number; label?: string } // pausa (unidades de timeline)
export type Leg = MoveLeg | HoldLeg;

export interface Placed {
  label?: string;
  from: number;
  to: number;
  kind: LegKind | "hold";
  t0: number;
  dur: number;
}

export class TravelPlan {
  readonly legs: Placed[] = [];
  readonly duration: number;
  readonly byLabel: Record<string, Placed> = {};

  constructor(legs: Leg[], public speed = 13, public pad = 0.4) {
    let from = 0;
    let t = pad;
    for (const l of legs) {
      let p: Placed;
      if ("hold" in l) {
        p = { label: l.label, from, to: from, kind: "hold", t0: t, dur: l.hold };
      } else {
        const d = l.to - from;
        const v = l.speed ?? speed;
        const dur = l.kind === "cruise" ? d / v : (2 * d) / v;
        p = { label: l.label, from, to: l.to, kind: l.kind, t0: t, dur };
        from = l.to;
      }
      this.legs.push(p);
      if (p.label) this.byLabel[p.label] = p;
      t += p.dur;
    }
    this.duration = t + pad;
  }

  /** Instante en el que la cámara llega a `m` metros (primera vez). */
  at(m: number): number {
    const mv = this.legs.filter((l) => l.kind !== "hold");
    const leg = mv.find((l) => m <= l.to) ?? mv[mv.length - 1];
    const D = leg.to - leg.from;
    const x = Math.min(Math.max(m - leg.from, 0), D);
    if (D === 0) return leg.t0;
    if (leg.kind === "cruise") return leg.t0 + (x / D) * leg.dur;
    if (leg.kind === "in") return leg.t0 + leg.dur * Math.sqrt(x / D);
    return leg.t0 + leg.dur * (1 - Math.sqrt(1 - x / D));
  }

  /** Agrega los tweens de `rig.dist` a la timeline maestra. */
  build(tl: gsap.core.Timeline, rig: Rig) {
    const ease = { in: "power1.in", cruise: "none", out: "power1.out" } as const;
    for (const l of this.legs) {
      if (l.kind === "hold") continue;
      tl.to(rig, { dist: l.to, duration: l.dur, ease: ease[l.kind] }, l.t0);
    }
    return tl;
  }
}
