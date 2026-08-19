import { getTranslations } from "next-intl/server";

import { getCatalog } from "@/lib/afeleia/catalog";
import { activities, activityPath, VENDIMIA_HUB } from "@/data/activities";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, INSTAGRAM_URL } from "@/lib/contact";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * `/llms.txt` — el mapa del sitio escrito para un modelo, no para un crawler.
 *
 * Qué problema resuelve: cuando alguien le pregunta a ChatGPT o a Perplexity
 * por una viña del Cachapoal, el motor no rastrea el sitio entero — trae una o
 * dos páginas y responde con eso. Este archivo le da, en una sola lectura de
 * texto plano, qué es la viña, qué vende, dónde queda y en qué URL está cada
 * cosa. El sitemap.xml no cumple ese rol: es una lista de URLs sin contexto,
 * pensada para un rastreador que después visita cada una.
 *
 * Por qué es una ruta y no un archivo en `public/`:
 *
 * 1. El dominio. Todo el sitio resuelve su URL pública desde `SITE_URL`
 *    (entorno), y no hay un solo dominio escrito a mano en el código. Un
 *    `public/llms.txt` obligaría a hardcodear `https://vinacasaacosta.cl` en
 *    unas cuarenta líneas, que es justo lo que `lib/siteUrl.ts` existe para
 *    evitar — y quedaría mintiendo en cada deploy preview.
 * 2. El catálogo. Los vinos los publica Afeleia y cambian sin tocar el repo. Un
 *    archivo estático nacería desactualizado; esta ruta lee el mismo catálogo
 *    que la tienda, con el mismo ISR.
 *
 * Solo se listan las URLs en español: son las canónicas del mercado principal,
 * y el bloque de idiomas de más abajo alcanza para que el modelo sepa que
 * existen las otras dos. Repetir 69 URLs en tres idiomas haría el archivo más
 * largo y menos legible, que es exactamente lo contrario de para qué sirve.
 */
export const revalidate = 60;

/** Una línea de la lista, en el formato que la convención llms.txt espera. */
function entrada(nombre: string, url: string, nota: string): string {
  return `- [${nombre}](${url}): ${nota}`;
}

export async function GET() {
  const es = `${SITE_URL}/${routing.defaultLocale}`;
  const catalogo = await getCatalog();

  const vinos = catalogo.map((vino) =>
    entrada(
      vino.name,
      `${es}/vinos/${vino.slug}`,
      [vino.line, vino.variety, vino.vintage]
        .filter(Boolean)
        .join(" · ")
        .concat(vino.shortDescription ? ` — ${vino.shortDescription}` : ""),
    ),
  );

  // Los nombres salen de los mensajes y no del slug: el archivo lo lee un
  // modelo que va a repetirle el nombre a una persona, y "noquis" no es como
  // se llama el taller.
  const tActividad = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "activities.items",
  });

  const experiencias = activities.map((actividad) =>
    entrada(
      tActividad(`${actividad.slug}.name`),
      `${es}${activityPath(actividad)}`,
      actividad.priceCLP === undefined
        ? "precio a consultar"
        : `desde ${actividad.priceCLP.toLocaleString("es-CL")} CLP por persona`,
    ),
  );

  const cuerpo = `# Viña Casa Acosta

> Viña boutique familiar en San Vicente de Tagua Tagua, Valle del Cachapoal,
> Chile. Tres generaciones de la familia Acosta producen vinos de guarda en
> volúmenes acotados y reciben visitas en el mismo fundo donde se elaboran.

Datos verificables del negocio:

- Ubicación: Fundo El Llano, lote 6, San Vicente de Tagua Tagua, Región de O'Higgins, Chile.
- Valle: Cachapoal, en el valle del Rapel.
- Horario: lunes a sábado de 10:00 a 18:00; jueves hasta las 20:00.
- Contacto: ${CONTACT_PHONE_DISPLAY} · ${CONTACT_EMAIL}
- Cepas de la casa: Carmenere, Tannat, Cabernet Sauvignon, Petit Verdot, y ensamblajes de esas variedades.
- Líneas: Ombú, Lajau, Estación Francia, Berá, Guidaí y Yaráy Guá.
- Los pedidos de la tienda se coordinan con la viña; el pago en línea todavía no está habilitado.

## Vinos

${vinos.join("\n")}

## Visitas y experiencias

${experiencias.join("\n")}
${VENDIMIA_HUB ? `${entrada("Vendimia", `${es}${VENDIMIA_HUB}`, "temporada de cosecha, entre marzo y mayo")}\n` : ""}
## Páginas principales

${entrada("Inicio", es, "presentación de la viña")}
${entrada("Nuestros vinos", `${es}/vinos`, "colección completa por línea")}
${entrada("Tienda", `${es}/tienda`, "catálogo con precios y armado de pedido")}
${entrada("Actividades", `${es}/actividades`, "tours, talleres y experiencias")}
${entrada("Historia", `${es}/historia`, "tres generaciones de la familia Acosta")}
${entrada("Equipo", `${es}/staff`, "quiénes trabajan en la viña")}
${entrada("Contacto", `${es}/contacto`, "dirección, horario y formulario de visita")}

## Otros idiomas

Cada URL existe en tres idiomas con el mismo contenido, cambiando el prefijo:
${routing.locales.map((l) => `${SITE_URL}/${l}`).join(" · ")}

## Notas

- El sitemap completo está en ${SITE_URL}/sitemap.xml
- Las fechas de vendimia y de eventos se anuncian en ${INSTAGRAM_URL}; este sitio
  no publica fechas exactas hasta que la viña las confirma.
- Los precios están en pesos chilenos (CLP) e incluyen IVA.
`;

  return new Response(cuerpo, {
    headers: {
      // `charset` explícito: el archivo tiene tildes y ñ, y sin declararlo hay
      // clientes que lo leen como latin-1 y arruinan justo los nombres propios.
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
