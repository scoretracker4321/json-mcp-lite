# json-mcp-lite

Turn a JSON file into an **MCP server** in one command, so Claude Desktop, Claude Code, Cursor or any stdio MCP client can browse and search your data.

Give it a catalogue, an FAQ, a price list or a docs index, and it creates three read-only tools:

| Tool | What it does |
|---|---|
| `<name>_list` | List records, with `limit` / `offset` paging |
| `<name>_search` | Keyword search; every word must match, case-insensitive |
| `<name>_get` | One record by its id field |

MIT licence. Node.js 20+. Two dependencies: the official `@modelcontextprotocol/sdk` and `zod`.

## Try it

```bash
git clone https://github.com/scoretracker4321/json-mcp-lite
cd json-mcp-lite && npm install
npm start          # serves examples/products.json on stdio
npm test
```

## Use it with Claude Desktop or Cursor

```json
{
  "mcpServers": {
    "products": {
      "command": "node",
      "args": [
        "/abs/path/json-mcp-lite/src/server.js",
        "--file", "/abs/path/products.json",
        "--name", "products",
        "--id", "sku",
        "--search", "title,description"
      ]
    }
  }
}
```

Claude Code:

```bash
claude mcp add products -- node /abs/path/json-mcp-lite/src/server.js --file /abs/path/products.json --name products --id sku
```

Then ask: *"Which teas are under ₹400 and in stock?"* or *"Show me product MUG-001."*

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--file` | (required) | The JSON file |
| `--path` | root | Dot path to the array inside the file, e.g. `data.items` |
| `--name` | `records` | Tool name prefix: `products` → `products_list`, … |
| `--id` | `id` | Field used by `<name>_get` |
| `--search` | all fields | Comma-separated fields that `<name>_search` looks in |

## Need more than a JSON file?

**json-mcp-lite** is the free, local, single-file part of [**MCP Server Kit**](https://checkout.dodopayments.com/buy/pdt_0NnmvXPBAvJBJC3NqGDJq?quantity=1) ($29, one-time). The Kit adds:

- **Any REST API → MCP tools** from its OpenAPI 3 spec: one typed tool per operation, auth injected from env, read-only filter, include/exclude lists
- **Remote hosting** over Streamable HTTP (stateless, proxy-friendly), not only stdio
- **API-key auth** and **per-key rate limits**, CORS, `/health` and `/tools` endpoints
- **Several sources in one server**, set up in one YAML/JSON config file
- **Docker** image, an Express router to mount inside your own app, and deploy guides

| | json-mcp-lite | MCP Server Kit |
|---|---|---|
| JSON file → list/search/get | ✅ | ✅ |
| stdio (Claude Desktop, Cursor, Claude Code) | ✅ | ✅ |
| OpenAPI / REST API → tools | | ✅ |
| Remote HTTP server | | ✅ |
| API keys + rate limits | | ✅ |
| Multiple sources, config file | | ✅ |
| Docker + deploy docs | | ✅ |
| Email support | | ✅ |

## Licence

MIT. Built by Brain Grain (support@braingrain.in).
