import { describe, expect, it } from 'vitest';
import { toBlocks, type LexicalNode, type Resolvers } from '../src/publish/lexical.ts';

const t = (text: string, format = 0): LexicalNode => ({ type: 'text', text, format });
const doc = (...children: LexicalNode[]) => ({ root: { type: 'root', children } });
const resolvers: Resolvers = {
  image: async (v) => (v === 7 ? { path: '../media/a.png', alt: 'A photo' } : null),
  internal: async (rel, v) => (rel === 'patterns' && v === 3 ? '/patterns/daisy-clip/' : null),
  cards: async (urls) => urls.map((url) => ({ kind: 'link', url, title: 'T' })),
};
const run = async (d: unknown) => {
  const warnings: string[] = [];
  return { blocks: await toBlocks(d, resolvers, (m) => warnings.push(m)), warnings };
};

describe('write-up conversion', () => {
  it('keeps bold, italic and links, and merges neighbouring text', async () => {
    const { blocks } = await run(
      doc({
        type: 'paragraph',
        children: [
          t('Start '),
          t('here', 0),
          t(' bold', 1),
          t('it', 2),
          {
            type: 'link',
            fields: { linkType: 'custom', url: 'https://example.com' },
            children: [t('site')],
          },
          {
            type: 'link',
            fields: { linkType: 'internal', doc: { relationTo: 'patterns', value: 3 } },
            children: [t('daisy')],
          },
        ],
      }),
    );
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        content: [
          { text: 'Start here' },
          { text: ' bold', bold: true },
          { text: 'it', italic: true },
          { text: 'site', href: 'https://example.com' },
          { text: 'daisy', href: '/patterns/daisy-clip/' },
        ],
      },
    ]);
  });

  it('turns unsafe or dead links into plain text and says so', async () => {
    const { blocks, warnings } = await run(
      doc(
        {
          type: 'paragraph',
          children: [{ type: 'link', fields: { url: 'javascript:alert(1)' }, children: [t('x')] }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              fields: { linkType: 'internal', doc: { relationTo: 'patterns', value: 99 } },
              children: [t('gone')],
            },
          ],
        },
      ),
    );
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ text: 'x' }] },
      { type: 'paragraph', content: [{ text: 'gone' }] },
    ]);
    expect(warnings).toHaveLength(2);
  });

  it('converts headings, lists (flattening nested ones), quotes and photos', async () => {
    const { blocks } = await run(
      doc(
        { type: 'heading', tag: 'h2', children: [t('Materials')] },
        { type: 'heading', tag: 'h3', children: [t('Base')] },
        {
          type: 'list',
          listType: 'bullet',
          children: [
            {
              type: 'listitem',
              children: [
                t('Yarn'),
                {
                  type: 'list',
                  listType: 'bullet',
                  children: [{ type: 'listitem', children: [t('Cotton')] }],
                },
              ],
            },
            { type: 'listitem', children: [t('Hook')] },
          ],
        },
        {
          type: 'list',
          listType: 'number',
          children: [{ type: 'listitem', children: [t('One')] }],
        },
        { type: 'quote', children: [t('Count every round.')] },
        { type: 'upload', relationTo: 'media', value: 7, fields: { caption: ' Close up ' } },
        { type: 'paragraph', children: [t('   ')] },
      ),
    );
    expect(blocks).toEqual([
      { type: 'heading', level: 2, text: 'Materials' },
      { type: 'heading', level: 3, text: 'Base' },
      {
        type: 'list',
        ordered: false,
        items: [[{ text: 'Yarn' }], [{ text: 'Cotton' }], [{ text: 'Hook' }]],
      },
      { type: 'list', ordered: true, items: [[{ text: 'One' }]] },
      { type: 'quote', text: 'Count every round.' },
      { type: 'image', image: '../media/a.png', alt: 'A photo', caption: 'Close up' },
    ]);
  });

  it('converts tips, rounds, abbreviations and link cards, skipping empty rows', async () => {
    const { blocks } = await run(
      doc(
        { type: 'block', fields: { blockType: 'tip', title: '', text: 'Count.' } },
        {
          type: 'block',
          fields: {
            blockType: 'rounds',
            title: 'Base',
            items: [
              { label: 'Rnd 1', text: 'Ch 41.', count: '80 sts' },
              { label: 'Rnd 2', text: 'Sc around.', count: '' },
              { label: '', text: '' },
            ],
          },
        },
        {
          type: 'block',
          fields: {
            blockType: 'abbreviations',
            rows: [
              { short: 'sc', meaning: 'single crochet' },
              { short: '', meaning: '' },
            ],
          },
        },
        {
          type: 'block',
          fields: { blockType: 'linkCards', links: [{ url: 'https://www.pinterest.com/pin/1/' }] },
        },
      ),
    );
    expect(blocks).toEqual([
      { type: 'tip', title: 'Tip', content: [{ text: 'Count.' }] },
      {
        type: 'rounds',
        title: 'Base',
        items: [
          { label: 'Rnd 1', text: 'Ch 41.', count: '80 sts' },
          { label: 'Rnd 2', text: 'Sc around.' },
        ],
      },
      { type: 'table', rows: [['sc', 'single crochet']] },
      {
        type: 'cards',
        cards: [{ kind: 'link', url: 'https://www.pinterest.com/pin/1/', title: 'T' }],
      },
    ]);
  });

  it('leaves out files that are not photos, with a note', async () => {
    const { blocks, warnings } = await run(doc({ type: 'upload', relationTo: 'media', value: 8 }));
    expect(blocks).toEqual([]);
    expect(warnings[0]).toMatch(/not a photo/);
  });

  it('handles an empty write-up', async () => {
    expect((await run(null)).blocks).toEqual([]);
  });
});
