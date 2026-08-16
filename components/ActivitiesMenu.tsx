import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import {
  activityMenu,
  activityPath,
  categoryIndexHref,
} from "@/data/activities";

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
 * Vendimia no aparece: su hub todavía no existe y enlazar a un 404 desde el
 * navbar de todo el sitio sería peor que no ofrecerlo. Ver VENDIMIA_HUB en
 * data/activities.ts.
 */
export default function ActivitiesMenu({ locale, variant, onNavigate }: Props) {
  const t = useTranslations("nav");
  const tCategories = useTranslations("activities.categories");
  const tItems = useTranslations("activities.items");
  const columns = activityMenu();
  const esMovil = variant === "mobile";

  const itemClass = esMovil
    ? "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 font-body text-body-md text-on-primary/75 transition-colors hover:bg-on-primary/10 hover:text-on-primary"
    : "group/item flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary";

  // El encabezado de columna es un enlace, no un rótulo: en móvil necesita los
  // 44 px de área táctil como cualquier otro destino del menú.
  const headingClass = esMovil
    ? "mt-2 flex min-h-11 items-center px-3 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary/55"
    : "mb-1 block px-3 font-body text-label-sm font-semibold uppercase tracking-wider text-primary hover:underline";

  return (
    <>
      <div className={esMovil ? "" : "grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4"}>
        {columns.map((column) => {
          // Las experiencias son ocho y las otras tres: sin esto la columna
          // larga estira el panel al triple de alto que sus vecinas.
          const esLarga = !esMovil && column.category === "experiencias";
          return (
            <div key={column.category} className={esLarga ? "lg:col-span-2" : ""}>
              <Link
                href={categoryIndexHref(locale, column.category)}
                onClick={onNavigate}
                className={headingClass}
              >
                {tCategories(`${column.category}.name`)}
              </Link>
              <ul className={esLarga ? "sm:columns-2" : ""}>
                {column.items.map((activity) => (
                  <li key={activity.slug} className="break-inside-avoid">
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
            </div>
          );
        })}
      </div>

      <div
        className={
          esMovil
            ? "mx-3 mt-2 border-t border-on-primary/15 pt-1"
            : "mt-4 flex items-center justify-between gap-4 border-t border-outline-variant/40 pt-3"
        }
      >
        <Link
          href={`/${locale}/actividades#eventos`}
          onClick={onNavigate}
          className={itemClass}
        >
          {t("activitiesEvents")}
        </Link>
        <Link
          href={`/${locale}/actividades`}
          onClick={onNavigate}
          className={itemClass}
        >
          {t("activitiesAll")}
        </Link>
      </div>
    </>
  );
}
