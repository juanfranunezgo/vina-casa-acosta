# Task 2 brief — Compact the card API and remove C2 description flow

This task completes the approved C2 rebuild of `/es/vinos` after the collection grid was fixed. Work only on `components/WineCard.tsx`, `components/CollectionBand.tsx`, `app/[locale]/vinos/page.tsx` and `tests/collection-band-source.test.mjs`. The workspace is shared and contains uncommitted work from an earlier agent: do not touch unrelated files.

## Constraints

- Preserve C1/C2 semantic `section` / `h2` / `ul` / `li` / `article` structure.
- Preserve `next/image`, local assets, existing focus-visible and reduced-motion behaviours.
- Do not undo Task 1's 38/62 desktop split, grid selection or alternating `flip`.
- C2 cards show bottle, badge if present, type · variety and name. They do not render the long/short description.
- Remove all unused `description` props and C2 mapper data; do not leave dead imports or code.
- The product detail pages and translated wine data remain untouched.

## Required red test

Append this test before changing production code:

```js
test("WineCard has no catalogue description prop or rendered description block", async () => {
  const source = await readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /description:\s*string/);
  assert.doesNotMatch(source, /line-clamp-2/);
});
```

Run `node --test tests/collection-band-source.test.mjs` and confirm it fails because the component still declares/renders description. Then remove description from `WineCardProps`, component parameters and JSX; stop passing it through `CollectionBand`; remove `description: tWine(...)` from the C2 page mapper. Tighten the card's image/body spacing to leave no artificial white region. Do not change text or navigation behaviour otherwise.

Re-run the test and `npx tsc --noEmit`. Commit only task files. Write full report to `.superpowers/sdd/task-2-report.md`; return status, commit SHA, one-line test summary and concerns.
