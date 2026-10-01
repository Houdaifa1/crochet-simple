import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// published content kept in Cloudflare R2, so GitHub can rebuild the site after a code change
export const BUCKET = 'crochet-simple-content';
const MANIFEST = 'manifest.json';

export interface StoreOptions {
  accountId: string;
  token: string;
  bucket?: string;
  fetch?: typeof fetch;
}

export interface Manifest {
  version: 1;
  publishedAt: string;
  siteUrl: string;
  // content path to the sha256 of its bytes; each file is stored once under its hash
  files: Record<string, string>;
  // files only the previous publish used, removed one publish later so a running build finds them
  retired: string[];
}

const blob = (hash: string) => `blob-${hash}`;
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

function client(o: StoreOptions) {
  const call = o.fetch ?? fetch;
  const base = `https://api.cloudflare.com/client/v4/accounts/${o.accountId}/r2/buckets/${o.bucket ?? BUCKET}/objects/`;
  const headers = { authorization: `Bearer ${o.token}` };
  const fail = async (what: string, res: Response) =>
    new Error(
      `Cloudflare storage ${what} failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
    );
  return {
    async get(key: string): Promise<Buffer | null> {
      const res = await call(base + key, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(`reading ${key}`, res);
      return Buffer.from(await res.arrayBuffer());
    },
    async put(key: string, body: Buffer): Promise<void> {
      const res = await call(base + key, {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/octet-stream' },
        body: new Uint8Array(body),
      });
      if (!res.ok) throw await fail(`saving ${key}`, res);
    },
    async remove(key: string): Promise<void> {
      const res = await call(base + key, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 404) throw await fail(`removing ${key}`, res);
    },
  };
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
}

export async function readManifest(o: StoreOptions): Promise<Manifest | null> {
  const raw = await client(o).get(MANIFEST);
  return raw ? (JSON.parse(raw.toString('utf8')) as Manifest) : null;
}

// uploads only new or changed files, then switches to them in one write of the manifest
export async function pushContent(
  dir: string,
  siteUrl: string,
  o: StoreOptions,
): Promise<{ uploaded: number; files: number }> {
  const store = client(o);
  const files: Record<string, string> = {};
  const bodies = new Map<string, Buffer>();
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(e.parentPath, e.name);
    const body = await readFile(full);
    const hash = sha256(body);
    files[path.relative(dir, full).split(path.sep).join('/')] = hash;
    bodies.set(hash, body);
  }
  const current = await readManifest(o);
  const stored = new Set([...Object.values(current?.files ?? {}), ...(current?.retired ?? [])]);
  const missing = [...bodies.keys()].filter((h) => !stored.has(h));
  await inBatches(missing, 6, (h) => store.put(blob(h), bodies.get(h)!));

  const keep = new Set(Object.values(files));
  const manifest: Manifest = {
    version: 1,
    publishedAt: new Date().toISOString(),
    siteUrl,
    files,
    retired: [...new Set(Object.values(current?.files ?? {}))].filter((h) => !keep.has(h)),
  };
  await store.put(MANIFEST, Buffer.from(JSON.stringify(manifest, null, 2)));
  const gone = (current?.retired ?? []).filter((h) => !keep.has(h));
  await inBatches(gone, 6, (h) => store.remove(blob(h)));
  return { uploaded: missing.length, files: Object.keys(files).length };
}

// downloads the last published content into dir, replacing it only once every file checks out
export async function pullContent(dir: string, o: StoreOptions): Promise<Manifest> {
  const store = client(o);
  const manifest = await readManifest(o);
  if (!manifest)
    throw new Error('No published content in Cloudflare yet: publish once from the admin.');
  const temp = `${dir}.pulling`;
  await rm(temp, { recursive: true, force: true });
  await mkdir(temp, { recursive: true });
  try {
    await inBatches(Object.entries(manifest.files), 8, async ([file, hash]) => {
      const target = path.join(temp, ...file.split('/'));
      if (!target.startsWith(temp + path.sep)) throw new Error(`Unsafe content path: ${file}`);
      const body = await store.get(blob(hash));
      if (!body || sha256(body) !== hash) throw new Error(`Stored content is damaged: ${file}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    });
  } catch (e) {
    await rm(temp, { recursive: true, force: true });
    throw e;
  }
  await rm(dir, { recursive: true, force: true });
  await rename(temp, dir);
  return manifest;
}
