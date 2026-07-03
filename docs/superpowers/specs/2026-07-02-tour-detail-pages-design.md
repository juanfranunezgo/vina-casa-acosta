# Páginas dedicadas de tour (`Dd`) — Diseño

**Fecha:** 2026-07-02
**Estado:** Aprobado — listo para plan de implementación
**Página nueva:** `Dd` — Detalle de actividad (`app/[locale]/actividades/[slug]/page.tsx`)

## Objetivo

Cada tour (Ombú, Berá, Carmenère) tiene hoy solo una card en la landing de
actividades (D2) con un botón "Reservar" que linkea a `/contacto`. Queremos una
**página dedicada por tour** con la información completa y verificada, una galería
(placeholder por ahora) y un formulario de reserva al final. Sin calendario, sin
disponibilidad real, sin pago — eso es Fase 2.

La fuente de verdad del contenido es `Textos - Tours Viña Casa Acosta.md` (doc del
cliente). La referencia visual/estructural es la ficha de tour de Viña Santa Cruz y
la página Berá previa, **pero en tema claro** (tokens Material 3 existentes), no en
fondo oscuro.

## Alcance

**Incluye:**
- Ruta dinámica `actividades/[slug]` con SSG para los 3 tours × 3 locales.
- Contenido verificado del doc, en los 3 idiomas (ES escrito, EN/PT traducidos por el
  agente y marcados para validación humana como el resto del sitio).
- Galería placeholder (las fotos reales entran luego vía `_fotos-input/D/`).
- Formulario de reserva: submit **demo** + botón **WhatsApp** con prefill.
- Cross-links a los otros tours.
- Reconciliar el copy de las cards de la landing D2 con los datos verificados.
- Repuntar los botones "Reservar" de D2 hacia las páginas nuevas.
- Actualizar `NOMENCLATURA.md` con la página `Dd`.

**No incluye (Fase 2):** calendario, disponibilidad, Webpay/pago, backend de
reservas, confirmación real de la reserva.

## Arquitectura de rutas

- `app/[locale]/actividades/[slug]/page.tsx`
  - `generateStaticParams`: producto de `["es","en","pt"]` × slugs de `tours`
    (`tour-ombu`, `tour-bera`, `tour-carmenere`) = 9 páginas SSG.
  - `setRequestLocale(locale)` para SSG i18n.
  - `notFound()` si el slug no está en `tours`.
  - `generateMetadata` por tour (título + descripción desde messages).
- Los botones "Reservar" de la landing D2 cambian de
  `href={/${locale}/contacto?asunto=tour}` a `href={/${locale}/actividades/${slug}}`.
  Se mantienen las labels `reserveStandard` / `reservePremium`.

## Secciones de la página (top → bottom)

| ID  | Sección            | Contenido |
|-----|--------------------|-----------|
| Dd1 | Hero               | Imagen del tour con overlay suave; eyebrow (tipo / "Premium" si aplica), título, tagline. Debajo banda clara con ficha rápida: **Lugar · Duración · Participantes · Reservas** + párrafo intro. |
| Dd2 | Sub-nav ancla      | Links `Detalle · Galería · Reserva` como `<a href="#...">` server-rendered. Sin JS, sin scroll-spy. |
| Dd3 | Detalle / Incluye  | Bullets verificados (recepción con copa de bienvenida, paseo/ampelografía, recorrido bodega·vinificación·barricas, cata desde barrica), **lista de vinos** de la degustación, maridaje, cierre. Precio destacado por persona. |
| Dd4 | Condiciones        | Derivadas honestamente del doc: duración aprox., mínimo de personas, reserva ideal 1 día antes / según disponibilidad, degustación no apta para menores de 18 (Ley 19.925). |
| Dd5 | Galería            | Grilla placeholder. Cuando lleguen fotos van a `public/images/` (nomenclatura `D2-<tour>`). |
| Dd6 | Reserva            | Form (nombre, correo, teléfono, personas, fecha) con submit demo + botón WhatsApp aparte que prefillea el tour. |
| Dd7 | Otros tours        | Cross-links a los otros 2 tours reusando el markup de card de la landing. |

## Datos e i18n

### `data/activities.ts`
Extender el type `Tour` con lo estructural no traducible:
- `minPeople: number` (Carmenère 4, Berá 2, Ombú 2).
- `image` y `priceCLP` ya existen y coinciden con el doc (30.000 / 35.000 / 45.000).
- Galería: por ahora sin lista real; el placeholder no necesita data. (Cuando haya
  fotos se agrega un `gallery: string[]` opcional.)

El precio, imagen, slug, premium y minPeople viven en `data/`. **Todo el texto en prosa
vive en `messages/`.**

### `messages/{es,en,pt}.json` — namespace nuevo `tourDetail`
Labels de UI compartidos:
- `place`, `duration`, `participants`, `reservations`, `whatIncludes`, `tasting`,
  `pairing`, `atClose`, `price`, `perPerson`, `conditionsTitle`, `gallery`,
  `galleryComing`, `reserveTitle`, `reserveVia`, `otherTours`, `backToActivities`,
  labels del form (`name`, `email`, `phone`, `people`, `date`, submit/whatsapp/estados).

Por tour (`tourDetail.<slug>`):
- `tagline` — subtítulo bajo el título.
- `intro` — párrafo introductorio (el itálico del doc).
- `duration` — string display ("3 horas", "2 horas y 30 minutos", "2 horas").
- `groupFrom` — "desde 4 personas" / "desde 2 personas".
- `reservationNote` — "Ideal 1 día antes o según disponibilidad".
- `includes[]` — bullets de "durante la experiencia".
- `wines[]` — vinos de la degustación.
- `pairing` — "Tabla de maridaje incluida".
- `closing` — "Podrás adquirir nuestros vinos directamente en la bodega".
- `conditions[]` — condiciones honestas derivadas del doc.

ES con el texto verificado literal del doc. EN/PT traducidos por el agente y sujetos a
validación humana (blocker ya abierto en el proyecto).

### Reconciliación de la landing D2
El namespace existente `tours.<slug>` (name/description/highlights) hoy contradice el
doc (p. ej. Berá dice "bodega subterránea / 4 Gran Reserva"; el doc dice 3 vinos y no
menciona bodega subterránea). Actualizar name/description/highlights de las 3 cards en
los 3 idiomas para que sean consistentes con el detalle verificado.

## Componentes

**Nuevo — `components/TourReservationForm.tsx` (client):**
- Campos: nombre, correo, teléfono, personas, fecha.
- Submit **demo** (spinner → éxito → reset) reusando el patrón y estilos de
  `ContactForm.tsx`, con su aviso de demo.
- Botón secundario **WhatsApp**: arma un mensaje con nombre/personas/fecha/tour y abre
  `CONTACT_WHATSAPP_URL` (de `lib/contact.ts`) con `?text=` prefilled.
- Recibe el nombre del tour como prop para el prefill y para el `<select>`/hidden.

**Inline en la page (server, sin JS extra):** hero, ficha rápida, sub-nav ancla,
detalle, condiciones, galería placeholder, otros tours.

**Reutilizados:** `Button`, `Reveal`, `next/image`, iconos `lucide-react`, helper de
formato de precio (mismo patrón `Intl.NumberFormat` que la landing).

## Decisiones tomadas

1. **i18n en los 3 idiomas**, EN/PT traducidos por el agente (marca de validación
   humana pendiente, coherente con el resto del sitio).
2. **Form: demo + botón WhatsApp aparte** (como la referencia doc 3).
3. **Condiciones derivadas honestamente** del doc; no se inventan políticas nuevas.
4. **Sub-nav ancla sin scroll-spy** (links simples) para no meter JS innecesario.
5. **Tema claro** con tokens Material 3 existentes; no se replica el fondo oscuro de la
   referencia Santa Cruz.

## Convención / nomenclatura

Antes de tocar código se actualiza `NOMENCLATURA.md` agregando la página `Dd — Detalle
de actividad (actividades/[slug])` con sus secciones Dd1–Dd7, siguiendo el precedente de
`Cd` (detalle de vino).

## Verificación

- `npm run build` compila TS + genera las 9 rutas SSG nuevas sin error.
- `npm run lint` limpio.
- Navegación manual: landing D2 → botón Reservar → página de tour correcta en los 3
  idiomas; botón WhatsApp abre chat con mensaje prefilled; form demo muestra el flujo
  éxito; cross-links entre tours funcionan; `/actividades/slug-inexistente` da 404.
