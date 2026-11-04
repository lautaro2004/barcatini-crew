import * as THREE from "three";
import { makeAsphalt, makeCoffer, makeConcrete, makeGlow, makeStreak } from "./textures";
import { TEXTURES } from "../config";

/**
 * Recursos compartidos entre escenas (una sola copia en GPU).
 * Se crean una vez por motor y se liberan junto con él.
 */
export class Shared {
  readonly concrete = makeConcrete(7);
  readonly asphalt = makeAsphalt(3, true);
  readonly coffer = makeCoffer(5);
  readonly glow = makeGlow();
  readonly streak = makeStreak();

  readonly matConcrete: THREE.MeshStandardMaterial;
  readonly matConcreteDark: THREE.MeshStandardMaterial;
  readonly matBox: THREE.MeshStandardMaterial;
  readonly matCeiling: THREE.MeshStandardMaterial;
  readonly matFloor: THREE.MeshStandardMaterial;
  readonly matStreet: THREE.MeshStandardMaterial;
  readonly matPaint = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  readonly matPaintRed = new THREE.MeshStandardMaterial({ color: 0xb30f18, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  readonly matBlack = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.7, metalness: 0.3 });
  readonly matMetal = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.45, metalness: 0.8 });

  constructor() {
    this.concrete.map.repeat.set(1, 1);
    const mk = (tint: number, rough: number) =>
      new THREE.MeshStandardMaterial({
        map: this.concrete.map,
        bumpMap: this.concrete.bump,
        bumpScale: 2.2,
        color: tint,
        roughness: rough,
        vertexColors: true,
        side: THREE.DoubleSide,
      });
    this.matConcrete = mk(0xc2c3c1, 0.94);
    this.matConcreteDark = mk(0x8c8e8e, 0.95);
    this.matCeiling = new THREE.MeshStandardMaterial({ map: this.coffer.map, bumpMap: this.coffer.bump, bumpScale: 5, color: 0x9a9b9b, roughness: 0.96, vertexColors: true, side: THREE.DoubleSide });
    this.matBox = this.matConcrete.clone();
    this.matBox.vertexColors = false;
    this.matFloor = new THREE.MeshStandardMaterial({
      map: this.asphalt.map,
      roughnessMap: this.asphalt.rough,
      bumpMap: this.asphalt.bump,
      bumpScale: 1.2,
      color: 0x8a8b8d,
      roughness: 1,
      metalness: 0.05,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    this.matStreet = new THREE.MeshStandardMaterial({
      map: this.asphalt.map,
      roughnessMap: this.asphalt.rough,
      bumpMap: this.asphalt.bump,
      bumpScale: 1.2,
      color: 0x9aa4b0,
      roughness: 0.9,
      metalness: 0.1,
    });
    // overrides opcionales con archivos reales
    const loader = new THREE.TextureLoader();
    const swap = (url: string | undefined, apply: (t: THREE.Texture) => void) => {
      if (!url) return;
      loader.load(url, (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        apply(t);
      });
    };
    swap(TEXTURES.concrete, (t) => {
      this.matConcrete.map = t; this.matConcreteDark.map = t; this.matBox.map = t;
      this.matConcrete.needsUpdate = this.matConcreteDark.needsUpdate = true;
    });
    swap(TEXTURES.asphalt, (t) => {
      this.matFloor.map = t; this.matStreet.map = t;
      this.matFloor.needsUpdate = this.matStreet.needsUpdate = true;
    });
  }

  dispose() {
    [this.concrete.map, this.concrete.bump, this.asphalt.map, this.asphalt.rough, this.asphalt.bump, this.glow, this.streak, this.coffer.map, this.coffer.bump].forEach((t) => t.dispose());
    [this.matConcrete, this.matConcreteDark, this.matBox, this.matCeiling, this.matFloor, this.matStreet, this.matPaint, this.matPaintRed, this.matBlack, this.matMetal].forEach((m) => m.dispose());
  }
}
