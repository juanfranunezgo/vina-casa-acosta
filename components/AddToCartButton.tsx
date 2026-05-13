"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Check } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
  variant?: "primary" | "icon";
  label?: string;
};

export default function AddToCartButton({ item, variant = "primary", label }: Props) {
  const t = useTranslations("cart");
  const add = useCart((s) => s.add);
  const [pulse, setPulse] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(item);
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleAdd}
        aria-label={t("addAriaLabel", { name: item.name })}
        className={`group relative h-11 w-11 rounded-full border border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary active:scale-95 transition-all duration-200 ${
          pulse ? "bg-primary text-on-primary scale-110" : ""
        }`}
      >
        {pulse ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`group relative inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-body font-semibold text-body-md bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ${
        pulse ? "scale-[1.02]" : ""
      }`}
    >
      {pulse ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
      )}
      {label ?? t("addLabel")}
    </button>
  );
}
