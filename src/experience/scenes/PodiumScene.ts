import * as THREE from "three";
import type { gsap } from "gsap";
import { ceilH } from "../layout";
import { boxUV, disposeGroup, hdr } from "../geo";
import type { SceneInstance, SceneModule } from "../types";

const sstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** trama de tela gruesa (sólo relieve, se usa como bumpMap) */
function weaveTexture() {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = (i / S) * Math.PI * 2 * 8, v = (j / S) * Math.PI * 2 * 8;
      const tw = 0.5 + 0.25 * Math.sin(u + v) + 0.15 * Math.sin(u * 0.5 - v * 0.5) + 0.1 * (Math.random() - 0.5);
      const k = Math.max(0, Math.min(255, tw * 255));
      const o = (j * S + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = k;
      img.data[o + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** nube suave para el humo */
function smokeTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const px = S / 2 + (rnd() - 0.5) * S * 0.5, py = S / 2 + (rnd() - 0.5) * S * 0.5, r = S * (0.14 + rnd() * 0.22);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
  }
  // borde suave para que el sprite no muestre cortes
  x.globalCompositeOperation = "destination-in";
  const m = x.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = m;
  x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/** haz de luz: gradiente vertical */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,1)"); // arriba (v=1) = más intenso, junto al foco
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

/** Estado que anima la timeline (todo 0..1). */
export interface PodiumState {
  on: number; // intensidad general de la iluminación
  sweep: number; // posición del foco que recorre la lona
  gust: number; // fuerza de la corriente de aire
  smoke: number; // presencia del humo
}

/**
 * ESCENA 5 — PODIO CENTRAL
 * Plataforma de hormigón en el centro de la sala (mismo espacio, misma cámara),
 * con un volumen completamente cubierto por una lona negra animada.
 * La forma de la lona es deliberadamente genérica: no insinúa marca, modelo ni tipo.
 */
export const PodiumScene: SceneModule = {
  id: "podium",
  build({ scene, shared, quality, gallery }): SceneInstance {
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = group) => (parent.add(o), o);
    const FLOOR = gallery.floor;
    const cx = gallery.center.x, cz = gallery.center.z;
    const ceilY = FLOOR + ceilH(cz);
    const TOP = FLOOR + 0.34; // cara superior de la plataforma
    const disposables: THREE.Texture[] = [];

    /* ---------- plataforma ---------- */
    const slab = (w: number, h: number, d: number, y: number, mat: THREE.Material) => {
      const g = w > 5 && mat === shared.matBox ? boxUV(new THREE.BoxGeometry(w, h, d), 3) : new THREE.BoxGeometry(w, h, d);
      const m = add(new THREE.Mesh(g, mat));
      m.position.set(cx, y, cz);
      return m;
    };
    slab(10.8, 0.1, 7.8, FLOOR + 0.05, shared.matBox);
    slab(9.5, 0.2, 6.5, FLOOR + 0.2, shared.matBox);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.4, metalness: 0.3 });
    slab(9.2, 0.04, 6.2, FLOOR + 0.32, topMat);

    // tira LED roja, muy contenida, en el borde de la plataforma
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const led = (w: number, d: number, x: number, z: number) => {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), ledMat));
      m.position.set(cx + x, TOP + 0.012, cz + z);
    };
    led(9.0, 0.04, 0, 3.0); led(9.0, 0.04, 0, -3.0); led(0.04, 6.0, 4.5, 0); led(0.04, 6.0, -4.5, 0);

    /* ---------- cercha con focos ---------- */
    const railY = ceilY - 0.5;
    for (const dz of [-2.4, 2.4]) {
      const r = add(new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.08, 0.08), shared.matBlack));
      r.position.set(cx, railY, cz + dz);
    }
    for (const dx of [-5, 0, 5]) {
      const r = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.9), shared.matBlack));
      r.position.set(cx + dx, railY, cz);
    }
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    [[-3.2, -2.4], [-3.2, 2.4], [3.2, -2.4], [3.2, 2.4]].forEach(([dx, dz]) => {
      const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.3, 12), shared.matBlack));
      head.position.set(cx + dx, railY - 0.2, cz + dz);
      const lens = add(new THREE.Mesh(new THREE.CircleGeometry(0.11, 12).rotateX(Math.PI / 2), lensMat));
      lens.position.set(cx + dx, railY - 0.36, cz + dz);
    });

    /* ---------- lonas (auto y moto) ---------- */
    const weave = weaveTexture();
    disposables.push(weave);
    const tarpMat = new THREE.MeshPhysicalMaterial({
      color: 0x24262b, roughness: 0.55, metalness: 0,
      sheen: 1, sheenColor: new THREE.Color(0x6a7282), sheenRoughness: 0.4,
      bumpMap: weave, bumpScale: 0.25, side: THREE.DoubleSide,
    });
    // zonas que se levantan y vuelven a caer (irregulares, no periódicas)
    const baseLifts = [
      { th: 0.6, w: 0.62, r: 0.5, f1: 0.37, f2: 0.23, p1: 0.4, p2: 2.1, amp: 0.2 },
      { th: 2.5, w: 0.72, r: 0.45, f1: 0.29, f2: 0.41, p1: 1.9, p2: 0.3, amp: 0.17 },
      { th: 4.1, w: 0.55, r: 0.55, f1: 0.33, f2: 0.19, p1: 3.3, p2: 1.2, amp: 0.22 },
      { th: 5.4, w: 0.78, r: 0.4, f1: 0.45, f2: 0.31, p1: 0.9, p2: 2.8, amp: 0.15 },
    ];
    const makeTarp = (ox: number, A: number, B: number, H: number, PN: number, nt: number, nw: number, ph: number) => {
      const NT = nt, NW = nw;
      const nV = NT * (NW + 1);
      const base = new Float32Array(nV * 3);
      const pos = new Float32Array(nV * 3);
      const wArr = new Float32Array(nV);
      const thArr = new Float32Array(nV);
      const idx: number[] = [];
      const uvs = new Float32Array(nV * 2);
      const radius = (th: number) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(th) / A), PN) + Math.pow(Math.abs(Math.sin(th) / B), PN), 1 / PN);
      const sc = Math.min(1, B / 1.08 + 0.35); // pliegues proporcionales al tamaño
      for (let j = 0; j <= NW; j++) {
        const w = Math.max(0.0015, j / NW);
        for (let i = 0; i < NT; i++) {
          const th = (i / NT) * Math.PI * 2;
          const fold = 0.55 * Math.sin(th * 7 + 1.3 * Math.sin(th * 2.3 + ph) + ph) + 0.45 * Math.sin(th * 13 + 0.7 + ph);
          const flare = 0.22 * sc * sstep((w - 0.76) / 0.24) * (0.55 + 0.45 * fold);
          const wr = (0.07 * Math.sin(th * 11 + w * 4 + ph) + 0.04 * Math.sin(th * 17 - w * 3)) * sc * sstep((w - 0.2) / 0.5);
          const rad = radius(th) * (w + flare) + wr;
          let y = H * Math.pow(Math.max(0, 1 - Math.pow(w, 3.2)), 0.5) * (1 + 0.06 * Math.sin(th * 3 + 1 + ph));
          y += (0.05 * Math.sin(th * 15 + w * 5 + ph) * w * (1 - w) * 4 + 0.03 * Math.sin(th * 5 - w * 9) * w) * sc;
          const k = j * NT + i;
          const x = Math.cos(th) * rad, zz = Math.sin(th) * rad;
          base[k * 3] = x; base[k * 3 + 1] = Math.max(0.012, y) + 0.012; base[k * 3 + 2] = zz;
          wArr[k] = w; thArr[k] = th;
          uvs[k * 2] = x / 1.4; uvs[k * 2 + 1] = zz / 1.4;
        }
      }
      for (let j = 0; j < NW; j++)
        for (let i = 0; i < NT; i++) {
          const a = j * NT + i, b = j * NT + ((i + 1) % NT), c = (j + 1) * NT + i, d = (j + 1) * NT + ((i + 1) % NT);
          idx.push(a, c, b, b, c, d);
        }
      pos.set(base);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = add(new THREE.Mesh(geo, tarpMat));
      mesh.position.set(cx + ox, TOP, cz);
      mesh.frustumCulled = false;
      // volumen oscuro debajo: si un borde se levanta, nunca se ve nada del interior
      const core = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0x000000 })));
      core.scale.set(A * 0.82, H * 0.7, B * 0.82);
      core.position.set(cx + ox, TOP + 0.1, cz);
      const lifts = baseLifts.map((l) => ({ ...l, th: l.th + ph, amp: l.amp * (H / 1.3) }));
      return {
        update(t: number, g: number, normals: boolean) {
          const baseAmp = (0.012 + 0.012 * g) * (H / 1.3 + 0.3);
          const envs = lifts.map((l) => {
            const a = Math.sin(t * l.f1 * 2 + l.p1 + ph) * Math.sin(t * l.f2 * 2.7 + l.p2);
            return Math.pow(Math.max(0, a), 2) * (0.25 + 0.95 * g) * l.amp;
          });
          for (let n = 0; n < nV; n++) {
            const bx = base[n * 3], by = base[n * 3 + 1], bz = base[n * 3 + 2];
            const w = wArr[n], th = thArr[n];
            const edge = 0.35 + 0.65 * w; // el centro se mueve menos que las caídas
            const n1 = Math.sin(bx * 1.9 + t * 1.15 + Math.sin(bz * 1.3 + t * 0.6)) * Math.sin(bz * 2.3 - t * 0.85 + bx * 0.5 + ph);
            const n2 = Math.sin(bx * 4.1 - t * 1.9 + bz * 2.2) * 0.4;
            let dy = (n1 + n2) * baseAmp * edge;
            let dr = 0;
            for (let q = 0; q < lifts.length; q++) {
              const l = lifts[q];
              let dth = Math.abs(((th - l.th) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
              if (dth > Math.PI) dth = Math.PI * 2 - dth;
              const d2 = (dth * dth) / (l.r * l.r) + ((w - l.w) * (w - l.w)) / 0.04;
              const e = Math.exp(-d2) * envs[q];
              dy += e;
              dr += e * 0.35;
            }
            const rr = Math.hypot(bx, bz) || 1;
            pos[n * 3] = bx + (bx / rr) * dr;
            pos[n * 3 + 1] = Math.max(0.012, by + dy);
            pos[n * 3 + 2] = bz + (bz / rr) * dr;
          }
          geo.attributes.position.needsUpdate = true;
          if (normals) geo.computeVertexNormals();
        },
      };
    };
    const tarps = [
      makeTarp(-1.5, 2.45, 1.08, 1.3, 2.7, quality.low ? 64 : 96, quality.low ? 24 : 36, 0),
      makeTarp(3.05, 1.05, 0.5, 0.95, 2.3, quality.low ? 40 : 56, quality.low ? 16 : 22, 1.7),
    ];

    /* ---------- luces ---------- */
    const key = new THREE.SpotLight(0xeef2ff, 0, 15, 0.46, 0.75, 1.3);
    key.position.set(cx + 0.4, ceilY - 0.45, cz + 0.4);
    key.target.position.set(cx, TOP + 0.5, cz);
    add(key); add(key.target);
    const sweepL = new THREE.SpotLight(0xffffff, 0, 14, 0.2, 0.85, 1.4);
    sweepL.position.set(cx - 2.8, ceilY - 0.45, cz + 2.6);
    add(sweepL); add(sweepL.target);
    const redL = new THREE.PointLight(0xff1a2a, 0, 10, 2);
    redL.position.set(cx + 3.6, FLOOR + 0.9, cz - 3.4);
    add(redL);

    /* ---------- pozos de luz y haces ---------- */
    const pool = add(new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shared.glow, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    ));
    pool.scale.set(17, 1, 12);
    pool.position.set(cx, FLOOR + 0.022, cz);
    pool.renderOrder = 2;
    const topGlow = add(new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shared.glow, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    ));
    topGlow.scale.set(8.4, 1, 5.6);
    topGlow.position.set(cx, TOP + 0.03, cz);
    topGlow.renderOrder = 2;
    const beamTex = beamTexture();
    disposables.push(beamTex);
    const beamH = ceilY - 0.45 - TOP;
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.6, beamH, 28, 1, true), beamMat));
    beam.position.set(cx + 0.2, TOP + beamH / 2, cz + 0.2);
    beam.renderOrder = 4;

    /* ---------- humo ambiental (moderado, alrededor, nunca sobre la lona) ---------- */
    const smokeTex = smokeTexture();
    disposables.push(smokeTex);
    const NS = quality.low ? 9 : 18;
    const puffs: { s: THREE.Sprite; ang: number; rad: number; y: number; size: number; spd: number; op: number; ph: number }[] = [];
    for (let i = 0; i < NS; i++) {
      const red = i % 5 === 0;
      const mat = new THREE.SpriteMaterial({ map: smokeTex, color: red ? 0x8a2a32 : 0xa7b0c2, transparent: true, opacity: 0, depthWrite: false });
      const s = add(new THREE.Sprite(mat));
      const size = 3.2 + ((i * 37) % 10) * 0.28;
      s.scale.set(size, size, 1);
      puffs.push({ s, ang: (i / NS) * Math.PI * 2 + i, rad: 3.8 + ((i * 53) % 9) * 0.5, y: 0.35 + ((i * 29) % 8) * 0.2, size, spd: (i % 2 ? 1 : -1) * (0.012 + (i % 4) * 0.004), op: red ? 0.05 : 0.085, ph: i * 1.7 });
    }

    const st: PodiumState = { on: 0, sweep: 0, gust: 0, smoke: 0 };
    const wind = { v: 0 }; // gust suavizado (evita saltos al scrollear rápido)
    let frame = 0;

    return {
      group,
      update({ time, dt, camera }) {
        const cam = camera.position;
        const near = cam.x > cx - 24;
        const on = near ? st.on : 0;
        const k = sstep(on);
        // luces
        key.intensity = 120 * k;
        sweepL.intensity = 75 * sstep((on - 0.15) / 0.6) * (0.55 + 0.45 * st.sweep);
        redL.intensity = 4.5 * k;
        const u = st.sweep;
        sweepL.target.position.set(cx + 0.7 + 3.4 * (1 - 2 * u), TOP + 0.5 + 0.35 * Math.sin(u * Math.PI), cz + 0.85 * Math.sin(u * Math.PI * 1.6));
        (pool.material as THREE.MeshBasicMaterial).color.copy(hdr(0xdfe8f5, 0.2 * k));
        (topGlow.material as THREE.MeshBasicMaterial).color.copy(hdr(0xe6ecff, 0.14 * k));
        beamMat.color.copy(hdr(0xdfe8ff, 0.016 * k));
        ledMat.color.copy(hdr(0xff1020, 0.08 + 0.42 * k));
        lensMat.color.copy(hdr(0xe8f0ff, 3 * k));
        // humo
        const sm = near ? st.smoke : 0;
        puffs.forEach((p, i) => {
          p.ang += p.spd * dt;
          p.s.position.set(cx + Math.cos(p.ang) * p.rad * 1.25, FLOOR + p.y + 0.12 * Math.sin(time * 0.22 + p.ph), cz + Math.sin(p.ang) * p.rad * 0.85);
          (p.s.material as THREE.SpriteMaterial).opacity = p.op * sm * (0.65 + 0.35 * Math.sin(time * 0.31 + p.ph)) * (0.4 + 0.6 * k);
          (p.s.material as THREE.SpriteMaterial).rotation = time * 0.01 * (i % 2 ? 1 : -1) + p.ph;
        });

        // lona: sólo se simula cuando está cerca de cámara
        if (!near) return;
        wind.v += (st.gust - wind.v) * Math.min(1, dt * 3);
        const g = wind.v;
        const t = time * (quality.reduced ? 0.4 : 1);
        const doN = (frame++ & 1) === 0;
        tarps.forEach((tp) => tp.update(t, g, doN));
      },
      timeline(tl, t) {
        const m = t.marks;
        if (!m["p1-hold"]) return;
        const { rig } = t;
        const p1 = m["p1-hold"], pa = m["pa-a"], pc = m["pa-c"], p2 = m["p2-hold"], ex = m["p-exit"];
        const b = m["bridge-b"], bc = m["bridge-c"];
        // iluminación y humo ganan intensidad a medida que se llega al podio
        tl.to(st, { on: 0.5, smoke: 0.7, ease: "sine.inOut", duration: bc.t0 + bc.dur - b.t0 }, b.t0);
        tl.to(st, { on: 0.78, ease: "sine.inOut", duration: p1.dur }, p1.t0);
        tl.to(st, { on: 1, smoke: 1, ease: "sine.inOut", duration: pc.t0 + pc.dur - pa.t0 }, pa.t0);
        // el foco recorre la lona (lento, en dos pasadas)
        tl.to(st, { sweep: 0.5, ease: "sine.inOut", duration: p1.dur + pa.dur }, p1.t0);
        tl.to(st, { sweep: 1, ease: "sine.inOut", duration: pc.t0 + pc.dur - (pa.t0 + pa.dur) + p2.dur }, pa.t0 + pa.dur);
        // corriente de aire: ráfagas ligadas al scroll sobre un movimiento base continuo
        tl.to(st, { gust: 0.55, ease: "sine.inOut", duration: p1.dur * 0.5 }, p1.t0);
        tl.to(st, { gust: 0.2, ease: "sine.inOut", duration: p1.dur * 0.5 }, p1.t0 + p1.dur * 0.5);
        tl.to(st, { gust: 1, ease: "sine.inOut", duration: pa.dur + m["pa-b"].dur * 0.5 }, pa.t0);
        tl.to(st, { gust: 0.3, ease: "sine.inOut", duration: p2.dur * 0.35 }, p2.t0 - 0.2);
        tl.to(st, { gust: 0.95, ease: "sine.inOut", duration: p2.dur * 0.4 }, p2.t0 + p2.dur * 0.4);
        // cámara: mira apenas por debajo de la lona (queda arriba en cuadro, el texto abajo)
        const cen = gallery.center;
        const dur = pc.t0 + pc.dur - pa.t0;
        tl.to(rig, { fx: cen.x + 0.6, fy: cen.y + 0.15, fz: cen.z, ease: "sine.inOut", duration: dur }, pa.t0);
        tl.to(rig, { fov: t.reduced ? 46 : 44, exposure: 0.98, bloom: 0.38, ease: "sine.inOut", duration: dur }, pa.t0);
        tl.to(rig, { fov: 40, ease: "none", duration: p2.dur + ex.dur }, p2.t0);
        // mensaje de expectativa
        const q = (s: string) => t.q(`[data-pm="${s}"]`);
        const T = p2.t0 + 0.2;
        const from = (el: Element | null, f: gsap.TweenVars, to: gsap.TweenVars, at: number, d: number) => {
          if (el) tl.fromTo(el, f, { ...to, ease: "power2.out", duration: d, immediateRender: false }, at);
        };
        const root = q("root");
        if (root) tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, T);
        from(q("tag"), { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, T, 0.5);
        from(q("l1"), { yPercent: 110 }, { yPercent: 0 }, T + 0.15, 0.8);
        from(q("l2"), { yPercent: 110 }, { yPercent: 0 }, T + 0.4, 0.8);
        from(q("line"), { scaleX: 0 }, { scaleX: 1 }, T + 0.7, 0.7);
        from(q("sub"), { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, T + 0.95, 0.8);
        from(q("note"), { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, T + 1.3, 0.8);
        // transición hacia la sección informativa: la escena se oscurece (el scroll sigue hacia #evento)
        const fade = t.q("[data-fade]");
        if (fade) tl.fromTo(fade, { opacity: 0 }, { opacity: 1, ease: "power1.in", duration: ex.dur * 0.85, immediateRender: false }, ex.t0 + ex.dur * 0.1);
        if (root) tl.to(root, { opacity: 0, ease: "power1.in", duration: ex.dur * 0.5 }, ex.t0);
      },
      dispose() {
        disposables.forEach((d) => d.dispose());
        puffs.forEach((p) => p.s.material.dispose());
        disposeGroup(group);
        scene.remove(group);
      },
    };
  },
};
