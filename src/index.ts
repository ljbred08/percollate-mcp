#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import percollate from "percollate";
import { tools } from "./tools.js";

// Cache directory in OS temp, created lazily
const CACHE_DIR = path.join(os.tmpdir(), "percollate-mcp-cache");

function urlToCachePath(url: string): string {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
  return path.join(CACHE_DIR, `${hash}.md`);
}

function mapCommonArgs(args: Record<string, unknown>): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  if (args.output) opts.output = args.output;
  if (args.title) opts.title = args.title;
  if (args.author) opts.author = args.author;
  if (args.css) opts.css = args.css;
  if (args.style) opts.style = args.style;
  if (args.template) opts.template = args.template;
  if (args.hyphenate !== undefined) opts.hyphenate = args.hyphenate;
  if (args.individual === true) opts.individual = true;
  if (args.wait !== undefined) opts.wait = args.wait;
  if (args.no_amp === true) opts.amp = false;
  if (args.cover !== undefined) opts.cover = args.cover;
  if (args.toc !== undefined) opts.toc = args.toc;
  if (args.toc_level !== undefined) opts["toc-level"] = args.toc_level;
  if (args.inline === true) opts.inline = true;
  if (args.debug === true) opts.debug = true;
  return opts;
}

const server = new Server(
  { name: "percollate-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args) {
    return { content: [{ type: "text", text: "No arguments provided." }], isError: true };
  }

  // Handle percollate_read_md separately
  if (name === "percollate_read_md") {
    return handleReadMd(args as Record<string, unknown>);
  }

  // Download tools: percollate_download_{format}
  const urls: string[] = args.urls as string[];
  if (!Array.isArray(urls) || urls.length === 0) {
    return { content: [{ type: "text", text: "Provide at least one URL in the 'urls' array." }], isError: true };
  }

  const opts = mapCommonArgs(args as Record<string, unknown>);
  percollate.configure();

  const format = name.replace("percollate_download_", "") as "pdf" | "epub" | "html" | "md";
  const fn = percollate[format];

  if (!fn || typeof fn !== "function") {
    return { content: [{ type: "text", text: `Unknown format: ${format}` }], isError: true };
  }

  try {
    const result = await fn(urls, opts);
    const savedFiles = result.items
      .map((item: { title?: string }, i: number) => `- ${item.title || urls[i]}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Converted ${urls.length} page(s) to ${format.toUpperCase()}.\nArticles:\n${savedFiles}`,
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function handleReadMd(args: Record<string, unknown>) {
  const url = args.url as string;
  if (!url || typeof url !== "string") {
    return { content: [{ type: "text", text: "Provide a 'url' string." }], isError: true };
  }

  const cachePath = urlToCachePath(url);

  try {
    // Try to return cached version
    const cached = await fs.readFile(cachePath, "utf-8");
    return { content: [{ type: "text", text: cached }] };
  } catch {
    // Not cached — download and cache
  }

  // Build options (no output — we set it to the cache path)
  const opts = mapCommonArgs(args);
  opts.output = cachePath;

  percollate.configure();

  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    await percollate.md([url], opts);

    const md = await fs.readFile(cachePath, "utf-8");
    return { content: [{ type: "text", text: md }] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error fetching page: ${message}` }],
      isError: true,
    };
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
