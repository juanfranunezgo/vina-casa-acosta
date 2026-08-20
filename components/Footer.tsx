import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Clock, Mail, Phone, Star } from "lucide-react";
import FacebookIcon from "@/components/icons/FacebookIcon";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { DOCUMENTOS_LEGALES } from "@/lib/legal";
import { VENDIMIA_HUB } from "@/data/activities";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
  FACEBOOK_URL,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
} from "@/lib/contact";

const socialLinks = [
  { href: INSTAGRAM_URL, key: "instagram" as const, Icon: InstagramIcon },
  { href: FACEBOOK_URL, key: "facebook" as const, Icon: FacebookIcon },
  { href: GOOGLE_MAPS_URL, key: "google" as const, Icon: Star },
];

/**
 * Pie del sitio: cuatro columnas sobre el papel de la página.
 *
 * **Por qué claro.** Estuvo un día sobre `primary` —el vino casi negro— y en la
 * home entraba a sangre justo debajo de la tarjeta-foto del CTA, que ya es
 * oscura: dos masas oscuras pegadas, separadas por una franja fina de papel, y
 * el pie leyéndose como un telón en vez de como un cierre. El fondo es
 * `surface-container-low`, el mismo de la banda A3 (Líneas Destacadas) y un
 * punto por debajo del papel del cuerpo. Cerrar la página lo hace el filete de
 * arriba, no un bloque de color.
 *
 * **Por qué una fila de cuatro y no dos bandas.** La versión oscura repartía la
 * banda de arriba en 5/3/4 de doce y la de abajo en tres tercios: ni una columna
 * caía sobre otra, los filetes verticales no separaban nada y las listas —de 5,
 * 7 y 3 ítems— dejaban el borde inferior dentado. Ahora todo vive en una sola
 * grilla de doce, cuatro columnas de tres, y las dos listas miden lo mismo.
 *
 * **Qué se fue.** Las seis líneas de vino una por una: eran seis de veintiséis
 * enlaces y su lugar es /vinos, que ya las dibuja completas. "Horarios" y
 * "Contacto" eran dos columnas de la misma pregunta —cómo visitar la viña— y
 * ahora son una.
 *
 * **Qué NO lleva**, por decisión del cliente: captura de correo y condiciones
 * de la tienda.
 *
 * Los enlaces de las columnas no tienen rótulos propios en `messages`: salen de
 * `nav` y de `activities`, que ya los nombran. Dos fuentes para el mismo texto
 * es como el menú termina diciendo "Tours" y el pie "Tour".
 */
export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tActivities = await getTranslations("activities");
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const lp = (path: string) => `/${locale}${path}`;

  // Los tres documentos legales existen sólo en español, y en /en y /pt la
  // etiqueta se queda en texto a propósito: enlazar un PDF que el visitante no
  // puede leer promete algo que no se cumple. Cuando haya traducción, se agrega
  // su archivo a `DOCUMENTOS_LEGALES` bajo el idioma que corresponda y el enlace
  // aparece solo.
  //
  // "Mapa de Sitio" se quitó el 2026-08-18: era la única etiqueta que no
  // llevaba a ninguna parte. El sitemap que importa —el que leen los buscadores—
  // lo emite `app/sitemap.ts` y no necesita un enlace en el pie.
  const docs: Partial<Record<string, string>> = DOCUMENTOS_LEGALES[locale] ?? {};
  const legalItems = [
    { label: t("legal.privacy"), href: docs.privacy },
    { label: t("legal.terms"), href: docs.terms },
    { label: t("legal.cookies"), href: docs.cookies },
  ];

  /**
   * Las dos columnas de enlaces.
   *
   * `#tours`, `#experiencias` y `#eventos` son secciones que el índice de
   * actividades realmente dibuja. **Talleres no está**: no tiene sección propia,
   * y un rótulo que no aterriza donde dice es lo mismo que se sacó con "Mapa de
   * Sitio". Si el índice estrena su sección, la fila entra acá en una línea.
   *
   * La segunda columna lleva a /vinos y /tienda en vez de listar las seis
   * colecciones: el pie dice dónde están los vinos, no cuáles son.
   */
  const columnas = [
    {
      title: t("columns.activities"),
      links: [
        ...(VENDIMIA_HUB
          ? [{ label: tActivities("vendimia.breadcrumb"), href: lp(VENDIMIA_HUB) }]
          : []),
        { label: tActivities("categories.tours.name"), href: lp("/actividades#tours") },
        {
          label: tActivities("categories.experiencias.name"),
          href: lp("/actividades#experiencias"),
        },
        { label: tNav("activitiesEvents"), href: lp("/actividades#eventos") },
        { label: tNav("activitiesAll"), href: lp("/actividades") },
      ],
    },
    {
      title: t("columns.winery"),
      links: [
        { label: tNav("vinos"), href: lp("/vinos") },
        { label: tNav("tienda"), href: lp("/tienda") },
        { label: tNav("historia"), href: lp("/historia") },
        { label: tNav("staff"), href: lp("/staff") },
        { label: tNav("contacto"), href: lp("/contacto") },
      ],
    },
  ];

  /**
   * Los rótulos iban a 12px con peso 600 y `tracking-widest`, y los enlaces a
   * 16px: la misma receta que hacía tosco al botón. Bajan a 11px con peso 500 y
   * 15px de cuerpo, y el aire lo pone el interlineado en vez del grosor.
   */
  const rotuloClass = "font-body text-[11px] font-medium uppercase tracking-[0.18em] text-primary";
  const enlaceClass =
    "text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm";

  return (
    <footer className="w-full border-t border-outline-variant/40 bg-surface-container-low">
      {/* El `pb-24` de móvil y el `md:pr-20` de la fila de cierre no son
          estética: el botón flotante del carrito es `fixed` y, con la página al
          fondo, se apoya sobre la esquina inferior derecha. Sin esa reserva
          tapaba el enlace de Cookies — medido, no supuesto. */}
      <div className="max-w-(--container-max) mx-auto px-margin-mobile md:px-margin-desktop pt-12 pb-24 md:pt-16 md:pb-10">
        {/* Una sola grilla: marca · visita · dos columnas de enlaces.
            En móvil se apila, en `sm` la marca y la visita comparten fila y los
            enlaces pasan abajo, y en `md` los cuatro bloques miden tres columnas
            de doce. El `gap` interno del `nav` es el mismo `gutter` de la grilla
            de afuera: es lo que hace que sus dos columnas caigan exactamente
            donde caerían dos columnas de tres. */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-12 md:gap-gutter">
          {/* ── Marca ──────────────────────────────────────────────────── */}
          <div className="md:col-span-3">
            <Link
              href={lp("")}
              className="inline-flex items-center gap-3 leading-none"
              aria-label="Viña Casa Acosta — Inicio"
            >
              <Image
                src="/brand/logo-negro.webp"
                alt=""
                width={200}
                height={200}
                className="h-14 w-auto"
                sizes="56px"
              />
              <span
                aria-hidden="true"
                className="font-display text-lg leading-tight tracking-tight text-primary"
              >
                Viña Casa Acosta
              </span>
            </Link>
            <p className="mt-5 font-body text-[15px] leading-[1.7] text-on-surface-variant">
              {t("tagline")}
            </p>

            <div className="mt-6 flex gap-3">
              {socialLinks.map(({ key, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`social.${key}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-primary transition-colors hover:border-primary/40 hover:bg-surface-container"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Visítanos ──────────────────────────────────────────────── */}
          <div className="md:col-span-3">
            <h2 className={`${rotuloClass} mb-5`}>{t("columns.visit")}</h2>
            <ul className="space-y-3.5 font-body text-[15px]">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="leading-[1.6] text-on-surface-variant">
                  {t("location")}
                  {/* "Cómo llegar" estaba escondido detrás del icono de estrella
                      rotulado "Google Reviews". Para una viña que recibe visitas
                      es de las tres cosas que más se buscan, así que ahora es un
                      enlace con todas las letras, colgado de la dirección. */}
                  <br />
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${enlaceClass} mt-1 inline-block underline decoration-outline-variant underline-offset-4 hover:decoration-primary/50`}
                  >
                    {t("directions")}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {/* El horario trae un salto de línea: el sábado va en su propia
                    línea, igual que en /contacto. Sin `whitespace-pre-line` el
                    HTML lo colapsa y las dos frases quedan pegadas. */}
                <span className="whitespace-pre-line leading-[1.6] text-on-surface-variant">
                  {t("hours")}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${enlaceClass} tabular-nums`}
                >
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={CONTACT_MAILTO_URL} className={enlaceClass}>
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          {/* ── Índice ─────────────────────────────────────────────────── */}
          <nav
            aria-label={t("navigation")}
            className="grid grid-cols-2 gap-8 sm:col-span-2 md:col-span-6 md:gap-gutter"
          >
            {columnas.map(({ title, links }) => (
              <div key={title}>
                <h2 className={`${rotuloClass} mb-5`}>{title}</h2>
                <ul className="space-y-3 font-body text-[15px]">
                  {links.map(({ label, href }) => (
                    <li key={href}>
                      <Link href={href} className={enlaceClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ── El cierre, en una línea ──────────────────────────────────── */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-outline-variant/40 pt-6 font-body text-[13px] text-on-surface-variant md:mt-14 md:flex-row md:justify-between md:pr-20">
          <p className="text-center md:text-left">
            {t("copyright", { year })}
            <span aria-hidden="true" className="mx-2 text-outline">
              ·
            </span>
            {t("developedBy")}{" "}
            <a
              href="https://ligts.cl"
              target="_blank"
              rel="noopener noreferrer"
              className={`${enlaceClass} underline decoration-outline-variant underline-offset-2 hover:decoration-primary/50`}
            >
              ligts.cl
            </a>
          </p>
          <div className="flex gap-5">
            {legalItems.map(({ label, href }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${enlaceClass} underline decoration-outline-variant underline-offset-2 hover:decoration-primary/50`}
                >
                  {label}
                </a>
              ) : (
                <span key={label}>{label}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
