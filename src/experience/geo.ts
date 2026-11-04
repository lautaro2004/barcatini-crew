import * as THREE from "three";
import { floorY } from "./layout";

export interface Vtx {
  p: [number, number, number];
  uv: [number, number];
  c?: number; // oclusión baked (multiplicador de color)
}

/** Superficie paramétrica (nu × nv) con colores de vértice para AO barato. */
export function surface(nu: number, nv: number, fn: (s: number, t: number) => Vtx) {
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const v = fn(i / nu, j / nv);
      pos.push(...v.p);
      uv.push(...v.uv);
      const c = v.c ?? 1;
      col.push(c, c, c);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cinta pegada al piso entre x0..x1 y z0..z1 siguiendo la pendiente. */
export function floorRibbon(x0: number, x1: number, z0: number, z1: number, lift = 0.012, step = 0.8) {
  const n = Math.max(1, Math.ceil(Math.abs(z1 - z0) / step));
  return surface(1, n, (s, t) => {
    const z = z0 + (z1 - z0) * t;
    return { p: [x0 + (x1 - x0) * s, floorY(z) + lift, z], uv: [s, t] };
  });
}

/** Mezcla geometrías sin dependencias extra (posición/uv/color/index). */
export function merge(list: THREE.BufferGeometry[]) {
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  let off = 0;
  for (const g of list) {
    const p = g.getAttribute("position");
    const u = g.getAttribute("uv");
    const c = g.getAttribute("color");
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
      col.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1);
    }
    const ix = g.getIndex()!;
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const disposeGroup = (root: THREE.Object3D) => {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
  });
};

/** Escala los UV de un BoxGeometry para que la textura mida `tile` metros. */
export function boxUV(g: THREE.BoxGeometry, tile = 4) {
  const { width: w, height: h, depth: d } = g.parameters;
  const uv = g.getAttribute("uv");
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
  return g;
}

export function planeUV(g: THREE.PlaneGeometry, tile = 6) {
  const { width: w, height: h } = g.parameters;
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return g;
}

export const hdr = (c: number | string, k: number) => new THREE.Color(c).multiplyScalar(k);

/**
 * Reflejos falsos de luces sobre piso mojado: cada luz proyecta una franja
 * alargada que se recalcula por frame según la posición de la cámara.
 */
export class Reflections {
  readonly mesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  constructor(tex: THREE.Texture, readonly max: number) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: true,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, this.col.set(0));
  }
  begin() { this.mesh.count = 0; }
  /** lightPos: posición de la luz; floorAt: altura del piso en ese punto */
  add(cam: THREE.Vector3, lx: number, ly: number, lz: number, floor: number, width: number, length: number, color: THREE.Color, k: number) {
    if (this.mesh.count >= this.max) return;
    const h = ly - floor;
    const t = (cam.y - floor) / (cam.y - floor + h);
    const x = cam.x + (lx - cam.x) * t;
    const z = cam.z + (lz - cam.z) * t;
    this.p.set(x, floor + 0.015, z);
    this.s.set(width, length, 1);
    this.m.compose(this.p, this.q, this.s);
    const i = this.mesh.count++;
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.setColorAt(i, this.col.copy(color).multiplyScalar(k));
  }
  end() {
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
