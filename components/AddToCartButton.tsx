"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Check } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
  agotado: boolean;
  variant?: "primary" | "icon";
  label?: string;
};

export default function AddToCartButton({
  item,
  agotado,
  variant = "primary",
  label,
}: Props) {
  const t = useTranslations("cart");
  const add = useCart((s) => s.add);
  const [pulse, setPulse] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (agotado) return;
    add(item);
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={agotado}
        aria-disabled={agotado}
        aria-label={agotado ? `${t("soldOut")}: ${item.name}` : t("addAriaLabel", { name: item.name })}
        className={`group relative flex h-11 items-center justify-center rounded-full border transition-all duration-200 ${
          agotado
            ? "cursor-not-allowed border-outline-variant bg-surface-container-highest px-3 text-on-surface-variant"
            : "w-11 border-primary text-primary hover:bg-primary hover:text-on-primary active:scale-95"
        } ${
          pulse && !agotado ? "bg-primary text-on-primary scale-110" : ""
        }`}
      >
        {agotado ? (
          <span className="font-body text-label-sm font-semibold uppercase tracking-wider">
            {t("soldOut")}
          </span>
        ) : pulse ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={agotado}
      aria-disabled={agotado}
      className={`group relative inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-body font-semibold text-body-md bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ${
        agotado
          ? "cursor-not-allowed bg-surface-container-highest text-on-surface-variant shadow-none hover:translate-y-0 hover:bg-surface-container-highest hover:shadow-none"
          : pulse
            ? "scale-[1.02]"
            : ""
      }`}
    >
      {agotado ? (
        t("soldOut")
      ) : pulse ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
      )}
      {label ?? t("addLabel")}
    </button>
  );
}
