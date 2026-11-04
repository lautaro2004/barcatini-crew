/**
 * Generadores sonoros procedurales ORIGINALES (placeholders). Sirven hasta que
 * se configure una pista propia/licenciada en audio.config.ts. No contienen ni
 * imitan literalmente ninguna obra protegida.
 */

const noiseBuffer = (ctx: AudioContext, seconds: number, pink = false) => {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (pink) {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
    } else d[i] = w;
  }
  return buf;
};

export interface Stoppable { stop: () => void }

/* ----------------------------- lluvia ----------------------------- */
export function createRain(ctx: AudioContext, out: AudioNode): Stoppable {
  const buf = noiseBuffer(ctx, 4, true);
  const loop = (hp: number, lp: number, g: number) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    const h = ctx.createBiquadFilter(); h.type = "highpass"; h.frequency.value = hp;
    const l = ctx.createBiquadFilter(); l.type = "lowpass"; l.frequency.value = lp;
    const gn = ctx.createGain(); gn.gain.value = g;
    s.connect(h).connect(l).connect(gn).connect(out);
    s.start(0, Math.random() * 3);
    return s;
  };
  const a = loop(700, 9000, 0.55); // manto de lluvia
  const b = loop(60, 420, 0.5); // cuerpo grave
  const c = loop(2500, 12000, 0.18); // brillo / gotas finas
  // gotas individuales
  const t = window.setInterval(() => {
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 5200; f.Q.value = 1.2;
      const g = ctx.createGain();
      const when = now + Math.random() * 0.12, v = 0.05 + Math.random() * 0.16;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(v, when + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0005, when + 0.03 + Math.random() * 0.03);
      s.connect(f).connect(g).connect(out);
      s.start(when, Math.random() * 3, 0.08);
    }
  }, 100);
  return { stop: () => { clearInterval(t); [a, b, c].forEach((s) => { try { s.stop(); } catch { /* ya detenido */ } }); } };
}

/* ------------------------ beat placeholder ------------------------ */
export function createTrack(ctx: AudioContext, out: AudioNode, bpm = 100): Stoppable {
  const white = noiseBuffer(ctx, 1);
  const sat = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; curve[i] = Math.tanh(x * 3.2); }
  sat.curve = curve;
  sat.connect(out);

  const kick808 = (t: number, f: number, len: number, v: number) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(sat);
    o.start(t); o.stop(t + len + 0.05);
  };
  const burst = (t: number, hp: number, bpF: number, dur: number, v: number) => {
    const s = ctx.createBufferSource(); s.buffer = white;
    const f = ctx.createBiquadFilter(); f.type = bpF ? "bandpass" : "highpass"; f.frequency.value = bpF || hp; f.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5, dur + 0.02);
  };
  const clap = (t: number) => { [0, 0.011, 0.023].forEach((d) => burst(t + d, 0, 1500, 0.05, 0.3)); burst(t + 0.03, 0, 1200, 0.16, 0.22); };
  const hat = (t: number, open: boolean, v: number) => burst(t, 7000, 0, open ? 0.22 : 0.035, v);
  const stab = (t: number, freq: number, dur: number) => {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 4;
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    [-9, 8].forEach((d) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    });
    f.connect(g).connect(out);
  };

  const step = 60 / bpm / 4;
  const roots = [43.65, 43.65, 34.65, 38.89]; // F1 F1 Db1 Eb1
  const mult = [1, 1, 0.794, 0.891];
  const riff: [number, number][] = [[0, 349.2], [3, 349.2], [6, 415.3], [8, 523.3], [11, 415.3], [14, 349.2]];
  let next = ctx.currentTime + 0.15, n = 0;

  const play = (k: number, t: number) => {
    const bar = Math.floor(k / 16) % 4, s = k % 16;
    if (s === 0) kick808(t, roots[bar], 0.9, 0.95);
    else if (s === 6 || s === 10 || (s === 13 && bar % 2 === 1)) kick808(t, roots[bar], 0.45, 0.8);
    if (s === 4 || s === 12) clap(t);
    if (s % 2 === 0) hat(t, false, s % 4 === 0 ? 0.11 : 0.07);
    if (s === 14) hat(t, true, 0.09);
    if (s === 7 || s === 15) hat(t, false, 0.04);
    for (const [rs, f] of riff) if (rs === s) stab(t, f * mult[bar], 0.22);
  };
  const timer = window.setInterval(() => {
    while (next < ctx.currentTime + 0.3) { play(n, next); next += step; n++; }
  }, 60);
  return { stop: () => clearInterval(timer) };
}

/* ------------------------------ SFX ------------------------------ */
export function playSfx(ctx: AudioContext, out: AudioNode, name: "whoosh" | "impact" | "riser", gain = 1) {
  const t = ctx.currentTime + 0.02;
  const white = noiseBuffer(ctx, 3);
  const g = ctx.createGain(); g.connect(out);
  const src = ctx.createBufferSource(); src.buffer = white;
  if (name === "whoosh" || name === "riser") {
    const dur = name === "whoosh" ? 1.6 : 3.2;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(name === "whoosh" ? 250 : 400, t);
    f.frequency.exponentialRampToValueAtTime(name === "whoosh" ? 3500 : 9000, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * gain, t + dur * (name === "whoosh" ? 0.45 : 0.98));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    src.connect(f).connect(g); src.start(t, 0, dur + 0.3);
  } else {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.9);
    g.gain.setValueAtTime(0.9 * gain, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6);
    o.connect(g); o.start(t); o.stop(t + 1.7);
    const nf = ctx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5 * gain, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    src.connect(nf).connect(ng).connect(out); src.start(t, 0, 0.8);
  }
}
