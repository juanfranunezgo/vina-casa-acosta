# Task 1 report — collection component contract

## Scope

Updated only `components/CollectionBand.tsx` and added the required source-level regression test in `tests/collection-band-source.test.mjs`.

## Implementation

- Retained the existing C1/C2 section, heading, description, image, card-link, `flip`, and `Reveal` structure.
- Kept the collection image as `next/image` with `fill`, local string assets, descriptive alt text, and responsive `sizes`.
- Changed the desktop collection split to `38fr 62fr`.
- Replaced the desktop fixed image minimum height with a mobile `4:3` aspect ratio and desktop stretch-to-content behavior, preventing empty vertical image space.
- Replaced the wrapping flex card layout with a responsive grid:
  - one or two wines use two columns from `sm` upward;
  - collections with more than two wines use three columns at `lg`;
  - a one-card collection occupies one grid track rather than stretching across the whole collection.
- Preserved `WineCard` as the focus and reduced-motion owner; this component keeps rendering those cards unchanged.

## TDD evidence

1. Added the requested test before changing `CollectionBand`.
2. Ran `node --test tests/collection-band-source.test.mjs`; it failed because the old component had no `grid-cols-2` token and still had `lg:min-h-[560px]`.
3. Implemented the compact adaptive grid and reran the test successfully.

## Verification

- `node --test tests/collection-band-source.test.mjs` — 1 pass, 0 failures.
- `npx tsc --noEmit` — exit 0.

## Self-review

- The change stays within Task 1 files and does not remove the existing `description` prop or flow.
- `flip` ordering remains unchanged.
- The `Image fill` parent remains positioned and has a defined mobile aspect ratio; desktop grid stretch supplies its content-driven height.

## Follow-up fix — line-aware desktop grid

Reviewer feedback identified that using the wine count for the three-column breakpoint made Lajau's four wines render as `3 + 1`. The column contract is now explicitly line-aware: only `id === "ombu"` receives `lg:grid-cols-3`; every other collection, including Lajau, remains in two columns from `sm` upward.

### Follow-up TDD evidence

1. Added a source assertion requiring the explicit Ombú-only ternary.
2. Ran `node --test tests/collection-band-source.test.mjs`; it failed against the previous `wines.length > 2` condition.
3. Replaced the count-based condition with the Ombú-only rule and reran verification.

### Follow-up verification

- `node --test tests/collection-band-source.test.mjs` — 1 pass, 0 failures.
- `npx tsc --noEmit` — exit 0.
