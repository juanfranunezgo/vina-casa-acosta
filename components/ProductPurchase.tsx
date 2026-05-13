"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Check, Minus, Plus } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
};

export default function ProductPurchase({ item }: Props) {
  const t = useTranslations("cart");
  const add = useCart((s) => s.add);
  const [quantity, setQuantity] = useState(1);
  const [pulse, setPulse] = useState(false);

  const dec = () => setQuantity((q) => Math.max(1, q - 1));
  const inc = () => setQuantity((q) => Math.min(99, q + 1));

  const handleAdd = () => {
    add(item, quantity);
    setPulse(true);
    setTimeout(() => {
      setPulse(false);
      setQuantity(1);
    }, 900);
  };

  return (
    <div className="flex items-stretch gap-3">
      {/* Quantity stepper */}
      <div
        className="inline-flex items-center border border-outline-variant rounded-md bg-surface overflow-hidden"
        role="group"
        aria-label={t("quantityLabel")}
      >
        <button
          type="button"
          onClick={dec}
          disabled={quantity <= 1}
          aria-label={t("decrement")}
          className="h-11 w-10 flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          className="w-10 text-center font-body font-semibold text-body-md tabular-nums select-none"
          aria-live="polite"
        >
          {quantity}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={quantity >= 99}
          aria-label={t("increment")}
          className="h-11 w-10 flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Add to cart */}
      <button
        type="button"
        onClick={handleAdd}
        className={`group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-body font-semibold text-body-md bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ${
          pulse ? "scale-[1.02]" : ""
        }`}
      >
        {pulse ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t("addedLabel")}
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {t("addLabel")}
          </>
        )}
      </button>
    </div>
  );
}
