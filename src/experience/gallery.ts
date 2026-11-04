import { floorY } from "./layout";
import type { Guest } from "../data/guests";

/**
 * Layout de la galería a partir de la lista de invitados (dinámico).
 * Todo en metros. Los autos están contra la pared del fondo (z = CAR_Z), la
 * cámara viaja por el pasillo (z = AISLE_Z) y entre cámara y autos hay columnas
 * (z = COL_Z) que producen las oclusiones del travelling.
 */
export const GALLERY = {
  firstCarX: 14.5,
  gap: 12.5,
  carZ: -86.4,
  colZ: -82.6,
  aisleZ: -79.1,
  eye: 1.45,
  colOffset: 5.4, // columna a la izquierda del auto
  camOffset: 0.5, // desplazamiento lateral de la cámara respecto del auto
  gazeShift: 2.1, // cuánto se desvía la mirada del centro del auto (lo encuadra a un lado y deja lugar al texto)
};

export interface Vec3 { x: number; y: number; z: number }

export interface GuestSlot {
  index: number;
  guest: Guest;
  side: "left" | "right"; // lado del texto
  carX: number;
  colX: number;
  stop: Vec3; // posición de cámara al detenerse
  focus: Vec3; // punto al que mira (centro del auto)
  /** waypoints de cámara desde la parada anterior hasta ésta (incluida) */
  approach: Vec3[];
}

export interface GalleryLayout {
  portrait: boolean;
  slots: GuestSlot[];
  floor: number;
  center: Vec3; // espacio central (próxima escena)
  bridge: Vec3[]; // waypoints del último invitado hacia el espacio central
  bridgeStop: Vec3;
  podiumPath: Vec3[]; // waypoints desde la primera parada hasta el 3/4 frontal
  podiumStop: Vec3;
  endX: number; // borde derecho de la sala
  wallFocus: Vec3; // centro de la pared de sponsors (donde termina la escena 1)
}

export function layoutGallery(guests: Guest[], portrait = false): GalleryLayout {
  const G = GALLERY;
  const floor = floorY(G.carZ);
  const eyeY = floor + G.eye;
  const slots: GuestSlot[] = [];
  const sponsorEnd: Vec3 = { x: -4, y: floor + 1.4, z: -79.5 };
  let prev: Vec3 = sponsorEnd;

  guests.forEach((guest, i) => {
    const side = guest.side ?? (i % 2 === 0 ? "left" : "right");
    const carX = G.firstCarX + i * G.gap;
    const colX = carX - G.colOffset;
    // texto a la izquierda ⇒ el auto queda a la derecha ⇒ cámara algo a la izquierda del auto
    const stopX = carX + (side === "left" ? -G.camOffset : G.camOffset);
    const stop: Vec3 = { x: stopX, y: eyeY, z: G.aisleZ };
    const approach: Vec3[] =
      i === 0
        ? [
            { x: -2.4, y: floor + 1.3, z: -77.9 }, // se aleja de la pared
            { x: 3.6, y: floor + 1.3, z: -77.9 }, // desplazamiento lateral
            { x: colX - 0.3, y: eyeY, z: G.aisleZ + 0.4 }, // pasa frente a la columna
            stop,
          ]
        : [
            { x: prev.x + 3.4, y: eyeY, z: G.aisleZ + 0.4 },
            { x: colX - 0.4, y: eyeY, z: G.aisleZ + 0.5 }, // pasa frente a la columna siguiente
            stop,
          ];
    slots.push({
      index: i, guest, side, carX, colX, stop, approach,
      focus: {
        x: carX + (portrait ? 0 : side === "left" ? -G.gazeShift : G.gazeShift),
        y: floor + (portrait ? 0.15 : 0.7),
        z: G.carZ,
      },
    });
    prev = stop;
  });

  const last = slots[slots.length - 1];
  const lx = last ? last.stop.x : sponsorEnd.x;
  // espacio central (podio): a la derecha del último invitado, en el centro de la sala
  const center: Vec3 = { x: lx + 20, y: floor, z: -83 };
  const cz = center.z, cx = center.x;
  const bridgeStop: Vec3 = { x: cx - 7.6, y: eyeY - 0.05, z: cz }; // primera parada frente al podio
  const bridge: Vec3[] = [
    { x: lx + 5, y: eyeY, z: G.aisleZ + 0.1 },
    { x: lx + 10.5, y: eyeY, z: -80.9 },
    bridgeStop,
  ];
  // rodeo hacia un 3/4 frontal bajo, desde donde se contempla la lona
  const podiumStop: Vec3 = { x: cx - 4.2, y: floor + 1.3, z: cz + 7.6 };
  const podiumPath: Vec3[] = [{ x: cx - 6.9, y: eyeY - 0.12, z: cz + 3.4 }, podiumStop];
  return {
    portrait, slots, floor, center, bridge, bridgeStop, podiumPath, podiumStop,
    endX: center.x + 26,
    wallFocus: { x: -4, y: floor + 1.4, z: -90 },
  };
}
