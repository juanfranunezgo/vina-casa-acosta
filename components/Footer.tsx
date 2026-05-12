import Link from "next/link";
import Image from "next/image";

const year = new Date().getFullYear();

const legalLinks = [
  { href: "#", label: "Privacidad" },
  { href: "#", label: "Términos" },
  { href: "#", label: "Mapa de Sitio" },
];

const socialLinks = [
  { href: "#", label: "Instagram", icon: "photo_camera" },
  { href: "#", label: "TripAdvisor", icon: "travel_explore" },
  { href: "#", label: "Google Reviews", icon: "star" },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant/40 bg-surface-container-low">
      <div className="max-w-(--container-max) mx-auto px-margin-mobile md:px-margin-desktop pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-gutter">
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/brand/logo-negro.png"
                alt="Viña Casa Acosta"
                width={180}
                height={48}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-6 font-body text-body-md text-on-surface-variant max-w-md leading-relaxed">
              Donde la vida ha ido dando sus frutos con raíces firmes, para hacer
              crecer los sueños. San Vicente de Tagua Tagua, Valle del Cachapoal.
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              Navegación
            </h4>
            <ul className="space-y-2 font-body text-body-md text-on-surface-variant">
              <li><Link href="/historia" className="hover:text-primary transition-colors">Historia</Link></li>
              <li><Link href="/vinos" className="hover:text-primary transition-colors">Nuestros Vinos</Link></li>
              <li><Link href="/actividades" className="hover:text-primary transition-colors">Actividades</Link></li>
              <li><Link href="/tienda" className="hover:text-primary transition-colors">Tienda</Link></li>
              <li><Link href="/contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="font-body font-semibold text-label-sm uppercase tracking-widest text-primary mb-4">
              Contacto
            </h4>
            <ul className="space-y-2 font-body text-body-md text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">place</span>
                San Vicente de Tagua Tagua, VI Región, Chile
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">schedule</span>
                Lun a Sáb · 10:00 – 18:00 hrs
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">mail</span>
                <a href="mailto:contacto@vinacasaacosta.cl" className="hover:text-primary transition-colors">
                  contacto@vinacasaacosta.cl
                </a>
              </li>
            </ul>

            <div className="flex gap-3 mt-6">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{s.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant font-body text-sm">
          <p>© {year} Viña Casa Acosta. Patrimonio y excelencia vitivinícola.</p>
          <div className="flex gap-5">
            {legalLinks.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant/70 font-body">
          Beber con moderación. Prohibida la venta de alcohol a menores de 18 años · Ley N° 19.925.
        </p>
      </div>
    </footer>
  );
}
