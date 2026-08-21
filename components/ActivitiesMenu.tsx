import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import { activityMenu, activityPath, VENDIMIA_HUB } from "@/data/activities";

type Props = {
  locale: string;
  variant: "desktop" | "mobile";
  /** El móvil cierra el drawer al elegir; el escritorio no necesita nada. */
  onNavigate?: () => void;
};

/**
 * Contenido del menú de Actividades, en sus dos formas. Vive aparte del Navbar
 * porque son las mismas 14 entradas dibujadas distinto, y tenerlo dos veces es
 * tenerlo desincronizado.
 *
 * No monta nada condicionalmente: quien lo usa decide si se VE, nunca si
 * EXISTE. Es lo que hace que estas 14 entradas cuenten como enlazado interno
 * — ver tests/navegacion-enlaces-source.test.mjs.
 *
 * Por eso las categorías despliegan con `<details>` y no con estado de React:
 * los ítems de una categoría cerrada siguen estando en el HTML que sirve el
 * servidor, ocultos por la hoja del navegador. Un acordeón con `{abierto &&
 * <ul/>}` se vería idéntico y dejaría once fichas sin un solo enlace entrante.
 * El `name` compartido es lo que hace que sólo una quede abierta a la vez, sin
 * una línea de JavaScript.
 *
 * Las seis entradas van en una sola columna y en un orden fijo: Vendimia,
 * las tres categorías, eventos y el índice. El mega-menú anterior las repartía
 * en cuatro columnas y la lista larga de Experiencias se partía en dos, así que
 * su segunda mitad quedaba bajo una columna sin encabezado — cuatro columnas a
 * la vista y tres títulos.
 *
 * Vendimia va arriba y aparte de las categorías: no es una categoría con lista,
 * es una página. Si `VENDIMIA_HUB` vuelve a `null` desaparece de las dos formas
 * del menú a la vez — enlazar a un 404 desde el navbar de todo el sitio sería
 * peor que no ofrecerlo.
 */
export default function ActivitiesMenu({ locale, variant, onNavigate }: Props) {
  const t = useTranslations("nav");
  const tCategories = useTranslations("activities.categories");
  const tItems = useTranslations("activities.items");
  const tVendimia = useTranslations("activities.vendimia");
  const columns = activityMenu();
  const esMovil = variant === "mobile";

  // Las seis filas de primer nivel son tipográficamente idénticas: mismo peso,
  // mismo tamaño, mismo color, mismos 44px de alto. Ninguna se destaca sobre
  // otra, ni siquiera Vendimia. Lo único que las diferencia es el chevron, y
  // sólo lo llevan las tres que despliegan algo.
  //
  // `font-medium` y no `font-semibold`: el peso sólo tiene que separar la fila
  // madre de sus fichas, que van en peso normal. 600 pesaba más que el propio
  // navbar que abre el panel.
  //
  // El filete vino va por fila y no en el panel: en el panel, con las esquinas
  // redondeadas, se leía como un contorno. Por eso el redondeo de la fila queda
  // sólo a la derecha — un borde de un solo lado con las cuatro esquinas curvas
  // se ve como un borde a medio dibujar.
  //
  // Y va como pseudo-elemento y no como `border-l-2`, que es de borde a borde:
  // apiladas, las filas dibujaban una única recta continua de arriba abajo del
  // desplegable, dura en las dos puntas. Metido dos unidades por arriba y por
  // abajo, y con las puntas redondeadas, cada fila vuelve a tener su propia
  // marca y entre una y otra queda aire.
  const filaBase =
    "relative flex min-h-11 items-center justify-between gap-3 pl-3.5 pr-3 py-2 font-body text-body-md font-medium transition-colors before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:transition-colors before:content-['']";
  const filaClass = esMovil
    ? `${filaBase} rounded-r-md text-on-primary/85 before:bg-on-primary/25 hover:bg-on-primary/10 hover:text-on-primary hover:before:bg-on-primary/70`
    : `${filaBase} rounded-r-lg text-on-surface before:bg-wine-accent/30 hover:bg-primary/5 hover:text-primary hover:before:bg-wine-accent`;

  // `list-none` mata el triangulito en Firefox y Chrome; el pseudo-elemento
  // hace lo propio en Safari. Sin los dos, el marcador nativo convive con el
  // chevron y la fila muestra dos flechas.
  const resumenClass = `${filaClass} cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden`;

  const itemClass = esMovil
    ? "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 font-body text-body-md text-on-primary/75 transition-colors hover:bg-on-primary/10 hover:text-on-primary"
    : "group/item flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary";

  // La lista sangrada y con filete a la izquierda es lo que ata cada ficha a su
  // categoría: es la separación que el mega-menú no lograba dibujar.
  //
  // El filete se desvanece en las dos puntas en vez de cortarse en seco. Con un
  // `border-l` la guía arrancaba y terminaba con un canto duro a la altura del
  // primer y del último enlace, y junto a las marcas de las filas madre daban
  // dos rectas paralelas y perfectas: más un diagrama de árbol que un menú.
  const listaBase =
    "relative mb-1 ml-6 pl-3 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:content-['']";
  const listaClass = esMovil
    ? `${listaBase} before:bg-gradient-to-b before:from-transparent before:via-on-primary/25 before:to-transparent`
    : `${listaBase} before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent`;

  // Vendimia es una fila más, sin tarjeta, sin icono y sin bajada: el menú no
  // jerarquiza destinos, sólo los ordena. Usa `breadcrumb` y no `hero.title`
  // porque acá la etiqueta corta es la que cabe en una fila — "Vendimia", no
  // "Vendimia en Casa Acosta".
  const vendimia = VENDIMIA_HUB && (
    <Link
      href={`/${locale}${VENDIMIA_HUB}`}
      onClick={onNavigate}
      className={filaClass}
    >
      {tVendimia("breadcrumb")}
    </Link>
  );

  return (
    <>
      {vendimia}
      {columns.map((column) => (
        <details
          key={column.category}
          name={`actividades-${variant}`}
          className="group/cat"
        >
          <summary className={resumenClass}>
            <span>{tCategories(`${column.category}.name`)}</span>
            {/* Tailwind v4 gira con la propiedad `rotate`, no con `transform`:
                si alguna vez hay que depurar esto, `getComputedStyle(svg).transform`
                dice "none" aunque el icono esté dado vuelta. */}
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open/cat:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className={listaClass}>
            {column.items.map((activity) => (
              <li key={activity.slug}>
                <Link
                  href={`/${locale}${activityPath(activity)}`}
                  onClick={onNavigate}
                  className={itemClass}
                >
                  {tItems(`${activity.slug}.name`)}
                  <ArrowRight
                    className={
                      esMovil
                        ? "h-4 w-4 shrink-0"
                        : "h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                    }
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <Link
        href={`/${locale}/actividades#eventos`}
        onClick={onNavigate}
        className={filaClass}
      >
        {t("activitiesEvents")}
      </Link>
      <Link
        href={`/${locale}/actividades`}
        onClick={onNavigate}
        className={filaClass}
      >
        {t("activitiesAll")}
      </Link>
    </>
  );
}
