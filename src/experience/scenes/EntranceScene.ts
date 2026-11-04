import * as THREE from "three";
import { L, floorY } from "../layout";
import { boxUV, planeUV, hdr, Reflections, disposeGroup } from "../geo";
import { makeBigP, makeSign, makeBarrierStripes } from "../textures";
import type { SceneInstance, SceneModule } from "../types";

/**
 * ESCENA 1 — LA ENTRADA
 * Fachada de hormigón, acceso de rampa, calle mojada, farolas, bolardos,
 * barrera levantada. Coreografía: se desvanece el título HTML, cae la
 * iluminación exterior (`rig.outside`) y la cámara empuja hacia la boca.
 */
export const EntranceScene: SceneModule = {
  id: "entrance",
  build({ scene, shared, quality }): SceneInstance {
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);
    const H = L.facadeH, OW = L.openW / 2, OH = L.openH;

    /* ---------- fachada ---------- */
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = shared.matBox) => {
      const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), 4), mat);
      m.position.set(x, y, z);
      return add(m);
    };
    const wallW = 60 - OW;
    box(wallW, H, 2, -(OW + wallW / 2), H / 2, -1);
    box(wallW, H, 2, OW + wallW / 2, H / 2, -1);
    box(L.openW, H - OH, 2, 0, OH + (H - OH) / 2, -1);
    box(130, 1.2, 3.2, 0, H + 0.6, -0.8, shared.matBox); // cornisa
    // viga frontal que enmarca la boca
    box(L.openW + 1.2, 0.5, 0.5, 0, OH + 0.25, 0.25, shared.matBlack);
    // cintas luminosas: rojo (acento) y blanco frío
    const redStrip = add(new THREE.Mesh(new THREE.BoxGeometry(L.openW + 1.2, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: hdr(0xff1a28, 3.2), toneMapped: false })));
    redStrip.position.set(0, OH - 0.1, 0.55);
    const whiteStrip = add(new THREE.Mesh(new THREE.BoxGeometry(L.openW + 1.2, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: hdr(0xcfe4ff, 3), toneMapped: false })));
    whiteStrip.position.set(0, OH + 0.55, 0.55);

    // aletas verticales (ritmo industrial)
    const finGeo = new THREE.BoxGeometry(0.28, H - 1.2, 0.5);
    const fins: number[] = [];
    for (let x = -58; x <= 58; x += 2.4) if (Math.abs(x) > OW + 0.6) fins.push(x);
    const finMesh = new THREE.InstancedMesh(finGeo, shared.matBlack, fins.length);
    fins.forEach((x, i) => finMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, (H - 1.2) / 2 + 0.2, 0.25)));
    add(finMesh);

    // ventanas-ranura cian tenues arriba
    const slitMat = new THREE.MeshBasicMaterial({ color: hdr(0x7fb2ff, 0.55), toneMapped: false });
    for (const y of [8.4, 9.6])
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.22), slitMat);
        m.position.set(s * 32, y, 0.52);
        add(m);
      }

    /* ---------- señalética luminosa ---------- */
    const signP = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), new THREE.MeshBasicMaterial({ map: makeBigP(), color: hdr(0xffffff, 1.5), toneMapped: false }));
    signP.position.set(-12.6, 6.5, 0.56);
    add(signP);
    const enter = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeSign({ w: 1040, h: 300, bg: "#06080b", title: "ENTRADA", sub: "TORTUGAS OPEN MALL  ·  NIVEL −1", border: "#d1121b", arrow: "down" }),
        color: hdr(0xffffff, 1.4), toneMapped: false,
      }),
    );
    enter.position.set(12.6, 6.5, 0.56);
    add(enter);

    /* ---------- calle / acera ---------- */
    const road = new THREE.Mesh(planeUV(new THREE.PlaneGeometry(2 * 9, 90), 6), shared.matStreet);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 45);
    add(road);
    const walkMat = new THREE.MeshStandardMaterial({ map: shared.concrete.map, bumpMap: shared.concrete.bump, color: 0x6b737c, roughness: 0.8 });
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(boxUV(new THREE.BoxGeometry(60, 0.15, 90), 4), walkMat);
      w.position.set(s * (9 + 30), 0.075, 45);
      add(w);
    }
    // tramo exterior hasta fusionar con el piso interior
    // líneas de calle
    const paint = shared.matPaint;
    const dashGeo = new THREE.PlaneGeometry(0.16, 2.2);
    const dashes: THREE.Matrix4[] = [];
    for (let z = 3; z < 70; z += 5) dashes.push(new THREE.Matrix4().makeTranslation(0, 0.012, z));
    const dashMesh = new THREE.InstancedMesh(dashGeo.rotateX(-Math.PI / 2), paint, dashes.length);
    dashes.forEach((m, i) => dashMesh.setMatrixAt(i, m));
    add(dashMesh);
    // cebra
    const zebraGeo = new THREE.PlaneGeometry(0.55, 3.4).rotateX(-Math.PI / 2);
    const zebra = new THREE.InstancedMesh(zebraGeo, paint, 15);
    for (let i = 0; i < 15; i++) zebra.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-7.7 + i * 1.1, 0.013, 10.5));
    add(zebra);
    // línea de frenado + bordes rojos/blancos de acera
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 0.35).rotateX(-Math.PI / 2), paint);
    stop.position.set(0, 0.013, 5.2);
    add(stop);
    const curbGeo = new THREE.BoxGeometry(0.2, 0.16, 1.6);
    const curbRed = new THREE.MeshStandardMaterial({ color: 0xb30f18, roughness: 0.6 });
    const curbWhite = new THREE.MeshStandardMaterial({ color: 0xcdd4da, roughness: 0.6 });
    const curbsA = new THREE.InstancedMesh(curbGeo, curbRed, 40);
    const curbsB = new THREE.InstancedMesh(curbGeo, curbWhite, 40);
    let ia = 0, ib = 0;
    for (let k = 0; k < 40; k++)
      for (const s of [-1, 1]) {
        const m = new THREE.Matrix4().makeTranslation(s * 9.1, 0.08, 1 + k * 1.7);
        if (k % 2) { if (ib < 40) curbsB.setMatrixAt(ib++, m); } else if (ia < 40) curbsA.setMatrixAt(ia++, m);
      }
    curbsA.count = ia; curbsB.count = ib;
    add(curbsA); add(curbsB);

    /* ---------- mobiliario ---------- */
    // bolardos
    const bolGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.95, 12);
    const bandGeo = new THREE.CylinderGeometry(0.118, 0.118, 0.1, 12);
    const bandMat = new THREE.MeshBasicMaterial({ color: hdr(0xff2230, 1.6), toneMapped: false });
    for (const x of [-15, -13, -11, 11, 13, 15]) {
      const b = new THREE.Mesh(bolGeo, shared.matMetal);
      b.position.set(x, 0.15 + 0.475, 3.2);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(x, 0.15 + 0.78, 3.2);
      add(b); add(band);
    }
    // barrera levantada
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 0.45), shared.matBlack);
    post.position.set(-7.2, 0.575, 4.2);
    add(post);
    const stripes = makeBarrierStripes();
    stripes.repeat.set(1, 1);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.11, 0.11), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 }));
    const pivot = new THREE.Group();
    pivot.position.set(-7.2, 1.0, 4.2);
    arm.position.x = 3.2;
    pivot.rotation.z = 1.2;
    pivot.add(arm);
    add(pivot);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: hdr(0xff1a28, 4), toneMapped: false }));
    led.position.set(-7.2, 1.2, 4.42);
    add(led);
    // garita
    const booth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 2.2), shared.matMetal);
    booth.position.set(8.3, 1.4, 4.2);
    add(booth);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.8), new THREE.MeshBasicMaterial({ color: hdr(0xbfe0ff, 1.5), toneMapped: false }));
    win.position.set(7.39, 1.8, 4.2);
    win.rotation.y = -Math.PI / 2;
    add(win);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 3), shared.matBlack);
    roof.position.set(8.3, 2.7, 4.2);
    add(roof);

    /* ---------- farolas ---------- */
    const lamps = [
      { x: -10.8, z: 22, warm: true },
      { x: 10.8, z: 36, warm: true },
      { x: -10.8, z: 50, warm: false },
    ];
    const lampLights: THREE.PointLight[] = [];
    for (const l of lamps) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 8), shared.matMetal);
      pole.position.set(l.x, 4.15, l.z);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), shared.matMetal);
      const dir = l.x < 0 ? 1 : -1;
      arm2.position.set(l.x + dir * 0.9, 8.1, l.z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.35), new THREE.MeshBasicMaterial({ color: hdr(l.warm ? 0xffb066 : 0xcfe0ff, 5), toneMapped: false }));
      head.position.set(l.x + dir * 1.7, 8.0, l.z);
      add(pole); add(arm2); add(head);
      if (quality.low ? l === lamps[0] : l.z < 40) {
        const pl = new THREE.PointLight(l.warm ? 0xffa458 : 0xbcd4ff, 0, 38, 1.6);
        pl.position.set(l.x + dir * 1.7, 7.7, l.z);
        add(pl);
        lampLights.push(pl);
      }
    }

    /* ---------- luces de acento sobre la fachada ---------- */
    const uplights: THREE.SpotLight[] = [];
    for (const x of [-10.5, -15, 10.5, 15]) {
      const s = new THREE.SpotLight(0xcfe0ff, 0, 22, 0.55, 0.9, 1.2);
      s.position.set(x, 0.12, 2.2);
      s.target.position.set(x * 1.05, 9, -1);
      add(s); add(s.target);
      uplights.push(s);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: hdr(0xcfe6ff, 3), toneMapped: false }));
      lens.position.set(x, 0.1, 2.2);
      add(lens);
    }
    const moon = new THREE.DirectionalLight(0x7da2ff, 0);
    moon.position.set(-18, 34, 46);
    moon.target.position.set(0, 0, 0);
    add(moon); add(moon.target);
    const hemi = new THREE.HemisphereLight(0x2a4a86, 0x07090d, 0);
    add(hemi);

    // brillos de suelo
    const glowMat = new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xa8bcd8, 0.18), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(46, 8), glowMat);
    wash.rotation.x = -Math.PI / 2;
    wash.position.set(0, 0.03, 4.5);
    add(wash);
    const mouthGlow = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xbcd7ff, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    mouthGlow.rotation.x = -Math.PI / 2;
    mouthGlow.position.set(0, 0.035, -3);
    add(mouthGlow);
    const lampGlow = new THREE.MeshBasicMaterial({ map: shared.glow, color: hdr(0xffa458, 0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const l of lamps) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), lampGlow);
      m.rotation.x = -Math.PI / 2;
      m.position.set(l.x * 0.5, 0.04, l.z);
      add(m);
    }

    /* ---------- lluvia fina (shader, un solo draw call) ---------- */
    const N = quality.low ? 700 : 1800;
    const rpos = new Float32Array(N * 6), rend = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 14, z = -2 + Math.random() * 40;
      rpos.set([x, y, z, x, y, z], i * 6);
      rend[i * 2] = 0; rend[i * 2 + 1] = 1;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
    rainGeo.setAttribute("aEnd", new THREE.BufferAttribute(rend, 1));
    const rainMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 1 } },
      vertexShader: `
        uniform float uTime; attribute float aEnd; varying float vA;
        void main(){
          vec3 p = position;
          float spd = 11.0 + fract(p.x*13.7)*4.0;
          p.y = mod(p.y - uTime*spd, 14.0);
          p.x += (p.y)*0.06;
          p.y += aEnd*0.55;
          p.x += aEnd*0.04;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          vA = smoothstep(2.0, 6.0, -mv.z) * (1.0 - smoothstep(25.0, 42.0, -mv.z));
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `uniform float uAmt; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55,0.7,1.0)*0.5, 0.35*vA*uAmt); }`,
    });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    add(rain);

    /* ---------- reflejos en calle mojada ---------- */
    const refl = new Reflections(shared.streak, 12);
    add(refl.mesh);
    const reflPos = new THREE.Vector3();
    const lampCols = lamps.map((l) => hdr(l.warm ? 0xffa458 : 0xcfe0ff, 1));
    const coolCol = hdr(0xcfe0ff, 1);
    const redCol = hdr(0xff2230, 1);

    const lampFlicker = { v: 1 };
    void floorY;

    return {
      group,
      update({ time, camera, rig, quality: q }) {
        const o = rig.outside;
        hemi.intensity = 0.28 * o;
        moon.intensity = 1.1 * o;
        uplights.forEach((s) => (s.intensity = 120 * o));
        lampLights.forEach((p, i) => (p.intensity = 150 * o * (i === 1 ? lampFlicker.v : 1)));
        glowMat.opacity = o; lampGlow.opacity = o; mouthGlow.material.opacity = 0.7;
        wash.visible = lampGlow.visible = o > 0.01;
        rainMat.uniforms.uTime.value = q.reduced ? 0 : time;
        rainMat.uniforms.uAmt.value = q.reduced ? 0 : o;
        rain.visible = o > 0.02;
        lampFlicker.v = q.reduced ? 1 : 0.82 + 0.18 * Math.sin(time * 37) * Math.sin(time * 11.3) + (Math.sin(time * 3.1) > 0.97 ? -0.5 : 0);
        redStrip.visible = true;

        refl.begin();
        const cam = camera.position;
        if (cam.z > -4) {
          lamps.forEach((l, i) => {
            reflPos.set(l.x + (l.x < 0 ? 1.7 : -1.7), 8, l.z);
            refl.add(cam, reflPos.x, reflPos.y, reflPos.z, 0, 0.5, 9, lampCols[i], 0.55 * o);
          });
          refl.add(cam, 0, OH - 0.1, 0.55, 0, 13, 0.35, redCol, 0.08 * o);
          refl.add(cam, 0, OH + 0.55, 0.55, 0, 13, 0.3, coolCol, 0.07 * o);
          refl.add(cam, -12.6, 6.5, 0.5, 0, 2.2, 6, coolCol, 0.35 * o);
          refl.add(cam, 12.6, 6.5, 0.5, 0, 3.4, 5, coolCol, 0.3 * o);
        }
        refl.end();
      },
      timeline(tl, t) {
        const { rig } = t;
        const title = t.q("[data-title]");
        const hint = t.q("[data-hint]");
        const meta = t.q("[data-meta]");
        const T0 = t.at(0);
        // título: se desvanece y "se queda atrás" mientras la cámara avanza
        if (title) tl.to(title, { opacity: 0, scale: 1.16, yPercent: -6, filter: "blur(14px)", ease: "power1.in", duration: t.span(0, 15) }, T0);
        if (meta) tl.to(meta, { opacity: 0, duration: t.span(0, 9) }, T0);
        if (hint) tl.to(hint, { opacity: 0, yPercent: 60, duration: t.span(0, 2.5) }, T0);
        // la cámara se comprime levemente hacia la boca
        tl.to(rig, { fov: 50, ease: "sine.inOut", duration: t.span(0, 24) }, T0);
        // adentro: se apaga la noche exterior
        tl.to(rig, { outside: 0, ease: "sine.inOut", duration: t.span(14, 40) }, t.at(14));
        tl.to(rig, { exposure: 0.74, bloom: 0.3, ease: "sine.inOut", duration: t.span(14, 44) }, t.at(14));
      },
      dispose() {
        disposeGroup(group);
        scene.remove(group);
      },
    };
  },
};
