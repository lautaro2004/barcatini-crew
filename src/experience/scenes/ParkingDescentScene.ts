import * as THREE from "three";
import { L, ceilH, floorY, mulberry } from "../layout";
import { boxUV, disposeGroup, floorRibbon, hdr, merge, Reflections, surface } from "../geo";
import { makeFloorArrow, makeSign, makeSpeedSign } from "../textures";
import type { SceneInstance, SceneModule } from "../types";

const sstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const slopeAt = (z: number) => (floorY(z + 0.3) - floorY(z - 0.3)) / 0.6; // dy/dz

/** AO horneado en el piso: más oscuro cerca de paredes */
const floorAOFn = (X1: number, WALL_END: number) => (x: number, z: number) => {
  let d = 99;
  if (z > -62) d = Math.min(d, 8 - Math.abs(x));
  else {
    d = Math.min(d, x + 34, z + 90);
    if (z > WALL_END) d = Math.min(d, 8 - x);
    else d = Math.min(d, X1 - x);
  }
  return 0.42 + 0.58 * sstep(d / 3);
};

interface Fixture { x: number; z: number; len: number; state: 0 | 1 | 2 | 3; y: number; tilt: number }

/**
 * ESCENA 2 y 3 (estructura) — RAMPA Y HALL
 * Todo el volumen interior: piso, techo, paredes, columnas, vigas,
 * fluorescentes, pintura, señalética y luces que acompañan a la cámara.
 * La pared de sponsors vive aparte en SponsorWall.
 */
export const ParkingDescentScene: SceneModule = {
  id: "parking-descent",
  build({ scene, shared, quality, gallery }): SceneInstance {
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);
    const rnd = mulberry(11);
    const X0 = L.hallLeft, X1 = gallery.endX, ZB = L.backZ;
    const WALL_END = -68; // la pared derecha termina acá: desde ahí se abre hacia la galería

    /* ---------- envolvente ---------- */
    const floorAO = floorAOFn(X1, WALL_END);
    const nu = Math.ceil((X1 - X0) / 2);
    const floorGeo = surface(nu, 90, (s, t) => {
      const x = X0 + (X1 - X0) * s, z = -t * 90;
      return { p: [x, floorY(z), z], uv: [x / 6, z / 6], c: floorAO(x, z) };
    });
    add(new THREE.Mesh(floorGeo, shared.matFloor));

    const ceilGeo = surface(nu, 90, (s, t) => {
      const x = X0 + (X1 - X0) * s, z = -t * 90;
      const edge = z > -62 ? 8 - Math.abs(x) : Math.min(x + 34, z + 90, z > WALL_END ? 8 - x : 99);
      return { p: [x, floorY(z) + ceilH(z), z], uv: [x / 1.8, z / 1.8], c: 0.5 + 0.5 * sstep(edge / 3) };
    });
    add(new THREE.Mesh(ceilGeo, shared.matCeiling));

    const wall = (axis: "x" | "z", fixed: number, a: number, b: number) => {
      const n = Math.max(2, Math.ceil(Math.abs(b - a) / 1.5));
      return new THREE.Mesh(
        surface(n, 6, (s, t) => {
          const k = a + (b - a) * s;
          const x = axis === "x" ? fixed : k, z = axis === "x" ? k : fixed;
          const h = ceilH(z), y = floorY(z) + h * t;
          const ao = (0.4 + 0.6 * sstep((h * t) / 1.3)) * (0.55 + 0.45 * sstep((h * (1 - t)) / 0.9));
          return { p: [x, y, z], uv: [(axis === "x" ? -z : x) / 4, y / 4], c: ao };
        }),
        shared.matConcrete,
      );
    };
    add(wall("x", L.wallX, 0, WALL_END));
    add(wall("x", -L.wallX, 0, -62));
    add(wall("x", X0, -62, ZB));
    add(wall("x", X1, WALL_END, ZB));
    add(wall("z", ZB, X0, X1));

    /* ---------- columnas y vigas ---------- */
    const colGeo = boxUV(new THREE.BoxGeometry(1, 1, 1), 3);
    const cols: { x: number; z: number; w: number }[] = [];
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) cols.push({ x: s * (L.wallX - 0.42), z: -7 - 7 * k, w: 0.85 });
    for (const x of [-30.6, -22.8, -15]) for (const z of [-67, -75, -83]) cols.push({ x, z, w: 1.0 });
    cols.push({ x: 8.2, z: WALL_END - 0.4, w: 1.3 });
    const colMesh = new THREE.InstancedMesh(colGeo, shared.matBox, cols.length);
    const bandGeo = new THREE.BoxGeometry(1, 1, 1);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xa30d16, roughness: 0.55, emissive: 0x330005 });
    const bandMesh = new THREE.InstancedMesh(bandGeo, bandMat, cols.length);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd5dbe1, roughness: 0.6 });
    const capMesh = new THREE.InstancedMesh(bandGeo, capMat, cols.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    cols.forEach((c, i) => {
      const h = ceilH(c.z);
      m4.compose(p.set(c.x, floorY(c.z) + h / 2, c.z), q.identity(), sc.set(c.w, h, c.w));
      colMesh.setMatrixAt(i, m4);
      m4.compose(p.set(c.x, floorY(c.z) + 1.1, c.z), q.identity(), sc.set(c.w + 0.03, 0.22, c.w + 0.03));
      bandMesh.setMatrixAt(i, m4);
      m4.compose(p.set(c.x, floorY(c.z) + 0.42, c.z), q.identity(), sc.set(c.w + 0.03, 0.84, c.w + 0.03));
      capMesh.setMatrixAt(i, m4);
    });
    add(colMesh); add(bandMesh);
    // zócalo claro (efecto de pintura en la base de cada columna)
    capMesh.visible = false; // reservado: se enciende al sumar iluminación más fina

    const beamMat = shared.matBox.clone();
    beamMat.color.setHex(0x89929c);
    const beamZ = [...Array.from({ length: 8 }, (_, k) => -7 - 7 * k), -67, -75, -83];
    const beams = new THREE.InstancedMesh(boxUV(new THREE.BoxGeometry(1, 1, 1), 3), beamMat, beamZ.length);
    beamZ.forEach((z, i) => {
      const h = ceilH(z);
      const tilt = -Math.atan(slopeAt(z));
      const w = z > -62 ? 2 * L.wallX : X1 - X0;
      const cx = z > -62 ? 0 : (X1 + X0) / 2;
      m4.compose(p.set(cx, floorY(z) + h - 0.24, z), q.setFromEuler(new THREE.Euler(tilt, 0, 0)), sc.set(w, 0.5, 0.6));
      beams.setMatrixAt(i, m4);
    });
    add(beams);

    /* ---------- fluorescentes ---------- */
    const fx: Fixture[] = [];
    const pushFix = (x: number, z: number) => {
      // x/z reasignables para jitter

      const r = rnd();
      const state: 0 | 1 | 2 | 3 = r < 0.16 ? 0 : r < 0.3 ? 1 : r < 0.37 ? 2 : 3; // 0 apagado,1 tenue,2 parpadea,3 normal
      x += (rnd() - 0.5) * 0.3; z += (rnd() - 0.5) * 0.5;
      fx.push({ x, z, len: 2.6, state, y: floorY(z) + ceilH(z) - 0.2, tilt: -Math.atan(slopeAt(z)) });
    };
    for (let k = 0; k < 9; k++) for (const x of [-4, 4]) pushFix(x, -3.4 - 7 * k);
    for (const z of [-65, -72, -79, -86]) for (const x of [-30, -22, -14, -6, 2]) pushFix(x, z);
    fx.forEach((f, i) => { if (f.z > -20 && Math.abs(f.x) === 4) f.state = i % 5 === 0 ? 2 : 3; }); // entrada bien iluminada
    const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.08, 2.7), shared.matBlack, fx.length);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.05, 2.5), tubeMat, fx.length);
    tubes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(fx.length * 3), 3);
    fx.forEach((f, i) => {
      m4.compose(p.set(f.x, f.y, f.z), q.setFromEuler(new THREE.Euler(f.tilt, 0, 0)), sc.set(1, 1, 1));
      housing.setMatrixAt(i, m4);
      tubes.setMatrixAt(i, m4.setPosition(f.x, f.y - 0.055, f.z));
    });
    add(housing); add(tubes);
    const COOL = new THREE.Color(0xdfe8ef), WARM = new THREE.Color(0xffe6c0);
    const tint = fx.map(() => new THREE.Color().copy(COOL).lerp(WARM, rnd() < 0.3 ? 0.35 + rnd() * 0.5 : rnd() * 0.12));
    const tubeBase = fx.map((f) => (f.state === 0 ? 0.03 : f.state === 1 ? 0.3 : 1.7 + rnd() * 0.5));
    const setTube = (i: number, k: number) => tubes.setColorAt(i, new THREE.Color().copy(tint[i]).multiplyScalar(k));

    // charcos de luz sobre el piso y lavado en paredes
    const poolMat = new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xb4c4d8, 0.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolMat, fx.length);
    fx.forEach((f, i) => {
      const k = f.state === 0 ? 0 : f.state === 1 ? 0.45 : 1;
      m4.compose(p.set(f.x, floorY(f.z) + 0.02, f.z), q.setFromEuler(new THREE.Euler(-Math.PI / 2 - Math.atan(slopeAt(f.z)), 0, 0)), sc.set(9 * k, 12 * k, 1));
      pools.setMatrixAt(i, m4);
    });
    pools.renderOrder = 2;
    add(pools);
    const washMat = poolMat.clone();
    washMat.color = hdr(0xb4c4d8, 0.03);
    const washes: THREE.Matrix4[] = [];
    fx.forEach((f) => {
      if (f.z < -62 || f.state === 0) return;
      const s = f.x > 0 ? 1 : -1;
      const w = new THREE.Matrix4().compose(
        p.set(s * (L.wallX - 0.03), floorY(f.z) + 1.9, f.z),
        q.setFromEuler(new THREE.Euler(0, -s * Math.PI / 2, 0)),
        sc.set(8, 3.6, 1),
      );
      washes.push(w);
    });
    const washMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), washMat, washes.length);
    washes.forEach((w, i) => washMesh.setMatrixAt(i, w));
    washMesh.renderOrder = 2;
    add(washMesh);

    /* ---------- pintura en el piso ---------- */
    const white: THREE.BufferGeometry[] = [], red: THREE.BufferGeometry[] = [];
    for (let z = -9; z > -60; z -= 5) white.push(floorRibbon(-0.07, 0.07, z, z - 2.4)); // eje discontinuo
    for (const s of [-1, 1]) white.push(floorRibbon(s * 6.7, s * 6.88, -4, -62)); // bordes
    for (let z = -4, i = 0; z > -64; z -= 1.6, i++) { // zócalo rojo/blanco contra las paredes
      for (const s of [-1, 1]) (i % 2 ? white : red).push(floorRibbon(s > 0 ? 7.3 : -8, s > 0 ? 8 : -7.3, z, z - 1.6));
    }
    for (let x = -33.2 + 2.6; x < -8; x += 2.6) for (const z of [-64, -72, -80]) white.push(floorRibbon(x - 0.05, x + 0.05, z, z - 6));
    for (let x = -33.2 + 2.6; x < -8; x += 2.6) for (const z of [-64, -72, -80]) red.push(floorRibbon(x - 0.14, x + 0.14, z - 6.2, z - 6.5));
    white.push(floorRibbon(-8, 8, -62.2, -62.5)); // línea de fin de rampa
    add(new THREE.Mesh(merge(white), shared.matPaint));
    add(new THREE.Mesh(merge(red), shared.matPaintRed));
    const arrowTex = makeFloorArrow();
    const arrowMat = new THREE.MeshStandardMaterial({ map: arrowTex, transparent: true, alphaTest: 0.4, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    for (const z of [-14, -28, -42, -56]) for (const x of [-3.4, 3.4]) {
      add(new THREE.Mesh(floorRibbon(x - 0.6, x + 0.6, z, z - 2.6, 0.016, 0.6), arrowMat));
    }

    /* ---------- señalética ---------- */
    const panel = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, emissive = 0.85, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: hdr(0xffffff, emissive), toneMapped: false }));
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      add(m);
      return m;
    };
    const hang = (tex: THREE.Texture, w: number, h: number, x: number, z: number, drop = 0.9, emissive = 0.85) => {
      const yTop = floorY(z) + ceilH(z);
      const y = yTop - drop - h / 2;
      panel(tex, w, h, x, y, z, emissive);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.08), shared.matBlack);
      frame.position.set(x, y, z - 0.05);
      add(frame);
      for (const dx of [-w * 0.38, w * 0.38]) {
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.04, drop + 0.2, 0.04), shared.matMetal);
        rod.position.set(x + dx, yTop - drop / 2 - 0.1 + 0.05, z - 0.05);
        add(rod);
      }
    };
    hang(makeSign({ w: 1200, h: 420, bg: "#07090c", title: "NIVEL −1", sub: "RAMPA DE ACCESO  ·  ESTACIONAMIENTO", border: "#d1121b", arrow: "down" }), 4.6, 1.6, 0, -15, 0.7);
    hang(makeSpeedSign(), 1.5, 1.5, 3.9, -30, 0.6);
    hang(makeSign({ w: 900, h: 300, bg: "#07090c", title: "ALTURA MÁX 2,10 m", sub: "PROHIBIDO EL PASO DE VEHÍCULOS ALTOS", border: "#e8edf2" }), 3.6, 1.2, -3.9, -44, 0.6);
    // placas sobre pared derecha
    const wy = (z: number, h: number) => floorY(z) + h;
    panel(makeSign({ w: 800, h: 260, bg: "#07090c", title: "PEATONES", sub: "CIRCULAR POR LA VEREDA", border: "#d1121b", arrow: "right", tiny: "B1" }), 2.4, 0.78, L.wallX - 0.03, wy(-24, 2.0), -24, 1.0, -Math.PI / 2);
    panel(makeSign({ w: 800, h: 260, bg: "#d1121b", fg: "#ffffff", title: "SALIDA", sub: "EXIT", arrow: "up" }), 2.4, 0.78, L.wallX - 0.03, wy(-52, 2.3), -52, 1.3, -Math.PI / 2);
    // hall
    // flechas pintadas en el piso hacia el pasaje
    for (const x of [-1.5, 3.2]) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6).rotateX(-Math.PI / 2), arrowMat);
      g.add(m);
      g.rotation.y = -Math.PI / 2;
      g.position.set(x, floorY(-77) + 0.02, -77);
      add(g);
    }
    hang(makeSign({ w: 900, h: 300, bg: "#07090c", title: "RESERVADO", sub: "INVITADOS  ·  SECTOR A", border: "#e8edf2" }), 3.4, 1.15, -22, -72, 0.6, 0.75);
    hang(makeSign({ w: 900, h: 300, bg: "#07090c", title: "RESERVADO", sub: "INVITADOS  ·  SECTOR B", border: "#e8edf2" }), 3.4, 1.15, -22, -84, 0.6, 0.75);

    /* ---------- luces dinámicas que acompañan a la cámara ---------- */
    const follow: THREE.PointLight[] = [];
    const offs = [2, 9, 17, 27, 40].slice(0, quality.followLights);
    const base = [24, 20, 16, 13, 10];
    for (let i = 0; i < offs.length; i++) {
      const l = new THREE.PointLight(0xdfe8ef, 0, 20, 1.7);
      add(l); follow.push(l);
    }
    const hall = new THREE.HemisphereLight(0x46505e, 0x07080a, 0);
    add(hall);

    /* ---------- reflejos en piso mojado ---------- */
    const refl = new Reflections(shared.streak, fx.length + 4);
    add(refl.mesh);
    const reflCol = new THREE.Color(0xdfe8ef);
    const tmpPath = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
    const flickerState = fx.map(() => 1);
    let lastFlickerT = 0;

    return {
      group,
      update({ time, camera, rig, quality: qy, path }) {
        const inside = 1 - rig.outside;
        hall.intensity = 0.06 * (0.15 + 0.85 * inside) * rig.ambient;
        // luces que siguen a la cámara
        follow.forEach((l, i) => {
          path.at(Math.min(rig.dist + offs[i], path.length), tmpPath);
          l.position.set(tmpPath.pos.x, tmpPath.pos.y + 0.5 + (ceilH(tmpPath.pos.z) - 2.4) * 0.55, tmpPath.pos.z);
          l.intensity = base[i] * inside * rig.ambient;
        });
        // parpadeo de fluorescentes (sólo cada ~60 ms)
        if (time - lastFlickerT > 0.06) {
          lastFlickerT = time;
          for (let i = 0; i < fx.length; i++) {
            const f = fx[i];
            let k = tubeBase[i];
            if (f.state === 2 && !qy.reduced) {
              const r = Math.sin(time * 9 + i * 7.3) * Math.sin(time * 23 + i);
              k *= Math.sin(time * 0.9 + i * 3) > 0.55 ? (r > 0 ? 1 : 0.15) : 1;
            }
            flickerState[i] = k;
            setTube(i, k);
          }
          if (tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
        }

        // reflejos
        refl.begin();
        const cam = camera.position;
        for (let i = 0; i < fx.length; i++) {
          const f = fx[i];
          if (f.state === 0 || f.z > cam.z + 2) continue;
          const d = cam.z - f.z;
          if (d > 90) continue;
          const att = Math.exp(-Math.pow(d * 0.016, 2));
          refl.add(cam, f.x, f.y, f.z, floorY(f.z), 0.42, 2.8 + d * 0.05, reflCol, Math.min(0.25, flickerState[i] * 0.04) * att * inside);
        }
        refl.end();
      },
      timeline(tl, t) {
        const { rig } = t;
        // "descenso": la cabeza baja con la pendiente y el campo visual se abre con la velocidad
        tl.to(rig, { fov: 62, ease: "sine.inOut", duration: t.span(24, 60) }, t.at(24));
        tl.to(rig, { pitch: -0.045, ease: "sine.inOut", duration: t.span(24, 42) }, t.at(24));
        tl.to(rig, { pitch: 0.015, ease: "sine.inOut", duration: t.span(66, 84) }, t.at(66));
        tl.to(rig, { fov: 54, ease: "sine.inOut", duration: t.span(70, 95) }, t.at(70));
        tl.to(rig, { fog: 0.8, ease: "sine.inOut", duration: t.span(70, 95) }, t.at(70));
      },
      dispose() {
        disposeGroup(group);
        scene.remove(group);
      },
    };
  },
};
