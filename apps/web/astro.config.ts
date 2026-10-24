import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import type { Plugin } from 'vite';
import { encodeCommands, type PathCommand } from '@crochet-simple/artwork';
import { freeRedirects, hasItems } from './src/lib/seo.ts';
import { enrichSitemap, pageExtras } from './src/lib/sitemap.ts';

// canonical urls, share images and the sitemap switch on once the domain is set
const site = process.env.SITE_URL;
const here = fileURLToPath(new URL('.', import.meta.url));
// the admin's export by default; tests point this at their fixtures and build into dist-test
process.env.CONTENT_DIR = resolve(here, process.env.CONTENT_DIR ?? '.content');
// an empty journal stays out of the sitemap until its first article
const journalEmpty = !hasItems(resolve(process.env.CONTENT_DIR, 'articles'));
const codec = fileURLToPath(new URL('../../packages/artwork/src/codec.ts', import.meta.url));

// the approved drawing files stay untouched; the browser gets them encoded (~30 KB gzipped)
function compactDrawings(): Plugin {
  const PREFIX = '\0drawing:';
  return {
    name: 'compact-drawings',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !/drawings\/[a-z-]+-commands\.json$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved ? `${PREFIX}${resolved.id.replace(/\.json$/, '')}.js` : null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = `${id.slice(PREFIX.length, -3)}.json`;
      this.addWatchFile(file);
      const text = encodeCommands(JSON.parse(readFileSync(file, 'utf8')) as PathCommand[]);
      return `import { decodeCommands } from ${JSON.stringify(codec)};\nexport default decodeCommands(${JSON.stringify(text)});`;
    },
  };
}

function redirects(): AstroIntegration {
  return {
    name: 'free-page-redirects',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        const lines = freeRedirects(pages.map((p) => p.pathname));
        if (lines.length) writeFileSync(new URL('_redirects', dir), `${lines.join('\n')}\n`);
      },
    },
  };
}

// runs after the sitemap is written: each page's last change and its photos are added from the built page
function sitemapExtras(siteUrl: string): AstroIntegration {
  return {
    name: 'sitemap-extras',
    hooks: {
      'astro:build:done': ({ dir }) => {
        for (const file of readdirSync(dir).filter((f) => /^sitemap-\d+\.xml$/.test(f))) {
          const at = new URL(file, dir);
          const extras = (loc: string) => {
            const page = new URL(`.${new URL(loc).pathname}index.html`, dir);
            return existsSync(page) ? pageExtras(readFileSync(page, 'utf8'), siteUrl) : undefined;
          };
          writeFileSync(at, enrichSitemap(readFileSync(at, 'utf8'), extras));
        }
      },
    },
  };
}

export default defineConfig({
  ...(site ? { site } : {}),
  outDir: process.env.OUT_DIR ?? 'dist',
  trailingSlash: 'always',
  integrations: [
    redirects(),
    ...(site
      ? [
          sitemap({
            filter: (page) =>
              !page.includes('/search/') && !(journalEmpty && page.includes('/journal/')),
          }),
          sitemapExtras(site),
        ]
      : []),
  ],
  build: { format: 'directory', inlineStylesheets: 'always' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1' },
  vite: { plugins: [compactDrawings()] },
});
