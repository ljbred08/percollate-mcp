#!/usr/bin/env node

// Workaround for TLS cert issues on Windows / corporate networks
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
import { configure as percollateConfigure, pdf, epub, html, md } from "percollate";

const percollateFns = { pdf, epub, html, md } as const;
import { tools } from "./tools.js";

/**
 * Percollate writes status output to stdout (file paths, progress)
 * which corrupts the JSON-RPC stream MCP uses over stdout.
 * Suppress stdout writes during percollate calls, redirect to stderr.
 */
const origStdoutWrite = process.stdout.write.bind(process.stdout);
function suppressStdout() {
  process.stdout.write = ((chunk: Buffer | string, ...args: unknown[]) => {
    process.stderr.write(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;
}
function restoreStdout() {
  process.stdout.write = origStdoutWrite;
}

// Cache directory in OS temp, created lazily
const CACHE_DIR = path.join(os.tmpdir(), "percollate-mcp-cache");

function urlToCachePath(url: string): string {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
  return path.join(CACHE_DIR, `${hash}.md`);
}

function mapCommonArgs(args: Record<string, unknown>): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  if (args.output) opts.output = path.resolve(args.output as string);
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

const EXT_MAP: Record<string, string> = { pdf: ".pdf", epub: ".epub", html: ".html", md: ".md" };

/**
 * Resolve the output path: absolute or relative (to cwd).
 * If no output given, generate one in cwd based on title or URL.
 * Ensures parent directories exist.
 */
async function resolveOutputPath(
  opts: Record<string, unknown>,
  urls: string[],
  format: string
): Promise<string> {
  if (opts.output) {
    const out = opts.output as string;
    await fs.mkdir(path.dirname(out), { recursive: true });
    return out;
  }

  // Auto-generate: use title if available, otherwise slug from first URL
  const title = (opts.title as string) || new URL(urls[0]).hostname;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const outPath = path.resolve(`${slug || "percollate"}${EXT_MAP[format]}`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  opts.output = outPath;
  return outPath;
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
  if (name === "percollate_download_md" && !opts.markdownOptions) opts.markdownOptions = {};
  percollateConfigure();

  const format = name.replace("percollate_download_", "") as keyof typeof percollateFns;
  const fn = percollateFns[format];

  if (!fn || typeof fn !== "function") {
    return { content: [{ type: "text", text: `Unknown format: ${format}` }], isError: true };
  }

  try {
    const outputPath = await resolveOutputPath(opts, urls, format);

    suppressStdout();
    const result = await fn(urls, opts);
    restoreStdout();
    const savedFiles = result.items
      .map((item: { title?: string }, i: number) => `- ${item.title || urls[i]}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Converted ${urls.length} page(s) to ${format.toUpperCase()}.\nSaved to: ${outputPath}\nArticles:\n${savedFiles}`,
        },
      ],
    };
  } catch (err: unknown) {
    restoreStdout();
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
  if (!opts.markdownOptions) opts.markdownOptions = {};

  percollateConfigure();

  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    suppressStdout();
    await md([url], opts);
    restoreStdout();

    const content = await fs.readFile(cachePath, "utf-8");
    return { content: [{ type: "text", text: content }] };
  } catch (err: unknown) {
    restoreStdout();
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
