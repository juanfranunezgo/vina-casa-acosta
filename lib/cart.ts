"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  slug: string;
  name: string;
  line: string;
  variety: string;
  image: string;
  priceCLP: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (slug: string) => void;
  increment: (slug: string) => void;
  decrement: (slug: string) => void;
  clear: () => void;
  toggle: (open?: boolean) => void;
  totalItems: () => number;
  totalCLP: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.slug === item.slug);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.slug === item.slug
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, { ...item, quantity }], isOpen: true };
        }),
      remove: (slug) =>
        set((state) => ({
          items: state.items.filter((i) => i.slug !== slug),
        })),
      increment: (slug) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),
      decrement: (slug) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.slug === slug ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      toggle: (open) =>
        set((state) => ({ isOpen: open ?? !state.isOpen })),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalCLP: () =>
        get().items.reduce((sum, i) => sum + i.priceCLP * i.quantity, 0),
    }),
    {
      name: "casa-acosta-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
