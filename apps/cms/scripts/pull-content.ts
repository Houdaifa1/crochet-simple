import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { siteDomains } from '../src/publish/build.ts';
import { pullContent } from '../src/publish/store.ts';

// used by the GitHub deploy: fetch the last published content into apps/web/.content
const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
const token = process.env['CLOUDFLARE_API_TOKEN'];
if (!accountId || !token) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.');
  process.exit(1);
}
const dir = path.resolve(import.meta.dirname, '../../web/.content');
const manifest = await pullContent(dir, { accountId, token });
if (!manifest.siteUrl) throw new Error('The published content has no website address.');
console.log(
  `Content from ${manifest.publishedAt}: ${Object.keys(manifest.files).length} files for ${manifest.siteUrl}`,
);
if (process.env['GITHUB_OUTPUT'])
  appendFileSync(
    process.env['GITHUB_OUTPUT'],
    `published_at=${manifest.publishedAt}\nsite_url=${manifest.siteUrl}\ndomains=${siteDomains(
      manifest.siteUrl,
    )
      .map((d) => `--domain ${d}`)
      .join(' ')}\n`,
  );
