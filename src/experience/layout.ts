/**
 * Geometría compartida del mundo (metros). Un solo lugar para que todas las
 * escenas hablen el mismo idioma. La cámara mira hacia -Z.
 *
 *   z = +18  cámara inicial, en la calle
 *   z =   0  fachada / boca del estacionamiento
 *   z =  -6 → -62  rampa de descenso (pendiente `slope`)
 *   z = -62 → -90  rellano, hall con columnas
 *   z = -90  pared de sponsors (+ pasaje a la derecha hacia la próxima escena)
 */
export const L = {
  startZ: 18,
  endZ: -79.5,
  eye: 1.4,
  facadeH: 11,
  openW: 16,
  openH: 4.6,
  rampStart: -6,
  rampEnd: -62,
  slope: 0.11,
  blend: 9,
  wallX: 8,
  hallLeft: -34,
  passageRight: 26,
  backZ: -90,
} as const;

const g = (x: number, w: number) => {
  if (x <= 0) return 0;
  if (x >= w) return x - w / 2;
  const t = x / w;
  return w * (t ** 3 - (t ** 4) / 2);
};

/** Altura del piso en z (rampa con transiciones suaves en ambos extremos). */
export const floorY = (z: number) =>
  -L.slope * (g(L.rampStart - z, L.blend) - g(L.rampEnd - z, L.blend));

const sstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Altura libre piso–techo en z (más alta en la boca, más baja adentro). */
export const ceilH = (z: number) => 4.6 - 1.05 * sstep((1 - z) / 15);

/** Posición lateral de la cámara a lo largo del recorrido. */
export const pathX = (z: number) => (z > -62 ? 0 : -4 * sstep((-62 - z) / 15));

export const mulberry = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
