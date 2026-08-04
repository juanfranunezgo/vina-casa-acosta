# Brief de contenido — Viña Casa Acosta

> Documento para pasarle al cliente (la familia Acosta) y conseguir el contenido
> que falta antes de la presentación final. Los textos están redactados para
> enviar por WhatsApp / correo, no son para la web.

## ✅ Lo que ya tenemos

- Logo en versión letras blancas y letras negras (`/public/brand/`)
- 13 fotos de botellas (`/public/vinos/`)
- Estructura completa de 6 páginas migradas a Next.js
- Tienda con filtros funcionando y carrito visual (vía WhatsApp)
- Mapa real de San Vicente de Tagua Tagua

## ⏳ Lo que falta y hay que pedir

### 1. Fotografía (lo más urgente — los placeholders actuales son de Unsplash y se notan genéricos)

**Hero principal**
- 2-3 fotos panorámicas del viñedo al atardecer (golden hour). Idealmente sin gente o con gente de espaldas/silueta.

**Casa Acosta**
- 4-6 fotos del lugar: la casona, la bodega por dentro, las barricas, detalles de las vides.

**Historia / Familia**
- Foto familiar de Nelson Acosta (fundador), de preferencia en el viñedo.
- Foto de Damián Acosta (cofundador, generación actual).
- Foto de Andrea Leyton (event planner).
- Foto de Enrique Pizarro (agrónomo).
- Foto de Alfonso Duarte (enólogo).
- Si hay fotos históricas (1998, primera cosecha) → oro puro para la línea de tiempo.

**Actividades**
- Tour Ombú en acción (gente caminando entre las vides).
- Tour Berá en la bodega subterránea (si existe).
- Mesa de cata del Tour Carmenere premium.
- Una experiencia tipo Vendimia o Día de las Madres (si la han hecho antes).
- Evento privado (matrimonio o corporativo) celebrado en el lugar.

> **Especificación técnica:** mínimo 1920px de ancho, formato JPG/PNG. Si están
> en celular, pedirles que envíen la versión original sin comprimir, no la
> versión de WhatsApp que pierde calidad.

### 2. Texto de cada vino

Tengo **13 vinos** cargados en el sistema, todos con datos placeholder que **el cliente debe validar**:

- Notas de cata (4 descriptores por vino)
- Maridajes sugeridos
- ☑ Precio real en CLP → **recibidos el 2026-08-03**, ver abajo. Todavía **no están cargados**:
  los que muestra el sitio siguen siendo inventados.
- Año de cosecha actual en venta

#### Precios reales (recibidos del cliente, 2026-08-03)

⚠️ **Estos precios no se cargan en el repositorio, se cargan en el panel de Afeleia.** La
tienda, `/vinos`, la ficha de cada vino y el carrusel del inicio leen el catálogo desde la
API del panel (`lib/afeleia/catalog.ts`); editar precios en el código no cambia nada de lo
que ve el visitante. Una vez cargados: `npm run catalogo:snapshot` y commitear el
`data/catalogo-fallback.json` regenerado, para que la copia de respaldo no quede con los
precios inventados.

La planilla llegó encabezada **"Precio (Caja x 6)"** — hay que confirmar con el cliente si
es el precio por botella comprando caja de 6 o el de la caja completa, porque la tienda web
vende por unidad.

| Vino (como lo escribió el cliente) | Variedad / Tipo | Precio | Producto en el catálogo |
|---|---|---|---|
| Berá Rosé | Carménère | $9.120 | `bera` |
| Ombú – Tannat | Tannat | $9.900 | `ombu-tannat` |
| Ombú – Cabernet Sauvignon | Cabernet Sauvignon | $9.900 | `ombu-sauvignon` |
| Ombú | Carménère | $9.900 | `ombu-carmenere` |
| Lajau – Betúm | Ensamblaje | $9.900 | `lajau-betum` |
| Lajau – Detí | Ensamblaje | $9.900 | `lajau-deti` |
| Lajau – Sam | Ensamblaje | $9.900 | `lajau-sam` |
| Lajau – Betum-Yu | Ensamblaje | $9.900 | `lajau-betum-yu` |
| Estación Francia | Carménère | $18.800 | `estacion-francia-carmenere` |
| Estación Francia – Tannat | Carménère / Tannat | $18.800 | `estacion-francia-tannat` |
| Guidaí – Brut | Carménère | $22.460 | `guidai` |
| Yaráy Guá Blanco | Blanco | $9.120 | `yaray-gua-blanco` |
| Yaráy Guá Tinto | Tinto | $9.120 | `yaray-gua-tinto` |

Los 13 calzan uno a uno con el catálogo. Tres nombres de la planilla no coinciden con los
del sitio y conviene aprovechar de zanjarlos al cargar: **Berá Rosé** (en el catálogo es
"Berá", y las fichas de tour lo llaman "Berá Rosé Carménère"), **Estación Francia – Tannat**
(la planilla lo declara ensamblaje Carménère/Tannat, el catálogo lo tiene como Tannat) y
**Guidaí – Brut** (la planilla lo declara Carménère, el catálogo lo tiene como espumante de
ensamblaje).

Líneas a confirmar:
- **Ombú** (Carmenere, Tannat, Cabernet Sauvignon) — Reserva
- **Lajau** (Sam, Detí, Betúm, Betúm Yú) — Edición limitada / Ícono
- **Estación Francia** (Carmenere, Tannat) — Gran Reserva
- **Berá** (Cabernet Sauvignon) — Gran Reserva
- **Guidaí** (Ensamblaje) — Edición limitada
- **Yaráy Guá** (Tinto, Blanco) — línea fresca

### 3. Texto de Historia

Tengo redactada una versión que mezcla lo del boceto de Stitch con datos
generales (Nelson Acosta, 1998, primera producción 2003, Damián como
sucesor). **Hay que validar fechas y nombres**, y si quieren añadir o ajustar
alguna parte de la narrativa.

### 4. Información operativa que falta

- ☐ Dirección exacta + cómo llegar
- ☐ Teléfono(s) de contacto reales (hoy el WhatsApp del carrito apunta a `+56 9 0000 0000` placeholder)
- ☑ Email de contacto real: `contacto@casaacosta.cl` (confirmado por el cliente 2026-08-03).
      Ojo: el dominio del correo NO es el del sitio (`vinacasaacosta.cl`) — ver si lo migran.
- ☐ Horarios oficiales (los del boceto son razonables pero hay que validar)
- ☐ Redes sociales activas (Instagram, Facebook, TikTok)
- ☐ ¿Despachan a regiones? ¿Solo zona centro? ¿Retiro en viña?
- ☐ ¿Cuentan con registro SAG o algún sello de denominación de origen?

### 5. Decisiones pendientes del cliente para Fase 2

- ☐ **¿Reservas de tours/eventos online o solo por contacto?** (afecta cuánto backend hay que hacer)
- ☐ **Pasarela de pago preferida**: Webpay Plus / Flow / Mercado Pago / Khipu
- ☐ **Verificación de edad** según Ley 19.925: ¿modal al entrar al sitio o solo al comprar?
- ☐ **Boleta electrónica**: ¿qué integrador usan o usarían? (OpenFactura, SimpleAPI, Bsale)
- ☐ **Dominio**: ¿ya está comprado el .cl? ¿qué dominio quieren?

## Para la conversación con el cliente

Cuando les muestres la demo, **pon expectativas claras**:

1. *"Lo que ven es un prototipo navegable: pueden hacer clic en todo, agregar al carrito, navegar entre páginas. Las imágenes que no son de sus vinos son placeholders — necesito que me envíen las fotos reales para reemplazarlas."*
2. *"La compra hoy se cierra por WhatsApp. En la fase 2, cuando aprueben el diseño, integramos Webpay y verificación de edad según la ley chilena. Eso son ~4-6 semanas adicionales."*
3. *"Los precios y notas de cata que ven son ejemplos — necesito que ustedes validen los datos de cada botella."*

---

*Generado para Fase 1 — Demo de presentación.*
