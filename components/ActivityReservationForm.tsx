"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Check, Send, MessageCircle, CalendarDays } from "lucide-react";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { submitToNetlifyForms } from "@/lib/netlifyForms";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  /** Nombre de la actividad, para el prefill del mensaje de WhatsApp. */
  activityName: string;
  /** Piso de personas por reserva (`minPeople` en data/activities.ts). */
  minPeople: number;
  /**
   * `cotizacion` cuando la actividad no publica precio. Cambia los textos y el
   * campo `tipo` del envío, no el formulario: son los mismos datos los que la
   * viña necesita para responder cualquiera de las dos.
   */
  mode: "reserva" | "cotizacion";
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors";
const labelClass =
  "font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2";

export default function ActivityReservationForm({ activityName, minPeople, mode }: Props) {
  const t = useTranslations("activities.labels.form");
  const locale = useLocale();
  const isQuote = mode === "cotizacion";
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(String(minPeople));
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [botField, setBotField] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);

  // El mínimo de fecha se pone al montar: calcularlo en el render rompería la
  // hidratación (la página es estática y se genera en el build).
  useEffect(() => {
    const input = dateRef.current;
    if (input) input.min = new Date().toISOString().slice(0, 10);
  }, []);

  /** Abre el calendario nativo desde el ícono. */
  const openDatePicker = () => {
    const input = dateRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.focus();
  };

  /**
   * La solicitud va a Netlify Forms: queda en el panel del proyecto y dispara
   * la notificación por correo. Los campos tienen que estar declarados en
   * `public/__forms.html` o Netlify los descarta en silencio.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");

    try {
      await submitToNetlifyForms("reserva-actividad", {
        actividad: activityName,
        tipo: mode,
        nombre: name,
        email,
        telefono: phone,
        personas: people,
        fecha: date,
        nota: note,
        idioma: locale,
        "bot-field": botField,
      });
      setStatus("success");
      window.setTimeout(() => {
        setName("");
        setEmail("");
        setPhone("");
        setPeople(String(minPeople));
        setDate("");
        setNote("");
        setStatus("idle");
      }, 5000);
    } catch {
      setStatus("error");
    }
  };

  const whatsappUrl = () => {
    const lines = [
      t(isQuote ? "waIntroQuote" : "waIntro", { activity: activityName }),
      name && `${t("name")}: ${name}`,
      people && `${t("people")}: ${people}`,
      date && `${t("date")}: ${date}`,
      note && `${t("note")}: ${note}`,
    ].filter(Boolean);
    return `${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-primary mb-2">{t(isQuote ? "titleQuote" : "title")}</h2>
        <p className="font-body text-body-md text-on-surface-variant">{t(isQuote ? "subtitleQuote" : "subtitle")}</p>
      </div>

      {/* Honeypot: invisible para personas, tentador para bots. Si llega con
          algo, Netlify descarta el envío como spam. */}
      <p className="hidden" aria-hidden="true">
        <label>
          No llenar este campo
          <input
            tabIndex={-1}
            autoComplete="off"
            value={botField}
            onChange={(e) => setBotField(e.target.value)}
          />
        </label>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>{t("name")}</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("email")}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("phone")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="tour-people">
            {t("people")}
          </label>
          <input
            id="tour-people"
            required
            type="number"
            inputMode="numeric"
            min={minPeople}
            step={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            onBlur={() =>
              setPeople((current) => {
                const parsed = Number.parseInt(current, 10);
                return String(Number.isNaN(parsed) ? minPeople : Math.max(minPeople, parsed));
              })
            }
            aria-describedby="tour-people-hint"
            className={`${inputClass} tabular-nums`}
          />
          <p id="tour-people-hint" className="mt-2 font-body text-xs text-on-surface-variant/80">
            {t("peopleHint", { min: minPeople })}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="tour-date">
            {t("date")}
          </label>
          {/* Sin fecha por defecto: se muestra un placeholder propio y un
              calendario clickeable para que se lea como campo editable. */}
          <div className="relative">
            <input
              id="tour-date"
              ref={dateRef}
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-describedby="tour-date-hint"
              className={`${inputClass} tabular-nums pr-10 ${date ? "" : "text-transparent"} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
            />
            {!date && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-body text-body-md tabular-nums text-on-surface-variant/60"
              >
                {t("datePlaceholder")}
              </span>
            )}
            <button
              type="button"
              onClick={openDatePicker}
              aria-label={t("dateOpen")}
              className="absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p id="tour-date-hint" className="mt-2 font-body text-xs text-on-surface-variant/80">
            {t("dateHint")}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t("note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={status === "submitting" || status === "success"}
          className="group inline-flex items-center justify-center gap-2 h-11 px-7 rounded-md font-body font-semibold text-body-md bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none"
        >
          {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {status === "success" && <Check className="h-4 w-4" aria-hidden="true" />}
          {(status === "idle" || status === "error") && (
            <Send className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          )}
          {status === "idle" && t(isQuote ? "submitIdleQuote" : "submitIdle")}
          {status === "submitting" && t("submitting")}
          {status === "success" && t("success")}
          {status === "error" && t("error")}
        </button>

        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-md font-body font-semibold text-body-md border border-primary text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t(isQuote ? "whatsappQuote" : "whatsapp")}
        </a>
      </div>

      <p aria-live="polite" className="font-body text-body-md">
        {status === "success" && <span className="text-primary">{t("successMessage")}</span>}
        {status === "error" && <span className="text-error">{t("errorMessage")}</span>}
      </p>
    </form>
  );
}
