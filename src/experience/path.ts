import * as THREE from "three";
import { L, floorY, pathX } from "./layout";

export interface PathSample {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
}
type P3 = { x: number; y: number; z: number };

/**
 * Recorrido de cámara. Escena 1: calle → rampa → pared de sponsors (generado a
 * partir del layout). Escenas siguientes agregan waypoints con `extra` y el
 * recorrido continúa desde donde terminó el anterior (misma curva, mismo espacio).
 */
export class CameraPath {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;
  /** distancia (m) a la que termina la escena 1 (frente a la pared de sponsors) */
  readonly baseLength: number;
  private spaced: THREE.Vector3[];
  private tmp = new THREE.Vector3();

  constructor(extra: P3[] = []) {
    const pts: THREE.Vector3[] = [];
    for (let z = L.startZ; z > L.endZ; z -= 3) pts.push(new THREE.Vector3(pathX(z), floorY(z) + L.eye, z));
    const end = new THREE.Vector3(pathX(L.endZ), floorY(L.endZ) + L.eye, L.endZ);
    pts.push(end);
    extra.forEach((p) => pts.push(new THREE.Vector3(p.x, p.y, p.z)));
    this.curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    this.curve.arcLengthDivisions = 1600;
    this.length = this.curve.getLength();
    this.spaced = this.curve.getSpacedPoints(6000);
    this.baseLength = this.distOf(end, 0);
  }

  at(dist: number, out: PathSample) {
    const u = THREE.MathUtils.clamp(dist / this.length, 0, 1);
    this.curve.getPointAt(u, out.pos);
    this.curve.getTangentAt(u, out.dir);
    return out;
  }

  /** z mundial → metros de recorrido (sólo válido en el tramo de la escena 1) */
  zAt(dist: number) {
    return this.curve.getPointAt(THREE.MathUtils.clamp(dist / this.length, 0, 1), this.tmp).z;
  }

  /** metros de recorrido del punto de la curva más cercano a `p` (a partir de `minDist`) */
  distOf(p: P3, minDist = 0) {
    let best = Infinity, bi = 0;
    const start = Math.floor((minDist / this.length) * (this.spaced.length - 1));
    for (let i = start; i < this.spaced.length; i++) {
      const s = this.spaced[i];
      const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2 + (s.z - p.z) ** 2;
      if (d < best) { best = d; bi = i; }
    }
    return (bi / (this.spaced.length - 1)) * this.length;
  }
}
