import { AUDIO_CONFIG as C, type Stage } from "./audio.config";
import { createRain, createTrack, playSfx, type Stoppable } from "./procedural";

type Listener = () => void;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Motor de audio. Singleton: sobrevive a re-montajes de React / cambios de
 * escena, así la canción NUNCA se reinicia por navegar. Sólo conoce el
 * "progreso" (setProgress); no sabe nada de las escenas visuales.
 *
 * Grafo:  rain  → rainLP → rainGain ─┐
 *         music → musicLP → musicGain ┴→ master → destination
 */
export class AudioEngine {
  private ctx?: AudioContext;
  private master!: GainNode;
  private rainGain!: GainNode;
  private rainLP!: BiquadFilterNode;
  private musicGain!: GainNode;
  private musicLP!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private started = false;
  private stoppers: Stoppable[] = [];
  private els: HTMLAudioElement[] = [];
  private raf = 0;
  private lastT = 0;
  private target = 0;
  private p = 0;
  private prevP = 0;
  private fired = new Set<number>();
  private on = false;
  private listeners = new Set<Listener>();
  private offTimer = 0;

  /* ---- estado observable (para el botón) ---- */
  subscribe = (l: Listener) => (this.listeners.add(l), () => this.listeners.delete(l));
  getSnapshot = () => this.on;
  private emit() { this.listeners.forEach((l) => l()); }

  /** El scroll sólo informa progreso; el resto es interno. */
  setProgress(p: number) { this.target = p; }

  async toggle() { return this.on ? this.disable() : this.enable(); }

  /** Debe llamarse desde un gesto explícito del usuario (click). */
  async enable() {
    if (this.on) return;
    clearTimeout(this.offTimer);
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    await ctx.resume();
    if (!this.started) this.startSources();
    this.els.forEach((e) => e.play().catch(() => undefined));
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(C.volumes.master, now + C.fade.in);
    this.on = true;
    this.p = this.target; this.prevP = this.target; this.lastT = 0;
    this.applyMix(true);
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  /** Detiene lluvia y música (el contexto se suspende: al reactivar, continúa donde quedó). */
  disable() {
    if (!this.on || !this.ctx) return;
    this.on = false;
    cancelAnimationFrame(this.raf);
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + C.fade.out);
    this.offTimer = window.setTimeout(() => {
      this.els.forEach((e) => e.pause());
      ctx.suspend();
    }, C.fade.out * 1000 + 60);
    this.emit();
  }

  /** Lectura de parámetros actuales (útil para ajustar la mezcla en consola: __barcatiniAudio.debug()). */
  debug() {
    if (!this.ctx) return null;
    return {
      on: this.on, p: +this.p.toFixed(3), state: this.ctx.state,
      rain: +this.rainGain.gain.value.toFixed(3), music: +this.musicGain.gain.value.toFixed(3),
      cutoffHz: Math.round(this.musicLP.frequency.value), rainCutoffHz: Math.round(this.rainLP.frequency.value),
    };
  }

  /** Efecto cinematográfico a demanda. */
  cue(name: "whoosh" | "impact" | "riser", gain = 1) {
    if (this.ctx && this.on) playSfx(this.ctx, this.sfxBus, name, gain);
  }

  /* ---------------------------- interno ---------------------------- */
  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    const lp = (f: number, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = "lowpass"; b.frequency.value = f; b.Q.value = q; return b; };
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    this.rainLP = lp(C.stages[0].rainCutoff);
    this.rainLP.connect(this.rainGain).connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0;
    this.musicLP = lp(C.stages[0].cutoff, C.filter.musicQ);
    this.musicLP.connect(this.musicGain).connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);
  }

  private startSources() {
    const ctx = this.ctx!;
    this.started = true;
    const file = (src: string, dest: AudioNode, fallback: () => Stoppable) => {
      const el = new Audio(src);
      el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
      try { ctx.createMediaElementSource(el).connect(dest); } catch { /* sin fuente */ }
      el.addEventListener("error", () => { this.stoppers.push(fallback()); }, { once: true });
      this.els.push(el);
    };
    const rainFallback = () => createRain(ctx, this.rainLP);
    const musicFallback = () => createTrack(ctx, this.musicLP, C.procedural.bpm);
    if (C.sources.rain) file(C.sources.rain, this.rainLP, rainFallback); else this.stoppers.push(rainFallback());
    if (C.sources.music) file(C.sources.music, this.musicLP, musicFallback); else this.stoppers.push(musicFallback());
  }

  private stageMix(p: number) {
    const st: Stage[] = C.stages;
    const cv = C.transitions.curve;
    let i = 0;
    while (i < st.length - 2 && p > st[i + 1].at) i++;
    const a = st[i], b = st[Math.min(i + 1, st.length - 1)];
    const raw = b.at === a.at ? 1 : Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at)));
    const sh = (k: number) => raw ** k;
    return {
      rain: lerp(a.rain, b.rain, sh(cv.rain)),
      music: lerp(a.music, b.music, sh(cv.music)),
      cutoff: Math.exp(lerp(Math.log(a.cutoff), Math.log(b.cutoff), sh(cv.cutoff))),
      rainCutoff: lerp(a.rainCutoff, b.rainCutoff, sh(cv.rain)),
    };
  }

  private applyMix(immediate = false) {
    if (!this.ctx) return;
    const m = this.stageMix(this.p);
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.01 : C.transitions.paramTime;
    this.rainGain.gain.setTargetAtTime(m.rain * C.volumes.rain, now, tc);
    this.musicGain.gain.setTargetAtTime(m.music * C.volumes.music, now, tc);
    this.musicLP.frequency.setTargetAtTime(m.cutoff, now, tc);
    this.rainLP.frequency.setTargetAtTime(m.rainCutoff, now, tc);
  }

  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0.016;
    this.lastT = t;
    this.p += (this.target - this.p) * (1 - Math.exp(-dt / C.transitions.smoothing));
    this.applyMix();
    // efectos: sólo al avanzar; se rearman al volver atrás
    C.sfx.forEach((c, i) => {
      if (this.prevP < c.at && this.p >= c.at && !this.fired.has(i)) { this.fired.add(i); this.cue(c.name, c.gain ?? 1); }
      if (this.p < c.at - 0.04) this.fired.delete(i);
    });
    this.prevP = this.p;
  };
}

export const audio = new AudioEngine();
if (typeof window !== "undefined") (window as unknown as { __barcatiniAudio: AudioEngine }).__barcatiniAudio = audio;
