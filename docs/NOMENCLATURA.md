# Nomenclatura de secciones — Viña Casa Acosta

Sistema de IDs para referirse a páginas y secciones del sitio de forma rápida y sin ambigüedad.

**Cómo usarlo:** en lugar de decir *"la sección de los 4 retratos de la familia en historia"*, basta con decir **B5**. En lugar de *"el banner final vino-tinto del home"*, basta con **A5**.

**Convención:**
- Letra mayúscula = página (A, B, C, D, E, F, G).
- Número = sección dentro de la página, en orden de aparición (top → bottom).
- Letra minúscula = sub-sección dentro de una sección que se repite (C2a, C2b…).
- Subpáginas dinámicas: prefijo `Cd` para "detalle de C" (vinos/[slug]).
- Globales (presentes en todas las páginas) usan iniciales: NV, FT, CD.

---

## A — Inicio (`app/[locale]/page.tsx`)

| ID | Sección |
|---|---|
| A1 | Hero (banner principal a pantalla completa) |
| A2 | Casa Acosta (antetítulo "San Vicente de Tagua Tagua" + StackedPhotos + texto; la frase "Tres generaciones, un mismo origen" vive en la card "Herencia familiar") |
| A3 | Vinos Destacados (grilla heritage con esquinas serif) |
| A4 | Actividades (mosaico bento con filtros píldora: Todas / Tours / Experiencias / Eventos + banner de eventos que enlaza a `/contacto`) |
| A5 | CTA Contacto (banner final vino-tinto) |

## B — Historia (`app/[locale]/historia/page.tsx`)

| ID | Sección |
|---|---|
| B1 | Hero full-screen (foto `vinos-retro`, texto claro sobre degradado) |
| B2 | Relato de origen (3 capítulos alternados foto/texto — `StoryChapter`, reusa `origin` + `twoCards` en messages) |
| B3 | Galería "detrás de escena" (grilla de fotos — `gallery` en messages; placeholders hasta tener fotos reales) |
| B4 | Timeline (hitos 1998, 2000, 2003, 2012, hoy) |
| B5 | CTA a Staff (enlace "Conoce al equipo") |

## C — Nuestros Vinos (`app/[locale]/vinos/page.tsx`)

| ID | Sección |
|---|---|
| C1 | Hero (centrado) |
| C2 | Catálogo por línea — banda editorial por colección (carrusel 4:5 de fotos de ambiente + identidad de la línea, y grilla de tarjetas que enlazan a la ficha del producto). 6 sub-secciones alternando fondos. Cada banda muestra **todos** los vinos de su línea (sin "ver más"). Las fotos del carrusel se declaran en `lineMeta[línea].photos` y se generan con `npm run fotos:colecciones`. |
| C2a | Línea Ombú |
| C2b | Línea Lajau |
| C2c | Línea Estación Francia |
| C2d | Línea Berá |
| C2e | Línea Guidaí |
| C2f | Línea Yaráy Guá |
| C3 | CTA a la Tienda (banda de cierre entre C2f y el footer) |

## Cd — Detalle de vino (`app/[locale]/vinos/[slug]/page.tsx`)

| ID | Sección |
|---|---|
| Cd1 | Producto (imagen + info + `ProductPurchase` con stepper) |
| Cd2 | Vinos relacionados de la misma línea |

## D — Actividades (`app/[locale]/actividades/page.tsx`)

| ID | Sección |
|---|---|
| D1 | Hero cinematográfico full-bleed (foto grupal, texto claro sobre degradados) |
| D1b | Sub-nav de sección (pestañas Tours/Experiencias/Eventos + scroll-spy), debajo del hero. Sticky **solo en desktop** (`md:sticky md:top-24`) |
| D2 | Tours (`#tours`) |
| D3 | Experiencias (`#experiencias`) — tres tarjetas-puerta, no la categoría. Las dos primeras son **selectoras** (`CategoryChooserCard`): despliegan la lista de su categoría. Tren EFE es enlace externo, sin desplegable. La miga de una ficha **no** apunta acá: ver `CATEGORIES_WITH_INDEX_ANCHOR` en `data/activities.ts`. |
| D4 | Eventos (`#eventos`) |

## Dd — Detalle de actividad (`app/[locale]/actividades/[categoria]/[slug]/page.tsx`)

Subpágina dinámica de D (una actividad por página). Mismo patrón que `Cd`.
La ruta lleva la categoría: `/actividades/tours/ombu`, `/actividades/talleres/pizzas`.

| ID | Sección |
|---|---|
| Dd1 | Hero + breadcrumbs + ficha rápida (Lugar · Duración · Participantes · Reservas + intro) |
| Dd2 | Sub-nav ancla (Detalle · Galería · Reserva) |
| Dd3 | Estacionalidad (franja de 12 meses) |
| Dd4 | Detalle — tickets (tours) o programa de la jornada (talleres · experiencias) |
| Dd5 | Tarjeta de reserva: precio **o** "a consultar", más condiciones |
| Dd6 | Galería (placeholder hasta tener fotos) |
| Dd7 | Reserva o cotización (formulario Netlify Forms + botón WhatsApp con prefill) |
| Dd8 | Otras actividades de la misma categoría |

## Dv — Hub de Vendimia (`app/[locale]/actividades/vendimia/page.tsx`)

| ID | Sección |
|---|---|
| Dv1 | Hero + breadcrumbs |
| Dv2 | Qué es la vendimia en Casa Acosta + los tres datos ciertos (temporada · duración · para quién) |
| Dv3 | El año de la viña — banda de 12 meses con las 5 etapas del ciclo y la ventana de cosecha (`components/VineyardYear.tsx`) |
| Dv4 | La jornada: corta, pisa y celebra — programa en `<ol>` con un ícono por paso + qué incluye |
| Dv5 | Otras formas de vivir el ciclo (Cosecha tu historia · Lágrimas de invierno) |
| Dv6 | Galería (apertura ancha + tres de apoyo) |
| Dv7 | Consulta (formulario en modo temporada, sin mínimo de personas) |

**El orden en pantalla es Dv1 · Dv2 · Dv3 · Dv4 · Dv6 · Dv7 · Dv5**, no el de la
numeración: mandar a otra página justo antes del formulario es perder la visita.
Es el mismo orden que la ficha `Dd`, donde "otras actividades" también cierra.

La página **no publica fechas exactas, precio ni mínimo de personas** — ver
`docs/HANDOFF.md` y `tests/vendimia-hub.test.mjs`.

**Dv3 absorbió la franja de meses**, que antes era una sección aparte entre Dv2 y
Dv3. Separadas decían lo mismo dos veces: cinco etapas por un lado y doce
casillas por el otro. `VineyardYear` las dibuja como una sola línea del año que
arranca en junio —el copy dice que la historia empieza en invierno, y en el
hemisferio sur eso es junio— con el tramo del visitante teñido al final. Dv3 es
la única sección del hub que no usa `SeasonStrip`: ese componente sigue siendo de
las fichas (`Dd3`), donde la franja responde "¿lo puedo hacer en julio?" y nada
más.

**Registro visual del hub: almanaque, no landing.** Toda la página va en papel
—no hay bandas en penumbra— y el contenido no va en cajas: lo que separa un
bloque de otro es un filete de un píxel. Por eso Dv4 no monta `ActivityProgram` y
Dv5 no monta `ActivityRowCard`, aunque las fichas sí: los dos componentes dibujan
el vocabulario que este hub abandona (número en círculo con anillo, tarjeta
redondeada con sombra y salto al hover). Siguen intactos para `Dd`. Si una
sección nueva de Dv necesita una caja para leerse, lo que le falta es jerarquía
tipográfica.

Dos excepciones deliberadas a esa regla: **las fotos van con esquina redondeada**
(`rounded-xl`; `rounded-lg` las miniaturas de Dv5) porque una foto no encierra
contenido sino que lo es, y **Dv7 sí es una tarjeta**, copiando exactamente la de
`Dd6` — el formulario no es contenido editorial sino el mismo trámite que el
visitante ya hizo en otra actividad, y que se vea igual es lo que lo hace
reconocible. Si cambia el de la ficha, cambia este.

⚠️ Tokens de radio: `globals.css` redefine `--radius-xl` en 1,5rem, así que
`rounded-xl` son **24px** y `rounded-2xl` son **16px** — al revés de lo que
sugieren los nombres de Tailwind.

## Dc, De — Reservados (aún no existen)

| ID | Página | Estado |
|---|---|---|
| Dc | Landing de categoría (`/actividades/tours`, `/talleres`, `/experiencias`) | Reservado. Hoy esas URLs redirigen en 307 al ancla del índice. |
| De | Eventos privados (`/actividades/eventos-privados`) | Reservado. Hoy es la sección D4 del índice. |

## E — Contacto (`app/[locale]/contacto/page.tsx`)

| ID | Sección |
|---|---|
| E1 | Hero ("Contáctanos") |
| E2 | Formulario + mapa (split 50/50) |
| E3 | 3 cards de info (Ubicación, Horarios, Email) |

## F — Tienda (`app/[locale]/tienda/page.tsx`)

| ID | Sección |
|---|---|
| F1 | Hero |
| F2 | Catálogo (filtros + sort + grilla + sheet mobile) |

## G — 404 (`app/[locale]/not-found.tsx`)

| ID | Sección |
|---|---|
| G1 | Página 404 completa ("404" gigante, copy ES/EN/PT, 2 CTAs) |

## H — Staff (`app/[locale]/staff/page.tsx`)

| ID | Sección |
|---|---|
| H1 | Hero ("Staff") |
| H2 | Grilla del equipo (4 retratos: Damián, Andrea, Enrique, Alfonso) |

---

## Globales (presentes en toda página, viven en `app/[locale]/layout.tsx`)

| ID | Componente | Notas |
|---|---|---|
| NV | Navbar | Header con logo + nav + LanguageSwitcher + CartButton. Bajo "Actividades" cuelga el **mega-menú**: panel ancho con una columna por categoría (Tours · Talleres · Experiencias) más un pie con Eventos y Ver todo. En móvil, acordeón de dos niveles dentro del drawer. Se deriva de `data/activities.ts` y su contenido vive en `components/ActivitiesMenu.tsx`, compartido por las dos formas. |
| FT | Footer | Pie de página |
| CD | CartDrawer | Carrito lateral overlay (z-index alto) |

---

## Notas de mantenimiento

- Cuando se agrega una sección **al medio**, conviene renombrar los siguientes IDs para mantener el orden top→bottom. Si renumerar es costoso (mucha referencia cruzada), se acepta usar `A2.5` puntualmente, pero como excepción, no regla.
- Cuando se agrega una **nueva página**, se le asigna la siguiente letra disponible (la próxima sería **I**). Si la página nueva es hija de otra —una subpágina, un hub, una landing de categoría— usa el prefijo de su madre en minúscula (`Cd`, `Dd`, `Dv`, `Dc`), no una letra propia.
- Si una página crece mucho, se puede sub-numerar como en C2a/C2b.
- Este archivo es el contrato. Cualquier cambio se refleja primero acá, después en el código.
