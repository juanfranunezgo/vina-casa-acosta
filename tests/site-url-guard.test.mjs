import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { resolveSiteUrl } = await import("@/lib/siteUrl");

/**
 * La regla que este test cuida: un build de produccion no puede resolver el
 * dominio publico a un host provisional.
 *
 * Es la falla que dejo la portada indexada bajo `vinacasaacosta.netlify.app`
 * en agosto de 2026. No la detecto ningun test porque el sitio se veia igual:
 * lo unico que cambiaba eran los canonical, el hreflang, el sitemap y el
 * JSON-LD, que ningun visitante mira. Google si.
 *
 * Los deploy previews viven en `*.netlify.app` a proposito, asi que el guard
 * solo puede morder en `CONTEXT=production`.
 */

test("el dominio explicito gana sobre el que inyecta Netlify", () => {
  const url = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: "https://vinacasaacosta.cl",
    URL: "https://vinacasaacosta.netlify.app",
    CONTEXT: "production",
  });
  assert.equal(url, "https://vinacasaacosta.cl");
});

test("la barra final se descarta", () => {
  const url = resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://vinacasaacosta.cl///" });
  assert.equal(url, "https://vinacasaacosta.cl");
});

test("el build de produccion falla si el dominio es el subdominio de Netlify", () => {
  assert.throws(
    () => resolveSiteUrl({ URL: "https://vinacasaacosta.netlify.app", CONTEXT: "production" }),
    /NEXT_PUBLIC_SITE_URL/,
  );
});

test("el build de produccion falla si no hay dominio y cae en localhost", () => {
  assert.throws(() => resolveSiteUrl({ CONTEXT: "production" }), /host provisional/);
});

test("un deploy preview en netlify.app se construye sin quejarse", () => {
  const url = resolveSiteUrl({
    DEPLOY_PRIME_URL: "https://deploy-preview-12--vinacasaacosta.netlify.app",
    CONTEXT: "deploy-preview",
  });
  assert.equal(url, "https://deploy-preview-12--vinacasaacosta.netlify.app");
});

test("el desarrollo local sigue en localhost:3000", () => {
  assert.equal(resolveSiteUrl({}), "http://localhost:3000");
});

test("un dominio que solo contiene 'netlify.app' como texto no se confunde", () => {
  const url = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: "https://netlify.app.vinacasaacosta.cl",
    CONTEXT: "production",
  });
  assert.equal(url, "https://netlify.app.vinacasaacosta.cl");
});
