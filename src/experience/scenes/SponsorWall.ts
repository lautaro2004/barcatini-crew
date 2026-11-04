import * as THREE from "three";
import { L, floorY } from "../layout";
import { disposeGroup, hdr } from "../geo";
import { SPONSORS, type Sponsor } from "../../config";
import { makeGraffiti, makeRedNeon, makeSponsorTexture, type SponsorStyle } from "../textures";
import type { SceneInstance, SceneModule } from "../types";

const WALL_X0 = -12; // borde izquierdo (m)
const WALL_Z = L.backZ + 0.06;
const FLOOR = floorY(L.backZ);

const STYLE: Record<Sponsor["tier"], SponsorStyle> = {
  title: { bg: "#0a0c10", fg: "#eef3f8", accent: "#d1121b" },
  gold: { bg: "#e8edf2", fg: "#0a0c10", accent: "#d1121b" },
  silver: { bg: "#0f1217", fg: "#e8edf2", accent: "#6f93d8" },
  partner: { bg: "#0f1217", fg: "#e8edf2", accent: "#6f93d8" },
};

interface Slot { s: Sponsor; u: number; v: number; w: number; h: number; lit: number }

/**
 * ESCENA 3 — PARED DE SPONSORS
 * Carteles físicos montados sobre la pared del subsuelo: lona de vinilo iluminada
 * por spots + cajas de luz con separadores metálicos. Los logos son placeholders
 * procedurales; con `image` en config.ts se reemplazan por archivos reales.
 */
export const SponsorWall: SceneModule = {
  id: "sponsor-wall",
  build({ scene, shared }): SceneInstance {
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);
    const at = (u: number, v: number, w: number, h: number) => ({ x: WALL_X0 + u + w / 2, y: FLOOR + v + h / 2 });

    /* placa de fondo y marco */
    const plate = new THREE.Mesh(new THREE.BoxGeometry(16.4, 3.35, 0.06), shared.matBlack);
    plate.position.set(WALL_X0 + 8, FLOOR + 1.75, WALL_Z - 0.01);
    add(plate);
    const seams = new THREE.MeshBasicMaterial({ color: 0x1b2028 });
    for (let u = 0; u <= 16; u += 2) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 3.35), seams);
      m.position.set(WALL_X0 + u, FLOOR + 1.75, WALL_Z + 0.025);
      add(m);
    }

    /* cartel rojo de neón */
    const neon = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 0.64),
      new THREE.MeshBasicMaterial({ map: makeRedNeon("OFFICIAL PARTNERS"), transparent: true, color: hdr(0xffffff, 1.5), toneMapped: false }),
    );
    neon.position.set(WALL_X0 + 0.6 + 2.7, FLOOR + 2.78, WALL_Z + 0.08);
    add(neon);
    const redLine = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: hdr(0xff1a28, 1.8), toneMapped: false }));
    redLine.position.set(WALL_X0 + 8, FLOOR + 3.45, WALL_Z + 0.06);
    add(redLine);

    /* slots: un panel por sponsor confirmado (logo real, proporción original) */
    const PH = 2.0, GAP = 0.5, V0 = 0.38;
    const slots: Slot[] = [];
    const totalW = SPONSORS.reduce((acc, sp) => acc + PH * (sp.aspect ?? 1.1), 0) + GAP * (SPONSORS.length - 1);
    let uc = (16.2 - totalW) / 2 + 0.1;
    SPONSORS.forEach((sp) => {
      const w = PH * (sp.aspect ?? 1.1);
      slots.push({ s: sp, u: uc, v: V0, w, h: PH, lit: 0 });
      uc += w + GAP;
    });

    const loader = new THREE.TextureLoader();
    const faces: { mat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial; slot: Slot; box: boolean }[] = [];
    slots.forEach((sl) => {
      const { x, y } = at(sl.u, sl.v, sl.w, sl.h);
      let tex: THREE.Texture;
      if (sl.s.image) {
        tex = loader.load(sl.s.image);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
      } else {
        tex = makeSponsorTexture(sl.s.label, sl.s.mark, Math.round(sl.w * 220), Math.round(sl.h * 220), STYLE.silver);
      }
      const depth = 0.2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(sl.w + 0.12, sl.h + 0.12, depth), shared.matMetal);
      body.position.set(x, y, WALL_Z + depth / 2 + 0.03);
      add(body);
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: hdr(0xffffff, 0.02), toneMapped: true });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sl.w, sl.h), mat);
      face.position.set(x, y, WALL_Z + depth + 0.035);
      add(face);
      for (const dx of [-sl.w * 0.35, sl.w * 0.35]) {
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), shared.matBlack);
        br.position.set(x + dx, y + sl.h / 2 + 0.12, WALL_Z + 0.09);
        add(br);
      }
      faces.push({ mat, slot: sl, box: true });
    });

    /* canaleta y cables */
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 16, 8).rotateZ(Math.PI / 2), shared.matMetal);
    conduit.position.set(WALL_X0 + 8, FLOOR + 3.52, WALL_Z + 0.1);
    add(conduit);

    /* topes de rueda frente a la pared */
    const stopGeo = new THREE.BoxGeometry(1.8, 0.12, 0.28);
    const stopMat = new THREE.MeshStandardMaterial({ color: 0x20252c, roughness: 0.8 });
    const stops = new THREE.InstancedMesh(stopGeo, stopMat, 9);
    for (let i = 0; i < 9; i++) stops.setMatrixAt(i, new THREE.Matrix4().makeTranslation(WALL_X0 + 0.9 + i * 1.75, FLOOR + 0.06, L.backZ + 0.7));
    add(stops);

    /* iluminación: riel con spots */
    const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.06, 0.06), shared.matBlack);
    const railY = FLOOR + 3.45;
    rail.position.set(WALL_X0 + 8, railY + 0.18, L.backZ + 3.1);
    add(rail);
    const spots: THREE.SpotLight[] = [];
    const headMat = new THREE.MeshBasicMaterial({ color: hdr(0xdbe8ff, 2.2), toneMapped: false });
    [-9.8, -6.6, -3.4, -0.2, 2.8].forEach((x) => {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 10), shared.matBlack);
      head.position.set(x, railY + 0.08, L.backZ + 3.1);
      head.rotation.x = 0.55;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), headMat);
      lens.position.set(x, railY - 0.02, L.backZ + 3.02);
      lens.rotation.x = Math.PI / 2 + 0.6;
      add(head); add(lens);
      const sp = new THREE.SpotLight(0xe6ecf2, 0, 14, 0.62, 1, 1.4);
      sp.position.set(x, railY + 0.05, L.backZ + 3.1);
      sp.target.position.set(x, FLOOR + 1.5, L.backZ);
      add(sp); add(sp.target);
      spots.push(sp);
    });

    /* lavado de luz fría sobre la pared */
    const wash = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 6),
      new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xb4c4d8, 0.05), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    wash.position.set(WALL_X0 + 8, FLOOR + 1.8, WALL_Z + 0.5);
    add(wash);
    const floorWash = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 8),
      new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xb4c4d8, 0.06), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    floorWash.rotation.x = -Math.PI / 2;
    floorWash.position.set(WALL_X0 + 8, FLOOR + 0.03, L.backZ + 3.2);
    add(floorWash);

    /* grafiti sobre el hormigón, a la derecha de la pared de sponsors (se descubre al alejarse) */
    const GX = 7.9, GW = 5.9, GH = 2.95;
    const gTex = makeGraffiti([
      { text: "¿QUÉ PASA CON", color: "#f4f1ff" },
      { text: "LA BANDA?", color: "#a24bff" },
      { text: "¿TODO EN ORDEN?", color: "#ff3a4a" },
    ]);
    const gMat = new THREE.MeshBasicMaterial({ map: gTex, transparent: true, color: 0x000000, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const graffiti = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), gMat);
    graffiti.position.set(GX, FLOOR + 1.88, WALL_Z - 0.01);
    graffiti.renderOrder = 2;
    add(graffiti);
    const anchor = new THREE.Vector3(GX, FLOOR + 0.22, WALL_Z);
    let linksEl: HTMLElement | null = null;

    const state = { on: 0 };
    const order = faces.map((_, i) => i);
    return {
      group,
      update({ time, camera }) {
        const on = state.on;
        // grafiti: se ilumina a medida que la cámara se acerca; los links de Instagram lo siguen en pantalla
        const gk = THREE.MathUtils.smoothstep(camera.position.x, -6, 4);
        gMat.color.setScalar(0.12 + 0.8 * gk);
        linksEl ??= document.querySelector<HTMLElement>("[data-gl-pos]");
        if (linksEl && linksEl.parentElement) {
          const v = anchor.clone().project(camera);
          const W = linksEl.parentElement.clientWidth, H = linksEl.parentElement.clientHeight;
          linksEl.style.transform = `translate(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px) translateX(-50%)`;
          linksEl.style.display = v.z < 1 ? "" : "none";
        }
        spots.forEach((s) => (s.intensity = 42 * Math.min(1, on * 1.6)));
        wash.visible = floorWash.visible = on > 0.02;
        (wash.material as THREE.MeshBasicMaterial).opacity = Math.min(1, on * 1.4);
        faces.forEach((f, i) => {
          const th = 0.15 + (order[i] / faces.length) * 0.7;
          let k = THREE.MathUtils.clamp((on - th) / 0.12, 0, 1);
          if (k > 0 && k < 1) k *= 0.5 + 0.5 * Math.sin(time * 40 + i * 9) ** 2; // encendido titilante
          if (f.box) {
            const flick = i === 5 ? 0.9 + 0.1 * Math.sin(time * 31) * Math.sin(time * 5) : 1;
            (f.mat as THREE.MeshBasicMaterial).color.copy(hdr(0xffffff, 0.02 + 1.0 * k * flick));
          } else {
            (f.mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 * k;
          }
        });
      },
      timeline(tl, t) {
        const end = t.baseLength;
        // el muro "despierta" al acercarse
        tl.to(state, { on: 1, ease: "none", duration: t.span(end - 46, end - 12) }, t.at(end - 46));
        tl.to(t.rig, { align: 1, ease: "sine.inOut", duration: t.span(end - 34, end - 6) }, t.at(end - 34));
        // plano final frontal, a ~9 m: la pared completa queda en cuadro y legible
        tl.to(t.rig, { exposure: 0.84, bloom: 0.34, ease: "sine.inOut", duration: t.span(end - 30, end) }, t.at(end - 30));
        // retrato (móvil): el ancho no alcanza → durante la pausa "wall" la cámara recorre la pared de punta a punta
        const wall = t.marks["wall"];
        if (wall) {
          tl.to(t.rig, { lateral: -4.6, ease: "sine.inOut", duration: t.span(end - 14, end) }, t.at(end - 14));
          tl.to(t.rig, { lateral: 4.2, ease: "sine.inOut", duration: wall.dur }, wall.t0);
        }
      },
      dispose() {
        disposeGroup(group);
        scene.remove(group);
      },
    };
  },
};
