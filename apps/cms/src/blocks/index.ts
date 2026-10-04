import type { Block } from 'payload';
import { httpsUrl } from '../fields/validators.ts';

export const Tip: Block = {
  slug: 'tip',
  labels: { singular: 'Tip', plural: 'Tips' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Tip', maxLength: 40 },
    { name: 'text', type: 'textarea', required: true },
  ],
};

export const Rounds: Block = {
  slug: 'rounds',
  labels: { singular: 'Rounds or rows', plural: 'Rounds or rows' },
  fields: [
    { name: 'title', type: 'text', admin: { description: 'Optional, like "Base" or "Handles".' } },
    {
      name: 'items',
      type: 'array',
      label: 'Steps',
      minRows: 1,
      labels: { singular: 'Step', plural: 'Steps' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              admin: { width: '25%', description: 'e.g. Rnd 1 or Row 4' },
            },
            { name: 'text', type: 'textarea', required: true, admin: { width: '55%' } },
            { name: 'count', type: 'text', admin: { width: '20%', description: 'e.g. 80 sts' } },
          ],
        },
      ],
    },
  ],
};

export const Abbreviations: Block = {
  slug: 'abbreviations',
  labels: { singular: 'Abbreviations table', plural: 'Abbreviations tables' },
  fields: [
    {
      name: 'rows',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Abbreviation', plural: 'Abbreviations' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'short',
              type: 'text',
              required: true,
              admin: { width: '30%', description: 'e.g. sc' },
            },
            {
              name: 'meaning',
              type: 'text',
              required: true,
              admin: { width: '70%', description: 'e.g. single crochet' },
            },
          ],
        },
      ],
    },
  ],
};

// sizes and measurements: one heading row, then one row per size, values separated by |
export const SizeChart: Block = {
  slug: 'sizeChart',
  labels: { singular: 'Size chart', plural: 'Size charts' },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Optional, like "Sizes and measurements".' },
    },
    {
      name: 'columns',
      type: 'text',
      required: true,
      admin: {
        description: 'The column headings separated by |, for example: Size | Foot length | Chain',
      },
    },
    {
      name: 'rows',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Row', plural: 'Rows' },
      fields: [
        {
          name: 'cells',
          type: 'text',
          required: true,
          admin: {
            description:
              'The values in the same order, separated by |, for example: Newborn | 8 cm | 18',
          },
        },
      ],
    },
  ],
};

export const LinkCards: Block = {
  slug: 'linkCards',
  labels: { singular: 'Link cards', plural: 'Link cards' },
  fields: [
    {
      name: 'links',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Link', plural: 'Links' },
      admin: {
        description:
          'Paste Pinterest pins, Etsy listings or any page. Photo, title, and for Etsy the price and rating, are fetched when you publish.',
      },
      fields: [{ name: 'url', type: 'text', required: true, validate: httpsUrl() }],
    },
  ],
};

export const BODY_BLOCKS = [Tip, Rounds, Abbreviations, SizeChart, LinkCards];
