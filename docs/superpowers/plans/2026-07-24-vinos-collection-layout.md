# Vinos Collection Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild C2 wine collection bands into compact horizontal editorial rows with a proportional image and an adaptive wine-card grid.

**Architecture:** `CollectionBand` owns the responsive two-column composition and derives its card-grid width from the number of supplied wines. `WineCard` remains the only product-card component, reduced to the information visible in C2; the page only maps the props it consumes. The existing section map, product routes, translation sources and `next/image` usage remain intact.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind CSS v4, next-intl, Node built-in test runner.

## Global Constraints

- Preserve C1/C2 and current semantic `section` / `h2` / `ul` / `li` / `article` structure.
- Use `next/image`, local public assets, visible keyboard focus and existing reduced-motion behaviour.
- At `lg`, use approximately 38% image / 62% content; never use a fixed image height that creates empty vertical space.
- Keep 2 cards per row for Lajau, up to 3 for Ombú, and do not stretch a one-card collection to fill a grid.
- Do not retain unused props, imports, copy mapping or CSS after the layout change.

---

### Task 1: Define the collection component contract

**Files:**

- Create: `tests/collection-band-source.test.mjs`
- Modify: `components/CollectionBand.tsx`

**Interfaces:**

- Consumes: `CollectionWine[]` where each wine has `slug`, `href`, `image`, `name`, `eyebrow`, and optional `badge`.
- Produces: `CollectionBand` without a card description dependency and with a compact adaptive card grid.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CollectionBand uses a compact adaptive wine grid instead of fixed tall imagery", async () => {
  const source = await readFile(new URL("../components/CollectionBand.tsx", import.meta.url), "utf8");
  assert.match(source, /grid-cols-2/);
  assert.match(source, /grid-cols-3/);
  assert.doesNotMatch(source, /lg:min-h-\[560px\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/collection-band-source.test.mjs`

Expected: FAIL because `CollectionBand` still includes `lg:min-h-[560px]` and no three-column card grid.

- [ ] **Step 3: Implement the minimal component change**

```tsx
const gridClass =
  wines.length === 1
    ? "grid-cols-1 max-w-[17rem]"
    : wines.length === 2
      ? "grid-cols-2"
      : "grid-cols-2 xl:grid-cols-3";

<ul className={`grid gap-4 ${gridClass}`}>
  {/* compact WineCard items */}
</ul>
```

Replace the fixed image minimum height with a stable, moderate aspect ratio on desktop, retain `Image fill`, and keep the alternating `flip` order.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/collection-band-source.test.mjs`

Expected: PASS.

### Task 2: Compact the card API and remove data flow that C2 no longer displays

**Files:**

- Modify: `components/WineCard.tsx`
- Modify: `app/[locale]/vinos/page.tsx`
- Modify: `tests/collection-band-source.test.mjs`

**Interfaces:**

- Consumes: `WineCardProps` with `href`, `image`, `name`, `eyebrow`, and optional `badge`.
- Produces: compact C2 cards whose cards remain product links and do not reserve a description area.

- [ ] **Step 1: Write the failing test**

```js
test("WineCard has no catalogue description prop or rendered description block", async () => {
  const source = await readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /description:\s*string/);
  assert.doesNotMatch(source, /line-clamp-2/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/collection-band-source.test.mjs`

Expected: FAIL because `WineCardProps` currently includes and renders `description`.

- [ ] **Step 3: Implement the minimal component and mapper change**

```tsx
export type WineCardProps = {
  href: string;
  image: string;
  name: string;
  eyebrow: string;
  badge?: string;
};
```

Remove the description paragraph from `WineCard`, remove its prop from `CollectionBand`, and remove `description: tWine(...)` from the C2 card mapper. Tighten image and body spacing so each card reads as a bottle, metadata and name without a blank content region.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/collection-band-source.test.mjs`

Expected: PASS.

### Task 3: Verify the rendered page and clean scope

**Files:**

- Modify only if verification finds a layout or lint issue: `components/CollectionBand.tsx`, `components/WineCard.tsx`, `app/[locale]/vinos/page.tsx`

**Interfaces:**

- Consumes: completed C2 component contract and existing route translations.
- Produces: a buildable, responsive `/es/vinos` page with no dead code from the replaced layout.

- [ ] **Step 1: Run source-contract tests**

Run: `node --test tests/collection-band-source.test.mjs`

Expected: PASS with two passing tests.

- [ ] **Step 2: Run static checks**

Run: `npm run lint && npm run build`

Expected: lint and production build complete successfully without errors.

- [ ] **Step 3: Inspect desktop and mobile renderings**

Run: `npm run dev`, then inspect `/es/vinos` at desktop and mobile widths.

Expected: each collection has a bounded image beside its identity/cards on desktop, alternating sides; cards use a readable 3/2/1 grid as applicable; mobile stacks image, copy and cards.

- [ ] **Step 4: Scan for dead implementation references**

Run: `rg -n "description: tWine|description=\{wine\.description\}|lg:min-h-\[560px\]" app components`

Expected: no matches related to C2's removed description or old fixed image height.

