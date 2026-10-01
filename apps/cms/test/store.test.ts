import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pullContent, pushContent, readManifest, type StoreOptions } from '../src/publish/store.ts';

// Cloudflare's object API, in memory
function fakeR2() {
  const objects = new Map<string, Buffer>();
  const calls: string[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    const key = url.split('/objects/')[1]!;
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${key}`);
    if (method === 'PUT') objects.set(key, Buffer.from(init!.body as Uint8Array));
    else if (method === 'DELETE') objects.delete(key);
    else if (!objects.has(key)) return new Response('not found', { status: 404 });
    else return new Response(new Uint8Array(objects.get(key)!));
    return new Response('{"success":true}');
  }) as typeof globalThis.fetch;
  const options: StoreOptions = { accountId: 'acc', token: 'tok', fetch };
  return { objects, calls, options };
}

const dirs: string[] = [];
async function folder(files: Record<string, string>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'store-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), text);
  }
  return dir;
}
afterEach(() => Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true }))));

const blobs = (objects: Map<string, Buffer>) =>
  [...objects.keys()].filter((k) => k !== 'manifest.json');

describe('content store', () => {
  it('uploads the content and pulls back exactly the same files', async () => {
    const r2 = fakeR2();
    const src = await folder({
      'settings.json': '{"a":1}',
      'patterns/bag.json': 'bag',
      'media/x.pdf': 'pdf',
    });
    expect(await pushContent(src, 'https://crochet.houdaifa.dev', r2.options)).toEqual({
      uploaded: 3,
      files: 3,
    });
    const out = path.join(await folder({ 'old.json': 'stale' }), 'content');
    const manifest = await pullContent(out, r2.options);
    expect(manifest.siteUrl).toBe('https://crochet.houdaifa.dev');
    expect(await readFile(path.join(out, 'patterns/bag.json'), 'utf8')).toBe('bag');
    expect(await readFile(path.join(out, 'media/x.pdf'), 'utf8')).toBe('pdf');
  });

  it('uploads only changed files and removes old ones one publish later', async () => {
    const r2 = fakeR2();
    const dir = await folder({ 'a.json': 'one', 'b.json': 'two' });
    await pushContent(dir, 'https://x.dev', r2.options);
    await writeFile(path.join(dir, 'b.json'), 'three');
    expect((await pushContent(dir, 'https://x.dev', r2.options)).uploaded).toBe(1);
    // the replaced file stays for a build that may still be reading the previous publish
    expect(blobs(r2.objects)).toHaveLength(3);
    await pushContent(dir, 'https://x.dev', r2.options);
    expect(blobs(r2.objects)).toHaveLength(2);
    expect((await readManifest(r2.options))!.retired).toEqual([]);
  });

  it('refuses to build from nothing or from damaged files, and keeps the folder as it was', async () => {
    const r2 = fakeR2();
    const out = await folder({ 'keep.json': 'mine' });
    await expect(pullContent(out, r2.options)).rejects.toThrow('publish once from the admin');
    await pushContent(await folder({ 'a.json': 'one' }), 'https://x.dev', r2.options);
    const key = blobs(r2.objects)[0]!;
    r2.objects.set(key, Buffer.from('tampered'));
    await expect(pullContent(out, r2.options)).rejects.toThrow('damaged: a.json');
    expect(await readFile(path.join(out, 'keep.json'), 'utf8')).toBe('mine');
  });

  it('never writes outside the content folder', async () => {
    const r2 = fakeR2();
    await pushContent(await folder({ 'a.json': 'one' }), 'https://x.dev', r2.options);
    const m = (await readManifest(r2.options))!;
    m.files = { '../escape.json': m.files['a.json']! };
    r2.objects.set('manifest.json', Buffer.from(JSON.stringify(m)));
    await expect(pullContent(await folder({}), r2.options)).rejects.toThrow('Unsafe content path');
  });
});
