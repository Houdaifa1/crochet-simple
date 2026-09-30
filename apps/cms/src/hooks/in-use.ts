import {
  APIError,
  type CollectionBeforeDeleteHook,
  type CollectionSlug,
  type GlobalSlug,
  type PayloadRequest,
} from 'payload';

type Doc = Record<string, unknown>;

const idOf = (v: unknown): string =>
  String(typeof v === 'object' && v !== null ? (v as { id: unknown }).id : v);

function inBody(body: unknown, id: string): boolean {
  const walk = (n: unknown): boolean => {
    if (!n || typeof n !== 'object') return false;
    const node = n as { type?: string; value?: unknown; children?: unknown[] };
    if (node.type === 'upload' && idOf(node.value) === id) return true;
    return (node.children ?? []).some(walk);
  };
  return walk((body as { root?: unknown } | null)?.root);
}

// the published version and the latest draft of every document
async function everyVersion(req: PayloadRequest, collection: CollectionSlug): Promise<Doc[]> {
  const found = await Promise.all(
    [false, true].map((draft) =>
      req.payload.find({ collection, draft, depth: 0, pagination: false, req }),
    ),
  );
  return found.flatMap((r) => r.docs as unknown as Doc[]);
}

const refuse = (what: string, places: Set<string>) => {
  if (!places.size) return;
  const list = [...places].slice(0, 6).join(', ');
  const more = places.size > 6 ? ` and ${places.size - 6} more` : '';
  throw new APIError(
    `${what} is still used by ${list}${more}. Change those first.`,
    400,
    null,
    true,
  );
};

export const categoryInUse: CollectionBeforeDeleteHook = async ({ req, id }) => {
  const places = new Set<string>();
  for (const p of await everyVersion(req, 'patterns'))
    if (idOf(p['category']) === String(id)) places.add(`pattern "${String(p['title'])}"`);
  refuse('This category', places);
};

export const fileInUse: CollectionBeforeDeleteHook = async ({ req, id }) => {
  const target = String(id);
  const places = new Set<string>();
  const check = (doc: Doc, label: string, fields: Record<string, unknown>) => {
    for (const [where, value] of Object.entries(fields))
      if (value !== null && value !== undefined && idOf(value) === target)
        places.add(`${label} (${where})`);
    if (inBody(doc['body'], target)) places.add(`${label} (text)`);
  };
  for (const p of await everyVersion(req, 'patterns')) {
    const gallery = (p['gallery'] as Doc[] | undefined) ?? [];
    check(p, `pattern "${String(p['title'])}"`, {
      cover: p['cover'],
      'Pinterest image': p['pinImage'],
      PDF: p['pdf'],
      ...Object.fromEntries(gallery.map((g, i) => [`photo ${i + 2}`, g['image']])),
    });
  }
  for (const a of await everyVersion(req, 'articles'))
    check(a, `article "${String(a['title'])}"`, { cover: a['cover'] });
  for (const c of await everyVersion(req, 'categories'))
    check(c, `category "${String(c['name'])}"`, { icon: c['icon'] });
  const global = (slug: GlobalSlug) => req.payload.findGlobal({ slug, depth: 0, req });
  const about = (await global('about')) as unknown as Doc;
  check(about, 'the About page', { photo: about['image'] });
  for (const [slug, label] of [
    ['privacy', 'the Privacy page'],
    ['terms', 'the Terms page'],
  ] as const)
    check((await global(slug)) as unknown as Doc, label, {});
  const settings = (await global('settings')) as unknown as Doc;
  const pin = (settings['pinterest'] ?? {}) as Doc;
  check(settings, 'Site settings', { 'Pinterest photo': pin['photo'] });
  refuse('This file', places);
};
