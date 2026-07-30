"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";

export default function ContactForm() {
  const t = useTranslations("contactForm");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Fase visual: sin backend. Se abre el cliente de correo del visitante con el
   * mensaje ya armado hacia la casilla de la viña.
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedSubject = subject ? t(`subjects.${subject}`) : t("subjects.other");
    const body = [
      t("emailIntro"),
      "",
      `${t("fields.name")}: ${name}`,
      `${t("fields.email")}: ${email}`,
      `${t("fields.subject")}: ${selectedSubject}`,
      "",
      `${t("fields.message")}:`,
      message,
    ].join("\r\n");

    const params = new URLSearchParams({
      subject: t("emailSubject", { subject: selectedSubject }),
      body,
    });
    window.location.href = `mailto:${CONTACT_EMAIL}?${params.toString()}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="mb-2 font-display text-3xl text-primary">{t("title")}</h2>
      <p className="mb-6 font-body text-body-md text-on-surface-variant">{t("subtitle")}</p>

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
          <option value="tour">{t("subjects.tour")}</option>
          <option value="evento">{t("subjects.event")}</option>
          <option value="compra">{t("subjects.purchase")}</option>
          <option value="otro">{t("subjects.other")}</option>
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

      <button
        type="submit"
        className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 font-body text-body-md font-semibold text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] active:translate-y-0"
      >
        <Mail className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        {t("buttons.idle")}
      </button>

      <p className="border-t border-outline-variant/30 pt-4 font-body text-xs text-on-surface-variant/70">
        {t("emailNotice")}
      </p>
    </form>
  );
}
