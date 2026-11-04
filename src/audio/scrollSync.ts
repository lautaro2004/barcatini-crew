import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { audio } from "./AudioEngine";

/**
 * Sincroniza el audio con el scroll usando ScrollTrigger (sin tocar las escenas).
 * El progreso se deriva SIEMPRE de la posición de scroll, por eso funciona igual
 * hacia adelante y hacia atrás.
 *
 *   0    → 1     escena 1: entrada → descenso → pared de sponsors
 *   1    → 1.15  escena 2: autos invitados (la música gana protagonismo)
 *   1.15 → 1.25  escena 3: viaje al podio central y lona (tensión: máxima intensidad)
 *
 * `splits` = fracciones (0..1) del scroll pinneado en las que terminan la escena 1 y la escena 2.
 * Para nuevas escenas: sumar un tramo más (cada uno agrega 0.25 en audio.config).
 */
export function bindAudioToScroll(root: Element, splits: number[]) {
  gsap.registerPlugin(ScrollTrigger);
  // puntos de progreso (audio.config) en los que cae cada corte del scroll: 0 → 1 → 1.15 → 1.25
  const marks = [0, 1, 1.15, 1.25];
  const cuts = [0, ...splits.map((v) => Math.min(0.98, Math.max(0.02, v))), 1];
  const map = (p: number) => {
    for (let i = 0; i < cuts.length - 1; i++) {
      if (p <= cuts[i + 1] || i === cuts.length - 2) {
        const k = (p - cuts[i]) / Math.max(1e-6, cuts[i + 1] - cuts[i]);
        const a = marks[Math.min(i, marks.length - 2)], b = marks[Math.min(i + 1, marks.length - 1)];
        return a + (b - a) * Math.min(1, Math.max(0, k));
      }
    }
    return 1.25;
  };
  const trigger = ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (st) => audio.setProgress(map(st.progress)),
    onRefresh: (st) => audio.setProgress(map(st.progress)),
  });
  return () => trigger.kill();
}
