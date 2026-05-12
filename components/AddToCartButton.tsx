"use client";

import { useState } from "react";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
  variant?: "primary" | "icon";
  label?: string;
};

export default function AddToCartButton({ item, variant = "primary", label = "Añadir al carrito" }: Props) {
  const add = useCart((s) => s.add);
  const [pulse, setPulse] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(item);
    setPulse(true);
    setTimeout(() => setPulse(false), 350);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleAdd}
        aria-label={`Añadir ${item.name} al carrito`}
        className={`h-10 w-10 rounded-full border border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors ${
          pulse ? "scale-110" : ""
        }`}
      >
        <span className="material-symbols-outlined text-xl">shopping_bag</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`bg-primary-container text-on-primary px-6 py-3 rounded font-body font-semibold hover:bg-primary transition-all duration-200 flex items-center justify-center gap-2 ${
        pulse ? "scale-[1.02]" : ""
      }`}
    >
      <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
      {label}
    </button>
  );
}
