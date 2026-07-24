# Task 2 report — Compact Wine Cards

## Scope completed

- Removed `description` from `WineCardProps`, the `WineCard` parameters, and its rendered card body.
- Stopped forwarding `description` through `CollectionBand`.
- Removed C2's `shortDescription` mapper field in `/app/[locale]/vinos/page.tsx`.
- Kept C1/C2's section, heading, list, list item, and article semantics intact.
- Kept the existing `next/image`, focus-visible, reduced-motion, navigation, grid-selection, 38/62 desktop layout, and alternating `flip` behavior intact.
- Compacted card presentation by using a 4:5 bottle frame, reduced image/body padding, and natural card height so the removed description does not leave a blank body region.

## Test-first evidence

1. Appended the required `WineCard has no catalogue description prop or rendered description block` source test.
2. Ran `node --test tests/collection-band-source.test.mjs` before production changes.
   - Result: expected failure because `WineCard.tsx` still contained `description: string` and a `line-clamp-2` description block.
3. Made the scoped production changes above.
4. Re-ran `node --test tests/collection-band-source.test.mjs`.
   - Result: 2 passing tests, 0 failures.
5. Ran `npx tsc --noEmit`.
   - Result: exit code 0.

## Files changed for Task 2

- `components/WineCard.tsx`
- `components/CollectionBand.tsx`
- `app/[locale]/vinos/page.tsx`
- `tests/collection-band-source.test.mjs`
- `.superpowers/sdd/task-2-report.md`

## Review follow-up

- Updated the collection-grid source regression to require Ombu to remain at two columns through `lg` and move to three columns only at `xl`; other lines continue to use `sm:grid-cols-2`.
- Ran the updated test before production changes. It failed as expected because the source still specified `sm:grid-cols-2 lg:grid-cols-3` for Ombu.
- Changed only the Ombu breakpoint to `xl:grid-cols-3`, preserving the 38/62 desktop split and all other CollectionBand layout behavior.
- Added `h-full` to the WineCard article and link so card heights stay aligned when grid-row text wraps.
- Re-ran `node --test tests/collection-band-source.test.mjs`: 2 passing tests, 0 failures.
- Re-ran `npx tsc --noEmit`: exit code 0.
