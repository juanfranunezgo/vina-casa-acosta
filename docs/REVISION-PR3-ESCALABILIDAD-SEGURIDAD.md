# Revisión adversarial PR #3 — Seguridad, resiliencia y escalabilidad

**Repositorio:** `vina-casa-acosta/web/sitio-web`  
**Rama revisada:** `m4/catalogo-definiciones`  
**Arreglos objetivo:** `9be662e` y `d518cd4`  
**HEAD al cerrar el informe:** `a8d34b8`  
**PR:** <https://github.com/juanfranunezgo/vina-casa-acosta/pull/3>  
**Fecha:** 28 de agosto de 2026

## Resumen ejecutivo

Los commits `9be662e` y `d518cd4` corrigen las cinco regresiones de la revisión anterior. En particular, las tres puertas del modo degradado están cubiertas, el sello detecta alteraciones y el test ahora falla si `degraded()` arroja una excepción.

Sin embargo, la revisión adversarial encontró **cuatro bloqueos**:

1. El snapshot y su sello no se reemplazan como una unidad atómica. Una muerte entre ambos renames deja una pareja inconsistente y el wrapper igualmente termina en código `0`.
2. Un snapshot corrupto permite un build verde que publica una tienda vacía y elimina todas las páginas de producto.
3. Durante una caída de la API, un build de Next multiplica una única consulta esperada en aproximadamente 52 intentos. Los timeouts individuales no ponen un techo a la fase completa.
4. El generador rechaza un catálogo vacío que el contrato y el runtime consideran válido. Esto puede hacer reaparecer productos retirados cuando se activa el fallback.

**Veredicto:** no aprobar ni mergear la PR todavía.

Desde el punto de vista de crecimiento, el sistema funciona bien con el catálogo actual, pero conserva varias suposiciones de “un cliente y pocos productos”. Los principales riesgos antes de conectar un segundo sitio son el acoplamiento de datos de Casa Acosta, el sitemap local, la falta de monitoreo externo, la estrategia de imágenes y la amplificación de requests cuando Afeleia falla.

---

## 1. Alcance y método

La revisión fue de código y límites. No se modificó código de producción, no se hizo merge ni push y no se accedió a la base de producción.

Se usaron servidores HTTP locales controlados para probar:

- respuesta válida perteneciente a otro sitio;
- respuesta `200` malformada;
- conexión aceptada sin respuesta;
- runtime real de Next contra una API que devuelve otro tenant;
- lectura de cuerpo que no termina;
- respuestas vacías válidas;
- fallas de escritura y terminación entre renames;
- concurrencia entre generadores;
- multiplicación de fetches durante una caída.

El repositorio de Afeleia se inspeccionó sólo en lectura, manteniendo la rama `m3/etapa1`. Sus 42 pruebas focalizadas del catálogo público pasaron.

Las afirmaciones marcadas como **comprobadas** provienen de ejecución o lectura directa. Las marcadas como **proyección** necesitan staging, métricas reales o prueba de carga antes de tratarlas como capacidad garantizada.

---

## 2. Hallazgos bloqueantes del PR

### P1 — Snapshot y sello no forman una unidad atómica

**Ubicación:**

- `scripts/catalogo-snapshot.mjs:203`
- `scripts/catalogo-snapshot.mjs:207`
- `scripts/catalogo-snapshot-build.mjs:81-83`

El generador reemplaza primero `data/catalogo-fallback.json` y después genera/reemplaza `data/catalogo-fallback.integrity.json`. Cada archivo se escribe atómicamente de manera individual, pero el par no es atómico.

Se inyectó una terminación inmediatamente después del rename del snapshot y antes del sello:

```text
generatorExit=99
snapshotCambio=True
selloCambio=False
integrityExit=1
tmpCount=0
```

La suite de integridad quedó con 4 pruebas correctas y 3 fallidas por hash y `generado_en` incompatibles.

El wrapper recibió el código `99` y terminó en cero:

```text
[afeleia] el snapshot no se pudo refrescar (codigo 99).
El build sigue con el snapshot committeado...
WRAPPER_EXIT=0
```

El mensaje es incorrecto: el snapshot committeado sí fue reemplazado.

**Impacto de seguridad/integridad:** el build puede continuar con una combinación de datos y sello que nunca existió como versión válida. El sello deja de ser una prueba confiable de procedencia e integridad.

**Recomendación:** publicar snapshot y manifiesto mediante una única referencia versionada. Por ejemplo, escribir ambos dentro de un directorio/version ID nuevo y hacer un único cambio atómico de puntero; alternativamente, guardar contenido, hash y metadata en un único archivo canónico.

### P1 — Un snapshot corrupto publica una tienda vacía

**Ubicación:** `lib/afeleia/catalog.ts:243-250`

Si la API está caída y el snapshot no cumple el contrato, `fallbackCatalog()` devuelve `emptyCatalog()`.

Se quitó el `slug` del primer producto del snapshot y se ejecutó un build con la API inaccesible:

```text
[afeleia] el snapshot committeado NO cumple el contrato:
se sirve un catálogo vacío...
BUILD_EXIT=0
Generating static pages ... 74/74
```

El build normal genera 113 páginas. Desaparecieron las 39 páginas de producto: 13 productos por 3 idiomas.

**Impacto:** un deploy verde puede reemplazar el último sitio bueno por una tienda sin productos. En una plataforma con deploy atómico, fallar el build sería más seguro porque mantendría publicada la versión anterior.

**Recomendación:** si API y snapshot fallan simultáneamente, fallar el build. Mantener `emptyCatalog` sólo para un modo explícito de emergencia, con una señal verificable y una aprobación operacional deliberada.

### P1 — Amplificación de requests durante una caída

**Ubicación:**

- `lib/afeleia/catalog.ts:300`
- `app/[locale]/vinos/[slug]/page.tsx:25-28`
- `scripts/catalogo-snapshot.mjs:71`
- `scripts/catalogo-snapshot-build.mjs:51-82`

Una respuesta sana generó una consulta cacheada durante `next build`. El mismo build contra un socket que destruye la conexión produjo:

```text
RESULT buildExit=0 failedFetchRequests=52
FINAL_COUNT=52
```

El `AbortSignal` evita que el fetch quede indefinido, pero también impide la memoización automática de Next. Las páginas/workers vuelven a ejecutar la consulta fallida.

Con un servidor que aceptó la conexión y nunca contestó:

```text
generator timeout=15s
runtime static generation=30.7s
RESULT buildExit=0 seconds=82.9
snapshotIntacto=True
selloIntacto=True
```

Los relojes de 15 y 45 segundos están correctamente ordenados para generador y wrapper. El hueco es que el wrapper no cubre la fase de Next y los timeouts de 10 segundos se multiplican entre workers.

**Impacto de escala:** 100 sitios desplegando durante una caída pueden producir aproximadamente 5.300 intentos: 100 del prebuild y unos 5.200 del build de Next. La cifra real en la plataforma depende de workers, regiones y concurrencia, pero la amplificación está comprobada.

**Recomendación:** resolver el catálogo una vez por proceso/build y compartir también el resultado degradado o el error. Agregar un presupuesto temporal para toda la fase, no solamente por fetch. Para muchos sitios, preferir un artefacto publicado por Afeleia sobre consultas sincronizadas desde cada build.

### P1 — Falso positivo: el generador rechaza un catálogo vacío válido

**Ubicación:**

- `scripts/catalogo-validacion.mjs:44-45`
- `lib/afeleia/contract.ts:220-225`

El contrato y el runtime aceptan `productos: []`, pero `razonParaRechazar()` lo rechaza:

```json
{
  "isValidCatalog": true,
  "razon": "el catalogo llego vacio",
  "sitio": "vina-casa-acosta",
  "productos": 0
}
```

Caso concreto:

1. El cliente despublica legítimamente todos los productos.
2. La API y el sitio vivo muestran cero productos.
3. El generador se niega a actualizar el snapshot.
4. Ante una caída posterior, reaparecen los productos viejos.

**Impacto:** se publica inventario retirado y el build continúa verde. Es el patrón H-54: el control rechaza un estado correcto y deja una copia vieja sin una alerta activa.

**Recomendación:** decidir la semántica una sola vez. Si vacío es válido, el generador debe aceptarlo. Si debe ser ilegal, API, contrato, runtime y generador deben rechazarlo de forma coherente.

---

## 3. Hallazgos adicionales

### P2 — Configuración inválida se confunde con indisponibilidad

**Ubicación:**

- `lib/afeleia/contract.ts:184-188`
- `scripts/catalogo-validacion.mjs:40-41`
- `lib/afeleia/catalog.ts:320-321`

Resultados:

```text
env=""                         -> no fetch, snapshot
env="  vina-casa-acosta  "    -> rechazado/degradado
env="VINA-CASA-ACOSTA"        -> rechazado/degradado
env="vina-casa-acosta"        -> aceptado
```

La igualdad estricta es correcta para el contrato v1. El slug válido ya está normalizado a minúsculas y guiones. Hacer la comparación case-insensitive escondería errores de configuración.

El problema es operacional: una variable vacía o con espacios puede dejar el sitio permanentemente degradado y verde.

**Recomendación:** validar formato y espacios al comienzo del prebuild. Configuración inválida debe fallar temprano; una caída temporal de una configuración válida puede usar snapshot.

### P2 — Temporal fijo sin aislamiento entre procesos

Diez generadores concurrentes dieron ocho éxitos y dos fallas `ENOENT` al renombrar el mismo `.tmp`. El resultado final quedó íntegro en esa ejecución, pero no existe aislamiento entre escritores.

**Recomendación:** temporal único por PID/UUID y coordinación explícita si puede haber más de un generador sobre el mismo checkout.

### P3 — Timeout de cuerpo mal diagnosticado

Un servidor devolvió headers `200` y nunca terminó el cuerpo:

```text
La API respondió algo que no es JSON. El snapshot NO se tocó.
RESULT exit=1 seconds=15.11 snapshotIntacto=True tmpCount=0
```

El timeout sí cubre DNS, redirects y lectura de cuerpo. El problema es de observabilidad: una espera agotada en `response.json()` se informa como JSON inválido.

### P3 — Un `.tmp` que sea directorio no se limpia

Un archivo temporal viejo se sobrescribe y elimina correctamente. Si la ruta temporal existe como directorio:

```text
GENERATOR_EXIT=1
TMP_IS_DIR=True
```

No existe riesgo de rename entre volúmenes: el temporal se crea al lado del destino.

---

## 4. Controles que sí quedaron corregidos

### Reproducciones originales

Los tres escenarios exigidos terminaron con snapshot y sello intactos, wrapper en cero y build completo:

```text
200 de otro sitio:        exit=0, 113/113, snapshot intacto
200 sin slug de producto: exit=0, 113/113, snapshot intacto
socket que no responde:   exit=0, 113/113, snapshot intacto
```

El runtime real de Next contra una API controlada de otro tenant publicó:

```text
<meta name="afeleia-catalogo" content="snapshot" ...>
CONTAINS_FOREIGN=False
CONTAINS_SNAPSHOT_FIRST=True
```

### Regresiones deliberadas

```text
throw en puerta response non-ok: 9 pass / 1 fail
throw en contrato roto:          9 pass / 1 fail
throw en fetch catch:            9 pass / 1 fail
throw al inicio de degraded:     9 pass / 1 fail
precio del snapshot alterado:    5 pass / 2 fail
```

El hallazgo anterior sobre `degraded()` está corregido: inyectar un `throw` ahora pone rojo el test.

### Códigos del generador

Todos estos caminos devolvieron un código distinto de cero:

```text
missing-env          exit=1
flag-without-value   exit=1
fetch-failed         exit=1
http-503             exit=1
bad-json             exit=1
empty-valid-v1       exit=1
wrong-site           exit=1
malformed-product    exit=1
```

No se encontró un camino de falla directa del generador que termine en cero. El riesgo está en el wrapper, que convierte deliberadamente esos códigos en éxito y puede asumir incorrectamente que el snapshot anterior quedó intacto.

---

## 5. Escalabilidad del catálogo del sitio

### Tamaño y número de páginas

Medición actual:

```text
13 productos
respuesta compacta: 15.510 bytes
snapshot:           22.890 bytes
aprox. 1.193 bytes por producto en respuesta
aprox. 1.761 bytes por producto en snapshot formateado
```

Proyección lineal:

| Productos | Respuesta | Snapshot | Páginas totales aproximadas |
|---:|---:|---:|---:|
| 100 | 0,11 MiB | 0,17 MiB | 374 |
| 250 | 0,28 MiB | 0,42 MiB | 824 |
| 500 | 0,57 MiB | 0,84 MiB | 1.574 |
| 1.000 | 1,14 MiB | 1,68 MiB | 3.074 |

El primer cuello no será la memoria de una única respuesta ni el tamaño del repositorio. Será el build:

- se generan tres páginas por producto;
- cada detalle obtiene/busca dentro del catálogo completo;
- `getCatalog()` adapta todos los productos;
- el trabajo acumulado se aproxima a `O(P²)`.

Umbrales recomendados:

- **Hasta 100 productos:** razonable.
- **100–250:** zona amarilla; medir tiempo, memoria y tamaño de artefactos.
- **En 250:** comenzar contrato v2 o artefactos particionados.
- **Desde 500:** cargar el catálogo entero en cada render deja de ser un diseño sano.
- **En 1.000:** tope duro de la API y aproximadamente 3.000 páginas de producto.

Paginar requiere contrato v2; no es un cambio que este repositorio pueda hacer solo.

### Colisión de imágenes en fallback

**Ubicación:** `scripts/catalogo-snapshot.mjs:119-152`

Las imágenes remotas se mapean a `public/vinos/` usando solamente el basename. Dos URLs diferentes que terminen en el mismo nombre quedan apuntando a una única imagen local.

El uploader actual usa una ruta que incluye `productoId` y `Date.now()`, por lo que el riesgo con cargas humanas secuenciales es bajo. Aumenta con importadores masivos, cargas concurrentes y fuentes externas que reutilicen nombres como `image.jpg`.

El warning de build no alcanza porque no existe monitoreo de esos logs.

**Recomendación:** usar una ruta determinística como:

```text
/vinos/<slug-producto>/<ordinal-o-hash>.<ext>
```

Slug sin ordinal/hash no alcanza si un producto tiene varias imágenes.

### Patrón de deploy multiplicado

En salud:

```text
2 consultas por sitio/deploy
100 sitios = 200 consultas por despliegue simultáneo
```

En caída comprobada:

```text
aprox. 53 intentos por sitio
100 sitios = aprox. 5.300 intentos
```

Para varios sitios conviene:

- escalonar deploys y agregar jitter;
- cachear también el resultado degradado dentro del proceso;
- evitar que cada worker resuelva independientemente la misma caída;
- considerar publicación central de artefactos por sitio;
- disparar builds por evento en vez de refrescar todo por calendario.

---

## 6. Qué cambiar al conectar el sitio 2

| Elemento | Tipo | Acción obligatoria |
|---|---|---|
| `collectionLines` | Diseño editorial local | Rehacer para la nueva marca. |
| `lineMeta`, `lineSlugs`, `featuredLineOrder` | Diseño local | Reemplazar líneas, fotos, tiers y anchors. |
| `WINE_CATEGORY` | Configuración del cliente | Definir la categoría principal del nuevo sitio. |
| `data/wines.ts` | Datos Casa Acosta/fallback | Sustituir o eliminar los 13 productos y listas locales. |
| Snapshot y sello | Datos del tenant | Regenerar verificando `payload.sitio`. |
| `public/vinos` | Assets del tenant | Sincronizar con nombres sin colisión. |
| `SNAPSHOT_IMAGE_PREFIX` | Convención técnica | Puede mantenerse, pero debe documentarse. |
| Sitemap | Acoplamiento incorrecto | Dejar de importar los 13 vinos locales. |
| `messages/*.json` | Copy de marca | Reescribir completamente. |
| Contacto, redes, email y mapa | Datos de marca | Reemplazar `lib/contact.ts`. |
| JSON-LD | Identidad y dirección | Parametrizar organización, geo, logo y marca. |
| Metadata, layout y `llms.txt` | Contenido de marca | Auditar y reemplazar. |
| Actividades | Datos del cliente | Rehacer o desactivar. |
| Redirects | Historia de migración | No copiar desde Casa Acosta. |
| PDFs, fotos, logos y paleta | Activos de marca | Reemplazar y revisar licencias. |
| Dominio, Netlify y env | Operación | Validar API URL, slug y dominio en prebuild. |

`collectionLines` y `lineMeta` son correctamente locales: representan diseño editorial. El sitemap, las listas fallback y el JSON-LD duro son más peligrosos porque parecen infraestructura, pero contienen datos del cliente.

El sitemap actual usa `wines` localmente en `app/sitemap.ts:44`; por lo tanto, un producto nuevo publicado por Afeleia puede tener página sin aparecer en el sitemap, mientras productos heredados pueden seguir anunciándose.

---

## 7. Escalabilidad del backend multiinquilino de Afeleia

### Bordes de 1.000 productos y 200 definiciones

**Ubicación:** `supabase/functions/catalogo-publico/index.ts`

El razonamiento de DEC-6 cierra para truncación: el whitelist se deriva de las mismas definiciones limitadas que viajan en la respuesta. Si una definición queda después de la fila 200, su atributo tampoco se publica.

Existe una excepción deliberada: si una definición entra dentro de las filas consultadas pero el saneo la descarta, el atributo permanece para que el verificador externo detecte la inconsistencia.

Hay un falso positivo de observabilidad en el borde exacto:

```text
limit(200)  + length === 200  -> definiciones_truncadas
limit(1000) + length >= 1000  -> catalogo_truncado
```

Con esas consultas no puede saberse si había exactamente 200/1.000 o si se descartaron filas adicionales. Para saberlo hay que pedir `límite + 1` y cortar antes de responder.

### Cache y aislamiento entre tenants

La clave de la cache de aplicación distingue por slug. No se encontró una vía directa para servir el catálogo de un sitio a otro.

Límites y riesgos:

- máximo de 200 slugs en memoria;
- política FIFO práctica, no LRU;
- techo de 120 misses/minuto global por isolate, no por sitio;
- misses sobre slugs inventados pueden consumir el techo y desalojar tenants legítimos;
- tráfico repetido sobre un slug cacheado no consume misses;
- el fallback rancio no tiene edad máxima y puede superar los 300 segundos del CDN.

La interferencia real entre sitios depende de cuántos compartan isolate y región. Eso requiere una prueba desplegada.

### Memoria de cache

Proyección con catálogos máximos:

```text
100 sitios × 1,15 MiB = 115 MiB de payload crudo
200 sitios × 1,15 MiB = 230 MiB de payload crudo
```

No incluye objetos JavaScript, strings duplicados, runtime ni respuestas. Con un límite documentado de 256 MB por Edge Function, 100 catálogos máximos ya son una zona de riesgo y 200 no son razonables.

Esto es una proyección. Debe validarse midiendo RSS/heap en staging.

### Consultas e índices

No se encontró una consulta estructuralmente obligada a hacer full scan:

- sitio: índice parcial único por `slug`, activo y no borrado;
- categorías: índice por `sitio_id` con borrados excluidos;
- productos: índice parcial `(sitio_id, activo)`;
- variantes: índice por `producto_id`;
- definiciones: índice parcial por `sitio_id` activo.

El primer trabajo evitable son los sorts por tenant: productos por nombre, categorías por orden/nombre y definiciones por orden/clave.

No deberían agregarse índices por especulación. Primero ejecutar `EXPLAIN (ANALYZE, BUFFERS)` en staging con volúmenes representativos.

---

## 8. Estimación de invocaciones y tráfico

Supuesto realista para planificación, no medición: 3.000 ventanas activas de cache por sitio/mes más dos deploys.

| Catálogo | Invocaciones/sitio | Egress/sitio | Primer cruce aproximado del egress Free de 5 GB |
|---|---:|---:|---:|
| 14 productos / 18 KB | 3.004 | 54 MB | sitio 93 |
| 100 productos / ~119 KB | 3.004 | 358 MB | sitio 14 |
| 1.000 productos / 1,15 MB | 3.004 | 3,45 GB | sitio 2 |

Por invocaciones, 500.000 mensuales se cruzarían alrededor del sitio 167 bajo este escenario.

Escenario continuamente activo, una ventana por minuto:

```text
43.200 invocaciones por sitio/mes
Free 500.000: se cruza en el sitio 12
Pro 2.000.000: se cruza en el sitio 47
```

Con un catálogo de 1.000 productos, un sitio continuamente activo rondaría 49,7 GB/mes. El cupo Pro de 250 GB se cruzaría aproximadamente con el sexto sitio.

Para saber cuál límite se alcanza realmente faltan:

- plan contratado;
- ventanas activas reales por sitio;
- distribución por regiones/isolate;
- hit rate del CDN y cache interno;
- egress e invocaciones consumidos por el resto del proyecto/organización.

Referencias de límites vigentes:

- <https://supabase.com/docs/guides/functions/limits>
- <https://supabase.com/pricing>
- <https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations>
- <https://supabase.com/docs/guides/platform/manage-your-usage/egress>
- <https://docs.netlify.com/build/functions/configuration/>

---

## 9. Monitor externo necesario

El HTML publica:

```html
<meta
  name="afeleia-catalogo"
  content="api|snapshot"
  data-generado="..."
>
```

Esto permite conocer origen y antigüedad de la copia, pero no cuánto tiempo lleva el sitio en modo degradado. `data-generado` es la fecha del snapshot, no el momento de la caída.

El monitor necesita:

1. Registro de sitios con URL pública, slug esperado, ruta de catálogo y responsable.
2. Consultar el HTML público/CDN cada 5–10 minutos.
3. Exigir exactamente un meta `afeleia-catalogo` válido.
4. Persistir `firstObservedSnapshot` y fallas consecutivas.
5. Alertar después de 2–3 chequeos o al superar X horas en snapshot.
6. Alertar inmediatamente por meta ausente, timestamp inválido, catálogo vacío o HTTP no satisfactorio.
7. Deduplicar alertas y emitir recuperación cuando vuelva a `api`.
8. Ejecutarse fuera de los deploys y, preferentemente, fuera del mismo dominio de falla que Afeleia.

Para detectar integridad multiinquilino y tienda vacía faltaría publicar al menos:

```text
data-sitio="vina-casa-acosta"
data-productos="13"
```

El meta actual alcanza para origen/edad; no alcanza para verificar tenant y cardinalidad.

---

## 10. Plan recomendado ordenado por cuándo duele

### Antes del sitio 2

1. Corregir atomicidad de snapshot y sello.
2. No desplegar automáticamente `emptyCatalog` cuando también falla la API.
3. Unificar la semántica del catálogo vacío.
4. Validar env y slug como configuración, no como caída.
5. Hacer el sitemap dependiente del catálogo real.
6. Crear el checklist de desacople de marca/tenant.
7. Definir nombres de imágenes sin colisiones.
8. Construir el monitor externo mínimo.

### Antes de 10 sitios

1. Eliminar la amplificación de fetches fallidos.
2. Escalonar deploys y agregar jitter.
3. Poner edad máxima al catálogo rancio.
4. Separar el techo de misses por tenant o evitar que un tenant lo agote para todos.

### Entre 20 y 50 sitios

1. Medir invocaciones, egress, cache hit rate y distribución por isolate.
2. Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` con datos representativos.
3. Medir tiempo de build y RSS con catálogos de 100 y 250 productos.
4. Evaluar artefactos centrales y builds disparados por publicación.

### Antes de 250 productos por sitio

1. Diseñar contrato v2 con paginación o partición.
2. Evitar adaptar/buscar el catálogo completo por cada página.
3. Separar listados, detalle y metadata en artefactos apropiados.

### Antes de 100 sitios o catálogos grandes

1. Reemplazar el cache fijo de 200 entradas.
2. Validar memoria real por isolate.
3. Probar degradación entre tenants bajo misses concurrentes.
4. Presupuestar egress por tamaño real de catálogo, no sólo por invocaciones.

---

## 11. Evidencia final de verificación

Sobre `d518cd4`, después de eliminar `.next`:

```text
NEXT_EXISTS=False
TYPECHECK_EXIT=0
LINT_EXIT=0
tests 247
pass 247
fail 0
BUILD_EXIT=0
Generating static pages ... 113/113
```

Sobre el HEAD posterior `a8d34b8`:

```text
TYPECHECK_EXIT=0
LINT_EXIT=0
tests 251
pass 251
fail 0
BUILD_RETRY_EXIT=0
Generating static pages ... 113/113
```

El primer build adicional del HEAD nuevo sufrió un crash no reproducido en el segundo intento:

```text
Next.js build worker exited with code: 3221226505
BUILD_EXIT=-1073740791
```

No se elevó como hallazgo autónomo por tener una sola reproducción.

Pruebas focalizadas de Afeleia:

```text
running 42 tests
ok | 42 passed | 0 failed
```

Hashes finales del sitio:

```text
catalogo-fallback.json:
E5726B0B6B856C15BEA369B585F9D0B3B5B85F3CC3270C780D1738D3D67024D1

catalogo-fallback.integrity.json:
AA9BA048E833D7EE2CBD0B3A0DBF7B7D754AA9921CD002ECE929F6A40C3B8752

TMP_COUNT=0
```

## Conclusión

La PR mejoró de forma real la resiliencia y cerró los cinco defectos anteriores, pero todavía convierte varios estados peligrosos en builds verdes. Para un solo sitio eso ya puede publicar datos viejos o una tienda vacía; con muchos sitios, la amplificación de requests, el cache global y la falta de observabilidad convierten una caída local en un problema de plataforma.

La prioridad no debería ser aumentar los topes todavía. Primero hay que asegurar integridad atómica, aislamiento entre tenants, una única semántica del catálogo vacío y monitoreo externo. Después corresponde medir el sistema con 20–50 sitios y catálogos de 100–250 productos antes de diseñar el contrato v2.
