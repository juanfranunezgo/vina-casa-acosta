# Handoff técnico — sitio Viña Casa Acosta

Estado real del proyecto para quien lo retome (persona o agente). `CLAUDE.md` explica el
stack y las convenciones; este archivo explica **en qué punto está**, qué no funciona
todavía y qué trampas ya se pagaron.

Última actualización: 2026-08-20.

---

## En una línea

El sitio está **completo como pieza visual y casi vacío como software**: 74 páginas SSG en
tres idiomas, sin backend propio, sin base de datos y sin pagos. Los dos formularios ya
llegan a la viña vía Netlify Forms; el carrito sigue derivando a WhatsApp sin cobro.

---

## Qué pasa hoy cuando alguien intenta contactar o comprar

Esto es lo primero que hay que saber, porque no se nota mirando la interfaz:

| Formulario | Qué hace realmente |
|---|---|
| Reserva de tours (`components/TourReservationForm.tsx`) | Envía a **Netlify Forms** (`reserva-tour`). Al lado hay un botón de WhatsApp que sí funciona. |
| Contacto (`components/ContactForm.tsx`) | Envía a **Netlify Forms** (`contacto`). Antes era un `mailto:` que se perdía si el visitante no tenía cliente de correo. |
| Carrito (`components/CartDrawer.tsx`) | El "checkout" arma un mensaje de WhatsApp con el pedido. **No hay cobro.** |

### Netlify Forms — cómo está armado

Solución provisoria mientras no haya backend. Plan Free: **100 envíos/mes**.

- `public/__forms.html` declara los dos formularios. Existe porque Netlify detecta
  formularios parseando el HTML **estático** del deploy, y con OpenNext los `<form>` de
  React no existen como HTML en el build. **Cada campo que envíe un componente tiene que
  estar declarado ahí**: Netlify descarta en silencio los que no figuren.
- `lib/netlifyForms.ts` hace el POST contra `/__forms.html` (no contra una ruta de Next,
  que se la llevaría OpenNext antes de que Forms la vea).
- ⚠️ **En `npm run dev` los formularios siempre fallan** (405/404): el handler de Forms es
  parte del runtime de Netlify. Se prueban en un deploy preview, no en local.
- La casilla de destino se configura en Netlify → Notifications → Form submission
  notifications. **No sale de `lib/contact.ts`**: cambiar esa constante no cambia a dónde
  llegan los envíos.
- Los envíos quedan guardados en el panel aunque la notificación por correo falle.
- El formulario de reserva pasó de llamarse `reserva-tour` a **`reserva-actividad`**
  (campos nuevos: `actividad` y `tipo`, que vale `reserva` o `cotizacion`). Los envíos
  anteriores **no se pierden**: quedan en el panel bajo el nombre viejo, en su propia
  lista. Si la notificación por correo estaba configurada sobre `reserva-tour`, hay que
  volver a configurarla para el nombre nuevo.

---

## Actividades — arquitectura (rama `feat/actividades-subpaginas`)

Cada actividad tiene página propia bajo su categoría:
`/actividades/{tours|talleres|experiencias}/{slug}`. Las tres URLs planas de tour
(`/actividades/tour-ombu` y hermanas) redirigen **308** desde `next.config.ts`; las URLs
padre de categoría redirigen **307**, a propósito: sus landings están planificadas y un
308 cacheado en los navegadores impediría estrenarlas.

**Agregar una actividad** cuesta un objeto en `data/activities.ts` y un bloque en
`activities.items` de **los tres** archivos de `messages/`. Nada más: ruta, sitemap,
submenú del navbar, menús de las tarjetas-puerta y JSON-LD se derivan de esos datos.

**Las tres tarjetas-puerta son una sola lista** (`categoryDoors`), y el menú que despliegan
es un solo componente (`components/CategoryMenu.tsx`). Están en dos páginas —el mosaico A4
del Inicio y la sección D3 del índice— y hasta el 2026-08-21 la lista vivía duplicada en las
dos: las de D3 desplegaban su categoría y las del Inicio llevaban a `/actividades`, o sea a
la página donde están estas mismas tarjetas. Si una puerta nueva se agrega, se agrega una vez.

**Las traducciones no son opcionales.** next-intl no falla cuando falta una clave:
`getMessageFallback` devuelve la ruta de la clave y la página se publica mostrando
`activities.items.pizzas.name` en pantalla. Pasó de verdad —tres portadas salieron así de
un build verde— y por eso existen `tests/actividades-i18n-parity.test.mjs` y
`tests/actividades-namespace-source.test.mjs`.

`tests/alias-hook.mjs` enseña a `node --test` el alias `@/` de tsconfig. Sin él, todo
módulo que use el alias solo se puede cubrir con un guard que lee su propio texto.

**Medición tras el hub de Vendimia:** build limpio, **112 páginas estáticas** (Turbopack las
genera en 805 ms con 15 workers). El sitemap emite **105 URLs**, 42 de ellas fichas de
actividad y 3 el hub. El costo por página resultó marginal, como se había estimado: el trabajo real
fue el copy en tres idiomas.

El catálogo son **14 actividades**: 3 tours, 3 talleres y 8 experiencias. Publican precio los
3 tours y —desde el 2026-08-21— los **3 talleres, a 39.900 por persona los tres**; las 8
experiencias siguen sin cifra, así que sus fichas salen en modo cotización. Publicar el
precio no es sólo un número en pantalla: la ficha pasa de "precio a consultar" a mostrarlo,
el formulario cambia de cotización a reserva y el JSON-LD estrena un `Offer`. El orden dentro
de cada categoría es el del catálogo del cliente y **se ve en pantalla** (bloque "otras
actividades de la misma categoría").

**Las 14 fichas están a un salto desde cualquier página** (plan 3). Medido sobre el HTML del
build, no en el navegador: `/es/contacto`, `/es/historia`, `/es/staff`, `/es/tienda` y
`/es/vinos` traen las 14; antes traían **cero**. Ninguna ficha queda sin enlaces entrantes.

El desplegable de Actividades que existía **nunca contó como enlazado interno**: se montaba
con `{activitiesMenuOpen && <panel/>}` y el estado arranca cerrado, así que sus enlaces no
llegaban al HTML servido. Es la trampa que da nombre a `tests/navegacion-enlaces-source.test.mjs`:
**los paneles se renderizan siempre y se ocultan con el atributo `hidden`**, nunca se montan
por estado. Se rompe sin síntoma visible — la interfaz sigue funcionando y el crawler deja de
ver los enlaces.

Ojo con `hidden`: aplica `display:none` desde la hoja del navegador y **cualquier clase de
display lo pisa**. El elemento que lo lleva no puede traer `flex`, `grid` ni `block`; la
grilla va en un hijo. El test también lo afirma.

**Copy sin validar por el cliente.** De cada actividad, el `intro` es texto del catálogo
verbatim; `name`, `description`, `tagline` y `closing` los escribimos nosotros porque el
catálogo no los trae. EN y PT, además, sin validación humana como el resto del sitio.

**Las actividades nuevas no llevan `highlights`.** Ese array lo lee un solo lugar
(`app/[locale]/actividades/page.tsx`, dentro de `tours.map`), así que escribirlo para las
otras once serían 90 strings en tres idiomas que nada renderiza. Se escriben cuando las
tarjetas del plan 3 los necesiten. Los de `pizzas` quedaron de antes y tampoco se muestran.

**Fotos:** el **Taller de mimbre** ya tiene material propio (2026-08-19): ocho fotos de un
taller real, una por ranura de la ficha —hero, bajada, tarjeta de reserva, galería de
cuatro y panel del formulario— y ninguna repetida. Entran por `photos` en
`data/activities.ts`, con los `alt` en los tres bundles bajo
`activities.items.mimbre.photos`; el pipeline es `npm run fotos:mimbre` (ver
[`FOTOS.md`](FOTOS.md)) y `tests/actividades-fotos.test.mjs` cruza archivo, `alt` y
proporción. La ficha aprendió a usarlas sola: sin `photos` sigue exactamente como estaba.

Las otras 10 fichas nuevas siguen compartiendo dos imágenes de categoría (`talleres.jpg` y
`pareja-columpio.webp`), que son hero, tarjeta de reserva y `og:image` a la vez; en las
experiencias esa foto aparece además tres veces en la misma página. **Aceptado por el
cliente**, que va a entregar fotos por actividad. Cuando lleguen, cada una es un bloque
`photos` como el de mimbre, sin tocar componentes.

**Anclas de categoría:** solo `tours` tiene en el índice una sección que lista su categoría,
así que es la única cuya miga lleva fragmento. Talleres no tiene sección y la que se llama
Experiencias son tres tarjetas-puerta donde no está ninguna de las ocho experiencias. La
regla vive en `CATEGORIES_WITH_INDEX_ANCHOR` (`data/activities.ts`) y la afirman las tres
superficies que llevan ese enlace —miga visible, `BreadcrumbList` y redirect de URL padre—
en `tests/actividades-anclas.test.mjs`. Cuando el plan 3 estrene las secciones, el test se
pone rojo hasta que la lista las reconozca.

**Tres cosas que preguntarle al cliente:**
- *Cena Sensorial* es la única actividad sin lista de contenidos: el catálogo habla de
  "cinco tiempos" y no los enumera. Su ficha sale sin bloque de detalle a propósito. Si
  llegan los cinco tiempos, entran como `program`.
- Los tres talleres de cocina declaran "Cocción en horno tradicional", incluido el de
  ñoquis, donde el plato se hierve. Se transcribió tal cual.
- El catálogo da "3 horas + cierre" para *Cosecha tu historia*, que a la vez describe un
  ciclo completo de poda a embotellado. Se transcribió tal cual; probablemente sean las
  horas de cada jornada.

## Hub de Vendimia (`/actividades/vendimia`)

Existe desde el 2026-08-16. Es una **página informativa**, no una ficha: cuenta qué es la
vendimia, dibuja el ciclo de la vid —las cinco etapas salen del propio catálogo, de las
inclusiones de *Cosecha tu historia*— y recién después ofrece la jornada *corta, pisa y
celebra*, que por eso **no tiene ficha propia**: dos páginas nuestras compitiendo por la
misma búsqueda es peor que una.

**No publica fechas, precio ni mínimo de personas, y es una decisión, no un pendiente.** La
cosecha depende de la maduración de la uva y la viña confirma cada jornada por temporada; el
material que había (una publicación de Instagram) era de la temporada pasada, con fechas y
preventa ya vencidas. El único dato de calendario es la franja de meses, que sale de
`VENDIMIA_MONTHS`. Lo afirman doce tests en `tests/vendimia-hub.test.mjs`, incluido uno que
falla si aparece un `$` o un día concreto en el copy de cualquiera de los tres idiomas.

Por lo mismo el structured data va como `WebPage` + `BreadcrumbList` y no como `Event` ni
`Product`: el primero exige `startDate` y el segundo un precio.

`VENDIMIA_HUB` sigue siendo el interruptor: si vuelve a `null`, la página desaparece del
mega-menú, de la banda del índice y del sitemap a la vez. Antes esa constante existía pero
**ninguna superficie la leía** — el handoff afirmaba lo contrario.

El formulario estrena un **tercer modo, `temporada`**, y no es cosmético: nadie pide una
cotización de una jornada que se repite todos los años. En ese modo el formulario dice
"guarda tu lugar para la próxima fecha", **no muestra el campo de fecha** —no hay día que
elegir todavía— y manda `tipo=temporada` a Netlify, así la viña distingue ese lead del que
pide precio. Los otros dos modos (`reserva`, `cotizacion`) quedaron igual.

Va además **sin `minPeople`**, que pasó a ser opcional en `ActivityReservationForm`: el campo
arranca vacío y no muestra la ayuda "desde N personas". Poner 1 para rellenar el hueco habría
afirmado un mínimo que el cliente no dio.

Su hero es la única foto propia de una actividad que no es tour: aérea del grupo en el
viñedo, servida en tres anchos WebP. Sin encuadre vertical a propósito y con el `sizes` en
`vh` — el detalle y las mediciones están en [`FOTOS.md`](FOTOS.md).

**Todas las fotos de la página salen de material real** (ocho de ellas, de una vendimia de
verdad, desde el 2026-08-18 — ver más abajo). No hay stock ni fotos de otras actividades
haciéndose pasar por vendimia; los `alt` describen lo que se ve y el del asado —la única
prestada que queda, de la galería de contacto— no afirma que sea de una vendimia. Por eso
**el hub no usa `GalleryPlaceholder`**: su galería tiene fotos de verdad, y el placeholder
de marcos vacíos se quedó solo en las 14 fichas.

**Ritmo visual:** el resto del sitio es claro y parejo, y esta página alterna — las dos
secciones de contexto (qué es la vendimia, el ciclo de la vid) van en penumbra sobre
`--color-primary`, con las fotos grandes encima, y vuelve a la luz para la jornada, la
galería y el formulario. Son los mismos tokens del sistema con otra intensidad, no una
paleta nueva.

**Fotos propias desde el 2026-08-18.** Llegaron ocho de una vendimia real y desplazaron a
casi todas las prestadas: el tríptico vertical de Dv2 (mosto, racimo en la mano, pisoneo)
reemplazó la única foto apaisada, Dv4 pasó a ser un carrusel —el mismo `CollectionPhotos`
de las bandas de /vinos, con el desayuno primero y el asado segundo—, la galería de Dv6
cambió sus tres verticales por gente cosechando, y Dv7 estrena la gamela roja al pie de la
parra. De la aérea sólo queda en pie `vendimia-grupo`, la apertura de la galería.

`CollectionPhotos` acepta ahora `alt` como arreglo, una por foto. En /vinos todas las fotos
de una banda son la misma colección y un `alt` común alcanza; acá son dos escenas distintas
y prestarle a una el texto de la otra le describiría a quien no ve algo que no está en
pantalla. Las medidas, los anclajes de recorte y las dos trampas (orientación EXIF y el
`object-position` de Dv7) están en [`FOTOS.md`](FOTOS.md).

**Lo que le falta:** fechas y precio de la próxima temporada, y la validación del copy, que
en ES es nuestro salvo el programa y el ciclo, y en EN/PT no lo vio una persona — los ocho
`alt` nuevos entran en esa misma deuda.

**Pendiente tras el plan 3:**
- **Las tarjetas del mosaico `A4` (home) siguen sin selector.** Las de `D3` (índice) sí lo
  tienen. Convertir las de la home exige que `HomeActivitiesShowcase` ramifique sus dos rutas
  de render, y ese componente ya está en 328 líneas mezclando filtros, mosaico y banner — el
  spec dice explícitamente no refactorizarlo en este trabajo. Sus tarjetas de experiencia sí
  dejaron de apuntar al ancla `#experiencias`, que no lista la categoría. No es un agujero de
  enlazado: el mega-menú está en la home igual que en el resto del sitio.
- **`ActivitiesTabs` sigue con sus tres pestañas escritas a mano**, sin Talleres. Se resuelve
  con la reestructuración del índice, que el cliente no aprobó.

**Detalle de UI anotado, sin resolver:** en una ficha de experiencia se apilan tres
encabezados antes del contenido —"¿Qué incluye?" → "Durante la experiencia disfrutarás de:"
→ "Programa de la jornada"— donde en un taller son dos. El tercero lo trae
`ActivityProgram`. No es incorrecto, pero sobra un nivel.

---

## Catálogo — qué manda el panel y qué manda el repo

Desde la Etapa D (M3, 2026-08-27) el sitio **no tiene ninguna lista de valores escrita a
mano que gobierne el catálogo**. Las líneas, los tipos, las cepas, los grupos de cepa, los
niveles y los campos de la ficha técnica los publica Afeleia en `definiciones_atributos`, y
el sitio se dibuja con eso. Antes, esas listas vivían en `data/wines.ts` y **validaban**: una
línea creada en el panel no existía para la web, y la ficha técnica cargada en el panel no
se dibujaba en ninguna parte.

### La frontera, que es la regla que hay que entender

| Vive en el panel | Vive en el repo |
|---|---|
| Descripción, notas de cata, maridajes, ficha técnica, precio, stock, foto | Fotos de ambiente de cada colección (`lineMeta`), anclas de URL (`lineSlugs`), secuencia editorial (`collectionLines`) |
| Los valores admitidos de cada atributo | El **vocabulario de la plantilla**: «Tinto», «Composición», «Ficha técnica», traducido en los tres idiomas |

**El contenido del cliente ya no pasa por next-intl** (regla R1 del founder). La consecuencia
está aceptada y es visible: un visitante en inglés o portugués ve esos textos en español
hasta que el panel tenga módulo de traducciones. Lo que sí se traduce son las etiquetas del
sitio, y ahí la traducción curada gana; si no existe, se muestra la etiqueta publicada — pero
**nunca una clave de i18n cruda**, que es lo que `labelOr` y `translatedOr` existen para
evitar.

**Única excepción reconocida, y queda como deuda:** el copy de marca de las seis colecciones
(`vinos.lineDescriptions.*`) sigue en el repo. Afeleia hoy no tiene dónde guardarlo: las
líneas son *valores de un atributo*, no entidades con contenido propio. Cerrarlo exige un
módulo de colecciones, fuera del alcance del M3.

### El invariante que sostiene `/vinos`

> **Todo producto del catálogo aparece en `/vinos`, en `/tienda` y en `/vinos/<slug>`,
> cualesquiera sean sus atributos.**

Las bandas de `/vinos` solo existen para las seis líneas curadas, porque necesitan activos de
diseño que la API no puede tener. Un producto de una línea desconocida —o **sin línea, que es
como nace en el panel**— cae en la sección «Otros vinos», que solo se dibuja cuando tiene
algo que mostrar. La regla es `winesOutsideLines` en `lib/afeleia/contract.ts` y está fijada
por test, incluido el caso `line === undefined`.

### Qué URLs anuncia el sitemap, y cuáles no

`app/sitemap.ts` arma las fichas de producto **con el catálogo publicado**, no con la lista de
`data/wines.ts`. Hasta la Etapa E esa lista era la fuente: un producto cargado en el panel
tenía página —`generateStaticParams` sí lee el catálogo— pero no entraba al listado que lee
Google. Existía y era invisible; y al revés, un vino retirado del panel seguía anunciándose
mientras estuviera escrito en el repo.

Las reglas viven en `lib/sitemap.ts`, aparte de la página, porque `lib/afeleia/catalog.ts`
importa React y el snapshot y `node --test` no puede cargarlo. Son tres:

1. **Categoría.** Se anuncian los productos que `/vinos` muestra: la categoría `vinos` y los
   que **no declaran ninguna** (`excludingOtherCategories`, la misma puerta de `a8d34b8`). Los
   que no son vino tienen ficha viva en `/vinos/<slug>` pero **no se anuncian**: su dirección
   definitiva es una decisión abierta del cliente, y una URL que Google ya indexó no se mueve
   sin arrastrar una redirección para siempre. Anunciarla hoy sería tomar esa decisión sin
   tomarla. ⚠️ **El sitemap no impide que se indexen**: `/tienda` las enlaza y el crawler sigue
   enlaces. Cerrar esa puerta —`noindex` hasta que tengan sección propia— va con la etapa que
   decida sus URLs.
2. **Slug.** El `slug` lo escribe el cliente en el panel y el contrato solo exige que sea un
   string no vacío. Lo que no sea un segmento de URL (`../`, espacios, `?`, `#`, `%`, `//`, una
   URL entera) **no se anuncia**, y el descarte se grita en el log del build. Es una lista de
   permitidos —letras de cualquier alfabeto, dígitos, `- _ . ~`— porque con una de prohibidos
   cada carácter que nadie previó es un agujero. Las tildes y la eñe entran: dejar afuera un
   producto real lo vuelve invisible para Google, y un chequeo que reprueba lo correcto es peor
   que no tenerlo. Un slug envenenado **no rompe el build**: se descarta y el sitio se despliega.
3. **Tope.** 50.000 URLs es el máximo del estándar y pasarlo invalida el archivo entero, así
   que el exceso se corta —por ruta, nunca dejando una página anunciada en dos idiomas de
   tres— y se avisa. Hoy el sitio va por 108 URLs. Cuando esto se acerque al tope, la salida es
   `generateSitemaps()`.

El sitemap se revalida cada 60 segundos, igual que las fichas que anuncia: sin eso quedaría
congelado en el build y un producto nuevo tendría ficha viva y URL ausente hasta el próximo
deploy, que es el mismo bug con otro disfraz. Sigue **sin `lastmod`**: el contrato v1 no
publica `updated_at` por producto y `generado_en` es cuándo se armó el catálogo entero, no
cuándo cambió esa ficha. Un `lastmod` falso es peor que ninguno.

### Modo degradado: qué pasa cuando Afeleia no responde

Hay **cuatro puertas** que mandan el sitio a servir su copia local, y todas terminan en la
misma función (`degraded` en `lib/afeleia/catalog.ts`): la API no contesta o tarda más de 10
segundos, responde un HTTP no-ok, responde algo que no cumple el contrato, o responde el
catálogo **de otro sitio**. Esa última se agregó tras la review: una respuesta ajena publicaría
nombres y precios de otro cliente, y el catálogo propio de ayer le gana al ajeno de hoy.

Tres reglas que conviene no «arreglar»:

1. **Un bloque de definiciones malformado NO invalida el catálogo.** `sanitizeDefinitions`
   devuelve `[]` y el sitio sigue sirviendo la API. Las definiciones son una mejora; los
   productos son el producto. Si un bloque roto empujara al sitio a modo snapshot, un error
   en la parte menos importante de la respuesta dejaría la tienda entera con precios viejos.
2. **`optionsFor` es el único lugar donde se razona el modo degradado de las listas.** Sin
   definiciones —un snapshot viejo— cae a las listas de `data/wines.ts`. Esas listas quedaron
   degradadas de *autoridad de validación* a *fallback y fuente de siembra del importador*:
   **no se agregan valores nuevos ahí**, un valor nuevo se crea en el panel.
3. **El snapshot committeado se valida antes de servirse.** Uno corrupto se sirve como
   catálogo vacío y ruidoso, en vez de reventar `generateStaticParams` y con eso el build:
   vacío se arregla, caído no.

### El snapshot se refresca solo, y no puede impedir desplegar

`prebuild` (`scripts/catalogo-snapshot-build.mjs`) consulta la API antes de cada `next build`
y reescribe `data/catalogo-fallback.json`. **Si la API no responde, el build NO falla:** avisa
y conserva la copia committeada. Una caída de Afeleia no puede además impedir desplegar —
sería convertir una caída en dos.

Lo que el generador **se niega** a escribir: una respuesta de otro sitio, una que no cumpla el
mismo contrato que exige el runtime, una vacía, o una que tarde más de 15 segundos. El
reemplazo es de todo o nada —temporal + `rename`— y si algo falla en el medio restaura el
estado anterior de los dos archivos.

El HTML publica `<meta name="afeleia-catalogo" content="api|snapshot" data-generado="…">`. La
fecha es lo que permite afirmar **desde afuera, sin logs y sin acceso a la base**, «este sitio
lleva N días sirviendo una copia vieja». Con un sitio se puede mirar a mano; con cien, es lo
único que escala.

### Deterioro conocido: las fotos del modo degradado

El snapshot reapunta cada foto a `public/vinos/<archivo>` **solo si ese archivo existe
committeado**; si no, conserva la URL de Storage y avisa. Los 13 vinos originales los sembró
el importador con nombres por slug (`bera.png`) y tienen su copia local. **Un producto creado
desde el panel no la tiene** —su foto se llama con un timestamp— así que en modo degradado
esa imagen se le pide al mismo host que se acaba de caer.

Medido el 2026-08-27: 13 de 14 productos con copia local; el único sin ella es el creado desde
el panel. No rompe la página —el resto se dibuja igual— pero **el número empeora solo** a
medida que el cliente cargue productos, y el aviso del generador se pierde en el log de un
build que nadie lee. Cerrarlo de verdad implicaría bajar las fotos al repo en cada snapshot,
que es un cambio más grande y con binarios de por medio.

### Topes conocidos

La API corta en **1000 productos** y **200 definiciones** por sitio, y registra un evento al
truncar. El sitio, por su lado, **carga el catálogo entero en cada render**: hoy son 18 KB con
14 productos (~1,2 KB por producto), o sea que el tope de la API proyecta ~1,15 MB por
respuesta. Para esta viña sobra; paginar exigiría subir el contrato a v2 y no es algo que este
repo pueda decidir solo.

---

## Lo que falta para producción

**Decisiones abiertas del cliente (2026-08-20):**

- El aviso de consumo moderado dejó de estar permanente en pantalla cuando se rehizo el pie
  (ver más arriba). Falta confirmar si vuelve a la línea de cierre.
- La foto de la capa de +18 usa un recorte vertical de 1125px de ancho, bajo el ideal de
  ≥1440 para un teléfono a DPR 3, porque sale del master horizontal. Se resuelve con una
  toma vertical propia, si llega.
- `/tienda` es la última página con encabezado de sólo texto. `/contacto` estrenó hero el
  2026-08-21 con la foto de la mesa larga de noche (`actividades/eventos.jpg`), que **ya se
  usa como card de Eventos en A4 y D4**: es su tercera aparición y sale de que no hay
  original suelto para esta página. El master mide 2000px, así que el candidato de
  escritorio llega a 1920 y el recorte vertical a 750 — bajo el ideal para un teléfono a
  DPR 3. Con una toma propia (o el original del letrero de entrada, que sería el motivo más
  fiel para esta página) se agrega a `_fuentes-fotos/` y se regenera con
  `npm run foto:heros`, sin tocar la página.

**Infraestructura de SEO:**
- ~~No hay `app/sitemap.ts` ni `app/robots.ts`~~ → hechos. El sitemap emite 69 URLs
  (23 rutas × 3 locales) con el set completo de hreflang + `x-default`, y sale de `data/`,
  así que agregar un vino o un tour lo incluye solo. Va **sin `lastmod`** a propósito: no
  existe fecha real de modificación y estampar la hora del build entrena a Google a ignorar
  el campo. Cuando el catálogo traiga `updated_at` desde Afeleia, se agrega.
- ~~`metadataBase` y `SITE_URL` apuntan al dominio de preview de Vercel~~ → resuelto:
  ambos leen `lib/siteUrl.ts`. **Falta definir `NEXT_PUBLIC_SITE_URL =
  https://vinacasaacosta.cl` en Netlify y redeployar** — sin eso los canonical siguen
  saliendo con el dominio `*.netlify.app`.
- ~~Canonical roto en todo el sitio~~ → resuelto. Las 78 páginas declaraban **la home**
  como su canónica (solo `/actividades` estaba bien): `alternates` vivía en el layout y se
  hereda entero, así que toda ruta que no lo redeclarara heredaba el de la portada. Google
  lo lee como "indexá una sola página". Ahora cada ruta lo declara con `alternatesFor()`
  de `lib/alternates.ts` y el layout ya **no** lo trae — si una ruta nueva se olvida, queda
  sin canonical (Google se auto-canonicaliza) en vez de apuntar mal.
- ~~`/tienda` no tiene metadata: es `"use client"`~~ → tiene su `layout.tsx` con el
  canonical. **Sigue faltando la clave `metadata.tienda`** en `messages/*.json`: hasta que
  exista, hereda el title y la description genéricos del sitio. Es copy y necesita
  validación del cliente, por eso no se inventó.
- Las fichas de vino y tour ya emiten su propio Open Graph (antes compartir un vino por
  WhatsApp mostraba el título y la foto genéricos del sitio). Ojo: `tour-ombu` y
  `tour-bera` todavía usan fotos de Unsplash como `og:image`.
- ~~JSON-LD solo en `/vinos` (`ItemList`)~~ → las cinco páginas principales (inicio,
  historia, vinos, actividades, contacto) emiten un `@graph` con la viña como
  `["Winery","LocalBusiness"]` — NAP, horario, coordenadas y `sameAs` — más el tipo de
  página que corresponde (`WebSite`, `AboutPage`, `CollectionPage`, `ContactPage`). Los
  tours de `/actividades` van como `Product` + `Offer` con precio, porque el precio se ve
  en la grilla. Todo en `lib/siteJsonLd.ts`.
  - Las **coordenadas** salen del propio listado de Google del negocio (el link del
    footer resuelve a `@-34.465133,-71.009675`), no de un geocode adivinado.
  - **Sin `aggregateRating`**: no hay reseñas propias publicadas y copiar las de Google
    sería marcado falso. **Sin `availability`** en las ofertas de tours: se reservan y
    tienen mínimo de personas, así que afirmar "InStock" diría algo que el sitio no dice.
  - **Sin `BreadcrumbList`**, y es a propósito: no existe un breadcrumb visible en
    ninguna página. Google pide que el schema refleje un rastro que el usuario ve. Si se
    agrega esa UI, el schema se suma en una línea.
  - **Sin `SearchAction`** en `WebSite`: el sitio no tiene buscador.
- Falta todavía `Product` + `offers` en la **ficha individual** de cada vino. Los precios
  ya son reales, así que es la pieza con más retorno comercial que queda pendiente.
- ~~Dos helpers para escapar el JSON-LD~~ → unificado al mergear `main`. Quedó
  `serializeJsonLd()` de `lib/jsonLd.ts`, y **el único emisor sancionado es
  `<JsonLd data={...} />`** (`components/JsonLd.tsx`). El `jsonLdHtml()` que traía la rama
  de SEO se borró y sus cinco bloques pasaron por el componente. No volver a escribir
  `application/ld+json` a mano: `tests/json-ld-source.test.mjs` falla si aparece en
  cualquier archivo que no sea `JsonLd.tsx`.
- ~~Deriva de NAP entre el footer y `/contacto`~~ → resuelto: el footer dice "O'Higgins" y
  trae el horario vigente en los tres idiomas, igual que `/contacto` y que el
  `OpeningHoursSpecification` del schema. **Horario vigente desde el 2026-08-19:**
  lunes a viernes de 08:00 a 16:30, sábados de 08:00 a 12:00 y de 13:00 a 17:00 (el
  sábado se confirma por teléfono). Se fue la excepción del jueves. El sábado va en
  **dos** bloques de schema y no en uno corrido de 08:00 a 17:00: el corte de mediodía
  existe, y declararlo seguido promete una hora en que no hay nadie.
- ~~`app/[locale]/vinos/page.tsx` pide `quality={84}`~~ → ya no: la página no declara
  `quality` en ninguna imagen y el build del 2026-08-20 no emite el warning. La lista de
  `next.config.ts` sigue siendo `[65, 70, 75, 85, 95]`.

**Catálogo:** los 13 precios reales llegaron el 2026-08-03 y están aplicados en el repo
(`data/wines.ts` y `data/catalogo-fallback.json`), pero **falta cargarlos en el panel de
Afeleia**: desde el M3 el precio sale de `producto.precio` de la API
(`lib/afeleia/catalog.ts`), así que mientras la API responda el visitante sigue viendo los
precios inventados de la demo. Ojo con el orden al hacerlo: el respaldo de hoy está editado
a mano y `npm run catalogo:snapshot` lo sobrescribe con lo que diga el panel. La lista y su
mapeo a cada producto están en
[`../CONTENT_BRIEF.md`](../CONTENT_BRIEF.md#2-texto-de-cada-vino).

**Tienda — compra mínima:** desde el 2026-08-17 el pedido no se puede cerrar con menos de
**6 botellas**, sumando todo el carrito (seis etiquetas distintas cumplen). El número es
`MIN_BOTTLES` en `lib/cart.ts` — está ahí, y no en el cajón, porque es una regla del
negocio y cualquier superficie que la anuncie tiene que leer el mismo valor. Las líneas
agotadas no cuentan, igual que no suman al total estimado. **Pendiente:** hoy la regla
sólo se descubre al abrir el carrito; falta anunciarla en la tienda y en la ficha de cada
vino (una cadena nueva en tres idiomas) para que nadie llegue al cierre con la sorpresa.

**El consentimiento cubre dos documentos desde el 2026-08-21.** La casilla decía "He leído y
acepto la Política de Privacidad" y ahora dice **"Acepto los términos y condiciones y estoy
de acuerdo con las políticas de privacidad"**, con los dos PDF enlazados (`TERMINOS_PDF` y
`PRIVACIDAD_PDF` en `lib/legal.ts`). El envío pasó a llevar **dos** campos de versión
—`terminos` y `privacidad`—, declarados en `public/__forms.html`: si el archivo no se
deployea con el campo nuevo, Netlify lo descarta en silencio y el registro dice qué política
se aceptó pero no qué términos. El texto en inglés y portugués es traducción de trabajo, como
el resto del copy EN/PT: falta validación humana.

**Legal (actualizado 2026-08-18):** el footer enlaza **tres documentos**, todos en
`public/documentos/` y **sólo en español**: `politica-de-privacidad.pdf` (v1.1),
`politica-de-cookies.pdf` (v1.2) y `terminos-y-condiciones.pdf` (v1.0), los tres con
vigencia 16-08-2026. El mapa `documentosLegales` de `Footer.tsx` es la única fuente: un
idioma sin archivo propio deja su etiqueta como texto, y `tests/legal-docs-source.test.mjs`
falla si un enlace apunta a un PDF que no está en `public/` — el modo de falla real, porque
un renombre no se ve en pantalla y devuelve un 404 donde debía estar la política.

Tres cosas que los documentos afirman y el sitio todavía no hace, anotadas para no
descubrirlas en una fiscalización:

- La política de cookies describe el **flujo de pago con Checkout Pro de Mercado Pago**
  (cookie de "pedido en curso" incluida) como configuración vigente. Hoy el carrito deriva
  a WhatsApp y no existe ese flujo.
- Declara una **cookie propia de idioma**. next-intl lleva el locale en la URL
  (`localePrefix: "always"`) y el sitio no escribe esa cookie.
- Su tabla de tecnologías es una **lista cerrada** (idioma · pedido · carrito · Mercado
  Pago). Cualquier cosa nueva que se guarde en el navegador —la marca del gate de +18, por
  ejemplo— pide una fila más en una v1.3.

El aviso de consumo moderado **sí existe** en los tres idiomas: es `ageGate.legal` ("Bebe con
moderación · Prohibida la venta de alcohol a menores de 18 años · Ley N° 19.925"), al pie de la
tarjeta de +18, y la tienda repite el suyo en `tienda.disclaimer`. Vivía además en el pie como
`footer.disclaimer`, que **se quitó el 2026-08-19** junto con el rework del pie: hoy el aviso no
está permanente en pantalla, y quien ya confirmó su edad no lo vuelve a ver en 30 días.
**Pendiente de confirmar con el cliente** si vuelve a la línea de cierre del pie.

**Verificación de edad (+18) desde el 2026-08-18** — `components/AgeGate.tsx`, montada en el
layout, sobre todas las páginas y recordada 30 días en `localStorage`. Lo que hay que saber
antes de tocarla:

- **Es una capa encima del HTML servido, no un reemplazo.** El contenido de las 112 páginas
  sigue completo en el DOM y no existe ninguna ruta `/edad`. Si alguien la convierte en un
  redirect o en un `display:none` sobre `<main>`, el sitio deja de ser indexable.
- **Quién decide que se vea.** El servidor no sabe si este visitante ya confirmó, así que la
  capa se sirve siempre y arranca oculta por CSS; un script inline del layout marca
  `<html data-age-gate="pendiente">` antes del primer pintado cuando no hay confirmación
  vigente. Montarla al hidratar mostraría la página entera primero, y ocultarla al hidratar
  la haría parpadear a quien ya confirmó.
- **El componente lee ese atributo con `useSyncExternalStore`**, no con un `setState` en un
  efecto: el dato vive fuera de React y el render del servidor tiene que decir "pendiente"
  para que el marcado exista. La regla `react-hooks/set-state-in-effect` rechaza lo otro.
- **Sin JavaScript no aparece**, a propósito: sus botones lo necesitan y mostrarla dejaría el
  sitio bloqueado sin salida.
- **Es una foto a sangre, no una tarjeta (2026-08-20).** Pasó por las dos formas el mismo
  día: la tarjeta dejaba la foto como miniatura de 320px y ponía tres líneas de texto al
  lado, y al comparar con Montes y Viña Santa Cruz —donde la foto es la pantalla— se vio
  que sobraba texto y faltaba imagen. Hoy la capa es la foto de los racimos con hojas
  moradas (`public/images/edad/uvas-*`, entra por `npm run foto:heros`), con el mismo
  `<picture>` de dirección de arte que los heros, dos velos medidos para que la foto se
  siga viendo, y encima sólo el logo, el idioma, la pregunta y dos botones. **Se eliminó
  `ageGate.body`** —el párrafo que explicaba la ley— en los tres bundles: lo dice la línea
  legal en una frase.
- **El selector de idioma vive dentro de la capa desde el 2026-08-20.** La pregunta llega
  antes que el sitio, así que el selector del navbar todavía no se puede tocar: quien entraba
  por `/en` tenía que confirmar su edad en español. Usa la variante `gate` de
  `LanguageSwitcher` —la `mobile` son tres botones también, pero pintados para el panel oscuro
  del menú— y el foco inicial apunta a `[data-age-gate-principal]`, para que el teclado
  empiece contestando la pregunta y no eligiendo idioma.

**Consentimiento de privacidad en los formularios**, misma fecha: `components/PrivacyConsent.tsx`
es una casilla `required` —no un botón deshabilitado, que no explica qué falta— y viaja como
campo `privacidad` con la **edición aceptada** (`PRIVACIDAD_VERSION` de `lib/legal.ts`, hoy
"v1.1 (16-08-2026)"), para que el registro diga qué se aceptó y no sólo que se aceptó. En
`en` y `pt` enlaza el PDF en español y la etiqueta lo advierte: es lo contrario de la regla
del footer, y la diferencia es que ahí se *ofrece* un documento y acá se *pide aceptarlo*.

⚠️ **El campo nuevo hay que declararlo en `public/__forms.html`** o Netlify lo descarta en
silencio. Eso ya no depende de que alguien se acuerde: `tests/netlify-forms-paridad.test.mjs`
compara campo por campo lo que envía cada componente contra lo declarado, en los dos
sentidos.

Historia previa:

**Legal:** Términos y Condiciones **sí existe** desde el 2026-08-17:
`public/documentos/terminos-y-condiciones.pdf` (v1.0, vigencia 16-08-2026), enlazado desde
el footer **sólo en español** — en `/en` y `/pt` la etiqueta sigue siendo texto, porque
enlazar un documento que el visitante no puede leer promete algo que no se cumple; el mapa
de idiomas está en `Footer.tsx`. El nombre del archivo es estable a propósito: una v1.1 lo
reemplaza sin tocar el enlace. **Pendiente:** el propio documento dice que esta edición es
"para publicación y adaptación web", y un PDF enlazado desde el pie es ilegible para Google
y para los buscadores de IA — falta la página `/terminos` con el texto, y lo mismo vale hoy
para privacidad y cookies. **Mapa de Sitio** sigue sin existir (texto sin enlace, a
propósito). La **verificación de edad** tampoco existe todavía: es lo que falta para cerrar
la Ley 19.925, que el aviso del footer ya cubre en su otra mitad.

**Medición:** cero analítica instalada.

**Assets:** las botellas de `public/vinos/` son 500×500 y se ven blandas en la ficha, salvo
**Lajau Betúm Yú y Estación Francia Tannat**, reemplazadas el 2026-08-17 por masters HD de
1000×1000 que pesan lo mismo que las viejas (84 y 96 KB). Sus fuentes sí están en el disco
(`_fuentes-fotos/`, fuera del repo) y las procesa `npm run fotos:botellas`: recorta la
transparencia, escala por la botella real y la centra en un cuadrado con el 94% del alto,
que es la proporción medida sobre las botellas ya publicadas. Para las once restantes
alcanza con poner su fuente en esa carpeta y sumar dos líneas a la lista del script. Los
originales de las fotos ya optimizadas **no están en el disco** (los tiene el cliente en su
respaldo en la nube): hasta que se repongan no se puede regenerar nada salvo el hero de la
home, cuyo master de desktop sí está versionado. Los `.webp` están todos versionados, así
que el sitio funciona. Qué archivo espera cada script está en [`FOTOS.md`](FOTOS.md).

**i18n:** el copy EN/PT lo tradujo un agente y **nunca lo validó una persona**. Lo agregado
el 2026-08-17 entra en la misma deuda, con una distinción útil para quien revise: los puntos
nuevos de las tarjetas de tour son **recortes** de oraciones ya traducidas en el mismo
archivo (`includes` → "Copa de bienvenida Berá Rosé"), mientras que las tres líneas de
degustación (`3 wines: reserva and blend`, `Degustação de toda a coleção`…), el aviso de
grupo bajo el mínimo y el de compra mínima son **redacción nueva**. Ese segundo grupo es el
que hay que leer con ojo.

---

## Trampas técnicas ya pagadas (no repetirlas)

- **El navbar decide su color con una lista de rutas escrita a mano.** `hasDarkHero` en
  `components/Navbar.tsx` enumera las páginas que abren con foto a sangre; sobre ellas el
  header va transparente con texto claro. Staff estrenó hero el 2026-08-20 y no se agregó a
  la lista: quedó texto oscuro sobre una foto oscura, invisible hasta que el scroll volvía
  opaco el header. **Cuando una página estrena o pierde su hero full-bleed, esa lista se
  toca en el mismo commit.**
- **El texto de los heros va centrado en el alto de la pantalla, así que la longitud de la
  bajada mueve el título.** Una bajada de una línea deja el bloque 32px más corto que una de
  dos, y el título 16px más abajo — se nota al cambiar de página. Staff reserva la segunda
  línea (`minHeight: "3.2em"`) para calzar con Historia y Vinos. Si alguna de esas dos pasa
  a una sola línea, el desalineado vuelve al revés; la solución de fondo es anclar el texto
  por arriba en los tres, y está pendiente.
- **`npx prettier` no es seguro en este repo**: no hay configuración, así que corre a 80
  columnas y el código está escrito a ~100. Formatear un archivo al pasar reescribe decenas
  de líneas ajenas al cambio. Se formatea a mano.

- **Caché de imágenes**: si se reemplaza una foto manteniendo el nombre, el navegador y el
  optimizador de Next siguen sirviendo la vieja. Convención: sufijo `-vN` en el archivo
  (ver el encabezado de `scripts/optimize-fotos.mjs`).
  - **Las botellas son la excepción y hay que saberlo antes de desplegar.** No pueden
    versionar el nombre: el catálogo apunta a `/vinos/<slug>.png` y esa ruta llega por la
    red desde el panel de Afeleia, así que renombrar acá deja la ficha sin foto en
    producción. Las dos reemplazadas el 2026-08-17 (Betúm Yú y Estación Francia Tannat)
    **necesitan purgado de caché en Netlify** en el primer deploy que las lleve.
- **Un color nuevo en `@theme` no aparece hasta reiniciar el dev server.** Agregar un
  `--color-*` a `app/globals.css` y usar su utilidad (`bg-*`) en un componente compila sin
  error, la clase queda en el DOM y el elemento sale **transparente**: Turbopack no rehace
  el CSS de Tailwind ante un cambio de `@theme`, así que ni la variable ni la utilidad
  existen en la hoja servida. No es un error de nombre ni de sintaxis — se diagnostica
  pidiendo el `.css` del build y buscando el token ahí. Se arregla reiniciando
  `npm run dev`. Editar un color que ya existe sí se recarga solo; el que no aparece es el
  token nuevo. Verificado el 2026-08-19.
- **Un atributo puesto a mano en `<html>` no es estado durable: React lo borra al
  re-renderizar el layout.** Cambiar de idioma con `router.replace` vuelve a pintar
  `<html lang>` y se lleva por delante el `data-age-gate="pendiente"` que había dejado el
  script inline — y el script no vuelve a correr, porque la navegación es del cliente. Medido
  el 2026-08-20 al poner el selector de idioma dentro de la capa de +18: la capa desaparecía y
  el sitio quedaba entero a la vista con `localStorage` vacío, o sea un bypass silencioso de
  la verificación de edad. `AgeGate` repone el atributo en un efecto mientras la capa deba
  verse, y `hayQuePreguntar()` dejó de creerle sólo a él: relee `localStorage`, que es el dato
  duro. `tests/age-gate-source.test.mjs` cuida las dos mitades.
- **Tailwind v4 gira con la propiedad `rotate`, no con `transform`**: `rotate-180` compila
  a `rotate: 180deg`. Al depurar, `getComputedStyle(el).transform` dice `"none"` aunque el
  icono esté dado vuelta — cuesta una hora dar por rota una utilidad que funciona. Medir
  `.rotate`. (Y no medir nunca durante el recambio de CSS del HMR: recargar y medir en frío.)
- **Tailwind v4 descarta la opacidad sobre `currentColor`**: `bg-current/15` compila a
  `background-color: currentColor`, sin el 15%. Para tintes que heredan color, usar tokens
  explícitos por estado.
- **RSC**: no se pueden pasar funciones de un server component a uno cliente. Las etiquetas
  del carrusel de colecciones se pasan como array de strings ya traducidos.
- **`npm run build` borra `.next`** y deja zombi al dev server (EBUSY / 500 en rutas). Bajar
  el dev, buildear, y recién ahí volver a levantarlo.
- **SVG**: `fill="none"` y `stroke` van como **atributos del `<path>`**, no solo en CSS. Un
  error de compilación que dejó el CSS sin cargar rellenó de negro toda la curva del
  timeline de Historia.
- **Headers en Netlify**: los `[[headers]]` de `netlify.toml` solo llegan a los archivos
  estáticos. Las páginas las sirve el handler de Next y se los saltan — verificado con
  `curl -I` en producción. Los headers que deban valer para el HTML van en la función
  `headers()` de `next.config.ts`.
- **La CSP puede tumbar una sección sin romper nada.** El mapa de `/contacto` estuvo caído
  con el iframe perfecto: la CSP de `next.config.ts` llevaba `frame-src 'none'` y el
  navegador bloqueaba el marco, dejando a la vista el esqueleto de `MapEmbed`. No falla el
  build, no falla ningún test de render y la única señal es una línea en la consola del
  visitante (`Framing 'https://maps.google.com/' violates …`). Dos detalles al arreglarlo:
  la directiva se evalúa **también en cada redirección** —el embed salta a `google.com` y
  después a `www.google.com`, así que van los tres orígenes—, y el `frame-src` es sólo del
  documento que embebe: lo que el iframe cargue adentro lo rige la CSP de Google, no ésta.
  `tests/map-embed-source.test.mjs` falla si el origen del embed sale de la lista.
- Al iterar CSS conviene hard refresh (Ctrl+Shift+R).

---

## Deploy

El hosting se movió **de Vercel a Netlify** (2026-08-01) por dos razones: el plan Hobby de
Vercel prohíbe el uso comercial —y este sitio va a vender— y el proyecto de Vercel estaba
conectado a un repo distinto (`web-casa-acosta`) del que recibía los push
(`vina-casa-acosta`), así que el push nunca disparó deploy.

En Netlify el proyecto queda conectado al repo correcto: push a `main` → producción, push a
otra rama → deploy preview gratis. El adaptador de Next (OpenNext) lo instala Netlify solo;
la config está en `netlify.toml` y la URL pública sale del entorno (`lib/siteUrl.ts`).

**Lo que hay que saber del plan Free:** 300 créditos al mes, límite duro. Cada deploy de
producción son 15; el ancho de banda, 20 por GB; los previews, cero. Si se agotan, el sitio
queda en `Site not available` hasta el ciclo siguiente. Conviene mergear a `main` por tandas.

Guía completa —crear el proyecto, dominio propio, apagar Vercel, troubleshooting— en
[`DEPLOY-NETLIFY.md`](DEPLOY-NETLIFY.md).

---

## Proyecto hermano: el panel interno de pedidos

En `vina-casa-acosta/app/` (repositorio **distinto**, no se toca desde acá) vive la app
interna de logística de la viña: Express + Supabase + Resend, con dos frontends React
(vendedores y empaquetadores). Modela pedidos con estados `pendiente → en_preparacion →
listo → entregado`, retiro o despacho, código de retiro y bloqueo transaccional para que dos
empaquetadores no tomen el mismo pedido.

**Importa para la fase de pagos**: cuando la tienda web cobre de verdad, el pedido debería
entrar en ese sistema, no en uno nuevo. Su tabla `pedidos` ya cubre casi todo lo que
necesita una venta web; le faltan campos de pago (el ID del pago del proveedor, con índice
único, es lo que evita que un reintento de webhook duplique el pedido) y un origen para
distinguir la venta web de la de un vendedor.

---

## Documentos relacionados

- [`DEPLOY-NETLIFY.md`](DEPLOY-NETLIFY.md) — la migración a Netlify paso a paso y el deploy
  del día a día.
- [`NOMENCLATURA.md`](NOMENCLATURA.md) — el contrato de IDs de sección (A5, C2f, Dd6…).
  Se actualiza **antes** de tocar el código.
- [`reglas-frontend-nextjs.md`](reglas-frontend-nextjs.md) — reglas de semántica,
  accesibilidad, SEO y rendimiento que aplican a todo componente nuevo.
- [`../CONTENT_BRIEF.md`](../CONTENT_BRIEF.md) — brief de contenido.
- [`superpowers/plans/`](superpowers/plans/) y [`superpowers/specs/`](superpowers/specs/) —
  diseños y planes de sesiones anteriores.

Las bitácoras de sesión (`SESION-*.md`) y los briefs para el cliente viven en `web/`, fuera
del repositorio, porque contienen decisiones y material internos y **este repo es público**.
