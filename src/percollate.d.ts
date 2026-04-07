declare module "percollate" {
  interface PercollateOptions {
    output?: string;
    title?: string;
    author?: string;
    css?: string;
    style?: string;
    template?: string;
    hyphenate?: boolean;
    individual?: boolean;
    wait?: number;
    amp?: boolean;
    cover?: boolean;
    toc?: boolean;
    "toc-level"?: number;
    inline?: boolean;
    debug?: boolean;
    sandbox?: boolean;
    browser?: string;
    slugCache?: Record<string, string>;
    xhtml?: boolean;
    mapRemoteResources?: boolean;
  }

  interface PercollateItem {
    title?: string;
    byline?: string;
  }

  interface PercollateResult {
    items: PercollateItem[];
    options: PercollateOptions;
  }

  type FormatFn = (
    urls: string[],
    options?: PercollateOptions
  ) => Promise<PercollateResult>;

  function configure(): void;
  const pdf: FormatFn;
  const epub: FormatFn;
  const html: FormatFn;
  const md: FormatFn;

  export { configure, pdf, epub, html, md };
}
