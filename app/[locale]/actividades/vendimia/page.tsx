import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import FotoBorrosa from "@/components/FotoBorrosa";
import ShowMore from "@/components/ShowMore";
import Button from "@/components/ui/Button";
import ActivityBreadcrumbs from "@/components/ActivityBreadcrumbs";
import ActivityFaq, { type FaqEntry } from "@/components/ActivityFaq";
import ActivityReservationForm from "@/components/ActivityReservationForm";
import FechasVendimia, { HorarioVendimia } from "@/components/FechasVendimia";
import VendimiaBarraReserva from "@/components/VendimiaBarraReserva";
import VendimiaHeroReserva from "@/components/VendimiaHeroReserva";
import VendimiaReserva from "@/components/VendimiaReserva";
import VendimiaShort from "@/components/VendimiaShort";
import JsonLd from "@/components/JsonLd";
import { fotoBorrosa } from "@/lib/fotoBorrosa";
import { FUENTE_FICHA } from "@/lib/fuenteFicha";
import { anioDeTemporada } from "@/lib/temporada";
import { buildVendimiaJsonLd } from "@/lib/activityJsonLd";
import { alternatesFor } from "@/lib/alternates";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import {
  VENDIMIA_HUB,
  VENDIMIA_MONTHS,
  activityPath,
  vendimiaRelatedActivities,
} from "@/data/activities";
import {
  VENDIMIA_DIA,
  VENDIMIA_FOTOS,
  VENDIMIA_GALERIA,
  type FilaGaleria,
  type ProporcionFila,
} from "@/data/vendimiaGallery";

/**
 * Dv — Vendimia. Una página para reservar: lo primero es la entrada con las
 * fechas y el precio, y cada sección responde una duda de quien está decidiendo
 * (qué se hace, cómo es, qué incluye) hasta llegar al formulario. La barra de
 * reserva acompaña todo el recorrido.
 *
 * **Ninguna fecha, precio ni cupo está escrito en este repo.** Los publica
 * Afeleia en `catalogo.eventos` y los lee el navegador. Sin esa clave la página
 * sigue con su información y la consulta de temporada. El único dato de
 * calendario propio es el mes (`VENDIMIA_MONTHS`). Lo cuida
 * `tests/vendimia-hub.test.mjs`.
 */

const HUB_PATH = VENDIMIA_HUB ?? "/actividades/vendimia";

// La página es estática, pero dice el año de la próxima vendimia y ese año cambia
// solo, terminado abril. Tiene que ser un literal: Next lee la config de segmento
// estáticamente.
export const revalidate = 86400;

// El hero va en <picture> con dos encuadres, como los otros heros a pantalla
// completa: la aérea 16:9 y un recorte 9:16 para pantallas verticales (ver
// scripts/optimize-heros.mjs). Sin el recorte, `object-cover` estira la foto
// hasta cubrir el alto y en un celular queda borrosa.
//
// Los `sizes` van en `vh` porque lo que decide cuánto se agranda la foto es el
// ALTO del hero: bajo 16:9 el ancho pintado es `alto × 1,78` (177.78vh), y en el
// encuadre vertical, bajo 9:16, es `alto × 0,5625` (56.25vh).
const heroSrcSet = (sufijo: string, anchos: number[]) =>
  anchos
    .map((w) => `/images/actividades/hero-vendimia${sufijo}-${w}.webp ${w}w`)
    .join(", ");
const HERO_SRCSET = heroSrcSet("", [1280, 1920, 2560]);
const HERO_SRCSET_MOVIL = heroSrcSet("-movil", [828, 1200, 1600]);
const HERO_FALLBACK = "/images/actividades/hero-vendimia-1920.webp";
const HERO_SIZES = "(max-aspect-ratio: 16/9) 177.78vh, 100vw";
const HERO_SIZES_MOVIL = "(max-aspect-ratio: 9/16) 56.25vh, 100vw";

const FOTO = VENDIMIA_FOTOS;

/** Clase de proporción de cada fila. Escritas enteras para que Tailwind las vea. */
const ASPECTO: Record<ProporcionFila, string> = {
  "16/9": "aspect-[16/9]",
  "3/2": "aspect-[3/2]",
  "4/5": "aspect-[4/5]",
};

/** Columnas según cuántas fotos trae la fila. Ver `VENDIMIA_GALERIA`. */
const COLUMNAS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
};

/**
 * `sizes` de cada foto según la fila y su lugar en ella. En una fila de tres la
 * última ocupa el ancho entero en móvil: pedirle 50vw como a las otras la
 * dejaría borrosa justo en la foto más grande.
 */
function tamanos(total: number, index: number): string {
  if (total === 1) return "(max-width: 1280px) 100vw, 1280px";
  if (total === 2) return "(max-width: 640px) 100vw, 50vw";
  if (total === 3) {
    return index === total - 1
      ? "(max-width: 768px) 100vw, 33vw"
      : "(max-width: 768px) 50vw, 33vw";
  }
  return "(max-width: 768px) 50vw, 25vw";
}

const tituloSeccion =
  "text-center font-body text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-primary md:text-[2.5rem]";
const contenedor = "mx-auto max-w-(--container-max)";
const margenes = "px-margin-mobile md:px-margin-desktop";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades/vendimia">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "activities.vendimia" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });

  // El año de la próxima temporada, calculado: ver `anioDeTemporada`.
  const year = anioDeTemporada(VENDIMIA_MONTHS);
  const title = t("meta.title", { year });
  const description = t("meta.description", { year });
  // Open Graph no aplica la plantilla de `title`, así que el título completo va
  // escrito (misma nota que en la ficha y en la portada de vinos).
  const ogTitle = `${title} | ${tMeta("siteName")}`;
  const image = {
    url: "/images/actividades/hero-vendimia-1280.webp",
    width: 1280,
    height: 720,
    alt: t("hero.imageAlt"),
  };

  return {
    title,
    description,
    alternates: alternatesFor(locale, HUB_PATH),
    openGraph: {
      type: "website",
      title: ogTitle,
      description,
      url: `/${locale}${HUB_PATH}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image.url],
    },
  };
}

export default async function VendimiaPage({
  params,
}: PageProps<"/[locale]/actividades/vendimia">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("activities.vendimia");
  const tLabels = await getTranslations("activities.labels");
  const tItems = await getTranslations("activities.items");
  // El mismo año del título: va en el dato de cuándo y en el JSON-LD.
  const year = anioDeTemporada(VENDIMIA_MONTHS);

  const faq = t.raw("faq") as FaqEntry[];
  const whatsappHref = `${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(
    tLabels("form.waIntroSeason", { activity: t("hero.title") }),
  )}`;

  const pasos = t.raw("landing.dia.pasos") as { titulo: string; texto: string }[];
  const includes = t.raw("program.includes") as string[];
  const related = vendimiaRelatedActivities();

  const filaDeGaleria = ({ proporcion, fotos }: FilaGaleria, conMargen: boolean) => (
    <div
      className={`grid gap-3 md:gap-4 ${COLUMNAS[fotos.length]} ${conMargen ? "mt-3 md:mt-4" : ""}`}
    >
      {fotos.map((foto, index) => (
        <div
          key={foto}
          className={`relative overflow-hidden rounded-2xl ${ASPECTO[proporcion]} ${
            fotos.length === 3 ? "last:col-span-2 md:last:col-span-1" : ""
          }`}
        >
          <Image
            src={FOTO[foto]}
            alt={t(`photos.${foto}`)}
            fill
            className="object-cover"
            sizes={tamanos(fotos.length, index)}
          />
        </div>
      ))}
    </div>
  );

  // Decorativa: acompaña a la consulta y no aporta información que el formulario
  // no diga. El anclaje en 16% deja entera la gamela roja en la ranura angosta.
  const fotoFormulario = (
    <Image
      src={FOTO.formulario}
      alt=""
      aria-hidden="true"
      fill
      className="object-cover object-[16%_center]"
      sizes="(max-width: 1024px) 100vw, 45vw"
    />
  );

  const datos = [
    {
      label: t("landing.info.cuando"),
      value: <FechasVendimia respaldo={t("facts.seasonValue", { year })} />,
    },
    {
      label: t("landing.info.horario"),
      value: <HorarioVendimia respaldo={t("facts.durationValue")} />,
    },
    { label: t("landing.info.donde"), value: t("landing.info.dondeValor") },
    { label: t("facts.audienceLabel"), value: t("facts.audienceValue") },
    { label: t("landing.info.mascotas"), value: t("landing.info.mascotasValor") },
    { label: t("landing.info.llevar"), value: t("landing.info.llevarValor") },
  ];

  // Los mismos textos que ve la miga en pantalla alimentan el BreadcrumbList:
  // un rastro marcado que no coincide con el visible es marcado inventado.
  const crumbLabels = {
    home: tLabels("breadcrumbHome"),
    activities: tLabels("breadcrumbActivities"),
    vendimia: t("breadcrumb"),
  };

  return (
    <>
      <JsonLd
        data={buildVendimiaJsonLd(
          locale,
          {
            name: t("hero.title"),
            description: t("meta.description", { year }),
            image: HERO_FALLBACK,
          },
          crumbLabels,
        )}
      />

      {/* Dv1 — Hero con la entrada. Tiene que ser el primer <section> de <main>
          y llevar data-hero-text: es lo que el Navbar busca para quedarse
          transparente sobre la foto (ver components/Navbar.tsx). El texto va
          abajo para no taparle las caras al grupo. */}
      <section
        className={`relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden ${FUENTE_FICHA}`}
      >
        <FotoBorrosa
          movil={fotoBorrosa("/images/actividades/hero-vendimia-movil-828.webp")}
          escritorio={fotoBorrosa("/images/actividades/hero-vendimia-1280.webp")}
          className="h-full w-full object-cover object-center"
        />
        <picture className="absolute inset-0">
          <source media="(min-aspect-ratio: 3/4)" srcSet={HERO_SRCSET} sizes={HERO_SIZES} />
          <source srcSet={HERO_SRCSET_MOVIL} sizes={HERO_SIZES_MOVIL} />
          <img
            src={HERO_FALLBACK}
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-black/75 via-black/40 to-transparent md:h-40 md:from-black/50 md:via-transparent"
        />

        {/* En celular el título va arriba y la entrada abajo: entre los dos queda
            el grupo a la vista. En pantallas anchas van juntos, abajo. */}
        <div className={`relative z-10 flex w-full flex-1 flex-col pb-5 pt-28 md:flex-none md:pb-10 md:pt-32 ${margenes}`}>
          <div
            data-hero-text
            className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between text-center md:block md:flex-none"
          >
            <div>
            <h1
              className="font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
              style={{
                fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)",
                lineHeight: 1.14,
                letterSpacing: "-0.015em",
              }}
            >
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-2 max-w-xl font-body text-base text-on-primary/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-lg">
              {t("landing.heroBajada")}
            </p>
            </div>
            <VendimiaHeroReserva />
          </div>
        </div>
      </section>

      {/* Migas bajo el hero, centradas, como en las fichas. */}
      <section className={`bg-surface pt-6 ${margenes} ${FUENTE_FICHA}`}>
        <div className={contenedor}>
          <ActivityBreadcrumbs
            tone="papel"
            align="center"
            aria={tLabels("breadcrumbAria")}
            items={[
              { href: `/${locale}`, label: crumbLabels.home },
              { href: `/${locale}/actividades`, label: crumbLabels.activities },
              { href: `/${locale}${HUB_PATH}`, label: crumbLabels.vendimia },
            ]}
          />
        </div>
      </section>

      {/* Dv2 — Qué es la vendimia, y la invitación a participar. El video no
          explica: muestra la jornada, por eso va como invitación y no entre los
          datos prácticos. Su id está en `data/vendimiaVideo.ts`. */}
      <section
        id="que-es"
        className={`mt-6 scroll-mt-24 bg-surface-container-low py-12 md:py-20 ${margenes} ${FUENTE_FICHA}`}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={tituloSeccion}>{t("about.title")}</h2>
          <p className="mx-auto mt-4 max-w-[62ch] font-body text-base leading-relaxed text-on-surface-variant md:text-lg">
            {t("landing.queEs.texto")}
          </p>
          <h3 className="mt-10 font-body text-xl font-bold text-primary md:text-2xl">
            {t("landing.invitacion.titulo")}
          </h3>
          <p className="mt-1.5 font-body text-base text-on-surface-variant">
            {t("landing.invitacion.texto")}
          </p>
          <div className="mx-auto mt-6 w-full max-w-[17rem] md:max-w-[20rem]">
            <VendimiaShort
              poster={FOTO.manoUva}
              alt={t("photos.manoUva")}
              titulo={t("landing.video.titulo")}
              ver={t("landing.video.ver")}
              verYoutube={t("landing.video.verYoutube")}
              pronto={t("landing.video.pronto")}
            />
          </div>
          <div className="mt-7">
            <Button href="#consulta" variant="primary" size="lg" multiline>
              {t("landing.invitacion.cta")}
            </Button>
          </div>
        </div>
      </section>

      {/* Dv4 — Qué vas a hacer. Numerado porque el orden es la información. En
          celular se desliza de lado; en escritorio se ve el día completo. */}
      <section
        id="jornada"
        className={`scroll-mt-24 overflow-hidden bg-surface py-12 md:py-20 ${margenes} ${FUENTE_FICHA}`}
      >
        <div className={contenedor}>
          <h2 className={tituloSeccion}>{t("landing.dia.titulo")}</h2>
          <p className="mx-auto mt-3 max-w-[60ch] text-center font-body text-base leading-relaxed text-on-surface-variant md:text-lg">
            {t("program.lead")}
          </p>
          <ol className="-mx-margin-mobile mt-8 flex snap-x snap-mandatory scroll-px-margin-mobile gap-3 overflow-x-auto px-margin-mobile pb-2 [scrollbar-width:none] md:-mx-margin-desktop md:scroll-px-margin-desktop md:px-margin-desktop xl:mx-0 xl:grid xl:grid-cols-6 xl:gap-4 xl:overflow-visible xl:px-0 xl:pb-0">
            {pasos.map((paso, index) => {
              const foto = VENDIMIA_DIA[index];
              return (
                <li key={paso.titulo} className="w-[68vw] max-w-[17rem] shrink-0 snap-start xl:w-auto xl:max-w-none">
                  {foto && (
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                      <Image
                        src={FOTO[foto]}
                        alt={t(`photos.${foto}`)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 272px, 200px"
                      />
                    </div>
                  )}
                  <h3 className="mt-3 font-body text-base font-bold leading-snug text-primary">
                    {index + 1}. {paso.titulo}
                  </h3>
                  <p className="mt-1 font-body text-sm leading-relaxed text-on-surface-variant">
                    {paso.texto}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Dv4b — Lo que necesitas saber. Los datos son cortos y van centrados; la
          lista de lo que incluye, a la izquierda, que centrada se lee mal. */}
      <section
        id="info"
        className={`scroll-mt-24 bg-surface-container-low py-12 md:py-20 ${margenes} ${FUENTE_FICHA}`}
      >
        <div className={contenedor}>
          <h2 className={tituloSeccion}>{t("landing.info.titulo")}</h2>
          <dl className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-x-10 gap-y-7 text-center sm:grid-cols-2 lg:grid-cols-3">
            {datos.map(({ label, value }) => (
              <div key={label}>
                <dt className="font-body text-sm text-on-surface-variant">{label}</dt>
                <dd className="mt-1 font-body text-lg font-semibold leading-snug text-primary">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mx-auto mt-12 max-w-3xl">
            <h3 className="text-center font-body text-xl font-bold text-primary md:text-2xl">
              {t("program.includesTitle")}
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 font-body text-base text-on-surface">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-wine-accent" strokeWidth={2.5} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Dv6 — Galería. Filas de una sola proporción, declaradas en
          `VENDIMIA_GALERIA`; el resto queda detrás de "Ver más fotos". */}
      <section
        id="galeria"
        className={`scroll-mt-24 bg-surface py-12 md:py-20 ${margenes} ${FUENTE_FICHA}`}
      >
        <div className={contenedor}>
          <h2 className={`mb-8 ${tituloSeccion}`}>{t("gallery.title")}</h2>
          {VENDIMIA_GALERIA.visibles.map((fila, index) => (
            <div key={fila.fotos[0]}>{filaDeGaleria(fila, index > 0)}</div>
          ))}
          <ShowMore
            id="vendimia-mas-fotos"
            label={t("gallery.more")}
            regionLabel={t("gallery.moreLabel")}
          >
            {VENDIMIA_GALERIA.mas.map((fila) => (
              <div key={fila.fotos[0]}>{filaDeGaleria(fila, true)}</div>
            ))}
          </ShowMore>
        </div>
      </section>

      {/* Dv7 — Reserva, o consulta si no hay evento publicado: `VendimiaReserva`
          decide en el navegador. Es el único bloque en vino de la página, para
          que el momento de reservar no se confunda con el resto. */}
      <section
        id="consulta"
        className={`scroll-mt-20 bg-primary-container py-12 md:py-20 ${margenes} ${FUENTE_FICHA}`}
      >
        <div className={contenedor}>
          <VendimiaReserva
            consulta={
              <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-surface lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-6 sm:p-8 md:p-12 [&_form>div:first-of-type]:text-center">
                  <ActivityReservationForm activityName={t("hero.title")} mode="temporada" />
                </div>
                <div className="relative order-first min-h-[220px] lg:order-none lg:min-h-[300px]">
                  {fotoFormulario}
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* Dv6b — Preguntas frecuentes, después de la reserva: quien ya decidió no
          tiene que pasar por ellas, y quien duda las encuentra justo debajo. */}
      <section
        id="preguntas"
        className={`scroll-mt-24 bg-surface py-12 md:py-20 [--font-display:var(--font-jakarta)] [&_h2]:font-bold [&_h2]:tracking-[-0.02em] ${margenes} ${FUENTE_FICHA}`}
      >
        <div className={contenedor}>
          <ActivityFaq
            title={tLabels("faqTitle")}
            entries={faq}
            more={tLabels("faqMore")}
            whatsappLabel={tLabels("faqWhatsapp")}
            whatsappHref={whatsappHref}
            expandAll={tLabels("faqExpandAll")}
            collapseAll={tLabels("faqCollapseAll")}
            centrado
          />
        </div>
      </section>

      {/* Dv5 — Otras experiencias. Salen de `VENDIMIA_RELATED_SLUGS`. */}
      {related.length > 0 && (
        <section className={`border-t border-outline-variant/40 bg-surface py-12 md:py-16 ${margenes} ${FUENTE_FICHA}`}>
          <div className={contenedor}>
            <h2 className="text-center font-body text-2xl font-bold tracking-[-0.01em] text-primary md:text-[1.75rem]">
              {t("others.title")}
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((activity) => (
                <li key={activity.slug}>
                  <Link
                    href={`/${locale}${activityPath(activity)}`}
                    className="group flex h-full gap-4 rounded-2xl bg-surface-container-low p-3 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-accent/60"
                  >
                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl sm:w-28">
                      <Image
                        src={activity.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                    <div className="min-w-0 self-center">
                      <h3 className="font-body text-lg font-bold leading-snug text-primary">
                        {tItems(`${activity.slug}.name`)}
                      </h3>
                      <p className="mt-1 line-clamp-2 font-body text-sm leading-relaxed text-on-surface-variant">
                        {tItems(`${activity.slug}.description`)}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 font-body text-sm font-semibold text-wine-accent">
                        {tLabels("nav.detail")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <VendimiaBarraReserva />
    </>
  );
}
