/** Estado de lectura compartido entre la experiencia 3D, el HUD y el audio. */
export const bus = {
  progress: 0, // 0..1 del scroll pinneado
  dist: 0, // metros recorridos por la cámara
  reduced: false,
};
