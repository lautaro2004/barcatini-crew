/**
 * INVITADOS — única fuente de datos del showcase.
 * Agregar uno = sumar un objeto (y su foto en /public/images/cars/). Las animaciones,
 * columnas, travelling y textos se generan solos a partir de esta lista.
 *
 * Campos vacíos ("") no se muestran, salvo `name`, que muestra PENDING_LABEL si
 * SHOW_PENDING es true (para no inventar datos mientras falta confirmarlos).
 */
export interface Guest {
  id: string;
  number: string; // "001"
  name: string;
  brand: string;
  model: string;
  image: string; // recorte con transparencia
  instagram: string; // "@usuario" o ""
  description: string;
  /** ancho aproximado del auto en metros (define su escala en el estacionamiento) */
  widthM?: number;
  /** lado donde va el texto; el auto se encuadra del lado opuesto. Por defecto alterna. */
  side?: "left" | "right";
}

export const SHOW_PENDING = true;
export const PENDING_LABEL = "Invitado a confirmar";

export const guests: Guest[] = [
  { id: "guest-01", number: "001", name: "", brand: "Chevrolet", model: "Chevy Serie 2", image: "/images/cars/guest-01.webp", instagram: "", description: "", widthM: 4.3 },
  { id: "guest-02", number: "002", name: "", brand: "Chevrolet", model: "", image: "/images/cars/guest-02.webp", instagram: "", description: "", widthM: 3.9 },
  { id: "guest-03", number: "003", name: "", brand: "Hyundai", model: "Veloster", image: "/images/cars/guest-03.webp", instagram: "", description: "", widthM: 3.9 },
  { id: "guest-04", number: "004", name: "", brand: "Fiat", model: "128 Berlina", image: "/images/cars/guest-04.webp", instagram: "", description: "", widthM: 3.7 },
  { id: "guest-05", number: "005", name: "", brand: "Chevrolet", model: "Chevy", image: "/images/cars/guest-05.webp", instagram: "", description: "", widthM: 4.1 },
];
