/**
 * Parámetros que las timelines de GSAP animan. El motor 3D los lee cada frame.
 * Agregar un parámetro nuevo = sumarlo acá y leerlo en `engine.ts`.
 */
export interface Rig {
  dist: number; // metros a lo largo del recorrido
  yaw: number; // radianes, giro de cabeza
  fx: number; // punto de mirada (usado cuando align > 0)
  fy: number;
  fz: number;
  ambient: number; // 1 = luz de seguimiento normal; <1 = galería más oscura
  align: number; // 0..1: endereza la mirada hacia -Z (ignora la tangente lateral del camino)
  pitch: number;
  roll: number;
  lateral: number; // desplazamiento lateral extra (m)
  fov: number; // fov vertical base (landscape)
  outside: number; // 1 = noche exterior, 0 = adentro
  exposure: number;
  bloom: number;
  fog: number; // multiplicador de densidad
}

export const createRig = (): Rig => ({
  dist: 0,
  yaw: 0,
  fx: -4,
  fy: -4.76,
  fz: -90,
  ambient: 1,
  align: 0,
  pitch: 0.05,
  roll: 0,
  lateral: 0,
  fov: 56,
  outside: 1,
  exposure: 0.82,
  bloom: 0.26,
  fog: 1,
});
