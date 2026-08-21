"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { submitToNetlifyForms } from "@/lib/netlifyForms";
import PrivacyConsent from "@/components/PrivacyConsent";
import { PRIVACIDAD_VERSION, TERMINOS_VERSION } from "@/lib/legal";

type Status = "idle" | "submitting" | "success" | "error";

/** Los value coinciden con las claves de `contactForm.subjects` en messages/. */
const SUBJECTS = ["tour", "event", "purchase", "other"] as const;

export default function ContactForm() {
  const t = useTranslations("contactForm");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [botField, setBotField] = useState("");
  const [consent, setConsent] = useState(false);

  /**
   * Los envíos van a Netlify Forms y quedan en el panel del proyecto, además
   * de dispararse por correo. Los campos tienen que estar declarados en
   * `public/__forms.html` o Netlify los descarta.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");

    try {
      await submitToNetlifyForms("contacto", {
        nombre: name,
        email,
        asunto: t(`subjects.${subject || "other"}`),
        mensaje: message,
        idioma: locale,
        // Qué ediciones se aceptaron, no sólo que se aceptaron: cuando salga
        // una v1.2, los consentimientos ya guardados siguen diciendo la verdad
        // sobre lo que esta persona leyó. Son dos campos porque los dos
        // documentos se versionan por separado.
        terminos: TERMINOS_VERSION,
        privacidad: PRIVACIDAD_VERSION,
        "bot-field": botField,
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setConsent(false);
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 6000);
    } catch {
      setStatus("error");
    }
  };

  const busy = status === "submitting" || status === "success";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="mb-2 font-display text-3xl text-primary">{t("title")}</h2>
      <p className="mb-6 font-body text-body-md text-on-surface-variant">{t("subtitle")}</p>

      {/* Honeypot: invisible para personas, tentador para bots. Si llega con
          algo, Netlify descarta el envío como spam. */}
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
          className="w-full resize-none border-0 border-b border-outline bg-transparent px-0 py-2 font-body text-body-md transition-colors focus:border-primary focus:outline-none"
        />
      </div>

      <PrivacyConsent id="contacto-privacidad" checked={consent} onChange={setConsent} />

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
