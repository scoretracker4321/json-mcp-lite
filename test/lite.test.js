import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTools } from "../src/server.js";

const opts = { file: "examples/products.json", name: "products", id: "sku", search: "title,description" };

test("three tools named after the source", async () => {
  const tools = await buildTools(opts);
  assert.deepEqual(tools.map((t) => t.name), ["products_list", "products_search", "products_get"]);
});

test("list paginates", async () => {
  const [list] = await buildTools(opts);
  const r = await list.handler({ limit: 2, offset: 1 });
  assert.equal(r.structuredContent.total, 5);
  assert.deepEqual(r.structuredContent.items.map((x) => x.sku), ["TEA-002", "TEA-003"]);
});

test("search needs every word, ignores case", async () => {
  const [, search] = await buildTools(opts);
  assert.deepEqual((await search.handler({ query: "BLACK tea", limit: 10 })).structuredContent.items.map((x) => x.sku),
    ["TEA-001", "TEA-002", "TEA-003"]);
  assert.equal((await search.handler({ query: "black mug", limit: 10 })).structuredContent.total, 0);
});

test("get by id, and a clear error for a missing id", async () => {
  const [, , get] = await buildTools(opts);
  assert.equal((await get.handler({ sku: "MUG-001" })).structuredContent.price, 450);
  const miss = await get.handler({ sku: "NOPE" });
  assert.equal(miss.isError, true);
});

test("a path that is not an array fails loudly", async () => {
  await assert.rejects(buildTools({ ...opts, path: "nope" }), /not an array/);
});
