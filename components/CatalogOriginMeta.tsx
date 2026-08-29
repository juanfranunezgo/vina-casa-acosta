import { getCatalogMeta } from "@/lib/afeleia/catalog";

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
 * `data-sitio` y `data-productos` los pidió la segunda ronda de review, y cierran
 * las dos fallas silenciosas que el origen y la fecha no alcanzan a describir:
 * un sitio sirviendo el catálogo de OTRO cliente, y un sitio que se quedó sin
 * productos. En los dos casos la web se ve perfectamente sana.
 *
 * No expone nada: `api`/`snapshot` no dice ni la URL ni el proyecto, el slug del
 * sitio ya viaja en la URL de la API pública, la cantidad de productos se cuenta
 * entrando a la tienda, y la fecha de generación ya viene dentro de la propia
 * respuesta pública.
 *
 * Los cuatro datos salen de UNA lectura: pedirlos por separado dejaría que el
 * meta se contradijera a sí mismo.
 */
export default async function CatalogOriginMeta() {
  const { origin, generatedAt, sitio, products } = await getCatalogMeta();
  return (
    <meta
      name="afeleia-catalogo"
      content={origin}
      data-generado={generatedAt}
      data-sitio={sitio}
      data-productos={products}
    />
  );
}
