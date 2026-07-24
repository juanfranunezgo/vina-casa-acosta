import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CollectionBand uses a compact adaptive wine grid instead of fixed tall imagery", async () => {
  const source = await readFile(new URL("../components/CollectionBand.tsx", import.meta.url), "utf8");
  assert.match(source, /grid-cols-2/);
  assert.match(source, /grid-cols-3/);
  assert.doesNotMatch(source, /lg:min-h-\[560px\]/);
  assert.match(source, /id === "ombu" \? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"/);
});

test("WineCard has no catalogue description prop or rendered description block", async () => {
  const source = await readFile(new URL("../components/WineCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /description:\s*string/);
  assert.doesNotMatch(source, /line-clamp-2/);
});
