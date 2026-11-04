import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { CameraPath, type PathSample } from "./path";
import { createRig, type Rig } from "./rig";
import { Shared } from "./shared";
import type { GalleryLayout } from "./gallery";
import type { BuildContext, FrameState, Quality, SceneInstance, SceneModule } from "./types";

const FOG_OUT = new THREE.Color(0x070b14);
const FOG_IN = new THREE.Color(0x05070c);

/**
 * Motor 3D único. Mantiene UNA escena, UNA cámara y UN compositor; las
 * escenas (SceneModule) sólo agregan objetos al grupo común.
 */
export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(56, 1, 0.1, 400);
  readonly rig: Rig = createRig();
  readonly shared: Shared;
  readonly modules: SceneInstance[] = [];

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private raf = 0;
  private last = 0;
  private visible = true;
  private lastDist = 0;
  private speed = 0;
  private sample: PathSample = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
  private tmpQ = new THREE.Quaternion();
  private io?: IntersectionObserver;
  private w = 1;
  private h = 1;

  readonly path: CameraPath;

  constructor(private canvas: HTMLCanvasElement, readonly quality: Quality, readonly gallery: GalleryLayout, extraPath: { x: number; y: number; z: number }[] = []) {
    this.path = new CameraPath(extraPath);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(quality.pixelRatio);

    this.scene.background = FOG_OUT.clone();
    this.scene.fog = new THREE.FogExp2(FOG_OUT.getHex(), 0.016);

    const rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: quality.low ? 0 : 4,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.26, 0.5, 0.92);
    this.bloom.enabled = quality.bloom;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.shared = new Shared();
    const stage = canvas.parentElement ?? canvas;
    this.io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { threshold: 0 });
    this.io.observe(stage);
  }

  get buildContext(): BuildContext {
    return { scene: this.scene, rig: this.rig, path: this.path, quality: this.quality, renderer: this.renderer, shared: this.shared, gallery: this.gallery };
  }

  add(mod: SceneModule) {
    const inst = mod.build(this.buildContext);
    this.scene.add(inst.group);
    this.modules.push(inst);
    return inst;
  }

  resize(w: number, h: number) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.applyFov();
  }

  private applyFov() {
    const a = this.camera.aspect;
    const f = a >= 1 ? this.rig.fov : Math.min(84, this.rig.fov + (1 - a) * 48);
    if (Math.abs(this.camera.fov - f) > 0.01) {
      this.camera.fov = f;
      this.camera.updateProjectionMatrix();
    }
  }

  start() {
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      if (document.hidden || !this.visible) { this.last = t; return; }
      const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
      this.last = t;
      this.frame(t / 1000, dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  frame(time: number, dt: number) {
    const { rig, camera, quality } = this;
    // velocidad suavizada → balanceo de cámara proporcional al movimiento
    const v = Math.abs(rig.dist - this.lastDist) / Math.max(dt, 1e-3);
    this.speed += (v - this.speed) * Math.min(1, dt * 4);
    this.lastDist = rig.dist;

    this.path.at(rig.dist, this.sample);
    const { pos, dir } = this.sample;
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    pos.addScaledVector(right, rig.lateral);
    if (!quality.reduced) {
      const amp = Math.min(1, this.speed / 6);
      pos.y += Math.sin(rig.dist * 2.1) * 0.014 * amp + Math.sin(time * 0.7) * 0.006;
      pos.x += Math.sin(time * 0.43 + 1.3) * 0.012;
    }
    camera.position.copy(pos);
    const look = dir.clone();
    if (rig.align > 0) look.lerp(new THREE.Vector3(rig.fx - pos.x, rig.fy - pos.y, rig.fz - pos.z).normalize(), rig.align);
    look.applyAxisAngle(camera.up, rig.yaw);
    look.y += Math.tan(rig.pitch);
    camera.lookAt(pos.clone().add(look));
    if (rig.roll) {
      this.tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rig.roll);
      camera.quaternion.multiply(this.tmpQ);
    }
    this.applyFov();

    // ambiente global
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = (0.011 + 0.013 * (1 - rig.outside)) * rig.fog;
    fog.color.copy(FOG_IN).lerp(FOG_OUT, rig.outside);
    (this.scene.background as THREE.Color).copy(fog.color);
    this.renderer.toneMappingExposure = rig.exposure;
    this.bloom.strength = rig.bloom;

    const state: FrameState = { time, dt, dist: rig.dist, rig, camera, path: this.path, quality };
    for (const m of this.modules) m.update?.(state);
    this.composer.render(dt);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.io?.disconnect();
    for (const m of this.modules) {
      m.dispose?.();
      this.scene.remove(m.group);
    }
    this.shared.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
