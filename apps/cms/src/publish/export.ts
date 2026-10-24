import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Payload } from 'payload';
import {
  cardKind,
  resolveLinkCard,
  resolveProfile,
  resolveVideo,
  type LinkCard,
  type Video,
} from '@crochet-simple/shared';
import { toBlocks, type OutBlock, type Resolvers } from './lexical.ts';
import { copyPhoto } from './unframe.ts';

export class PublishError extends Error {}

interface MediaDoc {
  id: number | string;
  filename: string;
  mimeType: string;
  alt?: string | null;
}

interface Cached {
  card: LinkCard;
  image?: string;
}

export interface ExportOptions {
  payload: Payload;
  mediaDir: string;
  dataDir: string;
  contentDir: string;
  // the latest version of every pattern and article, drafts included: for a preview on this Mac only
  drafts?: boolean;
  fetch?: typeof fetch;
  log: (line: string) => void;
}

export interface ExportResult {
  patterns: number;
  articles: number;
  categories: number;
  files: number;
  warnings: string[];
}

const PHOTO = /^image\/(png|jpeg|webp|avif)$/;
const idOf = (v: unknown): string =>
  String(typeof v === 'object' && v !== null ? (v as { id: unknown }).id : v);
const day = (v: unknown): string | undefined =>
  v ? new Date(String(v)).toISOString().slice(0, 10) : undefined;
const text = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || undefined;
};
const drop = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as T;

export async function exportContent(o: ExportOptions): Promise<ExportResult> {
  const { payload } = o;
  const warnings: string[] = [];
  const warn = (m: string) => {
    warnings.push(m);
    o.log(`Note: ${m}`);
  };
  const work = `${o.contentDir}.next`;
  await rm(work, { recursive: true, force: true });
  await mkdir(path.join(work, 'media'), { recursive: true });

  // every uploaded file, so relationships can be read whatever their depth
  const media = new Map<string, MediaDoc>();
  for (const m of (await payload.find({ collection: 'media', pagination: false, depth: 0 }))
    .docs as unknown as MediaDoc[]) {
    media.set(String(m.id), m);
  }
  const used = new Set<string>();
  const file = (value: unknown, where: string, kind: 'photo' | 'icon' | 'pdf'): MediaDoc => {
    const m = media.get(idOf(value));
    if (!m) throw new PublishError(`${where}: the file was deleted. Choose another one.`);
    const ok =
      kind === 'photo'
        ? PHOTO.test(m.mimeType)
        : kind === 'pdf'
          ? m.mimeType === 'application/pdf'
          : /^image\/(svg\+xml|png)$/.test(m.mimeType);
    if (!ok)
      throw new PublishError(
        `${where}: "${m.filename}" is not a ${kind === 'photo' ? 'photo' : kind === 'pdf' ? 'PDF' : 'SVG or PNG icon'}.`,
      );
    if (!existsSync(path.join(o.mediaDir, m.filename)))
      throw new PublishError(`${where}: "${m.filename}" is missing from the media folder.`);
    if (kind === 'photo' && !text(m.alt))
      throw new PublishError(
        `${where}: "${m.filename}" needs a photo description (Photos and files).`,
      );
    used.add(m.filename);
    return m;
  };
  // paths are written relative to the json file that uses them
  const rel = (m: MediaDoc, depth: 0 | 1) => `${depth ? '../' : './'}media/${m.filename}`;

  // link cards: fetched live, with the last good version kept for when a site does not answer
  const cachePath = path.join(o.dataDir, 'card-cache.json');
  const cache: Record<string, Cached> = existsSync(cachePath)
    ? JSON.parse(await readFile(cachePath, 'utf8'))
    : {};
  const cardDir = path.join(o.dataDir, 'cards');
  await mkdir(cardDir, { recursive: true });
  const settingsDoc = (await payload.findGlobal({
    slug: 'settings',
    depth: 1,
  })) as unknown as Record<string, unknown>;
  const etsyApiKey = text(settingsDoc['etsyApiKey']);
  const saveImage = async (url: string): Promise<string | undefined> => {
    const res = await (o.fetch ?? fetch)(url);
    const type = res.headers.get('content-type') ?? '';
    const ext = type.includes('png')
      ? 'png'
      : type.includes('webp')
        ? 'webp'
        : type.includes('avif')
          ? 'avif'
          : 'jpg';
    if (!res.ok || !type.startsWith('image/')) return undefined;
    const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.${ext}`;
    await writeFile(path.join(cardDir, name), new Uint8Array(await res.arrayBuffer()));
    return name;
  };
  const cardFor = async (url: string, where: string): Promise<Cached | null> => {
    try {
      const card = await resolveLinkCard(url, {
        ...(etsyApiKey ? { etsyApiKey } : {}),
        ...(o.fetch ? { fetch: o.fetch } : {}),
      });
      const image = card.image ? await saveImage(card.image).catch(() => undefined) : undefined;
      const fresh: Cached = { card, ...(image ? { image } : {}) };
      cache[url] = fresh;
      return fresh;
    } catch (e) {
      if (cardKind(url) === 'etsy' && !etsyApiKey) {
        warn(
          `${where}: ${url} needs your Etsy API key to show as a card (Site settings, Connections). The card is left out.`,
        );
        return cache[url] ?? null;
      }
      if (cache[url]) {
        warn(
          `${where}: ${url} could not be read (${(e as Error).message}); the last saved card is used.`,
        );
        return cache[url]!;
      }
      warn(`${where}: ${url} could not be read (${(e as Error).message}); the card is left out.`);
      return null;
    }
  };
  const cardsOut = async (urls: string[], where: string) => {
    const out = [];
    for (const url of urls) {
      const c = await cardFor(url, where);
      if (!c) continue;
      let image: string | undefined;
      if (c.image && existsSync(path.join(cardDir, c.image))) {
        await mkdir(path.join(work, 'media/cards'), { recursive: true });
        await copyFile(path.join(cardDir, c.image), path.join(work, 'media/cards', c.image));
        image = `../media/cards/${c.image}`;
      }
      const { image: _remote, ...rest } = c.card;
      out.push(drop({ ...rest, image }));
    }
    return out;
  };

  // a pattern's YouTube tutorial, with its thumbnail kept on this site
  const videoOut = async (url: string, where: string) => {
    const key = `video:${url}`;
    let v = cache[key] as unknown as (Video & { image?: string }) | undefined;
    try {
      const fresh = await resolveVideo(url, o.fetch ? { fetch: o.fetch } : {});
      const image = await saveImage(fresh.thumbnail).catch(() => undefined);
      v = { ...fresh, ...(image ? { image } : {}) };
      (cache as Record<string, unknown>)[key] = v;
    } catch (e) {
      warn(
        `${where}: ${url} could not be read (${(e as Error).message})${v ? '; the last saved details are used' : '; the video is left out'}.`,
      );
    }
    if (!v?.image || !existsSync(path.join(cardDir, v.image))) return undefined;
    await mkdir(path.join(work, 'media/cards'), { recursive: true });
    await copyFile(path.join(cardDir, v.image), path.join(work, 'media/cards', v.image));
    const { image, thumbnail: _remote, ...rest } = v;
    return { ...rest, thumbnail: `../media/cards/${image}` };
  };

  const slugs = new Map<string, string>();
  const patternLinks = new Map<string, { title: string; url: string; pinterestUrl?: string }>();
  const patternFor = (value: unknown) => patternLinks.get(idOf(value));
  const resolvers = (where: string): Resolvers => ({
    image: async (value) => {
      const m = media.get(idOf(value));
      if (!m || !PHOTO.test(m.mimeType)) return null;
      return { path: rel(file(value, where, 'photo'), 1), alt: text(m.alt)! };
    },
    internal: async (relationTo, value) => slugs.get(`${relationTo}:${idOf(value)}`) ?? null,
    cards: (urls) => cardsOut(urls, where),
    pattern: async (value) => patternFor(value) ?? null,
  });
  const body = (doc: Record<string, unknown>, where: string): Promise<OutBlock[]> =>
    toBlocks(doc['body'], resolvers(where), (m) => warn(`${where}: ${m}`));
  const write = (rel: string, data: unknown) =>
    writeFile(path.join(work, rel), `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  const which = o.drafts ? { draft: true } : { where: { _status: { equals: 'published' } } };
  // a preview leaves out drafts that are not filled in enough to make a page yet
  const ready = (kind: string, docs: Record<string, unknown>[]) =>
    docs.filter((d) => {
      const ok =
        Boolean(text(d['title']) && text(d['slug']) && d['cover']) &&
        (kind === 'Article' || Boolean(d['category']));
      if (!ok)
        warn(
          `${kind} draft "${text(d['title']) ?? 'without a title'}" is not finished and was left out of the preview.`,
        );
      return ok;
    });
  const found = async (collection: 'patterns' | 'articles', kind: string) => {
    const docs = (await payload.find({ collection, ...which, pagination: false, depth: 0 }))
      .docs as unknown as Record<string, unknown>[];
    return o.drafts ? ready(kind, docs) : docs;
  };
  const patterns = await found('patterns', 'Pattern');
  const articles = await found('articles', 'Article');
  const categories = (await payload.find({ collection: 'categories', pagination: false, depth: 0 }))
    .docs as unknown as Record<string, unknown>[];
  for (const p of patterns) {
    const url = `/patterns/${p['slug']}/`;
    slugs.set(`patterns:${p['id']}`, url);
    patternLinks.set(
      String(p['id']),
      drop({ title: String(p['title']), url, pinterestUrl: text(p['pinterestUrl']) }),
    );
  }
  for (const a of articles) slugs.set(`articles:${a['id']}`, `/journal/${a['slug']}/`);
  const catSlug = new Map(categories.map((c) => [String(c['id']), String(c['slug'])]));

  await mkdir(path.join(work, 'categories'), { recursive: true });
  for (const c of categories) {
    const where = `Category "${c['name']}"`;
    await write(
      `categories/${c['slug']}.json`,
      drop({
        name: c['name'],
        description: text(c['description']),
        seoTitle: text(c['seoTitle']),
        seoDescription: text(c['seoDescription']),
        guide: await toBlocks(c['guide'], resolvers(where), (m) => warn(`${where}: ${m}`)),
        icon: c['icon'] ? rel(file(c['icon'], where, 'icon'), 1) : undefined,
        cardPicture: c['cardPicture']
          ? rel(file(c['cardPicture'], `${where} (card picture)`, 'photo'), 1)
          : undefined,
        cardColour: text(c['cardColour']),
        order: Number(c['order'] ?? 0),
      }),
    );
  }

  await mkdir(path.join(work, 'patterns'), { recursive: true });
  for (const p of patterns) {
    const where = `Pattern "${p['title']}"`;
    const category = catSlug.get(idOf(p['category']));
    if (!category) throw new PublishError(`${where}: its category was deleted. Choose a category.`);
    const additionalCategories = [
      ...new Set(
        ((p['additionalCategories'] as unknown[] | undefined) ?? []).map((value) => {
          const slug = catSlug.get(idOf(value));
          if (!slug) throw new PublishError(`${where}: an additional category was deleted.`);
          return slug;
        }),
      ),
    ].filter((slug) => slug !== category);
    const cover = file(p['cover'], `${where} (cover)`, 'photo');
    const details = (p['details'] ?? {}) as Record<string, unknown>;
    const pdf = p['pdf'] ? file(p['pdf'], `${where} (PDF)`, 'pdf') : undefined;
    await write(
      `patterns/${p['slug']}.json`,
      drop({
        title: p['title'],
        heading: text(p['heading']),
        summary: text(p['summary']),
        seoTitle: text(p['seoTitle']),
        seoDescription: text(p['seoDescription']),
        category,
        additionalCategories,
        cover: rel(cover, 1),
        coverAlt: text(cover.alt),
        downloadPicture: p['downloadPicture']
          ? rel(file(p['downloadPicture'], `${where} (download picture)`, 'photo'), 1)
          : undefined,
        gallery: ((p['gallery'] as Record<string, unknown>[] | undefined) ?? []).map((g, i) => {
          const m = file(g['image'], `${where} (photo ${i + 2})`, 'photo');
          return { image: rel(m, 1), alt: text(m.alt) };
        }),
        pinImage: p['pinImage']
          ? rel(file(p['pinImage'], `${where} (Pinterest image)`, 'photo'), 1)
          : undefined,
        pinterestUrl: text(p['pinterestUrl']),
        details: drop({
          skill: text(details['skill']),
          time: text(details['time']),
          hook: text(details['hook']),
          yarn: text(details['yarn']),
          size: text(details['size']),
          terms: text(details['terms']),
        }),
        pdf: pdf
          ? drop({ file: rel(pdf, 1), pages: p['pdfPages'] ? Number(p['pdfPages']) : undefined })
          : undefined,
        etsyUrl: pdf ? undefined : text(p['etsyUrl']),
        etsyCard:
          !pdf && text(p['etsyUrl'])
            ? (await cardsOut([String(p['etsyUrl'])], `${where} (Etsy link)`))[0]
            : undefined,
        video: text(p['video']) ? await videoOut(String(p['video']), where) : undefined,
        body: await body(p, where),
        published: day(p['published']),
        updated: day(p['updated']),
        ads: p['showAds'] !== false,
      }),
    );
  }

  await mkdir(path.join(work, 'articles'), { recursive: true });
  for (const a of articles) {
    const where = `Article "${a['title']}"`;
    const cover = file(a['cover'], `${where} (cover)`, 'photo');
    await write(
      `articles/${a['slug']}.json`,
      drop({
        title: a['title'],
        heading: text(a['heading']),
        summary: text(a['summary']),
        seoTitle: text(a['seoTitle']),
        seoDescription: text(a['seoDescription']),
        topic: text(a['topic']),
        cover: rel(cover, 1),
        coverAlt: text(cover.alt),
        coverPattern: patternFor(a['coverPattern']),
        body: await body(a, where),
        published: day(a['published']),
        updated: day(a['updated']),
        ads: a['showAds'] !== false,
      }),
    );
  }

  await mkdir(path.join(work, 'pages'), { recursive: true });
  const about = (await payload.findGlobal({ slug: 'about', depth: 0 })) as unknown as Record<
    string,
    unknown
  >;
  const aboutBody = await body(about, 'About');
  const aboutImage = about['image'] ? file(about['image'], 'About (photo)', 'photo') : undefined;
  if (
    text(about['intro']) ||
    text(about['seoTitle']) ||
    text(about['seoDescription']) ||
    aboutBody.length ||
    aboutImage
  ) {
    await write(
      'pages/about.json',
      drop({
        title: 'About',
        seoTitle: text(about['seoTitle']),
        seoDescription: text(about['seoDescription']),
        intro: text(about['intro']),
        image: aboutImage ? rel(aboutImage, 1) : undefined,
        imageAlt: aboutImage ? text(aboutImage.alt) : undefined,
        imagePattern: patternFor(about['imagePattern']),
        body: aboutBody,
      }),
    );
  }
  for (const slug of ['privacy', 'terms'] as const) {
    const g = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Record<string, unknown>;
    const b = await body(g, slug === 'privacy' ? 'Privacy policy' : 'Terms of use');
    if (b.length)
      await write(
        `pages/${slug}.json`,
        drop({
          title: text(g['title']) ?? (slug === 'privacy' ? 'Privacy policy' : 'Terms of use'),
          body: b,
          updated: day(g['updated']),
        }),
      );
  }

  const home = (await payload.findGlobal({ slug: 'homepage', depth: 0 })) as unknown as Record<
    string,
    unknown
  >;
  await write(
    'homepage.json',
    drop({
      seoTitle: text(home['seoTitle']),
      seoDescription: text(home['seoDescription']),
      headline: text(home['headline']),
      headlineAccent: text(home['headlineAccent']),
      cue: text(home['cue']),
      products: ((home['products'] as Record<string, unknown>[] | undefined) ?? []).map((p) =>
        drop({
          name: text(p['name']),
          description: text(p['description']),
          tags: String(p['tags'] ?? '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          alt: text(p['alt']),
        }),
      ),
      endingEyebrow: text(home['endingEyebrow']),
      endingTitle: text(home['endingTitle']),
      endingAccent: text(home['endingAccent']),
      endingText: text(home['endingText']),
      primaryButton: text(home['primaryButton']),
      secondaryButton: text(home['secondaryButton']),
    }),
  );
  const listings = (await payload.findGlobal({ slug: 'listings', depth: 0 })) as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const heading = (g: Record<string, unknown> | undefined) =>
    drop({
      eyebrow: text(g?.['eyebrow']),
      title: text(g?.['title']),
      intro: text(g?.['intro']),
      seoTitle: text(g?.['seoTitle']),
      seoDescription: text(g?.['seoDescription']),
    });
  await write('listings.json', {
    patterns: heading(listings['patterns']),
    journal: heading(listings['journal']),
  });

  // settings: public values only; the Etsy key never leaves this Mac
  const s = settingsDoc;
  const pin = (s['pinterest'] ?? {}) as Record<string, unknown>;
  let pinterest: Record<string, unknown> | undefined;
  const pinUrl = text(pin['url']);
  if (pinUrl) {
    const cached = cache[`profile:${pinUrl}`] as unknown as
      { name?: string; description?: string; image?: string } | undefined;
    let fetched: { name?: string; description?: string; image?: string } = cached ?? {};
    if (!text(pin['name']) || !pin['photo']) {
      try {
        const p = await resolveProfile(pinUrl, o.fetch ? { fetch: o.fetch } : {});
        const image = p.image ? await saveImage(p.image).catch(() => undefined) : undefined;
        fetched = drop({ name: p.name, description: p.description, image });
        (cache as Record<string, unknown>)[`profile:${pinUrl}`] = fetched;
      } catch (e) {
        warn(
          `Pinterest profile could not be read (${(e as Error).message})${cached ? '; the last saved details are used' : ''}.`,
        );
      }
    }
    let image: string | undefined;
    if (pin['photo']) image = rel(file(pin['photo'], 'Pinterest profile photo', 'photo'), 0);
    else if (fetched.image && existsSync(path.join(cardDir, fetched.image))) {
      await mkdir(path.join(work, 'media/cards'), { recursive: true });
      await copyFile(
        path.join(cardDir, fetched.image),
        path.join(work, 'media/cards', fetched.image),
      );
      image = `./media/cards/${fetched.image}`;
    }
    pinterest = drop({
      url: pinUrl,
      name: text(pin['name']) ?? fetched.name ?? 'Crochet Simplified',
      description: text(pin['description']),
      image,
    });
  }
  const ads = (s['adsense'] ?? {}) as Record<string, unknown>;
  if (ads['enabled'] && !text(ads['client']))
    warn('Ads are switched on but the AdSense publisher ID is empty, so no ads are shown.');
  const ver = (s['verification'] ?? {}) as Record<string, unknown>;
  await write(
    'settings.json',
    drop({
      adsense: {
        enabled: Boolean(ads['enabled']),
        ...drop({ client: text(ads['client']) }),
        slots: drop({
          inFeed: text(ads['inFeed']),
          inArticle: text(ads['inArticle']),
          sidebar: text(ads['sidebar']),
        }),
      },
      pinterest,
      etsyShopUrl: text(s['etsyShopUrl']),
      contactEmail: text(s['contactEmail']),
      controls: drop({
        searchLabel: text((s['controls'] as Record<string, unknown> | undefined)?.['searchLabel']),
        downloadLabel: text(
          (s['controls'] as Record<string, unknown> | undefined)?.['downloadLabel'],
        ),
      }),
      indexable: Boolean(s['indexable']),
      social: ((s['social'] as Record<string, unknown>[] | undefined) ?? []).map((x) => ({
        platform: x['platform'],
        url: x['url'],
      })),
      analyticsToken: text(s['analyticsToken']),
      verification: drop({ google: text(ver['google']), pinterest: text(ver['pinterest']) }),
    }),
  );

  let unframed = 0;
  for (const name of used)
    if (await copyPhoto(path.join(o.mediaDir, name), path.join(work, 'media', name))) unframed++;
  if (unframed)
    o.log(`Trimmed the cream frame from ${unframed} cover photos (originals unchanged)`);
  await writeFile(cachePath, JSON.stringify(cache, null, 2));

  // swap in the new folder only once it is complete
  const old = `${o.contentDir}.old`;
  await rm(old, { recursive: true, force: true });
  if (existsSync(o.contentDir)) await rename(o.contentDir, old);
  await rename(work, o.contentDir);
  await rm(old, { recursive: true, force: true });

  return {
    patterns: patterns.length,
    articles: articles.length,
    categories: categories.length,
    files: used.size,
    warnings,
  };
}
