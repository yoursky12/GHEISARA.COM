const { test } = require("node:test");
const assert = require("node:assert/strict");
const { artworks, filterArtworks, queryString } = require("../src/lib/catalog.ts");

test("filter categories intersect, choices within a category combine", () => {
  assert.equal(filterArtworks({ style: ["Impresionisme", "Ukiyo-e"] }).length, 4);
  assert.equal(filterArtworks({ style: ["Impresionisme", "Ukiyo-e"], medium: "Cetak kayu" })[0].id, "the-great-wave");
});
test("search matches title, artist, or style without case sensitivity", () => {
  assert.equal(filterArtworks({ q: "  MONET  " })[0].id, "water-lilies");
  assert.equal(filterArtworks({ q: "not-present" }).length, 0);
});
test("invalid taxonomy and sort values use safe defaults", () => {
  assert.deepEqual(filterArtworks({ era: "unknown", sort: "unknown" }), artworks);
});
test("sorting does not mutate the catalog", () => {
  const ids = artworks.map(a => a.id);
  const result = filterArtworks({ sort: "title" });
  assert.equal(result[0].id, "a-sunday");
  assert.deepEqual(artworks.map(a => a.id), ids);
});
test("URL serialization preserves multiple selections and safe encoding", () => {
  const result = queryString({ style: ["Impresionisme", "Ukiyo-e"], q: "<script>&" });
  const params = new URLSearchParams(result.slice(1));
  assert.deepEqual(params.getAll("style"), ["Impresionisme", "Ukiyo-e"]);
  assert.equal(params.get("q"), "<script>&");
});

