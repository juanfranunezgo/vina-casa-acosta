import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Visítanos en San Vicente de Tagua Tagua, Valle del Cachapoal. Reserva tours, eventos o consulta sobre nuestros vinos.",
};

export default function ContactoPage() {
  return (
    <>
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            Hablemos
          </p>
          <h1 className="font-display text-4xl md:text-display-lg text-primary mb-6">
            Contáctanos
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Reserva una visita, cotiza tu evento o cuéntanos qué te llevó hasta acá.
            Te respondemos en menos de 24 horas.
          </p>
        </Reveal>
      </section>

      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <div className="bg-surface rounded-xl ambient-shadow overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12 lg:p-16">
            <ContactForm />
          </div>

          <div className="relative min-h-[400px] md:min-h-full bg-surface-variant">
            <iframe
              title="Ubicación Viña Casa Acosta en San Vicente de Tagua Tagua"
              src="https://www.google.com/maps?q=San+Vicente+de+Tagua+Tagua,+Chile&output=embed"
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-12">
          <Reveal className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-3xl">place</span>
            <h3 className="font-display text-xl text-primary mt-3 mb-2">Ubicación</h3>
            <p className="font-body text-body-md text-on-surface-variant">
              San Vicente de Tagua Tagua,<br/>Valle del Cachapoal, Chile
            </p>
          </Reveal>
          <Reveal className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30" delay={80}>
            <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
            <h3 className="font-display text-xl text-primary mt-3 mb-2">Horarios</h3>
            <p className="font-body text-body-md text-on-surface-variant">
              Lun a Sáb · 10:00 – 18:00<br/>Jueves hasta las 20:00
            </p>
          </Reveal>
          <Reveal className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/30" delay={160}>
            <span className="material-symbols-outlined text-primary text-3xl">mail</span>
            <h3 className="font-display text-xl text-primary mt-3 mb-2">Email</h3>
            <a
              href="mailto:contacto@vinacasaacosta.cl"
              className="font-body text-body-md text-on-surface-variant hover:text-primary transition-colors"
            >
              contacto@vinacasaacosta.cl
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
