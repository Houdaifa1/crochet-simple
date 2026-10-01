import { appendFileSync } from 'node:fs';
import { readManifest } from '../src/publish/store.ts';

// GitHub checks this before going online, so it never overwrites content published from the Mac meanwhile
const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
const token = process.env['CLOUDFLARE_API_TOKEN'];
const built = process.env['BUILT_FROM'];
if (!accountId || !token || !built) {
  console.error('CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and BUILT_FROM are required.');
  process.exit(1);
}
const latest = (await readManifest({ accountId, token }))?.publishedAt;
const current = latest === built;
console.log(
  current
    ? `Content is still current (${built}); deploying.`
    : `Newer content was published at ${latest} while this ran; it is already online, so this deploy is skipped.`,
);
if (process.env['GITHUB_OUTPUT'])
  appendFileSync(process.env['GITHUB_OUTPUT'], `current=${current}\n`);
