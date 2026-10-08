import type { Inline } from '@crochet-simple/shared';

// the editor's document, as far as the site needs it
export interface LexicalNode {
  readonly type: string;
  readonly children?: readonly LexicalNode[];
  readonly text?: string;
  readonly format?: number | string;
  readonly tag?: string;
  readonly listType?: string;
  readonly fields?: Record<string, unknown>;
  readonly relationTo?: string;
  readonly value?: unknown;
}

export interface Resolvers {
  // an uploaded photo: its path in the content folder and its description
  image(value: unknown): Promise<{ path: string; alt: string } | null>;
  // a link to one of the site's own patterns or articles
  internal(relationTo: string, value: unknown): Promise<string | null>;
  cards(urls: string[]): Promise<unknown[]>;
  pattern?(value: unknown): Promise<{ title: string; url: string; pinterestUrl?: string } | null>;
}

export type OutBlock = Record<string, unknown> & { type: string };

const BOLD = 1;
const ITALIC = 2;

const plain = (n: LexicalNode): string =>
  n.type === 'text'
    ? (n.text ?? '')
    : n.type === 'linebreak'
      ? ' '
      : (n.children ?? []).map(plain).join('');

async function inlines(
  nodes: readonly LexicalNode[],
  r: Resolvers,
  warn: (m: string) => void,
  href?: string,
): Promise<Inline[]> {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      const f = typeof n.format === 'number' ? n.format : 0;
      const piece: { text: string; bold?: boolean; italic?: boolean; href?: string } = {
        text: n.text ?? '',
      };
      if (f & BOLD) piece.bold = true;
      if (f & ITALIC) piece.italic = true;
      if (href) piece.href = href;
      out.push(piece);
    } else if (n.type === 'linebreak') {
      out.push(href ? { text: ' ', href } : { text: ' ' });
    } else if (n.type === 'link' || n.type === 'autolink') {
      const fields = n.fields ?? {};
      let target: string | null = null;
      if (fields['linkType'] === 'internal') {
        const doc = fields['doc'] as { relationTo?: string; value?: unknown } | undefined;
        target = doc?.relationTo ? await r.internal(doc.relationTo, doc.value) : null;
        if (!target)
          warn(
            `A link to a page that is no longer published was turned into plain text: "${plain(n)}"`,
          );
      } else {
        const url = String(fields['url'] ?? '');
        if (/^https:\/\//.test(url) || /^\/[^/]/.test(url)) target = url;
        else if (/^http:\/\//.test(url)) target = url.replace(/^http:/, 'https:');
        else
          warn(`A link without a full https:// address was turned into plain text: "${plain(n)}"`);
      }
      out.push(...(await inlines(n.children ?? [], r, warn, target ?? undefined)));
    } else if (n.children) {
      out.push(...(await inlines(n.children, r, warn, href)));
    }
  }
  // neighbours with the same style become one piece
  return out.reduce<Inline[]>((acc, i) => {
    const last = acc[acc.length - 1];
    if (last && last.bold === i.bold && last.italic === i.italic && last.href === i.href) {
      acc[acc.length - 1] = { ...last, text: last.text + i.text };
    } else acc.push(i);
    return acc;
  }, []);
}

const hasText = (content: Inline[]): boolean => content.some((i) => i.text.trim());

function listItems(list: LexicalNode): LexicalNode[] {
  // nested lists are flattened; the site shows one level
  return (list.children ?? []).flatMap((item) => {
    const nested = (item.children ?? []).filter((c) => c.type === 'list');
    const own = { ...item, children: (item.children ?? []).filter((c) => c.type !== 'list') };
    return [own, ...nested.flatMap(listItems)];
  });
}

export async function toBlocks(
  root: unknown,
  r: Resolvers,
  warn: (m: string) => void,
): Promise<OutBlock[]> {
  const doc = root as { root?: LexicalNode } | null;
  const out: OutBlock[] = [];
  for (const n of doc?.root?.children ?? []) {
    switch (n.type) {
      case 'paragraph': {
        const content = await inlines(n.children ?? [], r, warn);
        if (hasText(content)) out.push({ type: 'paragraph', content });
        break;
      }
      case 'heading': {
        const text = plain(n).trim();
        if (text) out.push({ type: 'heading', level: n.tag === 'h3' ? 3 : 2, text });
        break;
      }
      case 'list': {
        const items = [];
        for (const item of listItems(n)) {
          const content = await inlines(item.children ?? [], r, warn);
          if (hasText(content)) items.push(content);
        }
        if (items.length) out.push({ type: 'list', ordered: n.listType === 'number', items });
        break;
      }
      case 'quote': {
        const text = plain(n).trim();
        if (text) out.push({ type: 'quote', text });
        break;
      }
      case 'upload': {
        const img = await r.image(n.value);
        if (!img) {
          warn('A file in the text is not a photo (or was deleted) and was left out.');
          break;
        }
        const caption = String(n.fields?.['caption'] ?? '').trim();
        const pattern =
          n.fields?.['pattern'] && r.pattern ? await r.pattern(n.fields['pattern']) : null;
        if (n.fields?.['pattern'] && !pattern)
          warn('The pattern linked to a photo is no longer published. Its links were left out.');
        out.push({
          type: 'image',
          image: img.path,
          alt: img.alt,
          ...(caption ? { caption } : {}),
          ...(pattern ? { pattern } : {}),
        });
        break;
      }
      case 'block': {
        const f = n.fields ?? {};
        if (f['blockType'] === 'tip') {
          const text = String(f['text'] ?? '').trim();
          if (text)
            out.push({ type: 'tip', title: String(f['title'] || 'Tip'), content: [{ text }] });
        } else if (f['blockType'] === 'rounds') {
          const items = ((f['items'] as Record<string, unknown>[] | undefined) ?? [])
            .map((i) => ({
              label: String(i['label'] ?? '').trim(),
              text: String(i['text'] ?? '').trim(),
              count: String(i['count'] ?? '').trim(),
            }))
            .filter((i) => i.label && i.text)
            .map((i) => (i.count ? i : { label: i.label, text: i.text }));
          const title = String(f['title'] ?? '').trim();
          if (items.length) out.push({ type: 'rounds', ...(title ? { title } : {}), items });
        } else if (f['blockType'] === 'abbreviations') {
          const rows = ((f['rows'] as Record<string, unknown>[] | undefined) ?? [])
            .map((row) => [String(row['short'] ?? '').trim(), String(row['meaning'] ?? '').trim()])
            .filter(([a, b]) => a && b);
          if (rows.length) out.push({ type: 'table', rows });
        } else if (f['blockType'] === 'sizeChart') {
          const cells = (v: unknown) =>
            String(v ?? '')
              .split('|')
              .map((c) => c.trim());
          const head = cells(f['columns']).filter(Boolean);
          const rows = ((f['rows'] as Record<string, unknown>[] | undefined) ?? [])
            .map((r) => cells(r['cells']))
            .filter((r) => r.some(Boolean));
          if (head.length < 2 || !rows.length) {
            warn(
              'A size chart needs at least two column headings and one row, so it was left out.',
            );
          } else {
            if (rows.some((r) => r.length !== head.length))
              warn(
                `A size chart row does not have ${head.length} values; it was padded or cut to fit.`,
              );
            const title = String(f['title'] ?? '').trim();
            out.push({
              type: 'chart',
              ...(title ? { title } : {}),
              head,
              rows: rows.map((r) => head.map((_, i) => r[i] ?? '')),
            });
          }
        } else if (f['blockType'] === 'linkCards') {
          const urls = ((f['links'] as Record<string, unknown>[] | undefined) ?? [])
            .map((l) => String(l['url'] ?? ''))
            .filter(Boolean);
          const cards = await r.cards(urls);
          if (cards.length) out.push({ type: 'cards', cards });
        } else warn(`An unknown block (${String(f['blockType'])}) was left out.`);
        break;
      }
      default:
        if (plain(n).trim()) warn(`Some text of an unsupported kind (${n.type}) was left out.`);
    }
  }
  return out;
}
