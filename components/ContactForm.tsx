"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check, Send } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const t = useTranslations("contactForm");
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        setStatus("idle");
      }, 3500);
    }, 700);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="font-display text-3xl text-primary mb-2">
        {t("title")}
      </h2>
      <p className="font-body text-body-md text-on-surface-variant mb-6">
        {t("subtitle")}
      </p>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          {t("fields.name")}
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("fields.namePlaceholder")}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        />
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          {t("fields.email")}
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("fields.emailPlaceholder")}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        />
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          {t("fields.subject")}
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        >
          <option value="">{t("fields.subjectPlaceholder")}</option>
          <option value="tour">{t("subjects.tour")}</option>
          <option value="evento">{t("subjects.event")}</option>
          <option value="compra">{t("subjects.purchase")}</option>
          <option value="otro">{t("subjects.other")}</option>
        </select>
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          {t("fields.message")}
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("fields.messagePlaceholder")}
          rows={4}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || status === "success"}
        className="group inline-flex items-center justify-center gap-2 h-11 px-7 rounded-md font-body font-semibold text-body-md bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none"
      >
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {status === "success" && <Check className="h-4 w-4" aria-hidden="true" />}
        {status === "idle" && <Send className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
        {status === "idle" && t("buttons.idle")}
        {status === "submitting" && t("buttons.submitting")}
        {status === "success" && t("buttons.success")}
        {status === "error" && t("buttons.error")}
      </button>

      {status === "success" && (
        <p className="font-body text-body-md text-primary">
          {t("successMessage")}
        </p>
      )}

      <p className="text-xs text-on-surface-variant/70 font-body pt-4 border-t border-outline-variant/30">
        {t("demoNotice")}
      </p>
    </form>
  );
}
