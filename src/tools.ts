import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Options shared by download tools (pdf, epub, html, md).
 */
function downloadProperties() {
  return {
    urls: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "One or more URLs to convert.",
    },
    output: {
      type: "string" as const,
      description: "Output file path (absolute or relative). If it ends with / or has no extension, treated as a directory and a filename is auto-generated. Directories are created automatically.",
    },
    title: {
      type: "string" as const,
      description: "Title for the bundle.",
    },
    author: {
      type: "string" as const,
      description: "Author for the bundle.",
    },
    css: {
      type: "string" as const,
      description: "Additional CSS to override styles.",
    },
    style: {
      type: "string" as const,
      description: "Path to a custom CSS stylesheet.",
    },
    template: {
      type: "string" as const,
      description: "Path to a custom HTML template (nunjucks). Applies to pdf, html, md.",
    },
    hyphenate: {
      type: "boolean" as const,
      description: "Enable hyphenation. Default: true for pdf, false otherwise.",
    },
    individual: {
      type: "boolean" as const,
      description: "Export each URL as a separate file instead of bundling.",
    },
    wait: {
      type: "number" as const,
      description: "Seconds to wait between processing URLs (sequential mode).",
    },
    no_amp: {
      type: "boolean" as const,
      description: "Don't prefer the AMP version of the page.",
    },
    cover: {
      type: "boolean" as const,
      description: "Generate a cover page.",
    },
    toc: {
      type: "boolean" as const,
      description: "Generate a table of contents.",
    },
    toc_level: {
      type: "number" as const,
      description: "Heading depth for ToC (1–6). Values >1 imply --toc.",
    },
    inline: {
      type: "boolean" as const,
      description: "Embed images inline as base64 data URLs.",
    },
    debug: {
      type: "boolean" as const,
      description: "Print detailed debug info.",
    },
  };
}

/**
 * Processing-only options (no output/individual/cover/toc — used by percollate_read_md).
 */
function processingProperties() {
  return {
    url: {
      type: "string" as const,
      description: "The URL of the web page to read as Markdown.",
    },
    title: {
      type: "string" as const,
      description: "Title for the document.",
    },
    author: {
      type: "string" as const,
      description: "Author for the document.",
    },
    css: {
      type: "string" as const,
      description: "Additional CSS to override styles.",
    },
    style: {
      type: "string" as const,
      description: "Path to a custom CSS stylesheet.",
    },
    template: {
      type: "string" as const,
      description: "Path to a custom HTML template (nunjucks).",
    },
    hyphenate: {
      type: "boolean" as const,
      description: "Enable hyphenation.",
    },
    wait: {
      type: "number" as const,
      description: "Seconds to wait between processing URLs (sequential mode).",
    },
    no_amp: {
      type: "boolean" as const,
      description: "Don't prefer the AMP version of the page.",
    },
    debug: {
      type: "boolean" as const,
      description: "Print detailed debug info.",
    },
  };
}

export const tools: Tool[] = [
  {
    name: "percollate_download_pdf",
    description:
      "Download one or more web pages as a beautifully formatted PDF file. " +
      "Supports bundling multiple URLs into a single document with cover page and ToC.",
    inputSchema: {
      type: "object",
      properties: downloadProperties(),
      required: ["urls"],
    },
  },
  {
    name: "percollate_download_epub",
    description:
      "Download one or more web pages as an EPUB e-book. " +
      "Supports bundling multiple URLs with cover page and ToC.",
    inputSchema: {
      type: "object",
      properties: downloadProperties(),
      required: ["urls"],
    },
  },
  {
    name: "percollate_download_html",
    description:
      "Download one or more web pages as a self-contained HTML file. " +
      "Use the 'inline' option to embed images as base64.",
    inputSchema: {
      type: "object",
      properties: downloadProperties(),
      required: ["urls"],
    },
  },
  {
    name: "percollate_download_md",
    description:
      "Download one or more web pages as a Markdown file. " +
      "Produces clean, readable Markdown from web articles.",
    inputSchema: {
      type: "object",
      properties: downloadProperties(),
      required: ["urls"],
    },
  },
  {
    name: "percollate_read_md",
    description:
      "Read a web page as Markdown. Fetches the page, converts to clean Markdown, " +
      "caches the result locally, and returns the full Markdown content. " +
      "Subsequent calls for the same URL return the cached version instantly. " +
      "Ideal for consuming web content directly in conversation.",
    inputSchema: {
      type: "object",
      properties: processingProperties(),
      required: ["url"],
    },
  },
];
