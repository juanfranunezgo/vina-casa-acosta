"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check, Send, MessageCircle } from "lucide-react";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";

type Status = "idle" | "submitting" | "success";

type Props = {
  /** Nombre del tour, para el prefill del mensaje de WhatsApp. */
  tourName: string;
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors";
const labelClass =
  "font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2";

export default function TourReservationForm({ tourName }: Props) {
  const t = useTranslations("tourDetail.form");
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setName("");
        setEmail("");
        setPhone("");
        setPeople("");
        setDate("");
        setStatus("idle");
      }, 3500);
    }, 700);
  };

  const whatsappUrl = () => {
    const lines = [
      t("waIntro", { tour: tourName }),
      name && `${t("name")}: ${name}`,
      people && `${t("people")}: ${people}`,
      date && `${t("date")}: ${date}`,
    ].filter(Boolean);
    return `${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-primary mb-2">{t("title")}</h2>
        <p className="font-body text-body-md text-on-surface-variant">{t("subtitle")}</p>
      </div>

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
          <label className={labelClass}>{t("people")}</label>
          <input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{t("date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} tabular-nums`}
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
          {status === "idle" && (
            <Send className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          )}
          {status === "idle" && t("submitIdle")}
          {status === "submitting" && t("submitting")}
          {status === "success" && t("success")}
        </button>

        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-md font-body font-semibold text-body-md border border-primary text-primary hover:bg-primary/5 transition-all duration-200"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t("whatsapp")}
        </a>
      </div>

      {status === "success" && (
        <p className="font-body text-body-md text-primary">{t("successMessage")}</p>
      )}

      <p className="text-xs text-on-surface-variant/70 font-body pt-4 border-t border-outline-variant/30">
        {t("demoNotice")}
      </p>
    </form>
  );
}
