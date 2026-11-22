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
| A4 | Actividades (mosaico bento con filtros píldora: Todas / Tours / Experiencias / Eventos + banner de eventos que enlaza a `/contacto`). Las tarjetas de tour llevan a su ficha; las **tres de experiencia son las mismas puertas de D3** (`categoryDoors` en `data/activities.ts`) y despliegan ahí mismo el menú de su categoría — el del tren EFE sale al sitio del socio. Antes las tres llevaban a `/actividades`. |
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
| C2 | Catálogo por línea — banda editorial por colección (carrusel 4:5 de fotos de ambiente + identidad de la línea, y grilla de tarjetas que enlazan a la ficha del producto). 6 sub-secciones alternando fondos. Cada banda muestra **todos** los vinos de su línea (sin "ver más"). Las fotos del carrusel se declaran en `lineMeta[línea].photos` y se generan con `npm run fotos:colecciones`. Desde el 2026-10-12 cada tarjeta lleva **una medalla** abajo a la derecha de la foto, si el vino tiene (`MedallaVino`, la primera de su lista en `data/medallas.ts`). |
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
| Cd1 | Producto. Desde el 2026-09-25, con el tratamiento de las fichas de actividad (Plus Jakarta Sans, tarjetas que flotan por la sombra, `IconBadge`): la botella queda fija en escritorio y, a la derecha, nombre → **tarjeta de compra** (precio, `ProductPurchase` con stepper y el sello `CompraSegura`: Mercado Pago sólo con el pago en línea encendido, compra directa a la viña, mínimo de botellas) → descripción → notas de cata → maridaje → ficha técnica en tarjeta, con el PDF al pie. Antes la compra iba al final, después de la ficha técnica Desde el 2026-10-12, la medalla de la tarjeta va también sobre el panel de la botella (abajo a la derecha) y, entre la descripción y las notas de cata, el bloque **«Premios y puntajes»** lista todas las del vino con su texto (`data/medallas.ts`); sin medallas no se dibuja. Mismo día: en la tarjeta de compra, Mercado Pago pasa a la misma banda gris de F1, y el fondo de la foto de la botella a gris neutro (`from-neutro-claro to-neutro`), igual que en C2 y F2. |
| Cd2 | Vinos relacionados de la misma línea |

## D — Actividades (`app/[locale]/actividades/page.tsx`)

| ID | Sección |
|---|---|
| D1 | Hero cinematográfico full-bleed (foto grupal, texto claro sobre degradados) |
| D1b | Sub-nav de sección (pestañas Tours/Experiencias/Eventos + scroll-spy), debajo del hero. Sticky **solo en desktop** (`md:sticky md:top-24`) |
| D2 | Tours (`#tours`) |
| D3 | Experiencias (`#experiencias`) — tres tarjetas-puerta, no la categoría. Las dos primeras son **selectoras** (`CategoryChooserCard`): despliegan la lista de su categoría. Tren EFE es enlace externo, sin desplegable. Las tres salen de `categoryDoors` y **son las mismas de A4**, con el mismo menú (`components/CategoryMenu.tsx`); cambiar una cambia las dos. La miga de una ficha **no** apunta acá: ver `CATEGORIES_WITH_INDEX_ANCHOR` en `data/activities.ts`. |
| D4 | Eventos (`#eventos`) |

## Dd — Detalle de actividad (`app/[locale]/actividades/[categoria]/[slug]/page.tsx`)

Subpágina dinámica de D (una actividad por página). Mismo patrón que `Cd`.
La ruta lleva la categoría: `/actividades/tours/ombu`, `/actividades/talleres/pizzas`.

| ID | Sección |
|---|---|
| Dd1 | Hero con el texto centrado y sin antetítulo → migas centradas → (Dd2) → ficha rápida → intro. La ficha rápida (Lugar · Duración · Participantes · Reservas) es una tarjeta blanca sin bordes que flota sólo por su sombra, con íconos `IconBadge` (2026-09-24). Con `heroBooking` (hoy sólo el yoga) el hero suma el precio y los dos botones de reserva, para que en celular se vean sin bajar |
| Dd2 | Píldora de secciones (Detalle · Galería · Preguntas, si hay · **Reserva** en vino) entre las migas y la ficha rápida. Al bajar queda pegada bajo el navbar, en celular y escritorio, y una pastilla oscura se desliza a la sección en pantalla (`components/ActivitySectionNav.tsx`). Acompaña hasta el final de la reserva **En celular va fija abajo de la pantalla desde el 2026-10-12** (pedido de Juan Francisco: "para que no estorbe donde va la vista"), más angosta, y el carrito flotante sube para no quedar debajo; se esconde al pasar el formulario. En escritorio sigue pegada bajo el navbar. |
| ~~Dd3~~ | Retirada el 2026-09-24: la caja "¿Cuándo se hace?" con la franja de 12 meses decía "Todo el año" en once de catorce fichas. En las de temporada, los meses pasan a las condiciones de Dd5 (`lib/temporada.ts`). El ID no se reasigna |
| Dd4 | Detalle — tickets (tours) o programa de la jornada (talleres · experiencias). Si la actividad declara `schedule`, el programa va con horario: una regla proporcional de la mañana y cada etapa con sus minutos (`components/ActivitySchedule.tsx`); una etapa puede traer su carta (`components/ActivityMenu.tsx`) |
| Dd5 | Tarjeta de reserva: precio **o** "a consultar", más condiciones. Con `priceExcludesVAT` el precio dice "+ IVA" junto a la cifra |
| Dd6 | Galería: apertura 16:9 + hasta tres verticales 2:3; lo que no cabe, detrás de **"Ver más fotos"** en columnas (`gallery.more`, desde el 2026-09-29). Placeholder si la actividad no tiene fotos |
| Dd6b | Preguntas frecuentes (`components/ActivityFaq.tsx`): una tarjeta con sombra por pregunta y "Expandir todo". Sólo si la actividad trae `faq` en messages; hoy, el yoga. Sin marcado `FAQPage`: Google lo limita a sitios de gobierno y salud desde 2023 |
| Dd7 | Reserva o cotización (formulario a Afeleia + botón WhatsApp con prefill) |
| Dd8 | Otras actividades de la misma categoría |

**Tipografía de la ficha:** Libre Caslon sólo en los títulos y en la cita de la
introducción; el resto —datos de la ficha rápida, etapas, carta, preguntas y precios— va
en **Plus Jakarta Sans** (sólo en las fichas; el resto del sitio sigue en Work Sans), con
negrita para destacar. Los destacados se marcan con `**así**` en
messages y los dibuja `components/Emphasis.tsx` (`lib/enfasis.ts`).

**La ficha va en blanco puro** desde el 2026-09-24 (pedido de Juan Francisco): todas
sus secciones y tarjetas usan `surface-container-lowest` (#FFFFFF) en vez del papel
(#FBF9F8) y las bandas grises, y se separan por aire, sin filetes. Lo único gris que
queda es la franja de condiciones dentro de la tarjeta de precio. Desde el mismo día
**todo el sitio** va en blanco: el token `--color-background` / `--color-surface` pasó de
#FBF9F8 a #FFFFFF y las bandas grises de página (portada, vinos, Vendimia, Historia,
pie) pasaron a `bg-surface`. Las tarjetas grises dentro de las páginas se quedan.

## Dv — Hub de Vendimia (`app/[locale]/actividades/vendimia/page.tsx`)

| ID | Sección |
|---|---|
| Dv1 | Hero a pantalla completa con **la entrada**: fechas, precio y reservar (`VendimiaHeroReserva`), más migas debajo. Tocar una fecha la deja elegida en el formulario. Rediseño del 2026-11-22 |
| Dv2 | Qué es la vendimia, en un párrafo, y la invitación a participar con el **short de YouTube** (`data/vendimiaVideo.ts`) |
| ~~Dv3~~ | Retirada el 2026-11-22: el ciclo de la vid contaba la viña en vez de ayudar a reservar. El ID no se reasigna |
| Dv4 | Qué vas a hacer: los seis momentos del día, con foto y en orden. En celular se desliza de lado |
| Dv4b | Lo que necesitas saber: los datos prácticos y qué incluye |
| Dv5 | Otras experiencias (Cosecha tu historia · Lágrimas de invierno) |
| Dv6 | Galería en filas de una sola proporción; el resto detrás de **"Ver más fotos"** (`components/ShowMore.tsx`). Las filas se declaran en `data/vendimiaGallery.ts` |
| Dv6b | Preguntas frecuentes, después de la reserva (`components/ActivityFaq.tsx`) | **Reserva** (`components/VendimiaReserva.tsx`, desde el 2026-11-22): fecha, personas por rango y total orientativo; después encargado, una ficha por asistente y mascotas; termina en el checkout de Afeleia. Sin `catalogo.eventos` o sin URL del checkout, sigue la **consulta** (formulario en modo temporada, sin mínimo de personas) |

**El orden en pantalla es Dv1 · Dv2 · Dv4 · Dv4b · Dv6 · Dv7 · Dv6b · Dv5.** Títulos y textos van centrados; las listas, los datos del formulario y los pasos del día, alineados a la izquierda. Cada sección responde una duda de quien está por reservar, y la barra de reserva (`VendimiaBarraReserva`) acompaña desde que sale el hero hasta que aparece el formulario. Reemplaza a la píldora de secciones en esta página.

**Ninguna fecha, precio ni cupo se escribe en el repo**: los publica Afeleia en
`catalogo.eventos` — ver `docs/HANDOFF.md` y `tests/vendimia-hub.test.mjs`.

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
| E1 | Hero full-screen (foto `hero-mesa-larga`, la cena en la mesa larga; texto claro sobre degradados). Desde el 2026-08-21: antes era un encabezado de sólo texto sobre papel. El navbar se vuelve claro sobre este hero (Navbar → `hasDarkHero` incluye `/contacto`). |
| E2 | Formulario + mapa (split 50/50) |
| E3 | "Visítanos": ficha de datos (Ubicación, Horarios, Teléfono/WhatsApp, Email) + galería de 4 fotos |

## F — Tienda (`app/[locale]/tienda/page.tsx`)

| ID | Sección |
|---|---|
| F1 | Hero + franja de confianza bajo el subtítulo (`CompraSegura` en variante `franja`: pago seguro con Mercado Pago —sólo con el pago en línea encendido—, compra directa a la viña, mínimo de botellas). Desde el 2026-09-25 Desde el 2026-10-12 Mercado Pago va en una **banda gris propia** bajo el subtítulo —texto a la izquierda, logo grande a la derecha (`BandaMercadoPago` en `CompraSegura`)— y los otros dos datos quedan en la fila de abajo. |
| F2 | Catálogo (filtros + sort + grilla + sheet mobile). Desde el 2026-09-25 con el tratamiento de las fichas: Plus Jakarta Sans, filtros como pastillas (`aria-pressed`) en una tarjeta que flota por la sombra, orden como pastilla, tarjetas de vino blancas con sombra, la línea en la cursiva de los antetítulos, los sellos ("Edición Limitada", "Insignia") en pastilla blanca (`SelloProducto`, el mismo de Cd1) y el botón de carrito en círculo vino. El aviso del pie dice cómo se paga de verdad: Mercado Pago con el pago en línea encendido, WhatsApp sin él Desde el 2026-10-12 la tarjeta lleva **una medalla** abajo a la derecha de la foto, la misma de C2 (`MedallaVino`). |

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
| NV | Navbar | Header con logo + nav + LanguageSwitcher + CartButton. **Vendimia va en el menú principal** desde el 2026-11-22, entre Historia y Actividades, y también sigue dentro del acordeón. Bajo "Actividades" cuelga un **acordeón de una columna** (panel de 22rem): seis filas en orden fijo — Vendimia · Tours · Talleres · Experiencias · Eventos · Ver todo. Las tres categorías despliegan sus fichas con `<details>` de `name` compartido (una abierta a la vez, sin JavaScript); las otras tres navegan directo. Reemplazó al mega-menú de cuatro columnas, donde la lista larga de Experiencias se partía y su segunda mitad quedaba bajo una columna sin encabezado. Se deriva de `data/activities.ts` y su contenido vive en `components/ActivitiesMenu.tsx`, compartido por escritorio y drawer móvil. **Los 14 enlaces están siempre en el HTML servido**, ocultos por CSS: ver `tests/navegacion-enlaces-source.test.mjs`. |
| FT | Footer | Pie de página, **oscuro (`bg-primary`) y en tres bandas** desde el 2026-08-19: identidad y contacto directo · el índice del sitio en tres columnas · el cierre legal. La banda del medio baja a Vendimia, Tours, Experiencias y Eventos privados; **Talleres no está** porque el índice de actividades no tiene esa sección y un rótulo que no aterriza es lo mismo que se sacó con Mapa de Sitio. Privacidad, Términos y Cookies enlazan a sus PDF **sólo en español** — el mapa vive en `lib/legal.ts` y un idioma sin archivo propio deja la etiqueta como texto. Mapa de Sitio sigue sin enlace porque esa página no existe. `tests/legal-docs-source.test.mjs` falla si un enlace apunta a un PDF que no está en `public/`. |
| CD | CartDrawer | Carrito lateral overlay (z-index alto). Bloquea el cierre del pedido por debajo de la compra mínima (`MIN_BOTTLES` en `lib/cart.ts`, hoy 6 botellas) y también si todo el carrito está agotado. |
| AG | AgeGate | Verificación de +18 (Ley 19.925), sobre todo el sitio y recordada 30 días. **Es una capa sobre el HTML ya servido**: la página se renderiza entera y esto va encima, así que no hay contenido escondido de Google ni ruta `/edad` que indexar. Quién la ve lo decide un script inline del layout que marca `<html data-age-gate="pendiente">` antes del primer pintado; el CSS de `globals.css` hace el resto. Sin JavaScript no aparece, a propósito: sus botones lo necesitan y dejaría el sitio bloqueado sin salida. |

---

## Notas de mantenimiento

- Cuando se agrega una sección **al medio**, conviene renombrar los siguientes IDs para mantener el orden top→bottom. Si renumerar es costoso (mucha referencia cruzada), se acepta usar `A2.5` puntualmente, pero como excepción, no regla.
- Cuando se agrega una **nueva página**, se le asigna la siguiente letra disponible (la próxima sería **I**). Si la página nueva es hija de otra —una subpágina, un hub, una landing de categoría— usa el prefijo de su madre en minúscula (`Cd`, `Dd`, `Dv`, `Dc`), no una letra propia.
- Si una página crece mucho, se puede sub-numerar como en C2a/C2b.
- Este archivo es el contrato. Cualquier cambio se refleja primero acá, después en el código.
