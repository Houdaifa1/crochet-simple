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

export const BODY_BLOCKS = [Tip, Rounds, Abbreviations, LinkCards];
