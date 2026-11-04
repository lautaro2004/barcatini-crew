# BARCATINI CREW — Experiencia inmersiva

Experiencia web cinematográfica y scroll-driven para **Barcatini Crew** (DOM 15 NOV 2026 · Tortugas Open Mall): entrada a un estacionamiento subterráneo, pared de sponsors, recorrido por los autos invitados, podio misterioso con el sorteo de un auto y una moto, y sección informativa con entradas.

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · GSAP + ScrollTrigger · Three.js (una sola escena) · Web Audio API.

## Empezar

    npm install
    npm run dev       # http://localhost:3000
    npm run build && npm start

Requiere Node 20+.

## Fases

1. **Entrada y descenso** — calle, rampa, pared de sponsors (logos reales + grafiti con links de Instagram).
2. **The Car Showcase** — recorrido lateral por los autos confirmados, con columnas que ocluyen y texto editorial.
3. **Podio central** — lonas negras animadas (auto y moto del sorteo), foco, humo y mensaje de expectativa.
4. **Información del evento** (`#evento`) — fecha, lugar, entradas, invitados, sponsors, ubicación, redes y footer.

## Contenido editable (lo que se toca a menudo)

| Qué | Dónde |
|---|---|
| Fecha, horario, lugar, entradas, precios, redes, texto legal | `EVENT` en `src/config.ts` |
| Sponsors (logo, proporción) | `SPONSORS` en `src/config.ts` + archivo en `public/sponsors/` |
| Invitados y sus autos | `src/data/guests.ts` + foto recortada en `public/images/cars/` |
| Música / lluvia / mezcla | `public/audio/` y `src/audio/audio.config.ts` |
| Texto del grafiti | `SponsorWall.ts` (`makeGraffiti`) y links en `EVENT.instagram` |

## Deploy (Netlify)

1. Subir el repo a GitHub.
2. En Netlify: *Add new site → Import from Git* y elegir el repo. Build: `npm run build` (ya definido en `netlify.toml`). Netlify aplica su runtime de Next.js solo.
3. Cada `git push` a la rama principal redepliega.

Notas: el audio sólo se activa tras un clic en **SOUND ON** (política de los navegadores). La escena baja la calidad sola en equipos modestos. Abrir `/?debug` expone `window.__tl` con las marcas de la timeline.

## Créditos y licencias

- Música: **"Bringing Crunk Back" — SmallFortune** ([Pixabay](https://pixabay.com/music/beats-bringing-crunk-back-299728/)), bajo la Pixabay Content License. Si el archivo `public/audio/bringing-crunk-back.mp3` no está, se usa un beat procedural de respaldo.
- Tipografías: Big Shoulders Display y Chakra Petch (@fontsource, OFL); Rubik Spray Paint (OFL, en `public/fonts/`).
- Fotos de vehículos y logos de sponsors: material de Barcatini / sus dueños. No reutilizar sin permiso.

## Estructura
- `src/config.ts` — sponsors, texturas, audio (lo que se reemplaza).
- `src/components/ScrollExperience.tsx` — pin + timeline maestra GSAP (scrub) + registro de escenas.
- `src/experience/scenes/` — `EntranceScene`, `ParkingDescentScene`, `SponsorWall`, `CarShowcaseScene`, `PodiumScene` (módulos de escena).
- `src/experience/` — motor 3D (`engine.ts`), viaje de cámara (`travel.ts`, `path.ts`), geometría/texturas procedurales.
- `src/audio/` — audio reactivo al scroll, desacoplado de las escenas (`audio.config.ts` = toda la mezcla).
- `src/components/AmbientAudio.tsx` — botón SOUND ON/OFF.

## Reemplazar recursos
- Logos: archivo en `public/sponsors/` y `image: "/sponsors/x.png"` en `src/config.ts`.
- Audio: mp3 en `public/audio/` y `sources.music` / `sources.rain` en `src/audio/audio.config.ts`.
- Hormigón/asfalto: `TEXTURES` en `src/config.ts`.

## Nueva escena
1. Crear `src/experience/scenes/MiEscena.ts` (SceneModule: `build`, `update`, `timeline`).
2. Registrarla en `SCENES` (ScrollExperience.tsx) y sumar un tramo en `legs` si la cámara avanza.

## Escena 2 — The Car Showcase

Continúa donde termina la pared de sponsors, en el mismo estacionamiento y la misma `THREE.Scene`.

- **Datos**: `src/data/guests.ts`. Agregar un invitado = una entrada + su foto recortada en `public/images/cars/`.
  Campos vacíos (`name`, `instagram`, `description`, `model`) no se muestran; si falta `name` se muestra `PENDING_LABEL`
  (apagable con `SHOW_PENDING = false`). `widthM` fija el ancho real aproximado del auto (escala en escena). `side` fuerza el lado del texto
  (por defecto alterna izquierda/derecha).
- **Layout** (`src/experience/gallery.ts`): calcula bahías, columnas, paradas y waypoints de cámara a partir de la lista. Constantes en `GALLERY`.
- **Escena** (`scenes/CarShowcaseScene.ts`): columnas que ocluyen, autos (foto real, proporción original, sin deformar), sombra de contacto,
  reflejo en piso mojado, lámpara colgante, luces rojo/azul sutiles y el espacio central reservado (próxima etapa: podio).
- **Texto** (`components/GuestInfo.tsx`): composición editorial por invitado, revelada con el scroll (sin tarjetas ni paneles).
- **Timeline**: cada invitado = tramos `gN-a` (arranca) · `gN-b` (cruza la columna) · `gN-c` (frena) · `gN-hold` (pausa con info). Velocidad en `GV` (`ScrollExperience.tsx`), duración de la pausa en `hold`.
- **Audio**: el progreso 1 → 1.25 de `audio.config.ts` corresponde ahora a la escena 2 (la música crece hasta la revelación final); la pista nunca se reinicia.
- Diagnóstico: abrir `/?debug` expone `window.__tl` (marcas de timeline).

## Escena 3 — Podio central y revelación misteriosa

- `scenes/PodiumScene.ts`: plataforma de hormigón, cercha con focos, lona negra (malla con simulación ligera: viento continuo, zonas que se levantan y ráfagas ligadas al scroll), foco que recorre la tela, humo moderado, acentos rojos sutiles. La forma es genérica a propósito: no insinúa el vehículo.
- Timeline: `bridge-*` (sale del último invitado) → `p1-hold` → `pa-*` (rodeo al 3/4 frontal) → `p2-hold` (mensaje) → `p-exit` (fundido a negro). Posiciones en `gallery.ts` (`center`, `bridgeStop`, `podiumPath`, `podiumStop`).
- `components/PodiumMessage.tsx`: "EL MISTERIO SE REVELARÁ EN EL EVENTO" + texto secundario.
- `components/EventEntry.tsx` (`#evento`): sección informativa completa de la Fase 4 (datos desde `EVENT` y `SPONSORS`). Fecha/horario/entradas en `EVENT` de `src/config.ts` .
- Audio: el scroll mapea escena 1 → 0–1, invitados → 1–1.15, podio → 1.15–1.25 (`scrollSync.ts`); sólo se agregó un cue "riser" en `audio.config.ts`.
