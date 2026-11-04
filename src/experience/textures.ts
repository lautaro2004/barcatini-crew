import * as THREE from "three";
import { mulberry } from "./layout";
import type { MarkKind } from "../config";

type Ctx = CanvasRenderingContext2D;
const canvas = (w: number, h: number): [HTMLCanvasElement, Ctx] => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
};

const tex = (c: HTMLCanvasElement, srgb = true, repeat = false) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  return t;
};

/** dibuja `fn` 9 veces con desplazamientos para que la textura sea seamless */
const wrap = (size: number, fn: (dx: number, dy: number) => void) => {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) fn(dx, dy);
};

export function makeConcrete(seed = 1) {
  const S = 1024;
  const r = mulberry(seed);
  const [c, x] = canvas(S, S);
  x.fillStyle = "#7c7b78";
  x.fillRect(0, 0, S, S);
  // grano fino
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 1.05;
  }
  x.putImageData(img, 0, 0);
  // manchas grandes
  for (let i = 0; i < 70; i++) {
    const px = r() * S, py = r() * S, rad = 40 + r() * 220;
    const dark = r() < 0.6;
    wrap(S, (dx, dy) => {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      g.addColorStop(0, dark ? "rgba(20,24,30,0.13)" : "rgba(190,196,204,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
    });
  }
  // chorreaduras verticales
  for (let i = 0; i < 46; i++) {
    const px = r() * S, w = 2 + r() * 16, h = 120 + r() * 520, py = r() * S;
    wrap(S, (dx, dy) => {
      const g = x.createLinearGradient(0, py + dy, 0, py + dy + h);
      g.addColorStop(0, `rgba(10,14,20,${0.12 + r() * 0.1})`);
      g.addColorStop(1, "rgba(10,14,20,0)");
      x.fillStyle = g;
      x.fillRect(px + dx, py + dy, w, h);
    });
  }
  // juntas de encofrado + agujeros de tensores
  x.fillStyle = "rgba(15,15,15,0.32)";
  for (const p of [0, S / 2]) {
    x.fillRect(p - 1.5, 0, 3, S);
    x.fillRect(0, p - 1.5, S, 3);
  }
  for (let ix = 0; ix < 4; ix++)
    for (let iy = 0; iy < 4; iy++) {
      const cx = S / 8 + (ix * S) / 4, cy = S / 8 + (iy * S) / 4;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, 11);
      g.addColorStop(0, "rgba(20,20,20,0.5)");
      g.addColorStop(0.55, "rgba(20,20,20,0.38)");
      g.addColorStop(1, "rgba(170,170,165,0.12)");
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, 11, 0, 7);
      x.fill();
    }
  return { map: tex(c, true, true), bump: tex(c, false, true) };
}

export function makeAsphalt(seed = 2, wet = true) {
  const S = 1024;
  const r = mulberry(seed);
  const [c, x] = canvas(S, S);
  x.fillStyle = "#26292e";
  x.fillRect(0, 0, S, S);
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 44 + (r() < 0.04 ? 30 : 0);
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 1.08;
  }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 26; i++) {
    const px = r() * S, py = r() * S, rad = 50 + r() * 170;
    wrap(S, (dx, dy) => {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      g.addColorStop(0, "rgba(0,0,0,0.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
    });
  }
  x.strokeStyle = "rgba(0,0,0,0.5)";
  x.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    let px = r() * S, py = r() * S;
    x.beginPath();
    x.moveTo(px, py);
    for (let k = 0; k < 14; k++) {
      px += (r() - 0.5) * 70;
      py += (r() - 0.3) * 60;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  // mapa de rugosidad: charcos (oscuro = brillante)
  const [rc, rx] = canvas(S, S);
  rx.fillStyle = wet ? "rgb(178,178,178)" : "rgb(215,215,215)";
  rx.fillRect(0, 0, S, S);
  const rimg = rx.getImageData(0, 0, S, S);
  for (let i = 0; i < rimg.data.length; i += 4) {
    const n = (r() - 0.5) * 50;
    rimg.data[i] += n; rimg.data[i + 1] += n; rimg.data[i + 2] += n;
  }
  rx.putImageData(rimg, 0, 0);
  if (wet)
    for (let i = 0; i < 22; i++) {
      const px = r() * S, py = r() * S, rad = 40 + r() * 190;
      wrap(S, (dx, dy) => {
        const g = rx.createRadialGradient(px + dx, py + dy, rad * 0.2, px + dx, py + dy, rad);
        g.addColorStop(0, "rgba(100,100,100,0.7)");
        g.addColorStop(1, "rgba(100,100,100,0)");
        rx.fillStyle = g;
        rx.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
      });
    }
  return { map: tex(c, true, true), rough: tex(rc, false, true), bump: tex(c, false, true) };
}

/** gradiente radial blanco → transparente para charcos de luz / glows */
export function makeGlow(inner = 0.0, soft = 2) {
  const [c, x] = canvas(256, 256);
  const g = x.createRadialGradient(128, 128, inner * 128, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  void soft;
  return tex(c, true);
}

/** barra alargada con caída en ambos extremos (reflejo de tubo fluorescente) */
export function makeStreak() {
  const [c, x] = canvas(64, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 256);
  const h = x.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, "rgba(0,0,0,1)");
  h.addColorStop(0.5, "rgba(0,0,0,0)");
  h.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out";
  x.fillStyle = h;
  x.fillRect(0, 0, 64, 256);
  return tex(c, true);
}

/** losa casetonada (waffle slab): una celda por tile */
export function makeCoffer(seed = 5) {
  const S = 512;
  const r = mulberry(seed);
  const [c, x] = canvas(S, S);
  const [b, y] = canvas(S, S);
  x.fillStyle = "#7b7b78"; x.fillRect(0, 0, S, S);
  y.fillStyle = "#d0d0d0"; y.fillRect(0, 0, S, S);
  const m = 58;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    x.fillStyle = `rgb(${Math.round(70 - 26 * (1 - t))},${Math.round(70 - 26 * (1 - t))},${Math.round(68 - 26 * (1 - t))})`;
    x.fillRect(m + i, m + i, S - 2 * (m + i), S - 2 * (m + i));
    const v = Math.round(40 + 110 * t * t);
    y.fillStyle = `rgb(${v},${v},${v})`;
    y.fillRect(m + i, m + i, S - 2 * (m + i), S - 2 * (m + i));
  }
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 30;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 14; i++) {
    const px = r() * S, py = r() * S, rad = 30 + r() * 120;
    wrap(S, (dx, dy) => {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      g.addColorStop(0, r() < 0.7 ? "rgba(15,15,15,0.16)" : "rgba(210,210,205,0.08)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
    });
  }
  return { map: tex(c, true, true), bump: tex(b, false, true) };
}

/* ---------------------------- señalética ---------------------------- */

const FONT_D = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const FONT_T = '"Chakra Petch", "Arial", sans-serif';

export const loadFonts = async () => {
  try {
    // tipografía de aerosol (grafiti). Archivo propio en /public/fonts (OFL), sin dependencias.
    if (!document.fonts.check('40px "Rubik Spray Paint"')) {
      const f = new FontFace("Rubik Spray Paint", "url(/fonts/rubik-spray-paint.woff2)");
      document.fonts.add(await f.load());
    }
  } catch {
    /* sin grafiti tipográfico: usa la fuente de respaldo */
  }
  try {
    await Promise.all([
      document.fonts.load(`900 120px "Big Shoulders Display"`),
      document.fonts.load(`700 120px "Big Shoulders Display"`),
      document.fonts.load(`600 60px "Chakra Petch"`),
      document.fonts.load(`700 60px "Chakra Petch"`),
    ]);
  } catch {
    /* fuentes de respaldo */
  }
};

const arrow = (x: Ctx, cx: number, cy: number, s: number, dir: "up" | "down" | "left" | "right") => {
  x.save();
  x.translate(cx, cy);
  x.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
  x.beginPath();
  x.moveTo(0, -s);
  x.lineTo(s * 0.8, -s * 0.05);
  x.lineTo(s * 0.32, -s * 0.05);
  x.lineTo(s * 0.32, s);
  x.lineTo(-s * 0.32, s);
  x.lineTo(-s * 0.32, -s * 0.05);
  x.lineTo(-s * 0.8, -s * 0.05);
  x.closePath();
  x.fill();
  x.restore();
};

export interface SignOpts {
  w: number;
  h: number;
  bg?: string;
  fg?: string;
  border?: string;
  title: string;
  sub?: string;
  arrow?: "up" | "down" | "left" | "right";
  tiny?: string;
  transparent?: boolean;
}

export function makeSign(o: SignOpts) {
  const [c, x] = canvas(o.w, o.h);
  if (!o.transparent) {
    x.fillStyle = o.bg ?? "#0b0d11";
    x.fillRect(0, 0, o.w, o.h);
  }
  if (o.border) {
    x.strokeStyle = o.border;
    x.lineWidth = Math.max(6, o.h * 0.035);
    const m = x.lineWidth * 1.6;
    x.strokeRect(m, m, o.w - m * 2, o.h - m * 2);
  }
  x.fillStyle = o.fg ?? "#eef3f8";
  x.textBaseline = "middle";
  const pad = o.w * 0.06;
  const aw = o.arrow ? o.h * 0.5 : 0;
  x.textAlign = "left";
  const tx = pad + (o.arrow && (o.arrow === "left" || o.arrow === "down" || o.arrow === "up") ? aw * 1.2 : 0);
  const fs = o.h * (o.sub ? 0.46 : 0.58);
  x.font = `900 ${fs}px ${FONT_D}`;
  x.fillText(o.title, tx, o.h * (o.sub ? 0.4 : 0.52));
  if (o.sub) {
    x.font = `600 ${o.h * 0.15}px ${FONT_T}`;
    x.globalAlpha = 0.8;
    // tracking manual
    let px = tx;
    for (const ch of o.sub) {
      x.fillText(ch, px, o.h * 0.76);
      px += x.measureText(ch).width + o.h * 0.03;
    }
    x.globalAlpha = 1;
  }
  if (o.arrow) {
    const ax = o.arrow === "right" ? o.w - pad - aw * 0.6 : pad + aw * 0.6;
    arrow(x, ax, o.h / 2, o.h * 0.26, o.arrow);
  }
  if (o.tiny) {
    x.font = `600 ${o.h * 0.085}px ${FONT_T}`;
    x.textAlign = "right";
    x.globalAlpha = 0.55;
    x.fillText(o.tiny, o.w - pad, o.h * 0.9);
    x.globalAlpha = 1;
  }
  return tex(c);
}

export function makeSpeedSign() {
  const [c, x] = canvas(512, 512);
  x.fillStyle = "#e8edf2";
  x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
  x.strokeStyle = "#d1121b"; x.lineWidth = 46;
  x.beginPath(); x.arc(256, 256, 205, 0, 7); x.stroke();
  x.fillStyle = "#0b0d11"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `900 250px ${FONT_D}`; x.fillText("10", 256, 270);
  x.font = `700 44px ${FONT_T}`; x.fillText("km/h", 256, 400);
  return tex(c);
}

export function makeBigP() {
  const [c, x] = canvas(512, 512);
  x.fillStyle = "#06080b";
  x.fillRect(0, 0, 512, 512);
  x.strokeStyle = "#e6edf3"; x.lineWidth = 14;
  x.strokeRect(30, 30, 452, 452);
  x.fillStyle = "#f2f6fa"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `900 440px ${FONT_D}`; x.fillText("P", 256, 280);
  x.fillStyle = "#d1121b"; x.fillRect(30, 452, 452, 30);
  return tex(c);
}

export function makeBarrierStripes() {
  const [c, x] = canvas(512, 32);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? "#e9eef2" : "#c4121a";
    x.fillRect(i * 64, 0, 64, 32);
  }
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** flecha pintada en el piso */
export function makeFloorArrow() {
  const [c, x] = canvas(256, 512);
  x.fillStyle = "#e8edf2";
  arrow(x, 128, 256, 200, "up");
  return tex(c);
}

export function makeFloorText(text: string, w = 512, h = 256) {
  const [c, x] = canvas(w, h);
  x.fillStyle = "#e8edf2"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `900 ${h * 0.8}px ${FONT_D}`;
  x.fillText(text, w / 2, h / 2);
  return tex(c);
}

/* ---------------------------- sponsors ---------------------------- */

function drawMark(x: Ctx, kind: MarkKind, cx: number, cy: number, s: number) {
  x.save();
  x.translate(cx, cy);
  x.lineJoin = "miter";
  switch (kind) {
    case "chevron":
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.moveTo(-s, -s * 0.5 + i * s * 0.55);
        x.lineTo(0, s * 0.1 + i * s * 0.55 - s * 0.55);
        x.lineTo(s, -s * 0.5 + i * s * 0.55);
        x.lineTo(s, -s * 0.2 + i * s * 0.55);
        x.lineTo(0, s * 0.4 + i * s * 0.55 - s * 0.55);
        x.lineTo(-s, -s * 0.2 + i * s * 0.55);
        x.closePath();
        x.fill();
      }
      break;
    case "ring":
      x.lineWidth = s * 0.28;
      x.beginPath(); x.arc(0, 0, s * 0.8, 0, 7); x.stroke();
      x.beginPath(); x.arc(0, 0, s * 0.3, 0, 7); x.fill();
      break;
    case "slash":
      for (let i = -1; i <= 1; i++) {
        x.beginPath();
        x.moveTo(i * s * 0.55 - s * 0.3, s);
        x.lineTo(i * s * 0.55 + s * 0.15, -s);
        x.lineTo(i * s * 0.55 + s * 0.5, -s);
        x.lineTo(i * s * 0.55 + s * 0.05, s);
        x.fill();
      }
      break;
    case "hex":
      x.beginPath();
      for (let i = 0; i < 6; i++) x.lineTo(Math.cos((i * Math.PI) / 3) * s, Math.sin((i * Math.PI) / 3) * s);
      x.closePath(); x.lineWidth = s * 0.25; x.stroke();
      x.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s);
      break;
    case "wheel":
      x.lineWidth = s * 0.2;
      x.beginPath(); x.arc(0, 0, s * 0.85, 0, 7); x.stroke();
      for (let i = 0; i < 5; i++) {
        x.rotate((Math.PI * 2) / 5);
        x.fillRect(-s * 0.08, 0, s * 0.16, s * 0.8);
      }
      break;
    case "bolt":
      x.beginPath();
      x.moveTo(s * 0.2, -s); x.lineTo(-s * 0.7, s * 0.15); x.lineTo(-s * 0.05, s * 0.15);
      x.lineTo(-s * 0.3, s); x.lineTo(s * 0.75, -s * 0.25); x.lineTo(s * 0.1, -s * 0.25);
      x.closePath(); x.fill();
      break;
    case "bars":
      for (let i = 0; i < 5; i++) x.fillRect(-s + i * s * 0.42, -s * (0.35 + 0.16 * i), s * 0.28, s * (0.7 + 0.32 * i));
      break;
    case "diamond":
      x.beginPath(); x.moveTo(0, -s); x.lineTo(s, 0); x.lineTo(0, s); x.lineTo(-s, 0); x.closePath();
      x.lineWidth = s * 0.22; x.stroke();
      x.beginPath(); x.moveTo(0, -s * 0.35); x.lineTo(s * 0.35, 0); x.lineTo(0, s * 0.35); x.lineTo(-s * 0.35, 0); x.fill();
      break;
    case "arc":
      x.lineWidth = s * 0.26;
      for (let i = 0; i < 3; i++) {
        x.beginPath(); x.arc(-s * 0.4, s * 0.6, s * (0.5 + i * 0.5), -Math.PI * 0.45, 0.05); x.stroke();
      }
      break;
  }
  x.restore();
}

export interface SponsorStyle {
  bg: string;
  fg: string;
  accent: string;
}

/** Placeholder de un sponsor; si hay `image` se compone encima cuando carga. */
export function makeSponsorTexture(
  label: string,
  mark: MarkKind,
  w: number,
  h: number,
  style: SponsorStyle,
  image?: string,
) {
  const [c, x] = canvas(w, h);
  const t = tex(c);
  const draw = (img?: HTMLImageElement) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = style.bg;
    x.fillRect(0, 0, w, h);
    // trama diagonal sutil de "slot vacío"
    x.save();
    x.strokeStyle = style.fg;
    x.globalAlpha = 0.05;
    x.lineWidth = 2;
    for (let i = -h; i < w; i += 22) {
      x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke();
    }
    x.restore();
    x.fillStyle = style.accent;
    x.fillRect(0, h - h * 0.045, w, h * 0.045);
    if (img) {
      const pad = h * 0.14;
      const s = Math.min((w - pad * 2) / img.width, (h - pad * 2) / img.height);
      x.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      const wide = w / h > 1.8;
      const ms = h * (wide ? 0.27 : 0.2);
      x.fillStyle = style.fg; x.strokeStyle = style.fg;
      drawMark(x, mark, wide ? w * 0.2 : w / 2, wide ? h * 0.5 : h * 0.4, ms);
      x.textBaseline = "middle";
      x.textAlign = wide ? "left" : "center";
      x.fillStyle = style.fg;
      const lx = wide ? w * 0.2 + ms * 1.7 : w / 2;
      const ly = wide ? h * 0.44 : h * 0.74;
      x.font = `900 ${h * (wide ? 0.25 : 0.17)}px ${FONT_D}`;
      x.fillText(label, lx, ly);
      x.font = `600 ${h * (wide ? 0.07 : 0.06)}px ${FONT_T}`;
      x.globalAlpha = 0.65;
      x.fillText("TU MARCA AQUÍ", lx, ly + h * (wide ? 0.2 : 0.12));
      x.globalAlpha = 1;
    }
    t.needsUpdate = true;
  };
  draw();
  if (image) {
    const img = new Image();
    img.onload = () => draw(img);
    img.src = image;
  }
  return t;
}

export function makeRedNeon(text: string) {
  const [c, x] = canvas(1400, 160);
  x.textBaseline = "middle"; x.textAlign = "left";
  x.font = `900 120px ${FONT_D}`;
  let px = 20;
  for (const ch of text) {
    x.fillStyle = "#ff2a35";
    x.fillText(ch, px, 84);
    px += x.measureText(ch).width + 10;
  }
  return tex(c);
}


/** Grafiti de pared: aerosol con halo, contorno, gotas y salpicado. */
export function makeGraffiti(lines: { text: string; color: string }[], w = 2048, h = 1024) {
  const [c, x] = canvas(w, h);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  const fs = h * 0.27;
  x.font = `400 ${fs}px "Rubik Spray Paint", ${FONT_D}`;
  const lh = fs * 1.02;
  const y0 = h * 0.5 - ((lines.length - 1) * lh) / 2 + fs * 0.3;
  x.save();
  x.translate(w / 2, h / 2);
  x.rotate(-0.035);
  x.translate(-w / 2, -h / 2);
  lines.forEach((l, i) => {
    const y = y0 + i * lh + (i % 2 ? 6 : -4);
    const jx = w / 2 + (i === 1 ? 18 : i === 2 ? -14 : 0);
    // halo de aerosol
    x.shadowColor = l.color; x.shadowBlur = 26;
    x.fillStyle = l.color; x.globalAlpha = 0.55;
    x.fillText(l.text, jx, y);
    x.shadowBlur = 0; x.globalAlpha = 1;
    // sombra desplazada oscura + contorno
    x.fillStyle = "rgba(0,0,0,0.55)";
    x.fillText(l.text, jx + 7, y + 8);
    x.lineWidth = 9; x.strokeStyle = "rgba(6,6,10,0.9)"; x.lineJoin = "round";
    x.strokeText(l.text, jx, y);
    x.fillStyle = l.color;
    x.fillText(l.text, jx, y);
    // gotas que chorrean desde la base de las letras
    const mw = x.measureText(l.text).width;
    for (let k = 0; k < 11; k++) {
      const dx = jx - mw / 2 + rnd() * mw;
      const len = 25 + rnd() * (i === lines.length - 1 ? 150 : 70);
      const r = 2.5 + rnd() * 3;
      x.fillStyle = l.color; x.globalAlpha = 0.9;
      x.beginPath();
      x.rect(dx - r, y - fs * 0.08, r * 2, len + fs * 0.08);
      x.fill();
      x.beginPath(); x.arc(dx, y + len, r * 1.25, 0, Math.PI * 2); x.fill();
      x.globalAlpha = 1;
    }
  });
  // salpicado de aerosol
  for (let k = 0; k < 520; k++) {
    const px = w * 0.08 + rnd() * w * 0.84, py = h * 0.12 + rnd() * h * 0.76;
    x.globalAlpha = 0.12 + rnd() * 0.35;
    x.fillStyle = lines[Math.floor(rnd() * lines.length)].color;
    x.beginPath(); x.arc(px, py, 0.8 + rnd() * 2.2, 0, Math.PI * 2); x.fill();
  }
  x.restore();
  return tex(c);
}
