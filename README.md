# percollate-mcp

An MCP server that wraps [Percollate](https://github.com/danburzo/percollate) to convert web pages into PDF, EPUB, HTML, or Markdown — directly from your AI assistant.

## Tools

### Download tools

Each writes a file to disk:

| Tool | Output |
|------|--------|
| `percollate_download_pdf` | PDF |
| `percollate_download_epub` | EPUB e-book |
| `percollate_download_html` | HTML file |
| `percollate_download_md` | Markdown file |

**Parameters:**

- `urls` (required) — Array of URLs to convert
- `output` — Output file path
- `title` — Document title
- `author` — Document author
- `css` — Additional CSS overrides
- `style` — Custom CSS stylesheet path
- `template` — Custom HTML template path
- `hyphenate` — Enable hyphenation
- `individual` — Export each URL as a separate file
- `wait` — Seconds between processing URLs
- `no_amp` — Don't prefer AMP versions
- `cover` — Generate a cover page
- `toc` — Generate a table of contents
- `toc_level` — Heading depth for ToC (1–6)
- `inline` — Embed images as base64
- `debug` — Verbose output

### percollate_read_md

Reads a web page as Markdown and returns the content directly in conversation. Results are cached locally — repeated calls for the same URL return instantly.

**Parameters:**

- `url` (required) — URL to read
- `title`, `author`, `css`, `style`, `template`, `hyphenate`, `wait`, `no_amp`, `debug` — standard processing options

Cached files are stored in your OS temp directory (`percollate-mcp-cache/`).

## Installation

```bash
git clone <repo-url> percollate-mcp
cd percollate-mcp
pnpm install
pnpm run build
```

## Configuration

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "percollate": {
      "command": "node",
      "args": ["/absolute/path/to/percollate-mcp/dist/index.js"]
    }
  }
}
```

## Requirements

- Node.js 14.17.0+
- Percollate pulls in Puppeteer (for PDF generation), which downloads a Chromium binary on first use

## License

MIT
