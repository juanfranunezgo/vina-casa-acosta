"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { enviarFormularioAfeleia, LARGO_MAXIMO_CAMPO } from "@/lib/afeleiaFormularios";
import { enviarConVerificacion, type EstadoEnvio } from "@/lib/estadoEnvio";
import PrivacyConsent from "@/components/PrivacyConsent";
import TurnstileInvisible, { type TurnstileInvisibleHandle } from "@/components/TurnstileInvisible";
import { PRIVACIDAD_VERSION, TERMINOS_VERSION } from "@/lib/legal";

/** Los value coinciden con las claves de `contactForm.subjects` en messages/. */
const SUBJECTS = ["tour", "event", "purchase", "other"] as const;

export default function ContactForm() {
  const t = useTranslations("contactForm");
  const locale = useLocale();
  const [status, setStatus] = useState<EstadoEnvio>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [botField, setBotField] = useState("");
  const [consent, setConsent] = useState(false);
  const turnstile = useRef<TurnstileInvisibleHandle>(null);

  /**
   * Los envíos van a la puerta de formularios de Afeleia
   * (`lib/afeleiaFormularios.ts`): quedan en el panel de la viña y disparan el
   * aviso por correo. `enviarConVerificacion` (`lib/estadoEnvio.ts`) pide el token
   * de Cloudflare en cada envío y lleva los estados: cualquier falla —el widget,
   * la red, la puerta— termina en el error con la alternativa, nunca en un botón
   * girando.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;

    const enviado = await enviarConVerificacion(
      turnstile.current,
      (token) =>
        enviarFormularioAfeleia(
          "contacto",
          {
            // `nombre`, `email` y `telefono` son los nombres con que Afeleia suma
            // a quien escribió a los contactos de la viña. El teléfono se llama
            // igual en la reserva.
            nombre: name,
            email,
            telefono: phone.trim(),
            asunto: t(`subjects.${subject || "other"}`),
            mensaje: message,
            idioma: locale,
            // Qué ediciones se aceptaron, no sólo que se aceptaron: cuando salga
            // una v1.2, los consentimientos ya guardados siguen diciendo la verdad
            // sobre lo que esta persona leyó. Son dos campos porque los dos
            // documentos se versionan por separado.
            terminos: TERMINOS_VERSION,
            privacidad: PRIVACIDAD_VERSION,
          },
          token,
          botField,
        ),
      setStatus,
    );
    if (!enviado) return;
    setName("");
    setEmail("");
    setPhone("");
    setSubject("");
    setMessage("");
    setConsent(false);
    window.setTimeout(() => setStatus("idle"), 6000);
  };

  const busy = status === "submitting" || status === "success";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="mb-2 font-display text-3xl text-primary">{t("title")}</h2>
      <p className="mb-6 font-body text-body-md text-on-surface-variant">{t("subtitle")}</p>

      {/* Trampa: invisible para personas, tentadora para bots. Viaja aparte de
          los campos, y si llega con algo Afeleia descarta el envío en silencio. */}
      <p className="hidden" aria-hidden="true">
        <label>
          No llenar este campo
          <input
            tabIndex={-1}
            autoComplete="off"
            value={botField}
            onChange={(event) => setBotField(event.target.value)}
          />
        </label>
      </p>

      <div>
        <label className="mb-2 block font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
          {t("fields.name")}
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("fields.namePlaceholder")}
          className="w-full border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
          {t("fields.email")}
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("fields.emailPlaceholder")}
          className="w-full border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      {/* El celular se pide desde el 2026-09-22, a pedido de la viña, y es
          obligatorio. El patrón pide entre 8 y 15 dígitos (el tope de E.164) y
          deja pasar espacios, guiones, paréntesis y un "+" antes del primer
          dígito —también "(+56)"—, así que acepta un número chileno escrito de
          cualquier forma y también uno extranjero. Dentro de la clase todo va
          escapado: los navegadores compilan `pattern` con el flag `v`, que
          rechaza un "(" suelto ahí, y un patrón inválido se ignora sin avisar. */}
      <div>
        <label
          htmlFor="contacto-celular"
          className="mb-2 block font-body text-label-sm uppercase tracking-wider text-on-surface-variant"
        >
          {t("fields.phone")}
        </label>
        <input
          id="contacto-celular"
          required
          type="tel"
          autoComplete="tel"
          pattern="[\s\(]*\+?(?:[\s\-\(\)]*\d){8,15}[\s\-\(\)]*"
          title={t("fields.phoneHint")}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={t("fields.phonePlaceholder")}
          className="w-full border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
          {t("fields.subject")}
        </label>
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        >
          <option value="">{t("fields.subjectPlaceholder")}</option>
          {SUBJECTS.map((key) => (
            <option key={key} value={key}>
              {t(`subjects.${key}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
          {t("fields.message")}
        </label>
        <textarea
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("fields.messagePlaceholder")}
          rows={4}
          maxLength={LARGO_MAXIMO_CAMPO}
          className="w-full resize-none border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      <PrivacyConsent id="contacto-privacidad" checked={consent} onChange={setConsent} />

      <TurnstileInvisible ref={turnstile} />

      <button
        type="submit"
        disabled={busy}
        className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 font-body text-body-md font-semibold text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-70"
      >
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {status === "success" && <Check className="h-4 w-4" aria-hidden="true" />}
        {status !== "submitting" && status !== "success" && (
          <Mail className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        )}
        {status === "submitting" && t("buttons.submitting")}
        {status === "success" && t("buttons.success")}
        {status !== "submitting" && status !== "success" && t("buttons.idle")}
      </button>

      <p aria-live="polite" className="font-body text-body-md">
        {status === "success" && <span className="text-primary">{t("successMessage")}</span>}
        {status === "error" && (
          <span className="text-error">{t("errorMessage", { email: CONTACT_EMAIL })}</span>
        )}
      </p>

      <p className="border-t border-outline-variant/30 pt-4 font-body text-xs text-on-surface-variant/70">
        {t("emailNotice", { email: CONTACT_EMAIL })}
      </p>
    </form>
  );
}
