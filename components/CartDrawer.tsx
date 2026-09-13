"use client";

import Image from "next/image";
import Link from "next/link";
import { type SubmitEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Wine, Trash2, MessageCircle, CreditCard } from "lucide-react";
import { MIN_BOTTLES, useCart } from "@/lib/cart";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { catalogEndpoint, isValidCatalog } from "@/lib/afeleia/contract";
import {
  carritoParaCheckout,
  checkoutIniciarUrl,
  iniciarCheckout,
  minBottlesFrom,
} from "@/lib/checkout";

type CartCatalog = { soldOut: ReadonlySet<string>; minBottles: number };

let catalogRequest: Promise<CartCatalog | null> | null = null;

async function fetchCartCatalog(): Promise<CartCatalog | null> {
  const endpoint = catalogEndpoint();
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!isValidCatalog(payload)) return null;
    return {
      soldOut: new Set(
        payload.productos.filter((product) => product.agotado).map((product) => product.slug),
      ),
      minBottles: minBottlesFrom(payload, MIN_BOTTLES),
    };
  } catch {
    return null;
  }
}

async function getCartCatalog(): Promise<CartCatalog | null> {
  catalogRequest ??= fetchCartCatalog();
  const catalog = await catalogRequest;
  if (catalog === null) catalogRequest = null;
  return catalog;
}

/**
 * El Worker vio otro stock, precio o mínimo: la próxima lectura va a la red. Vive fuera del
 * componente porque reasignar `catalogRequest` desde adentro lo prohíbe `react-hooks/globals`,
 * aunque quien llama sea un handler y no el render.
 */
function forgetCartCatalog(): void {
  catalogRequest = null;
}

// Se lee una vez: `NEXT_PUBLIC_*` se incrusta en build. Sin variable, el cajón ofrece WhatsApp.
const checkoutUrl = checkoutIniciarUrl(process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL);

export default function CartDrawer() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const toggle = useCart((s) => s.toggle);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);
  const [cartCatalog, setCartCatalog] = useState<CartCatalog | null>(null);
  // El intento de pago recuerda el carrito que mandó: su aviso y su respaldo valen mientras el
  // carrito sea ese, y al cambiarlo el cajón vuelve a ofrecer "Pagar". Se deriva en el render: un
  // efecto que volviera a "idle" lo rechaza `react-hooks/set-state-in-effect`. El envío en vuelo
  // no se suelta, para que cambiar el carrito mientras espera no habilite un segundo POST.
  const [checkoutAttempt, setCheckoutAttempt] = useState<{
    items: typeof items;
    state: "sending" | "fallback" | "cart";
  } | null>(null);
  const checkoutState =
    checkoutAttempt !== null &&
    (checkoutAttempt.state === "sending" || checkoutAttempt.items === items)
      ? checkoutAttempt.state
      : "idle";

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(priceLocale, {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    if (!isOpen || cartCatalog !== null) return;
    let active = true;

    void getCartCatalog().then((catalog) => {
      if (active && catalog !== null) setCartCatalog(catalog);
    });

    return () => {
      active = false;
    };
  }, [isOpen, cartCatalog]);

  const cartLines = items.map((item) => ({
    item,
    isSoldOut: cartCatalog?.soldOut.has(item.slug) ?? false,
  }));
  const orderLines = cartLines.filter(({ isSoldOut }) => !isSoldOut);
  const orderTotalCLP = orderLines.reduce(
    (total, { item }) => total + item.priceCLP * item.quantity,
    0,
  );
  const allSoldOut = cartCatalog !== null && items.length > 0 && orderLines.length === 0;
  // Las botellas que se cuentan son las que se van a vender: una línea agotada
  // no suma al total y tampoco puede ayudar a alcanzar el mínimo.
  const orderBottles = orderLines.reduce((total, { item }) => total + item.quantity, 0);
  const minBottles = cartCatalog?.minBottles ?? MIN_BOTTLES;
  const belowMinimum = orderBottles > 0 && orderBottles < minBottles;
  const checkoutBlocked = allSoldOut || belowMinimum;
  const checkoutClassName =
    "w-full bg-primary text-on-primary py-3 rounded-md font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)]";

  const whatsappMessage = encodeURIComponent(
    [
      t("whatsappIntro"),
      ...orderLines.map(
        ({ item }) =>
          `· ${item.name} × ${item.quantity} (${formatPrice(item.priceCLP * item.quantity)})`,
      ),
      "",
      t("whatsappTotal", { total: formatPrice(orderTotalCLP) }),
      "",
      t("whatsappOutro"),
    ].join("\n"),
  );

  const carrito = carritoParaCheckout(
    orderLines.map(({ item }) => ({ slug: item.slug, quantity: item.quantity })),
  );
  const carritoJson = JSON.stringify(carrito);
  // Con el checkout configurado se ofrece pagar en línea, salvo que el intento ya haya caído al
  // respaldo: desde ahí el botón, su ícono y el aviso del pie hablan de WhatsApp.
  const payOnline = checkoutUrl !== null && checkoutState !== "fallback";

  async function handleCheckoutSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (!checkoutUrl) return;
    event.preventDefault();
    setCheckoutAttempt({ items, state: "sending" });
    const resultado = await iniciarCheckout(checkoutUrl, carrito, { fetch: window.fetch.bind(window) });
    if (resultado.ok) {
      window.location.assign(resultado.url);
      return;
    }
    if (resultado.motivo === "carrito") {
      // El Worker vio algo distinto (agotado, precio, mínimo): se vuelve a pedir el catálogo.
      forgetCartCatalog();
      setCartCatalog(null);
    }
    setCheckoutAttempt({ items, state: resultado.motivo === "carrito" ? "cart" : "fallback" });
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => toggle(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-surface shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal={isOpen || undefined}
        aria-label={t("title")}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30">
          <h2 className="font-display text-2xl text-primary">{t("title")}</h2>
          <button
            onClick={() => toggle(false)}
            className="p-2 -mr-2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <Wine className="h-12 w-12 text-outline-variant" aria-hidden="true" />
              <p className="font-body text-body-md text-on-surface-variant">
                {t("emptyMessage")}
              </p>
              <Link
                href={`/${locale}/tienda`}
                className="mt-4 text-primary font-body font-semibold underline underline-offset-4"
                onClick={() => toggle(false)}
              >
                {t("exploreShop")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-5">
              {cartLines.map(({ item, isSoldOut }) => {
                return (
                  <li
                    key={item.slug}
                    className="flex gap-4 border-b border-outline-variant/20 pb-5 last:border-0"
                  >
                    <div
                      className={`relative w-20 h-24 shrink-0 bg-surface-container rounded-md overflow-hidden ${
                        isSoldOut ? "opacity-70" : ""
                      }`}
                    >
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
                          {isSoldOut && (
                            <>
                              <span className="mt-1 inline-flex rounded bg-surface-container-highest px-2 py-0.5 font-body text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                {t("soldOut")}
                              </span>
                              <p className="mt-1 font-body text-xs text-on-surface-variant">
                                {t("soldOutNotice")}
                              </p>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => remove(item.slug)}
                          aria-label={t("remove", { name: item.name })}
                          className="text-outline hover:text-error transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-outline-variant rounded">
                          <button
                            onClick={() => decrement(item.slug)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container transition-colors"
                            aria-label={t("decrement")}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-body text-body-md">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increment(item.slug)}
                            disabled={isSoldOut}
                            aria-disabled={isSoldOut}
                            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={t("increment")}
                          >
                            +
                          </button>
                        </div>
                        <span className="font-body font-semibold text-primary">
                          {formatPrice(item.priceCLP * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="px-6 py-5 border-t border-outline-variant/30 bg-surface-container-low space-y-4">
            <div className="flex justify-between font-body text-body-lg">
              <span>{t("totalLabel")}</span>
              <span className="font-semibold text-primary">{formatPrice(orderTotalCLP)}</span>
            </div>
            {checkoutState === "fallback" && (
              <p role="alert" className="text-center text-sm text-on-surface-variant font-body">
                {t("checkoutFallbackNotice")}
              </p>
            )}
            {checkoutBlocked ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`${checkoutClassName} cursor-not-allowed opacity-60`}
              >
                {payOnline ? (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                )}
                {payOnline ? t("checkoutPay") : t("checkout")}
              </button>
            ) : payOnline ? (
              <form method="POST" action={checkoutUrl} onSubmit={handleCheckoutSubmit}>
                <input type="hidden" name="carrito" value={carritoJson} />
                <button
                  type="submit"
                  disabled={checkoutState === "sending"}
                  className={`${checkoutClassName} ${checkoutState === "sending" ? "opacity-60" : ""}`}
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  {checkoutState === "sending" ? t("checkoutPaying") : t("checkoutPay")}
                </button>
              </form>
            ) : (
              <a
                href={`${CONTACT_WHATSAPP_URL}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className={checkoutClassName}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t("checkout")}
              </a>
            )}
            {checkoutState === "cart" && (
              <p role="alert" className="text-center text-sm text-on-surface-variant font-body">
                {t("checkoutCartChanged")}
              </p>
            )}
            {allSoldOut && (
              <p className="text-center text-sm text-on-surface-variant font-body">
                {t("allSoldOut")}
              </p>
            )}
            {/* `aria-live`: el aviso cambia solo, al sumar o quitar botellas con
                los botones de al lado, sin que nadie navegue hasta él. */}
            {!allSoldOut && belowMinimum && (
              <p
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-md border-l-[3px] border-wine-accent bg-wine-accent/8 px-4 py-3 font-body text-sm text-on-surface"
              >
                <Wine className="mt-0.5 h-4 w-4 shrink-0 text-wine-accent" aria-hidden="true" />
                <span>
                  {t("minimumNotice", {
                    min: minBottles,
                    missing: minBottles - orderBottles,
                  })}
                </span>
              </p>
            )}
            <p className="text-center text-xs text-on-surface-variant/80 font-body">
              {payOnline ? t("checkoutDisclaimerOnline") : t("checkoutDisclaimer")}
            </p>
          </footer>
        )}
      </div>
    </>
  );
}
