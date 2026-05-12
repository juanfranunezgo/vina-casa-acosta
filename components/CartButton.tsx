"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export default function CartButton() {
  const toggle = useCart((s) => s.toggle);
  const total = useCart((s) => s.totalItems());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => toggle(true)}
      aria-label={`Abrir carrito${mounted && total > 0 ? `, ${total} artículos` : ""}`}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
    >
      <span className="material-symbols-outlined text-2xl">shopping_bag</span>
      {mounted && total > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-tertiary-fixed text-primary text-xs font-bold flex items-center justify-center border-2 border-background">
          {total}
        </span>
      )}
    </button>
  );
}
