# Deploy en Netlify — paso a paso

Guía de la migración de Vercel a Netlify y del deploy de todos los días.

**Por qué se movió:** el plan Hobby de Vercel prohíbe el uso comercial, así que en cuanto
el sitio empiece a vender la cuenta tendría que pasar a Pro (US$20 por usuario al mes). El
plan Free de Netlify sí permite uso comercial, con un límite duro de créditos y sin cobro
por exceso. Ver [Costos](#costos-lo-que-hay-que-vigilar) al final: el límite existe y
conviene entenderlo antes de empezar a deployar diez veces al día.

Última actualización: 2026-08-03. Sitio en producción: <https://vinacasaacosta.cl>.

---

## Lo que ya está hecho en el repo

Nada de esto hay que volver a tocarlo:

| Archivo | Qué hace |
|---|---|
| `netlify.toml` | Build command, publish dir, Node 22 y headers de seguridad de los assets. |
| `next.config.ts` | Los mismos headers de seguridad, para las páginas (ver la trampa más abajo). |
| `lib/siteUrl.ts` | Resuelve la URL pública del sitio desde el entorno. Ya no hay dominio clavado en el código. |
| `app/[locale]/layout.tsx` | `metadataBase` sale de `SITE_URL`. |
| `lib/wineJsonLd.ts` | Las URLs absolutas del JSON-LD salen de `SITE_URL`. |
| `.env.example` | Documenta `NEXT_PUBLIC_SITE_URL`. |
| `.gitignore` | Ignora `.netlify` (y sigue ignorando `.vercel`). |

**El adaptador de Next no se instala:** Netlify lo aplica solo en cada build (es OpenNext,
mantenido por ellos). No hay que agregar `@netlify/plugin-nextjs` a `package.json` ni fijar
versión — si se fija, deja de recibir el soporte de las versiones nuevas de Next.

Verificado con `npm run build` sobre Next 16.2.6: 74 páginas SSG + el proxy (middleware de
next-intl), sin errores ni warnings de lint.

---

## Paso 1 — Subir los cambios a GitHub

El repo correcto es `juanfranunezgo/vina-casa-acosta` (el mismo al que ya pushea el
`origin` local).

```bash
cd sitio-web
git add netlify.toml lib/siteUrl.ts lib/wineJsonLd.ts "app/[locale]/layout.tsx" .env.example .gitignore docs/ CLAUDE.md README.md
git commit -m "chore: migrar el hosting de Vercel a Netlify"
git push origin main
```

## Paso 2 — Crear la cuenta y el proyecto en Netlify

1. Entrar a <https://app.netlify.com/signup> y registrarse **con GitHub** (así queda
   autorizado el acceso a los repos en un solo paso).
2. En el dashboard: **Add new project → Import an existing project → GitHub**.
3. Netlify pide permisos: elegir **Only select repositories** y marcar
   `juanfranunezgo/vina-casa-acosta`. (Se puede ampliar después.)
4. Seleccionar el repo. En la pantalla de configuración:
   - **Branch to deploy**: `main`
   - **Base directory**: vacío — la raíz del repo ya es la raíz del proyecto Next
   - **Build command** y **Publish directory**: llegan de `netlify.toml`
     (`npm run build` y `.next`). Si aparecen en blanco, no pasa nada: el archivo manda.
5. **Deploy**. El primer build tarda ~2–4 min (instala dependencias + genera las 74 páginas).

## Paso 3 — Ponerle nombre al subdominio

Netlify asigna un nombre random tipo `celebrated-pika-3f9a21`. Cambiarlo:

**Project configuration → General → Project details → Change project name** →
`vinacasaacosta`

Quedó en `https://vinacasaacosta.netlify.app`, hoy detrás del dominio propio. No hay que
tocar nada en el código: el build recibe la URL pública en el entorno y `lib/siteUrl.ts` la
usa para canonical, Open Graph y JSON-LD (ver Paso 6).

## Paso 4 — Verificar el deploy

Abrir el sitio y revisar, en este orden:

- [ ] `https://vinacasaacosta.netlify.app/` redirige a `/es` (eso prueba que el proxy de
      next-intl está corriendo en las Edge Functions).
- [ ] `/en` y `/pt` cargan traducidos, y el selector de idioma del navbar cambia de idioma.
- [ ] `/es/vinos` muestra las botellas y `/es/vinos/ombu-carmenere` abre la ficha.
- [ ] Las imágenes se ven nítidas (van por el Image CDN de Netlify) y el hero no salta.
- [ ] El carrito abre, suma y el checkout arma el mensaje de WhatsApp.
- [ ] `Ctrl+U` en la home: el `<link rel="canonical">` dice `vinacasaacosta.cl`.
- [ ] `Ctrl+U` en `/es/vinos/ombu-carmenere`: el canonical apunta **a esa ficha**, no a la
      home. Si apunta a la home, `alternates` volvió a heredarse del layout — ver
      `lib/alternates.ts`.
- [ ] `/sitemap.xml` lista 69 URLs y `/robots.txt` termina con la línea `Sitemap:`.

Si algo falla, el log completo está en **Deploys → [el deploy] → Deploy log**.

## Paso 5 — Auto-deploy (esto arregla el problema viejo)

Con Vercel el push no disparaba deploy porque el proyecto apuntaba a otro repo
(`web-casa-acosta`). Acá el proyecto queda conectado al repo que realmente se usa, así que:

- push a `main` → deploy a producción, solo.
- push a cualquier otra rama → **deploy preview** con su propia URL, que además **no
  consume créditos**. Es la forma barata de revisar cambios antes de publicarlos.

Ya no hace falta correr ningún comando a mano para publicar.

## Paso 6 — Dominio propio: `vinacasaacosta.cl` (hecho)

El dominio está registrado en **NIC Chile**, el DNS lo administra **Cloudflare** (solo como
DNS, todo en gris / "DNS only": el CDN y el SSL los pone Netlify, encimar dos CDNs solo
suma puntos de falla) y el hosting es Netlify.

**Registros en Cloudflare** — los que importan:

| Nombre | Tipo | Contenido | Proxy |
|---|---|---|---|
| `vinacasaacosta.cl` | A | `75.2.60.5` (apex de Netlify) | DNS only |
| `www` | CNAME | `vinacasaacosta.netlify.app` | DNS only |
| `vinacasaacosta.cl` | MX | `mail.vinacasaacosta.cl` | DNS only |
| `mail` | A | `216.246.46.90` (cPanel de BanaHosting) | DNS only |

⚠️ El correo `@vinacasaacosta.cl` sigue en BanaHosting, **no** en Netlify. El MX apunta a
`mail.` y no al apex justamente porque el apex ahora resuelve a Netlify. Si alguna vez se
activa el proxy naranja de Cloudflare sobre `mail`, el correo deja de llegar: el proxy solo
pasa HTTP/HTTPS. Lo mismo vale para `cpanel`, `webmail`, `webdisk`, `cpcalendars` y
`cpcontacts`.

**En Netlify**: `vinacasaacosta.cl` es el *Primary domain* y `www` redirige a él.

**En Netlify → Environment variables**:
`NEXT_PUBLIC_SITE_URL = https://vinacasaacosta.cl` (sin barra final).

Netlify ya expone el dominio primario en su variable `URL`, así que un redeploy solo
también alcanzaría; se define explícita para que no dependa de cuál dominio esté marcado
como primario. Después de definirla hay que **Trigger deploy → Deploy site**: los canonical,
el hreflang, el sitemap y el JSON-LD se calculan en build time.

## Paso 7 — Apagar Vercel (sin romper los links viejos)

Recién cuando Netlify esté verificado. El proyecto `web-casa-acosta` **no tenía dominio
propio**, solo los alias `*.vercel.app`, así que no hay DNS que mover.

El link `web-casa-acosta.vercel.app` circuló por WhatsApp, así que **no se borra: se
convierte en un redirect 301** al sitio nuevo. Así los mensajes viejos siguen funcionando y
Google traspasa las señales en vez de perderlas. El cascarón está armado fuera del repo, en
`web/vercel-redirect/` (ver su `LEEME.md`):

```bash
cd ../vercel-redirect
vercel --prod      # vincular al proyecto EXISTENTE web-casa-acosta
curl -I https://web-casa-acosta.vercel.app/es/vinos   # debe responder 301/308 a Netlify
```

Después, en local, borrar el link de la CLI vieja para no volver a deployar el sitio a
Vercel por costumbre:

```bash
rm -rf sitio-web/.vercel
```

(Es solo estado local de la CLI, está gitignoreado. Borrarlo no toca nada remoto.)

En un par de meses, cuando nadie use el link viejo, ahí sí: Vercel → `web-casa-acosta` →
Settings → General → **Delete Project**. Ojo de no tocar los otros dos proyectos del equipo
(`elcsanvicente-booking`, `ligts-site`).

---

## Deploy manual con la CLI (opcional)

No es necesario — el auto-deploy del Paso 5 cubre el día a día — pero sirve para publicar
sin pasar por GitHub:

```bash
npm i -g netlify-cli
netlify login
cd sitio-web && netlify link      # conecta esta carpeta con el proyecto ya creado
netlify deploy --build            # deploy preview, con URL propia
netlify deploy --build --prod     # producción
```

---

## Costos: lo que hay que vigilar

El plan **Free** trae **300 créditos al mes**, es un límite duro (no se puede comprar más) y
se reinicia cada ciclo. Tarifas relevantes:

| Consumo | Créditos |
|---|---|
| Deploy de producción | 15 c/u |
| Ancho de banda | 20 por GB |
| Web requests | 2 por cada 10.000 |
| Deploy previews y branch deploys | 0 |
| Envíos de formularios | 0 |

Traducido: **el gasto grande no es el tráfico, son los deploys de producción**. Veinte
deploys a `main` en un mes se comen los 300 créditos solos. La forma de trabajar que
corresponde en este plan es iterar en ramas (preview gratis) y mergear a `main` por tandas.

Un mes típico de este sitio podría verse así: 8 deploys (120) + 5 GB de tráfico (100) +
300.000 requests (60) = 280 créditos. Entra, pero sin lujos.

**Si se acaban los créditos, los proyectos de la cuenta se pausan** y los visitantes ven un
`Site not available` hasta el siguiente ciclo. Netlify avisa al 50%, 75% y 100% — conviene
tener las notificaciones activas. Si el sitio crece, el paso siguiente es el plan Personal
(1.000 créditos/mes), que sigue siendo bastante más barato que Vercel Pro.

---

## Si algo se rompe

| Síntoma | Causa probable |
|---|---|
| `/` no redirige a `/es` | El proxy no se desplegó. Revisar que `proxy.ts` esté en la raíz del repo y que el deploy log muestre "Next.js proxy/middleware". |
| Canonical con dominio viejo | Falta redeployar después de setear `NEXT_PUBLIC_SITE_URL`, o quedó con barra final. |
| Build falla en `next build` | Reproducirlo local con `npm run build`. Si local pasa y Netlify no, casi siempre es la versión de Node: `NODE_VERSION` en `netlify.toml`. |
| Imágenes 404 | Rutas con mayúsculas: el CDN distingue mayúsculas de minúsculas, Windows no. |
| Sitio en `Site not available` | Se acabaron los créditos del mes. Ver arriba. |

Documentación oficial: <https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/>
