import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import type { Plugin } from 'vite';
import { encodeCommands, type PathCommand } from '@crochet-simple/artwork';

// canonical urls, share images and the sitemap switch on once the domain is set
const site = process.env.SITE_URL;
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

export default defineConfig({
  ...(site ? { site } : {}),
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1' },
  vite: { plugins: [compactDrawings()] },
});
