import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";

// Cada persona es una fila editorial: foto grande + texto, alternando lados.
// `image`: retrato real (local) o placeholder Unsplash. `pos`: object-position
// para encuadrar bien el rostro según cada foto.
const staffMembers = [
  { key: "damian", image: "/images/staff/damian.webp", pos: "50% 18%" },
  {
    key: "andrea",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=75",
    pos: "50% 28%",
  },
  { key: "enrique", image: "/images/staff/enrique.webp", pos: "50% 16%" },
  {
    key: "alfonso",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=75",
    pos: "50% 25%",
  },
] as const;

// Borde "cosido" artesanal en el canto exterior de cada retrato (guiño al boceto).
function StitchedEdge() {
  return (
    <span
      aria-hidden="true"
      className="w-3.5 sm:w-4 shrink-0 self-stretch bg-primary/[0.04]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, rgba(122,37,48,0.5) 0 2px, transparent 2px 11px)",
      }}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/staff">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.staff" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function StaffPage({
  params,
}: PageProps<"/[locale]/staff">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");

  return (
    <section className="pt-32 pb-24 md:pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
      <Reveal className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
        <p className="font-accent italic font-light text-wine-accent text-lg md:text-xl tracking-wide mb-3">
          {t("hero.eyebrow")}
        </p>
        <h1
          className="font-display text-primary mb-5 md:mb-6"
          style={{
            fontSize: "clamp(2.25rem, 7vw, 5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="font-body text-on-surface-variant"
          style={{ fontSize: "clamp(1rem, 1.5vw, 1.25rem)", lineHeight: 1.6 }}
        >
          {t("hero.subtitle")}
        </p>
      </Reveal>

      <div className="space-y-20 md:space-y-28">
        {staffMembers.map((person, idx) => {
          const reversed = idx % 2 === 1; // foto a la derecha en filas impares
          const name = t(`members.${person.key}.name`);
          return (
            <Reveal
              key={person.key}
              className="grid md:grid-cols-2 gap-8 md:gap-14 lg:gap-20 items-center"
            >
              <figure
                className={`group relative flex overflow-hidden rounded-2xl ambient-shadow-lg bg-surface-container-low ${
                  reversed ? "md:order-2" : "md:order-1"
                }`}
              >
                {!reversed && <StitchedEdge />}
                <div className="relative flex-1 aspect-[4/5] overflow-hidden">
                  <Image
                    src={person.image}
                    alt={name}
                    fill
                    className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]"
                    style={{ objectPosition: person.pos }}
                    sizes="(max-width: 768px) 100vw, 45vw"
                  />
                </div>
                {reversed && <StitchedEdge />}
              </figure>

              <div
                className={`flex flex-col justify-center ${
                  reversed ? "md:order-1" : "md:order-2"
                }`}
              >
                <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest mb-3">
                  {t(`members.${person.key}.role`)}
                </span>
                <h2
                  className="font-display text-primary leading-tight"
                  style={{ fontSize: "clamp(1.9rem, 3.5vw, 3rem)" }}
                >
                  {name}
                </h2>
                <div className="w-14 h-px bg-outline-variant/50 my-6" />
                <p className="font-body text-body-md text-on-surface-variant leading-relaxed max-w-[62ch]">
                  {t(`members.${person.key}.bio`)}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
