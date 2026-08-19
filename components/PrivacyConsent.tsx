"use client";

import { useLocale, useTranslations } from "next-intl";
import { PRIVACIDAD_PDF } from "@/lib/legal";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Único por página: dos formularios pueden convivir en la misma vista. */
  id: string;
};

/**
 * Consentimiento de la Política de Privacidad, compartido por los dos
 * formularios del sitio.
 *
 * Va `required` y no con el botón deshabilitado: el navegador rechaza el envío,
 * mueve el foco a la casilla y explica por qué en el idioma del visitante. Un
 * botón apagado sin decir qué falta es un callejón sin salida, y aquí no hay un
 * aviso que lo explique como sí lo tiene la compra mínima del carrito.
 *
 * El enlace abre el PDF en otra pestaña a propósito: pinchado en la misma, se
 * lleva puesto el formulario a medio llenar.
 *
 * En `en` y `pt` el enlace apunta igual al documento en español —es el único que
 * existe— y la etiqueta lo advierte. Es lo contrario de la regla del footer, y
 * la diferencia es el verbo: el footer *ofrece* un documento y por eso calla
 * cuando no puede ofrecerlo en el idioma de la página; acá se *pide aceptar*
 * uno, y pedir que acepten algo que no pueden abrir es peor que ofrecerlo en
 * otro idioma.
 */
export default function PrivacyConsent({ checked, onChange, id }: Props) {
  const t = useTranslations("privacyConsent");
  const locale = useLocale();

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name="privacidad"
        type="checkbox"
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      />
      <label
        htmlFor={id}
        className="font-body text-[14px] leading-relaxed text-on-surface-variant"
      >
        {t.rich("label", {
          policy: (chunks) => (
            <a
              href={PRIVACIDAD_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-current/40 underline-offset-2 transition-colors hover:decoration-current"
            >
              {chunks}
            </a>
          ),
        })}
        {locale !== "es" && <span className="ml-1 opacity-80">{t("inSpanish")}</span>}
      </label>
    </div>
  );
}
