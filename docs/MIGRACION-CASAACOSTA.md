# Migración de casaacosta.cl → vinacasaacosta.cl

**Para:** quien administre el WordPress de `casaacosta.cl`
**Qué se pide:** redirección 301 permanente, URL por URL, del sitio antiguo al nuevo
**Fecha del inventario:** 9 de agosto de 2026 (97 URLs, tomadas de `https://casaacosta.cl/wp-sitemap.xml`)

> ## Estado al 18 de agosto de 2026: el dominio ya redirige, pero mal
>
> Comprobado con `curl`: `casaacosta.cl` responde **301 a la home** en todas sus
> URLs, no el mapeo de este documento.
>
> ```
> https://casaacosta.cl/                    301 -> https://vinacasaacosta.cl
> https://casaacosta.cl/tour-ombu/          301 -> https://vinacasaacosta.cl
> https://casaacosta.cl/product/ombu/       301 -> https://vinacasaacosta.cl
> https://casaacosta.cl/how-to-choose-wine/ 301 -> https://vinacasaacosta.cl   (debia ser 410)
> ```
>
> Es un *domain forwarding* del hosting, no las reglas de aca. Tres problemas,
> en orden de gravedad:
>
> 1. **Google trata la redireccion masiva a la home como soft 404** y no
>    traspasa autoridad. Las 13 fichas `/product/*` -las URLs con mas historial
>    de la vina- no le estan pasando nada a sus equivalentes.
> 2. El destino no lleva `/es`, asi que cada URL antigua encadena
>    **301 -> 307 -> 200**. El salto del medio es temporal: la peor senal
>    posible en una cadena de migracion.
> 3. El contenido de demostracion no da 410 y sigue en el indice.
>
> Reemplazar ese reenvio por el mapeo de este documento es la tarea pendiente de
> mayor impacto SEO del proyecto.

---

## 1. Por qué

La viña tiene hoy **dos sitios vivos** que hablan de lo mismo:

| | |
|---|---|
| `casaacosta.cl` | WordPress 7.0.3 + WooCommerce. Responde **200 OK**, con su propio `<link rel="canonical">` apuntándose a sí mismo. |
| `vinacasaacosta.cl` | Sitio nuevo, en línea desde agosto de 2026. |

Para Google no son "el sitio viejo y el nuevo": son **dos sitios distintos compitiendo por las mismas búsquedas**. Y gana el antiguo, porque tiene años de historial y enlaces. Hoy, buscando *"viña casa acosta tour"*, aparece `casaacosta.cl`.

Un 301 permanente es la única señal que le dice a Google *"esta página se mudó allá"* y le traspasa al dominio nuevo la antigüedad, los enlaces y el posicionamiento acumulados. Sin él, el sitio nuevo tiene que ganarse todo desde cero mientras compite contra el viejo.

> **Lo que NO sirve:** poner `noindex` en el sitio viejo, borrarlo, dejarlo caer en 404, o redirigir con `meta refresh` o JavaScript. Todo eso **elimina** la autoridad en vez de traspasarla.

---

## 2. Antes de tocar nada: dos decisiones del cliente

1. **¿La tienda WooCommerce sigue recibiendo pedidos reales?**
   Si sí, hay que coordinar la fecha del corte: las redirecciones de `/tienda/`, `/comprar/`, `/carrito/`, `/finalizar-compra/` y `/my-account/` dejan el checkout viejo inaccesible.

2. **¿Cómo está verificada la propiedad de `casaacosta.cl` en Search Console?**
   Si está verificada con un **archivo HTML** o una **etiqueta meta**, la redirección puede romper esa verificación y con ella el trámite de cambio de dirección (paso 5).
   **Verificar por DNS (registro TXT) antes de aplicar las redirecciones.**

---

## 3. El mapeo

97 URLs. Los destinos fueron verificados uno por uno: los 23 destinos distintos responden 200.

### 3.1 Páginas principales

| URL antigua | Destino |
|---|---|
| `/` | `https://vinacasaacosta.cl/es` |
| `/historia/` | `/es/historia` |
| `/staff/` | `/es/staff` |
| `/contacto/` | `/es/contacto` |
| `/vinos/` | `/es/vinos` |
| `/actividades/` | `/es/actividades` |
| `/premios-2/` · `/premios-3/` | `/es/historia` |
| `/blog/` | `/es` |

### 3.2 Tienda

| URL antigua | Destino |
|---|---|
| `/tienda/` · `/comprar/` · `/carrito/` · `/finalizar-compra/` · `/my-account/` | `/es/tienda` |
| `/orders-tracking/` | `/es/contacto` |
| `/product-category/carmenere/` · `/cabernet-sauvignon/` · `/tannat/` · `/ensamblaje/` · `/tinto/` · `/a-eleccion/` | `/es/tienda` |

### 3.3 Fichas de producto → fichas de vino

Estas son las más valiosas del traspaso: cada producto viejo tiene su equivalente exacto en el sitio nuevo.

| URL antigua | Destino |
|---|---|
| `/product/bera-rose/` | `/es/vinos/bera` |
| `/product/ombu/` | `/es/vinos/ombu-carmenere` |
| `/product/ombu-cabernet-sauvignon/` | `/es/vinos/ombu-sauvignon` |
| `/product/ombu-tannat/` | `/es/vinos/ombu-tannat` |
| `/product/estacion-francia/` | `/es/vinos/estacion-francia-carmenere` |
| `/product/estacion-francia-tannat/` | `/es/vinos/estacion-francia-tannat` |
| `/product/guidai/` | `/es/vinos/guidai` |
| `/product/lajau-betum/` | `/es/vinos/lajau-betum` |
| `/product/lajau-betum-yu/` | `/es/vinos/lajau-betum-yu` |
| `/product/lajau-deti/` | `/es/vinos/lajau-deti` |
| `/product/lajau-sam/` | `/es/vinos/lajau-sam` |
| `/product/yaray-gua-blanco/` | `/es/vinos/yaray-gua-blanco` |
| `/product/yaray-gua-tinto/` | `/es/vinos/yaray-gua-tinto` |
| `/product/crea-tu-caja/` | `/es/tienda` |

`/product/ombu/` y `/product/estacion-francia/` se mapearon a la versión **Carmenere** de cada línea: es la variedad que describe el contenido de esas dos fichas antiguas.

### 3.4 Tours (equivalencia exacta)

| URL antigua | Destino |
|---|---|
| `/tour-ombu/` | `/es/actividades/tours/ombu` |
| `/tour-bera/` | `/es/actividades/tours/bera` |
| `/tour-carmenere/` | `/es/actividades/tours/carmenere` |

Los destinos son los de la estructura por categoria. Apuntar a la URL plana
(`/es/actividades/tour-ombu`) todavia funciona, pero hoy es un **308**: la
migracion estrenaria cadenas de dos saltos sin ninguna necesidad.

### 3.5 Experiencias y talleres

Cuando se escribio este documento ninguna de estas doce tenia pagina propia y
todas caian al indice. Ya no: cada una tiene su ficha, asi que cada URL antigua
va a su equivalente exacto. Es la diferencia entre traspasarle la autoridad a la
pagina que habla del mismo tema y diluirla en un indice.

| URL antigua | Destino |
|---|---|
| `/apicultura/` | `/es/actividades/experiencias/apicultura` |
| `/cena-sensorial/` | `/es/actividades/experiencias/cena-sensorial` |
| `/cosecha-tu-historia/` | `/es/actividades/experiencias/cosecha-tu-historia` |
| `/enologo-por-un-dia/` | `/es/actividades/experiencias/enologo-por-un-dia` |
| `/hilado-y-trasquilado/` | `/es/actividades/experiencias/alpacas` |
| `/lagrimas-de-invierno/` | `/es/actividades/experiencias/lagrimas-de-invierno` |
| `/mimbre/` | `/es/actividades/experiencias/mimbre` |
| `/yoga/` | `/es/actividades/experiencias/yoga` |
| `/clases-de-pizza/` | `/es/actividades/talleres/pizzas` |
| `/clases-de-pasta/` | `/es/actividades/talleres/pastas` |
| `/clases-de-gnocchis/` | `/es/actividades/talleres/noquis` |
| `/vendimia/` | `/es/actividades/vendimia` |

`/hilado-y-trasquilado/` va a la ficha de alpacas porque es la misma actividad
con otro nombre: el trasquilado es lo que esa ficha describe.

### 3.6 Eventos

Las dos entradas de vendimia del calendario viejo tienen hub propio:

| URL antigua | Destino |
|---|---|
| `/events/vendimia-2/` · `/events/vendimia-abril/` | `/es/actividades/vendimia` |
| `/eventos/` · `/proximos-eventos/` · `/events/evento-sorpresa/` · `/events/feria-de-emprendedores/` · `/event-location/vina-casa-acosta/` | `/es/actividades` |

Sin el ancla `#eventos`: el indice se reorganizo y ya no la publica. Redirigir a
un ancla que no existe no rompe nada, pero deja al visitante arriba de la pagina
sin la seccion que le prometieron.

### 3.7 Contenido de demostración → 410 Gone

Son 36 entradas en inglés que vinieron con la plantilla del tema, más sus categorías y la página de ejemplo de WordPress. No tienen equivalente ni valor:

- `annual-dinner-delayed-due-to-covid-19`, `annual-wine-awards-2020`, `diy-winemaking-pt-1`, `diy-winemaking-pt-2`, `health-benefits-of-white-wine`, `how-to-choose-wine`, `how-to-combine-good-wine-with-good-cheese`, `the-art-of-winemaking`, `the-new-vineyard` — cada una con sus duplicados `-2`, `-3`, `-4`
- `/category/event-updates/` · `/category/latest-news/` · `/category/wine-recommendations/`
- `/pag-de-ejemplo/`

**410 Gone** es la respuesta correcta: le dice a Google que se eliminaron a propósito y las saca del índice rápido. Redirigirlas a la home sería peor — Google trata las redirecciones sin relación como 404 blandos igual, pero tarda más en limpiarlas.

---

## 4. Implementación

### Opción A — `.htaccess` (recomendada: Apache/LiteSpeed, funciona aunque WordPress se apague)

Va **antes** del bloque `# BEGIN WordPress`. Las reglas toleran la barra final opcional.

```apache
# ===== Migración a vinacasaacosta.cl — 301 permanentes =====
<IfModule mod_rewrite.c>
RewriteEngine On

# --- Fichas de producto → fichas de vino ---
RewriteRule ^product/bera-rose/?$              https://vinacasaacosta.cl/es/vinos/bera [R=301,L]
RewriteRule ^product/ombu/?$                   https://vinacasaacosta.cl/es/vinos/ombu-carmenere [R=301,L]
RewriteRule ^product/ombu-cabernet-sauvignon/?$ https://vinacasaacosta.cl/es/vinos/ombu-sauvignon [R=301,L]
RewriteRule ^product/ombu-tannat/?$            https://vinacasaacosta.cl/es/vinos/ombu-tannat [R=301,L]
RewriteRule ^product/estacion-francia/?$       https://vinacasaacosta.cl/es/vinos/estacion-francia-carmenere [R=301,L]
RewriteRule ^product/estacion-francia-tannat/?$ https://vinacasaacosta.cl/es/vinos/estacion-francia-tannat [R=301,L]
RewriteRule ^product/guidai/?$                 https://vinacasaacosta.cl/es/vinos/guidai [R=301,L]
RewriteRule ^product/lajau-betum/?$            https://vinacasaacosta.cl/es/vinos/lajau-betum [R=301,L]
RewriteRule ^product/lajau-betum-yu/?$         https://vinacasaacosta.cl/es/vinos/lajau-betum-yu [R=301,L]
RewriteRule ^product/lajau-deti/?$             https://vinacasaacosta.cl/es/vinos/lajau-deti [R=301,L]
RewriteRule ^product/lajau-sam/?$              https://vinacasaacosta.cl/es/vinos/lajau-sam [R=301,L]
RewriteRule ^product/yaray-gua-blanco/?$       https://vinacasaacosta.cl/es/vinos/yaray-gua-blanco [R=301,L]
RewriteRule ^product/yaray-gua-tinto/?$        https://vinacasaacosta.cl/es/vinos/yaray-gua-tinto [R=301,L]
RewriteRule ^product/crea-tu-caja/?$           https://vinacasaacosta.cl/es/tienda [R=301,L]

# --- Tours ---
RewriteRule ^tour-ombu/?$      https://vinacasaacosta.cl/es/actividades/tours/ombu [R=301,L]
RewriteRule ^tour-bera/?$      https://vinacasaacosta.cl/es/actividades/tours/bera [R=301,L]
RewriteRule ^tour-carmenere/?$ https://vinacasaacosta.cl/es/actividades/tours/carmenere [R=301,L]

# --- Tienda ---
RewriteRule ^(tienda|comprar|carrito|finalizar-compra|my-account)/?$ https://vinacasaacosta.cl/es/tienda [R=301,L]
RewriteRule ^product-category/.*$  https://vinacasaacosta.cl/es/tienda [R=301,L]
RewriteRule ^orders-tracking/?$    https://vinacasaacosta.cl/es/contacto [R=301,L]

# --- Páginas principales ---
RewriteRule ^historia/?$      https://vinacasaacosta.cl/es/historia [R=301,L]
RewriteRule ^staff/?$         https://vinacasaacosta.cl/es/staff [R=301,L]
RewriteRule ^contacto/?$      https://vinacasaacosta.cl/es/contacto [R=301,L]
RewriteRule ^vinos/?$         https://vinacasaacosta.cl/es/vinos [R=301,L]
RewriteRule ^actividades/?$   https://vinacasaacosta.cl/es/actividades [R=301,L]
RewriteRule ^premios-[23]/?$  https://vinacasaacosta.cl/es/historia [R=301,L]
RewriteRule ^blog/?$          https://vinacasaacosta.cl/es [R=301,L]

# --- Experiencias y talleres (cada una a su ficha) ---
RewriteRule ^apicultura/?$           https://vinacasaacosta.cl/es/actividades/experiencias/apicultura [R=301,L]
RewriteRule ^cena-sensorial/?$       https://vinacasaacosta.cl/es/actividades/experiencias/cena-sensorial [R=301,L]
RewriteRule ^cosecha-tu-historia/?$  https://vinacasaacosta.cl/es/actividades/experiencias/cosecha-tu-historia [R=301,L]
RewriteRule ^enologo-por-un-dia/?$   https://vinacasaacosta.cl/es/actividades/experiencias/enologo-por-un-dia [R=301,L]
RewriteRule ^hilado-y-trasquilado/?$ https://vinacasaacosta.cl/es/actividades/experiencias/alpacas [R=301,L]
RewriteRule ^lagrimas-de-invierno/?$ https://vinacasaacosta.cl/es/actividades/experiencias/lagrimas-de-invierno [R=301,L]
RewriteRule ^mimbre/?$               https://vinacasaacosta.cl/es/actividades/experiencias/mimbre [R=301,L]
RewriteRule ^yoga/?$                 https://vinacasaacosta.cl/es/actividades/experiencias/yoga [R=301,L]
RewriteRule ^clases-de-pizza/?$      https://vinacasaacosta.cl/es/actividades/talleres/pizzas [R=301,L]
RewriteRule ^clases-de-pasta/?$      https://vinacasaacosta.cl/es/actividades/talleres/pastas [R=301,L]
RewriteRule ^clases-de-gnocchis/?$   https://vinacasaacosta.cl/es/actividades/talleres/noquis [R=301,L]
RewriteRule ^vendimia/?$             https://vinacasaacosta.cl/es/actividades/vendimia [R=301,L]

# --- Eventos ---
RewriteRule ^events/vendimia-(2|abril)/?$  https://vinacasaacosta.cl/es/actividades/vendimia [R=301,L]
RewriteRule ^(eventos|proximos-eventos)/?$ https://vinacasaacosta.cl/es/actividades [R=301,L]
RewriteRule ^events/.*$                    https://vinacasaacosta.cl/es/actividades [R=301,L]
RewriteRule ^event-location/.*$            https://vinacasaacosta.cl/es/actividades [R=301,L]

# --- Contenido de demostración: 410 Gone ---
RewriteRule ^(annual-dinner-delayed-due-to-covid-19|annual-wine-awards-2020|diy-winemaking-pt-1|diy-winemaking-pt-2|health-benefits-of-white-wine|how-to-choose-wine|how-to-combine-good-wine-with-good-cheese|the-art-of-winemaking|the-new-vineyard)(-[234])?/?$ - [G,L]
RewriteRule ^category/(event-updates|latest-news|wine-recommendations)/?$ - [G,L]
RewriteRule ^pag-de-ejemplo/?$ - [G,L]

# --- Home ---
RewriteRule ^$ https://vinacasaacosta.cl/es [R=301,L]

# --- Cualquier otra URL (ver nota abajo) ---
# Descomentar SOLO cuando el WooCommerce ya no opere. Deja fuera la verificación
# de dominio y el admin para no romper Search Console ni el acceso al panel.
# RewriteCond %{REQUEST_URI} !^/\.well-known/
# RewriteCond %{REQUEST_URI} !^/wp-admin/
# RewriteCond %{REQUEST_URI} !^/wp-login\.php
# RewriteRule ^(.*)$ https://vinacasaacosta.cl/es [R=301,L]
</IfModule>
# ===== fin migración =====
```

### Opción B — plugin Redirection

Si se prefiere administrar desde el panel: plugin **Redirection** → *Import/Export* → importar el archivo adjunto [`migracion-casaacosta-redirects.csv`](migracion-casaacosta-redirects.csv) (dos columnas: origen, destino; el importador acepta ese formato).

Ese CSV es la **fuente de verdad** del mapeo: `casaacosta-redirect/_redirects` se
genera desde el con `node scripts/migracion-redirects.mjs`, y
`tests/migracion-redirects.test.mjs` falla si algun destino deja de ser una ruta
que el sitio sirve. Es lo que evita que la tabla vuelva a envejecer sin aviso
cuando el sitio se reorganice. Después, revisar que el código de cada regla quede en **301**, no en 302.

Es más lento que el `.htaccess` —cada redirección carga WordPress entero— y deja de funcionar si algún día se apaga el WordPress, pero para este volumen es perfectamente válido.

### Opción C — si se apaga WordPress por completo

Si el cliente decide bajar el WordPress, el dominio no debe morir: hay que apuntarlo a un servidor mínimo que solo haga los 301 del mapeo. El sitio nuevo ya tiene armado un cascarón así en `vercel-redirect/`, que puede ampliarse con esta tabla.

---

## 5. Search Console: cambio de dirección

Con las redirecciones ya aplicadas y verificadas:

1. Confirmar que **ambas propiedades** (`casaacosta.cl` y `vinacasaacosta.cl`) están verificadas en la misma cuenta, la antigua **por DNS**.
2. En la propiedad de `casaacosta.cl` → *Configuración* → **Cambio de dirección** → seleccionar `vinacasaacosta.cl`.
3. Google exige que la home antigua redirija a la nueva; si el paso 4 está bien hecho, la validación pasa sola.
4. En la propiedad nueva: reenviar `https://vinacasaacosta.cl/sitemap.xml` y pedir indexación de `/es`, `/es/actividades`, `/es/vinos` y `/es/tienda`.

**No usar** la herramienta de *Eliminación de URLs* sobre el sitio antiguo: ocultaría las páginas antes de que Google alcance a leer las redirecciones, y el traspaso se pierde.

---

## 6. Qué no hacer

- ❌ Redirección 302 / 307 (temporal) en vez de 301 — no traspasa autoridad.
- ❌ `meta refresh` o redirección por JavaScript.
- ❌ Mandar las 97 URLs a la home. Cada una a su equivalente; solo las que no tienen equivalente caen a una sección.
- ❌ Dar de baja el dominio `casaacosta.cl`. **Las redirecciones deben quedar vivas al menos 12 meses**; lo ideal es dejarlas para siempre, cuestan cero.
- ❌ Poner `noindex` en el sitio antiguo pensando que "así deja de competir": lo saca del índice sin traspasar nada.

---

## 7. Verificación

Cuando esté aplicado, estos comandos deben devolver `301` y el destino correcto:

```bash
curl -sI https://casaacosta.cl/                     | grep -iE "^HTTP|^location"
curl -sI https://casaacosta.cl/tour-ombu/           | grep -iE "^HTTP|^location"
curl -sI https://casaacosta.cl/product/ombu/        | grep -iE "^HTTP|^location"
curl -sI https://casaacosta.cl/actividades/         | grep -iE "^HTTP|^location"
curl -sI https://casaacosta.cl/how-to-choose-wine/  | grep -iE "^HTTP"   # debe decir 410
```

Comprobación rápida de las 97 de una vez, desde cualquier terminal:

```bash
curl -s https://casaacosta.cl/wp-sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's|</\?loc>||g' > /tmp/idx
while read s; do curl -s "$s" | grep -o '<loc>[^<]*</loc>' | sed 's|</\?loc>||g'; done < /tmp/idx | sort -u |
while read u; do printf "%-60s " "$u"; curl -sI "$u" -o /dev/null -w "%{http_code} → %{redirect_url}\n"; done
```

Toda línea que salga `200` es una URL que quedó sin redirigir y sigue compitiendo con el sitio nuevo.

---

## 8. Qué esperar después

El traspaso no es inmediato. Google necesita volver a rastrear las URLs antiguas para ver los 301, y eso toma **entre 2 y 8 semanas** según la frecuencia con que visite el sitio. En ese período es normal ver las dos versiones alternándose en los resultados. La señal de que funcionó es que, en Search Console del dominio nuevo, las impresiones suban mientras la propiedad antigua las pierde.
