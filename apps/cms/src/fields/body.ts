import type { Field } from 'payload';
import {
  BlockquoteFeature,
  BlocksFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { BODY_BLOCKS } from '../blocks/index.ts';

// only what the website can show, so everything written here appears as written
export const bodyEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({ enabledCollections: ['patterns', 'articles'] }),
    UnorderedListFeature(),
    OrderedListFeature(),
    BlockquoteFeature(),
    UploadFeature({
      collections: {
        media: {
          fields: [
            { name: 'caption', type: 'text' },
            {
              name: 'pattern',
              type: 'relationship',
              relationTo: 'patterns',
              label: 'Pattern shown in this photo',
              admin: {
                description:
                  'Optional. Links this picture to the matching pattern and its published Pinterest pin.',
              },
            },
          ],
        },
      },
    }),
    BlocksFeature({ blocks: BODY_BLOCKS }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
});

// the longer text under a category's patterns: words, headings, lists and links, nothing else
export const guideEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({ enabledCollections: ['patterns', 'articles'] }),
    UnorderedListFeature(),
    OrderedListFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
});

export const bodyField = (description: string): Field => ({
  name: 'body',
  type: 'richText',
  label: 'Write-up',
  editor: bodyEditor,
  admin: { description },
});
