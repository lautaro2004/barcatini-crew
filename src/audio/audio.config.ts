/**
 * CONFIGURACIÓN DEL AUDIO — todo lo ajustable vive acá.
 * Independiente de las escenas: sólo depende del "progreso" de la experiencia.
 *
 * Progreso (p):
 *   0.00 → 1.00  recorrido pinneado (entrada → descenso → pared de sponsors)
 *   1.00 → 1.25  escena 2: autos invitados (hasta la revelación final)
 *   1.25 → ...   reservado para la revelación final
 */
export interface Stage {
  id: string;
  at: number; // progreso en el que se alcanza exactamente este estado
  rain: number; // 0..1 (se multiplica por volumes.rain)
  music: number; // 0..1 (se multiplica por volumes.music)
  cutoff: number; // Hz del low-pass de la música
  rainCutoff: number; // Hz del low-pass de la lluvia (más bajo = "adentro")
}

export interface SfxCue {
  at: number; // dispara al cruzar este progreso avanzando
  name: "whoosh" | "impact" | "riser";
  gain?: number;
}

export const AUDIO_CONFIG = {
  /** Pistas. Dejalas en null para usar los generadores procedurales originales. */
  sources: {
    music: "/audio/bringing-crunk-back.mp3" as string | null, // "Bringing Crunk Back" — SmallFortune (Pixabay Content License). Si el archivo falta, usa el beat procedural
    rain: null as string | null, // ej: "/audio/rain.mp3"
  },

  volumes: { master: 0.9, rain: 0.6, music: 0.85 },

  /** Procedural: tempo del beat placeholder (estilo crunk/hip-hop de los 2000). */
  procedural: { bpm: 100 },

  filter: { musicQ: 0.8 },

  fade: { in: 2.5, out: 0.6 }, // segundos al activar / desactivar

  transitions: {
    /** suavizado del progreso (s). Más alto = cambios más lentos y graduales */
    smoothing: 0.35,
    /** constante de tiempo de la automatización de parámetros (s) */
    paramTime: 0.12,
    /** intensidad de cada transición (1 = lineal, >1 = cambia más tarde y más rápido al final) */
    curve: { rain: 1.0, music: 1.35, cutoff: 1.15 },
  },

  /** Keyframes. Entre dos stages se interpola; en reversa se desarma solo. */
  stages: [
    { id: "entrance", at: 0.0, rain: 1.0, music: 0.04, cutoff: 130, rainCutoff: 9500 },
    { id: "mouth", at: 0.14, rain: 0.9, music: 0.1, cutoff: 170, rainCutoff: 7000 },
    { id: "descent", at: 0.45, rain: 0.5, music: 0.38, cutoff: 480, rainCutoff: 3200 },
    { id: "hall", at: 0.8, rain: 0.22, music: 0.62, cutoff: 2600, rainCutoff: 2400 },
    { id: "sponsors", at: 1.0, rain: 0.14, music: 0.72, cutoff: 5200, rainCutoff: 2200 },
    { id: "cars", at: 1.05, rain: 0.07, music: 0.9, cutoff: 14000, rainCutoff: 2000 },
    { id: "reveal", at: 1.25, rain: 0.04, music: 1.0, cutoff: 20000, rainCutoff: 2000 },
  ] as Stage[],

  /** Efectos cinematográficos (preparados; se disparan al avanzar). */
  sfx: [
    { at: 0.14, name: "whoosh", gain: 0.5 },
    { at: 1.17, name: "riser", gain: 0.7 },
    { at: 1.25, name: "impact", gain: 0.9 },
  ] as SfxCue[],
};
