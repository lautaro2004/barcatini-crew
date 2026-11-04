import * as THREE from "three";
import type { gsap } from "gsap";
import { ceilH, floorY } from "../layout";
import { GALLERY } from "../gallery";
import { boxUV, disposeGroup, floorRibbon, hdr, merge } from "../geo";
import { makeFloorText, makeSign } from "../textures";
import type { SceneInstance, SceneModule } from "../types";

const sstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** gradiente radial negro (sombra de contacto) */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.45, "rgba(0,0,0,0.65)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** reflejo en piso mojado: la foto invertida que se desvanece */
function reflectionTexture(img: HTMLImageElement) {
  const w = 256, h = Math.max(32, Math.round((256 * img.height) / img.width));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.save();
  x.translate(0, h);
  x.scale(1, -1);
  x.drawImage(img, 0, 0, w, h);
  x.restore();
  x.globalCompositeOperation = "destination-in";
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(0.55, "rgba(0,0,0,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Car {
  group: THREE.Group;
  billboard: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  shadow: THREE.Mesh;
  pool: THREE.Mesh;
  refl: THREE.Mesh;
  reflMat: THREE.MeshBasicMaterial;
  glow: THREE.Sprite;
  bars: THREE.MeshBasicMaterial[];
  wallGlow: THREE.Mesh[];
  x: number;
  w: number;
  h: number;
  lit: number;
}

/**
 * ESCENA 4 — THE CAR SHOWCASE
 * Sector de exhibición dentro del MISMO estacionamiento: una columna por invitado,
 * cada auto en su bahía con lámpara colgante, sombra de contacto y reflejo en el
 * piso mojado. La cantidad de bahías sale de `guests` (data/guests.ts).
 *
 * Las fotos son recortes reales (no se generan ni se modifican autos): se montan
 * en un plano vertical con la proporción original, que gira para mirar a cámara,
 * y quedan por detrás de las columnas (profundidad real ⇒ oclusión del travelling).
 */
export const CarShowcaseScene: SceneModule = {
  id: "car-showcase",
  build({ scene, shared, quality, gallery }): SceneInstance {
    const G = GALLERY;
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = group) => (parent.add(o), o);
    const FLOOR = gallery.floor;
    const ceilY = FLOOR + ceilH(G.carZ);
    const slots = gallery.slots;

    /* ---------- columnas (producen las oclusiones) ---------- */
    const colH = ceilH(G.colZ);
    const colW = 1.25;
    const colGeo = boxUV(new THREE.BoxGeometry(colW, colH, colW), 3);
    const colMat = shared.matBox;
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xa30d16, roughness: 0.55, emissive: 0x330005 });
    const bandGeo = new THREE.BoxGeometry(colW + 0.03, 0.22, colW + 0.03);
    const baseGeo = new THREE.BoxGeometry(colW + 0.03, 0.84, colW + 0.03);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.8 });
    const colXs = slots.map((s) => s.colX);
    colXs.push(gallery.center.x - 8.5, gallery.center.x + 8.5); // flanquean el podio (al fondo)
    colXs.forEach((x, i) => {
      const y = FLOOR + colH / 2;
      const zc = i < slots.length ? G.colZ : -88.6;
      const m = add(new THREE.Mesh(colGeo, colMat));
      m.position.set(x, y, zc);
      const b = add(new THREE.Mesh(bandGeo, bandMat));
      b.position.set(x, FLOOR + 1.35, zc);
      const base = add(new THREE.Mesh(baseGeo, baseMat));
      base.position.set(x, FLOOR + 0.42, zc);
      if (i < slots.length) {
        // placa física atornillada a la columna (cara hacia el pasillo)
        const tex = makeSign({ w: 480, h: 210, bg: "#07090c", title: `BAHÍA ${slots[i].guest.number}`, sub: "INVITADO  ·  RESERVADO", border: "#d1121b" });
        const plate = add(new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.415), new THREE.MeshBasicMaterial({ map: tex, color: hdr(0xffffff, 0.7) })));
        plate.position.set(x, FLOOR + 2.15, G.colZ + colW / 2 + 0.012);
      }
    });

    /* ---------- pintura del piso ---------- */
    const white: THREE.BufferGeometry[] = [];
    const bayTex = new Map<string, THREE.Texture>();
    slots.forEach((s) => {
      const hw = (s.guest.widthM ?? 4) / 2 + 0.75;
      white.push(floorRibbon(s.carX - hw - 0.05, s.carX - hw + 0.05, G.carZ + 1.2, -89.9));
      white.push(floorRibbon(s.carX + hw - 0.05, s.carX + hw + 0.05, G.carZ + 1.2, -89.9));
      white.push(floorRibbon(s.carX - hw - 0.05, s.carX + hw + 0.05, G.carZ + 1.2, G.carZ + 1.1));
    });
    add(new THREE.Mesh(merge(white), shared.matPaint));
    slots.forEach((s) => {
      const t = makeFloorText(s.guest.number.replace(/^0+/, "") ? `${s.guest.number}` : s.guest.number, 384, 160);
      bayTex.set(s.guest.id, t);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 0.46).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
      );
      m.position.set(s.carX, FLOOR + 0.018, G.carZ + 1.8);
      add(m);
    });

    /* ---------- tubos fluorescentes apagados / tenues del sector ---------- */
    const fxPos: [number, number][] = [];
    for (let x = 6; x < gallery.endX - 6; x += 6.2) fxPos.push([x, -79.2]);
    const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.08, 2.7), shared.matBlack, fxPos.length);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.05, 2.5), tubeMat, fxPos.length);
    tubes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(fxPos.length * 3), 3);
    const m4 = new THREE.Matrix4();
    const tubeK = fxPos.map((_, i) => (i % 4 === 1 ? 0.55 : 0.04));
    const tcol = new THREE.Color();
    fxPos.forEach(([x, z], i) => {
      m4.makeTranslation(x, FLOOR + ceilH(z) - 0.2, z);
      housing.setMatrixAt(i, m4);
      tubes.setMatrixAt(i, m4.clone().setPosition(x, FLOOR + ceilH(z) - 0.25, z));
      tubes.setColorAt(i, tcol.copy(hdr(0xdfe8ef, tubeK[i])));
    });
    add(housing); add(tubes);

    /* ---------- autos ---------- */
    const loader = new THREE.TextureLoader();
    const shTex = shadowTexture();
    const cars: Car[] = [];
    const disposables: THREE.Texture[] = [shTex, ...bayTex.values()];

    slots.forEach((s) => {
      const w = s.guest.widthM ?? 4;
      const cg = new THREE.Group();
      add(cg);
      cg.position.set(s.carX, FLOOR, G.carZ);

      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, color: 0x000000, fog: false, depthWrite: true, side: THREE.DoubleSide });
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      bb.renderOrder = 5;
      bb.visible = false;
      add(bb, cg);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
      );
      shadow.scale.set(w * 1.22, 1, 4.6);
      shadow.position.set(0, 0.014, -1.75);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.9;
      shadow.renderOrder = 4;
      add(shadow, cg);
      const core = new THREE.Mesh(shadow.geometry, shadow.material.clone());
      core.scale.set(w * 0.92, 1, 3.0);
      core.position.set(0, 0.016, -1.55);
      (core.material as THREE.MeshBasicMaterial).opacity = 1;
      core.renderOrder = 4;
      add(core, cg);

      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: shared.glow, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      pool.scale.set(w * 2.5, 1, 7);
      pool.position.set(0, 0.02, 1.4);
      pool.renderOrder = 2;
      add(pool, cg);

      const reflMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0xffffff });
      const refl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), reflMat);
      refl.renderOrder = 3;
      refl.visible = false;
      add(refl, cg);

      /* lámpara colgante */
      const lampY = ceilY - 0.7;
      const lampZ = G.carZ + 1.3;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, ceilY - lampY, 6), shared.matBlack);
      cord.position.set(0, lampY - FLOOR + (ceilY - lampY) / 2, lampZ - G.carZ);
      add(cord, cg);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide }));
      shade.position.set(0, lampY - FLOOR, lampZ - G.carZ);
      add(shade, cg);
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: hdr(0xe8f0ff, 3), toneMapped: false }));
      bulb.position.set(0, lampY - FLOOR - 0.12, lampZ - G.carZ);
      add(bulb, cg);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: shared.glow, color: 0x000000, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      glow.scale.set(2.4, 2.4, 1);
      glow.position.set(0, lampY - FLOOR - 0.2, lampZ - G.carZ);
      add(glow, cg);

      /* luces ambientales rojo / azul sobre la pared del fondo (muy sutiles) */
      const bars: THREE.MeshBasicMaterial[] = [];
      const wallGlow: THREE.Mesh[] = [];
      ([[-1, 0xff1a2a], [1, 0x2f66ff]] as [number, number][]).forEach(([sd, col]) => {
        const bx = sd * (w / 2 + 1.55);
        const bm = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.3, 0.05), bm);
        bar.position.set(bx, 1.5, -89.85 - G.carZ);
        add(bar, cg);
        const gm = new THREE.MeshBasicMaterial({ map: shared.glow, color: new THREE.Color(col).multiplyScalar(0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        gm.userData.col = new THREE.Color(col);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 5.2), gm);
        gl.position.set(bx, 1.5, -89.9 - G.carZ + 0.12);
        gl.renderOrder = 2;
        add(gl, cg);
        bars.push(bm);
        wallGlow.push(gl);
        bm.userData.col = new THREE.Color(col);
      });

      const car: Car = { group: cg, billboard: bb, mat, shadow, pool, refl, reflMat, glow, bars, wallGlow, x: s.carX, w, h: w * 0.4, lit: 0 };
      cars.push(car);

      loader.load(s.guest.image, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        const img = t.image as HTMLImageElement;
        const h = (w * img.height) / img.width; // proporción original, sin estirar
        car.h = h;
        mat.map = t;
        mat.color.setScalar(1);
        mat.needsUpdate = true;
        bb.scale.set(w, h, 1);
        bb.position.set(0, h / 2 - 0.02, 0);
        bb.visible = true;
        const rt = reflectionTexture(img);
        reflMat.map = rt;
        reflMat.needsUpdate = true;
        refl.scale.set(w, 1, h * 0.55);
        refl.position.set(0, 0.016, h * 0.275 + 0.02);
        refl.visible = true;
        disposables.push(t, rt);
      });
    });

    /* ---------- luces reales: 3 puntuales reutilizadas por los más cercanos ---------- */
    const LN = quality.low ? 2 : 3;
    const lights: THREE.PointLight[] = [];
    for (let i = 0; i < LN; i++) {
      const l = new THREE.PointLight(0xdfe8ff, 0, 11, 1.6);
      add(l);
      lights.push(l);
    }
    const cWarm = new THREE.Color(0xe9eef7);
    const tmpV = new THREE.Vector3();
    let lastT = 0;

    return {
      group,
      update({ time, camera }) {
        const cam = camera.position;
        // cuánto "pertenece" cada bahía a la cámara (continuo ⇒ reversible)
        const cands: { x: number; y: number; z: number; w: number; k: number }[] = [];
        cars.forEach((c) => {
          c.lit = 1 - sstep((Math.abs(cam.x - c.x) - 2.2) / 8.5);
          const k = c.lit;
          // billboard cilíndrico: gira sobre Y para mirar a cámara (la foto no se deforma)
          const ang = Math.atan2(cam.x - c.x, cam.z - G.carZ);
          c.billboard.rotation.y = ang;
          const br = 0.22 + 1.28 * k;
          c.mat.color.setScalar(br);
          (c.pool.material as THREE.MeshBasicMaterial).color.copy(hdr(0xdfe8f5, 0.28 * k));
          (c.glow.material as THREE.SpriteMaterial).color.copy(hdr(0xe0eaff, 0.55 * k));
          c.reflMat.opacity = 0.34 * k;
          c.bars.forEach((b) => b.color.copy((b.userData.col as THREE.Color).clone().multiplyScalar(0.05 + 1.1 * k)));
          c.wallGlow.forEach((g) => {
            const m = g.material as THREE.MeshBasicMaterial;
            m.color.copy((m.userData.col as THREE.Color).clone().multiplyScalar(0.07 * (0.35 + 0.65 * k)));
          });
          cands.push({ x: c.x, y: FLOOR + ceilH(G.carZ) - 0.95, z: G.carZ + 1.3, w: 1, k });
        });
        cands.sort((a, b) => b.k - a.k);
        lights.forEach((l, i) => {
          const c = cands[i];
          if (!c) { l.intensity = 0; return; }
          l.position.set(c.x, c.y, c.z);
          l.intensity = 26 * c.k;
          l.color.copy(cWarm);
        });
        // titileo de unos pocos tubos del techo
        if (time - lastT > 0.07) {
          lastT = time;
          tubeK.forEach((k0, i) => {
            const f = i % 4 === 1 && Math.sin(time * 0.8 + i) > 0.6 ? (Math.sin(time * 41 + i * 7) > 0 ? 1 : 0.25) : 1;
            tubes.setColorAt(i, tcol.copy(hdr(0xdfe8ef, k0 * f)));
          });
          if (tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
        }
        void tmpV;
      },
      timeline(tl, t) {
        const { rig } = t;
        const m = t.marks;
        const slotsN = slots.length;
        if (!slotsN) return;
        const first = m["g0-a"];
        // al alejarse de los sponsors el estacionamiento se oscurece: sólo quedan los puntos de luz
        const c0 = m["g0-c"], s0 = m["g0-s"], gw = m["g0-gw"], a2 = m["g0-a2"];
        tl.to(rig, { ambient: 0.22, ease: "sine.inOut", duration: c0.t0 - first.t0 }, first.t0);
        tl.to(rig, { exposure: 0.92, bloom: 0.3, ease: "sine.inOut", duration: c0.t0 - first.t0 }, first.t0);
        // grafiti: la mirada se abre hacia él y los links de Instagram aparecen debajo
        const gp = { x: 7.9, y: gallery.floor + 1.55, z: -90 };
        tl.to(rig, { fx: gp.x, fy: gp.y, fz: gp.z, ease: "sine.inOut", duration: first.dur + s0.dur }, first.t0);
        const gl = t.q("[data-gl]");
        if (gl) {
          tl.fromTo(gl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power1.out", immediateRender: false }, s0.t0 + s0.dur * 0.4);
          tl.to(gl, { autoAlpha: 0, duration: 0.5, ease: "power1.in" }, a2.t0);
        }
        void gw;
        // mirada: sigue al auto de cada bahía; entre bahías barre lateralmente
        slots.forEach((s, i) => {
          const a = m[`g${i}-a`], c = m[`g${i}-c`], hold = m[`g${i}-hold`];
          const dur = c.t0 + c.dur - a.t0;
          const fStart = i === 0 ? m["g0-gw"].t0 + m["g0-gw"].dur * 0.45 : a.t0;
          tl.to(rig, { fx: s.focus.x, fy: s.focus.y, fz: s.focus.z, ease: "sine.inOut", duration: c.t0 + c.dur - fStart }, fStart);
          // lente: se abre al viajar (paralaje), se cierra al encuadrar el auto
          tl.to(rig, { fov: 50, ease: "sine.inOut", duration: Math.max(0.1, i === 0 ? m["g0-a2"].dur : a.dur) }, i === 0 ? m["g0-a2"].t0 : a.t0);
          tl.to(rig, { fov: t.reduced ? 42 : 40, ease: "sine.inOut", duration: c.dur + a.dur * 0.2 }, c.t0 - a.dur * 0.2 + (i === 0 ? 0 : 0));
          // durante la pausa un empuje lentísimo (sin movimiento de cámara real)
          tl.to(rig, { fov: 38.5, ease: "none", duration: hold.dur }, hold.t0);
        });
        // información editorial: aparece al detenerse, se retira cuando la cámara vuelve a moverse
        slots.forEach((s, i) => {
          const root = t.q(`[data-guest="${i}"]`);
          if (!root) return;
          const pick = (k: string) => root.querySelector(`[data-g="${k}"]`);
          const hold = m[`g${i}-hold`];
          const next = m[i + 1 < slotsN ? `g${i + 1}-a` : "bridge-a"];
          const T = hold.t0 - 0.12;
          const right = s.side === "right";
          const dir = right ? 1 : -1;
          const enter = (el: Element | null, from: gsap.TweenVars, to: gsap.TweenVars, at: number, d: number) => {
            if (el) tl.fromTo(el, from, { ...to, ease: "power2.out", duration: d, immediateRender: false }, at);
          };
          tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none", immediateRender: false }, T);
          enter(pick("ghost"), { opacity: 0, xPercent: 4 * dir }, { opacity: 1, xPercent: 0 }, T, Math.min(1.2, hold.dur * 0.6));
          enter(pick("tag"), { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, T + 0.05, 0.5);
          enter(pick("line"), { scaleX: 0 }, { scaleX: 1 }, T + 0.15, 0.6);
          enter(pick("name"), { yPercent: 108 }, { yPercent: 0 }, T + 0.22, 0.7);
          enter(pick("model"), { yPercent: 115 }, { yPercent: 0 }, T + 0.45, 0.6);
          enter(pick("ig"), { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, T + 0.7, 0.5);
          enter(pick("desc"), { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, T + 0.85, 0.5);
          // salida
          const X = next.t0;
          const xd = Math.min(1.0, next.dur * 0.35);
          tl.to(root, { opacity: 0, duration: xd, ease: "power1.in" }, X);
          tl.to(root.querySelectorAll("[data-g]"), { x: 22 * dir * -1, duration: xd, ease: "power1.in" }, X);
          tl.set(root.querySelectorAll("[data-g]"), { x: 0 }, X + xd + 0.001);
          void tl;
        });
        // puente hacia el espacio central: la mirada se abre hacia el hueco
        const ba = m["bridge-a"], bc = m["bridge-c"];
        if (ba && bc) {
          const cen = gallery.center;
          tl.to(rig, { fx: cen.x, fy: cen.y + 0.9, fz: cen.z - 1, ease: "sine.inOut", duration: bc.t0 + bc.dur - ba.t0 }, ba.t0);
          tl.to(rig, { fov: 46, ease: "sine.inOut", duration: bc.t0 + bc.dur - ba.t0 }, ba.t0);
        }
      },
      dispose() {
        disposables.forEach((d) => d.dispose());
        disposeGroup(group);
        scene.remove(group);
      },
    };
  },
};
