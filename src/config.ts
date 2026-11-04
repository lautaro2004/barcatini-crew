/**
 * Contenido editable de la experiencia. Para reemplazar recursos:
 *  - Logos de sponsors: poné el archivo en /public/sponsors y completá `image`.
 *  - Audio: ver src/audio/audio.config.ts (sources.music / sources.rain).
 *  - Texturas (hormigón / asfalto): ver TEXTURES.
 */
export type MarkKind = "chevron" | "ring" | "slash" | "hex" | "wheel" | "bolt" | "bars" | "diamond" | "arc";

export interface Sponsor {
  id: string;
  label: string;
  tier: "title" | "gold" | "silver" | "partner";
  mark: MarkKind; // sólo para placeholders sin imagen
  image?: string; // recorte/arte del logo (se muestra tal cual, sin deformar)
  aspect?: number; // ancho / alto de la imagen (para no estirarla)
  url?: string;
}

/**
 * Sponsors confirmados. Se muestran en la pared del subsuelo y en la sección informativa.
 * Agregar uno = sumar el archivo en /public/sponsors y un objeto acá (con su `aspect`).
 */
export const SPONSORS: Sponsor[] = [
  { id: "lowcaps", label: "Low Caps", tier: "partner", mark: "chevron", image: "/sponsors/lowcaps.png", aspect: 262 / 223 },
  { id: "maxi-c64", label: "Maxi-C64 · Road to Scale", tier: "partner", mark: "chevron", image: "/sponsors/maxi-c64.png", aspect: 254 / 227 },
  { id: "rotary", label: "Rotary Brothers", tier: "partner", mark: "chevron", image: "/sponsors/rotary-brothers.png", aspect: 257 / 234 },
  { id: "cema", label: "Instituto CEMA", tier: "partner", mark: "chevron", image: "/sponsors/instituto-cema.png", aspect: 260 / 235 },
  { id: "subzero", label: "Subzero", tier: "partner", mark: "chevron", image: "/sponsors/subzero.png", aspect: 261 / 241 },
];

/** Si se define una URL, reemplaza la textura procedural. */
export const TEXTURES: { concrete?: string; asphalt?: string } = {
  // concrete: "/textures/concrete.jpg",
  // asphalt: "/textures/asphalt.jpg",
};

export const EVENT = {
  name: "BARCATINI CREW",
  subtitle: "FIERROS · FAMILIA · PASIÓN",
  venue: "Tortugas Open Mall",
  address: "Acceso Norte – Ramal Pilar Km 36,5",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tortugas+Open+Mall+Acceso+Norte+Ramal+Pilar+Km+36,5",
  /** Compra de entradas (Flashpass). */
  ticketsUrl: "https://events.flashpass.com.ar/eventos/barcatini-crew-1602",
  date: "DOM 15 NOV 2026",
  dateLong: "Domingo 15 de noviembre de 2026",
  time: "11:00 — 18:00 hs",
  instagram: [
    { label: "@barcatini", note: "La comunidad", url: "https://www.instagram.com/barcatini/" },
    { label: "@barcatinicrew", note: "El evento", url: "https://www.instagram.com/barcatinicrew/" },
  ],
  tickets: [
    { name: "Preventa 1", price: "$10.000", note: "" },
    { name: "Pack x3", price: "$27.000", note: "3 entradas" },
    { name: "Pack x5", price: "$43.000", note: "5 entradas" },
    { name: "VIP", price: "$40.000", note: "" },
    { name: "Combo VIP", price: "$100.000", note: "Pack x3" },
  ],
  highlights: [
    "Autos y proyectos seleccionados",
    "Fierros personalizados",
    "Música y entretenimiento",
    "Stands y experiencias de marcas",
    "Sorteo de un auto y una moto",
    "Regalos y sorpresas durante la jornada",
    "Un evento pensado para disfrutar con toda la familia",
  ],
  freeEntry: [
    { who: "Menores de hasta 14 años", how: "presentando DNI" },
    { who: "Jubilados", how: "presentando DNI" },
    { who: "Personas con discapacidad", how: "presentando CUD" },
  ],
  legal: "La participación en sorteos y premios estará sujeta a sus correspondientes bases y condiciones. El evento se reserva el derecho de admisión y permanencia.",
};
