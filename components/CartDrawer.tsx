"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { formatCLP } from "@/data/wines";

export default function CartDrawer() {
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const toggle = useCart((s) => s.toggle);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);
  const totalCLP = useCart((s) => s.totalCLP());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const whatsappMessage = encodeURIComponent(
    [
      "Hola Casa Acosta, me interesa este pedido:",
      ...items.map(
        (i) => `· ${i.name} × ${i.quantity} (${formatCLP(i.priceCLP * i.quantity)})`
      ),
      "",
      `Total estimado: ${formatCLP(totalCLP)}`,
      "",
      "¿Cómo puedo concretar la compra?",
    ].join("\n")
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => toggle(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-surface shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Carrito de compras"
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30">
          <h2 className="font-display text-2xl text-primary">Tu selección</h2>
          <button
            onClick={() => toggle(false)}
            className="p-2 -mr-2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Cerrar carrito"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <span className="material-symbols-outlined text-5xl text-outline-variant">
                wine_bar
              </span>
              <p className="font-body text-body-md text-on-surface-variant">
                Tu selección está vacía.
              </p>
              <Link
                href="/tienda"
                className="mt-4 text-primary font-body font-semibold underline underline-offset-4"
                onClick={() => toggle(false)}
              >
                Explorar la tienda
              </Link>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => (
                <li key={item.slug} className="flex gap-4 pb-5 border-b border-outline-variant/20 last:border-0">
                  <div className="relative w-20 h-24 shrink-0 bg-surface-container rounded-md overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant">
                          {item.line}
                        </p>
                        <h3 className="font-display text-lg text-primary truncate">
                          {item.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => remove(item.slug)}
                        aria-label={`Eliminar ${item.name}`}
                        className="text-outline hover:text-error transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-outline-variant rounded">
                        <button
                          onClick={() => decrement(item.slug)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container transition-colors"
                          aria-label="Quitar uno"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-body text-body-md">{item.quantity}</span>
                        <button
                          onClick={() => increment(item.slug)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container transition-colors"
                          aria-label="Añadir uno"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-body font-semibold text-primary">
                        {formatCLP(item.priceCLP * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="px-6 py-5 border-t border-outline-variant/30 bg-surface-container-low space-y-4">
            <div className="flex justify-between font-body text-body-lg">
              <span>Total estimado</span>
              <span className="font-semibold text-primary">{formatCLP(totalCLP)}</span>
            </div>
            <a
              href={`https://wa.me/56900000000?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-primary-container text-on-primary py-3 rounded font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined">chat</span>
              Concretar por WhatsApp
            </a>
            <p className="text-center text-xs text-on-surface-variant/80 font-body">
              Pago online disponible próximamente. Por ahora confirmamos cada pedido contigo.
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
