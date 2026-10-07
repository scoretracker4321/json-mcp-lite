#!/usr/bin/env node
// JSON file -> MCP server over stdio, with three tools: <name>_list, <name>_search, <name>_get.
// Good for catalogues, FAQs, docs, price lists: anything that fits in memory.
//
//   json-mcp-lite --file products.json --name products --id sku --search title,description [--path data.items]

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function dig(obj, dotPath) {
  return dotPath ? dotPath.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) : obj;
}

function tokens(s) {
  return String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export async function buildTools({ file, name, id, search, path: dotPath }) {
  const raw = JSON.parse(await readFile(path.resolve(file), "utf8"));
  const rows = dig(raw, dotPath);
  if (!Array.isArray(rows)) throw new Error(`'${dotPath || "(root)"}' in ${file} is not an array`);
  const fields = Object.keys(rows[0] || {});
  const searchFields = search ? search.split(",").map((s) => s.trim()).filter(Boolean) : fields;
  const byId = new Map(rows.map((r) => [String(r[id]), r]));
  const label = `${name} (${rows.length} records; fields: ${fields.join(", ")})`;
  const text = (r) => JSON.stringify(r, null, 2);

  return [
    {
      name: `${name}_list`,
      title: `List ${name}`,
      description: `List records from ${label}. Paginate with limit/offset.`,
      inputSchema: { limit: z.number().int().min(1).max(200).default(20), offset: z.number().int().min(0).default(0) },
      handler: async ({ limit, offset }) => {
        const p = { total: rows.length, offset, limit, items: rows.slice(offset, offset + limit) };
        return { content: [{ type: "text", text: text(p) }], structuredContent: p };
      },
    },
    {
      name: `${name}_search`,
      title: `Search ${name}`,
      description: `Keyword search over ${searchFields.join(", ")} in ${label}. All words must match (case-insensitive).`,
      inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(100).default(10) },
      handler: async ({ query, limit }) => {
        const q = tokens(query);
        const items = rows
          .filter((r) => {
            const hay = searchFields.map((f) => dig(r, f)).filter((v) => v != null).map(String).join(" ").toLowerCase();
            return q.every((t) => hay.includes(t));
          })
          .slice(0, limit);
        const out = { total: items.length, items };
        return { content: [{ type: "text", text: items.length ? text(out) : `No ${name} match "${query}".` }], structuredContent: out };
      },
    },
    {
      name: `${name}_get`,
      title: `Get one ${name} record`,
      description: `Fetch a single record from ${label} by ${id}.`,
      inputSchema: { [id]: z.string() },
      handler: async (args) => {
        const r = byId.get(String(args[id]));
        if (!r) return { content: [{ type: "text", text: `No ${name} with ${id}=${args[id]}` }], isError: true };
        return { content: [{ type: "text", text: text(r) }], structuredContent: r };
      },
    },
  ];
}

export function buildServer(tools, name) {
  const server = new McpServer({ name: `${name}-json-mcp-lite`, version: "1.0.0" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      { title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: true } },
      async (args) => {
        try {
          return await t.handler(args);
        } catch (e) {
          return { content: [{ type: "text", text: `${t.name} failed: ${e.message || e}` }], isError: true };
        }
      },
    );
  }
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (isMain) {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      name: { type: "string", default: "records" },
      id: { type: "string", default: "id" },
      search: { type: "string" },
      path: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || !values.file) {
    console.error("Usage: json-mcp-lite --file data.json [--name products] [--id sku] [--search title,description] [--path data.items]");
    process.exit(values.help ? 0 : 1);
  }
  const tools = await buildTools(values);
  await buildServer(tools, values.name).connect(new StdioServerTransport());
  console.error(`json-mcp-lite: ${tools.map((t) => t.name).join(", ")} ready on stdio`);
}
