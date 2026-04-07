# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

percollate-mcp is a lightweight MCP (Model Context Protocol) server that wraps [Percollate](https://github.com/danburzo/percollate), exposing web-page-to-document conversion as MCP tools.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run build        # Compile TypeScript to dist/
pnpm run start        # Run the MCP server (stdio transport)
npx tsc --noEmit      # Type-check without emitting
```

## Architecture

- **src/index.ts** — MCP server entry point. Stdio transport, registers 5 tools, dispatches to handlers. Download tools call Percollate's programmatic API directly. `percollate_read_md` has its own handler with a local file cache.
- **src/tools.ts** — Tool schema definitions. `downloadProperties()` for the 4 download tools, `processingProperties()` for `percollate_read_md` (single URL, no output path).
- **src/percollate.d.ts** — Type declarations for the percollate package (ships without types).

### Tool overview

| Tool | Purpose |
|------|---------|
| `percollate_download_pdf` | Download web pages as PDF |
| `percollate_download_epub` | Download web pages as EPUB |
| `percollate_download_html` | Download web pages as HTML |
| `percollate_download_md` | Download web pages as Markdown file |
| `percollate_read_md` | Read a web page as Markdown — fetches, caches in OS temp dir, returns content directly |

`percollate_read_md` uses SHA-256 hashing of the URL to create deterministic cache filenames under `%TEMP%/percollate-mcp-cache/`. Cached files are reused on subsequent calls for the same URL.

### Percollate API

Percollate is used programmatically (not via CLI): `import percollate from "percollate"` then `percollate.pdf(urls, opts)`, `percollate.md(urls, opts)`, etc. `configure()` must be called once before use.

## Usage with MCP clients

```json
{
  "mcpServers": {
    "percollate": {
      "command": "node",
      "args": ["/path/to/percollate-mcp/dist/index.js"]
    }
  }
}
```
