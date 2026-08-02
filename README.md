# Viña Casa Acosta — sitio web

Sitio público de la viña (San Vicente de Tagua Tagua, Valle del Cachapoal), en español,
inglés y portugués. Next.js 16 (App Router) + Tailwind v4 + next-intl.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # producción: verifica TypeScript y genera las páginas estáticas
npm run lint
```

Para las variables de entorno, copiar [`.env.example`](.env.example) a `.env.local`. En
desarrollo ninguna es obligatoria.

## Deploy

Hosteado en **Netlify**: el push a `main` publica producción y el push a cualquier otra rama
crea un deploy preview. El adaptador de Next lo instala Netlify en cada build; la
configuración vive en [`netlify.toml`](netlify.toml).

El paso a paso completo —crear el proyecto, conectar el dominio, límites del plan gratuito y
troubleshooting— está en [`docs/DEPLOY-NETLIFY.md`](docs/DEPLOY-NETLIFY.md).

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — stack, estructura y convenciones del proyecto.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — estado real: qué funciona, qué no y qué falta para
  producción. **Empezar por acá.**
- [`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md) — el contrato de IDs de sección.
- [`docs/reglas-frontend-nextjs.md`](docs/reglas-frontend-nextjs.md) — reglas de semántica,
  accesibilidad, SEO y rendimiento.
