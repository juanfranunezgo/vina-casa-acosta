import { getCatalogGeneratedAt, getCatalogOrigin } from "@/lib/afeleia/catalog";

/**
 * Declara en el HTML de dónde salió el catálogo de esta página: `api` o `snapshot`.
 *
 * El modo degradado es, por diseño, invisible para el visitante — y esa misma
 * virtud lo vuelve indetectable para nosotros. Durante la verificación del
 * preview de Netlify el sitio sirvió el snapshot de punta a punta y se veía
 * perfectamente sano: nada en la página desmentía que estuviera leyendo la API.
 *
 * Este `<meta>` cierra ese hueco. `scripts/verificar-catalogo-publico.mjs`
 * (repo de Afeleia, flag `--web`) lo lee sobre la URL pública real, así que
 * "la web está leyendo la API" pasa de ser una afirmación del documento a una
 * aserción que corre y falla.
 *
 * `data-generado` agrega la fecha del catálogo servido. En modo degradado es la
 * edad de la copia, y es lo que permite afirmar desde afuera —sin logs y sin
 * acceso a la base— «este sitio lleva N días sirviendo una copia vieja». Con un
 * solo sitio se puede mirar a mano; con cien, esto es lo único que escala.
 *
 * No expone nada: `api`/`snapshot` no dice ni la URL ni el proyecto, y la fecha
 * de generación del catálogo ya viaja dentro de la propia respuesta pública.
 */
export default async function CatalogOriginMeta() {
  const [origin, generado] = await Promise.all([getCatalogOrigin(), getCatalogGeneratedAt()]);
  return <meta name="afeleia-catalogo" content={origin} data-generado={generado} />;
}
