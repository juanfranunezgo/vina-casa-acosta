# Google Search Console — puesta en marcha

**Qué es esto:** el orden exacto para dar de alta el sitio en Search Console sin
perder el historial del dominio viejo. El orden importa: hacer el paso 4 antes
del 3 invalida el trámite y hay que empezarlo de nuevo.

La tabla de redirecciones y el detalle de la migración viven en
[`MIGRACION-CASAACOSTA.md`](MIGRACION-CASAACOSTA.md). Este documento es el
trámite.

---

## 0. Estado verificado el 18 de agosto de 2026

Lo comprobado con `curl` contra producción, para no repetir trabajo:

| Punto | Estado |
|---|---|
| `robots.txt` accesible y sin bloqueos | ✅ `User-Agent: * / Allow: /` |
| Línea `Sitemap` en robots.txt | ✅ absoluta, como exige el estándar |
| `sitemap.xml` | ✅ 69 URLs, **todas responden 200** (verificadas una por una) |
| hreflang recíproco + `x-default` | ✅ en el HTML y dentro del sitemap |
| Canonical auto-referencial | ✅ en las 20 rutas × 3 idiomas |
| `www` → apex | ✅ 301 |
| `http` → `https` | ✅ 301 |
| `*.netlify.app` → dominio propio | ✅ 301 |
| Raíz `/` → `/es` | ⚠️ 307 (temporal). Lo emite next-intl; Google lo sigue igual. No es un bloqueante. |
| 404 real en ruta inexistente | ✅ devuelve 404, no un 200 vacío |
| Meta de verificación de Google en el HTML | ❌ todavía no hay ninguna propiedad verificada |
| Redirecciones del dominio viejo | ❌ **reenvío global a la home** — ver paso 2 |

---

## 1. Crear la propiedad del sitio nuevo

**Tipo: “Dominio”, no “Prefijo de URL”.** La de dominio cubre de una sola vez
`http`, `https`, `www` y cualquier subdominio; la de prefijo obligaría a crear
una propiedad por variante y a mirar cuatro paneles.

1. Search Console → *Añadir propiedad* → **Dominio** → `vinacasaacosta.cl`
2. Google entrega un registro **TXT**. Se agrega en **Cloudflare**, que es donde
   está el DNS de este dominio.
3. Verificar.

> Agregar un TXT no toca los MX ni el correo. Lo único que rompería el correo de
> la viña es mover los *nameservers*, y eso acá no hace falta en ningún paso.

## 2. Antes de tocar Search Console: arreglar las redirecciones del viejo

**Este es el paso que hoy está mal y el que más vale.** `casaacosta.cl` redirige
todas sus URLs a la home del sitio nuevo. Google trata esas redirecciones
masivas a la portada como *soft 404* y **no traspasa nada**: las 13 fichas de
producto del WordPress, que son las URLs con más historial de la viña, no le
están pasando su autoridad a las fichas nuevas.

Hay que reemplazar ese reenvío por el mapeo URL-por-URL. Las tres formas están
en [`MIGRACION-CASAACOSTA.md`](MIGRACION-CASAACOSTA.md) §4; la más rápida sin
tocar el WordPress es apuntar el dominio al shell de Netlify que ya está armado
en `casaacosta-redirect/` (no tiene build, así que no consume créditos de
deploy).

Verificación de que quedó bien — cada línea debe mostrar el destino específico,
nunca la home pelada:

```bash
for u in / /tour-ombu/ /product/ombu/ /apicultura/ /vinos/; do printf "%-22s " "$u"; curl -sI "https://casaacosta.cl$u" -o /dev/null -w "%{http_code} -> %{redirect_url}\n"; done
```

Y el contenido de demostración del tema tiene que dar **410**, no 301:

```bash
curl -sI https://casaacosta.cl/how-to-choose-wine/ -o /dev/null -w "%{http_code}\n"
```

## 3. Verificar el dominio viejo, por DNS

`casaacosta.cl` también necesita su propiedad **de tipo Dominio**, verificada
por **TXT**. No por archivo HTML ni por etiqueta meta: cuando las redirecciones
estén activas, el archivo de verificación redirige y deja de encontrarse, y ahí
se cae el trámite del paso 4 justo cuando lo necesitás.

El DNS de `casaacosta.cl` está en **BanaHosting** (`ns2021` / `ns2022`), no en
Cloudflare. Es otro panel.

> Las dos propiedades tienen que estar en **la misma cuenta de Google**, o el
> cambio de dirección no aparece como opción.

## 4. Cambio de dirección

Solo cuando el paso 2 esté verificado y el 3 también:

Propiedad de `casaacosta.cl` → *Configuración* → **Cambio de dirección** →
elegir `vinacasaacosta.cl`.

Google valida solo que la home vieja redirija a la nueva. Si el paso 2 está
bien hecho, pasa sin intervención.

## 5. Enviar el sitemap y pedir indexación

En la propiedad nueva:

1. *Sitemaps* → enviar `sitemap.xml` (solo la ruta; el dominio ya lo pone la
   propiedad).
2. *Inspección de URLs* → pedir indexación de, en este orden:
   `/es` · `/es/vinos` · `/es/tienda` · `/es/actividades`
3. Una ficha de vino y una de actividad como muestra, para confirmar que el
   structured data se lee: `/es/vinos/ombu-carmenere` y
   `/es/actividades/tours/ombu`.

No hace falta pedir indexación de las 69: con el sitemap enviado, Google
recorre el resto solo.

## 6. Qué revisar la primera semana

| Dónde | Qué tiene que verse |
|---|---|
| *Páginas* → Indexación | Las 69 URLs pasando a “Indexada”. Es normal que tarde. |
| *Páginas* → “Alternativa con etiqueta canónica adecuada” | **Vacío o casi.** Si aparecen muchas, algún canonical quedó mal. |
| *Mejoras* → Productos | Las fichas de vino, con precio y disponibilidad. Es el bloque nuevo. |
| *Mejoras* → Fragmentos de reseña | No debe aparecer nada: el sitio no publica reseñas y no las inventa. |
| *Experiencia* → Core Web Vitals | Aparece recién con tráfico real; sin visitas no hay datos de campo. |
| *Enlaces* | Los enlaces del dominio viejo migrando al nuevo. Es el termómetro del paso 2. |

## 7. Lo que NO hay que hacer

- ❌ **Eliminación de URLs** sobre el sitio viejo. Oculta las páginas antes de
  que Google alcance a leer las redirecciones, y el traspaso se pierde entero.
- ❌ Verificar el dominio viejo por archivo HTML o meta (ver paso 3).
- ❌ Dar de baja `casaacosta.cl`. Las redirecciones tienen que quedar vivas al
  menos 12 meses, y además el correo de la viña vive en ese dominio.
- ❌ Reenviar todo a la home “mientras tanto”. Es exactamente el estado actual y
  es lo que hay que arreglar.

## 8. Después del deploy: verificación del sitio nuevo

Cuando la rama esté en producción, estas son las comprobaciones que dependen del
deploy y que hoy no se pueden hacer:

```bash
curl -s https://vinacasaacosta.cl/llms.txt | head -20
curl -s https://vinacasaacosta.cl/es/vinos/ombu-carmenere | grep -c "application/ld+json"
curl -s https://vinacasaacosta.cl/es/tienda | grep -o "<title>[^<]*</title>"
curl -sI https://vinacasaacosta.cl/es/actividades/tours/ombu -o /dev/null -w "%{http_code}\n"
```

Esperado: el `llms.txt` con el dominio real (no `localhost`), **1** bloque de
structured data en la ficha de vino, el título propio de la tienda —no el de la
portada— y **200** en la URL de tour por categoría.

Además, pasar una ficha de vino por la
[prueba de resultados enriquecidos](https://search.google.com/test/rich-results)
de Google: tiene que detectar **Producto** con precio y disponibilidad.

## 9. Qué esperar

El traspaso no es inmediato: Google necesita volver a rastrear las URLs viejas
para ver los 301, y eso toma **entre 2 y 8 semanas**. En ese período es normal
ver las dos versiones alternándose en los resultados. La señal de que funcionó
es que las impresiones suban en la propiedad nueva mientras la vieja las pierde.
