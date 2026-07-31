# Task 1 brief — Define the collection component contract

This task fits inside C2, the approved rebuild of `/es/vinos`. Work only on `components/CollectionBand.tsx` and the test below. The workspace is shared and contains uncommitted work from an earlier agent: do not alter any files beyond this task.

## Constraints

- Preserve C1/C2 semantic structure.
- Use `next/image`, local public assets, visible keyboard focus and reduced-motion behaviour.
- At `lg`, approximate 38% image / 62% content; never use a fixed image height that creates empty vertical space.
- 2 cards per row for Lajau, up to 3 for Ombú; a one-card collection must not stretch to fill the grid.
- Keep alternating `flip` order.
- Do not remove the existing `description` flow yet; Task 2 owns that API cleanup.

## Required test

Create `tests/collection-band-source.test.mjs`:

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

Run `node --test tests/collection-band-source.test.mjs` before implementation and confirm it fails for the expected old layout. Then implement a compact adaptive card grid in `CollectionBand`, retaining `Image fill`, and re-run the test. Commit only your task files. Self-review for scope and TypeScript correctness.

Write the detailed report to `.superpowers/sdd/task-1-report.md`; return only: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), commit SHA, one-line test summary and concerns.
