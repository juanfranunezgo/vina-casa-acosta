import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Home } from "lucide-react";
import Button from "@/components/ui/Button";

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");

  return (
    <section className="min-h-[80svh] flex items-center justify-center px-margin-mobile md:px-margin-desktop py-section-gap">
      <div className="max-w-xl text-center">
        <p
          className="font-display text-primary/15 leading-none mb-6"
          style={{
            fontSize: "clamp(8rem, 20vw, 14rem)",
            letterSpacing: "-0.04em",
          }}
        >
          404
        </p>
        <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
          {t("eyebrow")}
        </p>
        <h1
          className="font-display text-primary mb-4"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.1,
          }}
        >
          {t("title")}
        </h1>
        <p className="font-body text-body-md text-on-surface-variant mb-10 max-w-md mx-auto">
          {t("subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            href={`/${locale}`}
            variant="primary"
            iconLeft={<Home className="h-4 w-4" />}
          >
            {t("ctaHome")}
          </Button>
          <Button
            href={`/${locale}/vinos`}
            variant="outline"
            iconLeft={<ArrowLeft className="h-4 w-4" />}
          >
            {t("ctaCatalog")}
          </Button>
        </div>
      </div>
    </section>
  );
}
