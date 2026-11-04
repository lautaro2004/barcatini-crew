import type * as THREE from "three";
import type { gsap } from "gsap";
import type { Rig } from "./rig";
import type { TravelPlan } from "./travel";
import type { CameraPath } from "./path";
import type { Shared } from "./shared";
import type { GalleryLayout } from "./gallery";

export interface Quality {
  low: boolean; // móvil / equipos modestos
  bloom: boolean;
  followLights: number;
  pixelRatio: number;
  reduced: boolean; // prefers-reduced-motion
}

export interface BuildContext {
  scene: THREE.Scene;
  rig: Rig;
  path: CameraPath;
  quality: Quality;
  renderer: THREE.WebGLRenderer;
  shared: Shared;
  gallery: GalleryLayout;
}

export interface FrameState {
  time: number;
  dt: number;
  dist: number;
  rig: Rig;
  camera: THREE.PerspectiveCamera;
  path: CameraPath;
  quality: Quality;
}

export interface TimelineContext {
  rig: Rig;
  travel: TravelPlan;
  /** instante de la timeline en el que la cámara está a `m` metros */
  at: (m: number) => number;
  /** duración (unidades) entre dos distancias */
  span: (m0: number, m1: number) => number;
  /** busca un elemento del overlay HTML */
  q: <T extends Element = HTMLElement>(sel: string) => T | null;
  reduced: boolean;
  /** metros de recorrido en los que termina la escena 1 (frente a los sponsors) */
  baseLength: number;
  gallery: GalleryLayout;
  /** inicio/duración (unidades de timeline) de cada tramo etiquetado */
  marks: Record<string, { t0: number; dur: number }>;
}

/**
 * Contrato de una escena. Cada escena:
 *  - construye sus objetos dentro de la ÚNICA THREE.Scene compartida,
 *  - anima por frame (flicker, etc.) con `update`,
 *  - registra su coreografía en la timeline maestra con `timeline`.
 */
export interface SceneModule {
  id: string;
  build(ctx: BuildContext): SceneInstance;
}

export interface SceneInstance {
  group: THREE.Group;
  update?(f: FrameState): void;
  timeline?(tl: gsap.core.Timeline, t: TimelineContext): void;
  dispose?(): void;
}
