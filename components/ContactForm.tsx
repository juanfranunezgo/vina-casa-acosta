"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    // Demo Fase 1: simulamos envío. En Fase 2 conectamos a Resend / Formspree / Supabase Edge Function.
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
        Envíanos un mensaje
      </h2>
      <p className="font-body text-body-md text-on-surface-variant mb-6">
        Te respondemos en menos de 24 horas hábiles.
      </p>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          Nombre
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        />
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          Correo electrónico
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        />
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          Asunto
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors"
        >
          <option value="">Selecciona un asunto</option>
          <option value="tour">Reservar tour</option>
          <option value="evento">Cotizar evento privado</option>
          <option value="compra">Consulta sobre vinos</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
          Mensaje
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="¿En qué podemos ayudarte?"
          rows={4}
          className="w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting" || status === "success"}
        className="bg-primary-container text-on-primary px-8 py-3 rounded font-body font-semibold hover:bg-primary transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {status === "submitting" && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
        {status === "success" && <span className="material-symbols-outlined text-base">check</span>}
        {status === "idle" && "Enviar mensaje"}
        {status === "submitting" && "Enviando…"}
        {status === "success" && "¡Mensaje enviado!"}
        {status === "error" && "Reintentar"}
      </button>

      {status === "success" && (
        <p className="font-body text-body-md text-primary">
          Gracias por contactarnos. Te responderemos pronto.
        </p>
      )}

      <p className="text-xs text-on-surface-variant/70 font-body pt-4 border-t border-outline-variant/30">
        Formulario de demostración · En la versión final los mensajes llegarán
        directamente al correo de la viña.
      </p>
    </form>
  );
}
