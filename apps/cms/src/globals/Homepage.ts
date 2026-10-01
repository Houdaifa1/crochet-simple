import type { GlobalConfig } from 'payload';

// the seven products, their drawings and photos are fixed; their words are yours
const PRODUCTS = [
  [
    'Blue market bag',
    'A structured tote in cobalt blue, finished with a pair of cherry charms.',
    'cobalt blue, cherry charms',
    'Cobalt blue crochet market bag with two red cherry charms on a wooden chair',
  ],
  [
    'Daisy clip',
    'White petals around a golden centre, with a small olive leaf.',
    'cream petals, golden centre, olive leaf',
    'White crochet daisy hair clip with a golden centre and an olive leaf on a blue plate',
  ],
  [
    'Olive cup cozy',
    'Deep olive ribbing that turns a takeaway cup into something you want to hold.',
    'olive ribbing, takeaway cup',
    'Olive ribbed crochet cozy on a takeaway coffee cup by a sunny window',
  ],
  [
    'AirPods pouch',
    'A compact buttoned pouch with a soft crochet wrist strap.',
    'brass snaps, wrist strap',
    'Taupe crochet AirPods pouch with an open flap, brass buttons and a wrist strap on a desk',
  ],
  [
    'Laptop sleeve',
    'Dense charcoal stitches closed with a simple tan leather tab.',
    'charcoal stitches, leather tab',
    'Charcoal crochet laptop sleeve with a tan leather closure tab on a wooden desk',
  ],
  [
    'Bucket hat',
    'Open stitches in warm pink and orange, shaped into a bright brim.',
    'pink and orange, open stitches',
    'Pink and orange open stitch crochet bucket hat on a wooden stand',
  ],
  [
    'Crochet panda',
    'A small black and white companion, shaped one round at a time.',
    'black and cream, amigurumi',
    'Small black and cream crochet panda sitting on a wooden table',
  ],
].map(([name, description, tags, alt]) => ({ name, description, tags, alt }));

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: 'Homepage',
  admin: {
    group: 'Pages',
    description:
      'The words on the homepage. The yarn drawing, the photos and the order of the seven products are part of the design and stay fixed.',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Search results',
      fields: [
        {
          name: 'seoTitle',
          type: 'text',
          required: true,
          maxLength: 70,
          defaultValue: 'Crochet Simplified | Crochet patterns and tutorials',
        },
        {
          name: 'seoDescription',
          type: 'textarea',
          required: true,
          maxLength: 160,
          defaultValue:
            'Follow one thread as it becomes seven crochet designs, then find clear crochet patterns, tutorials and notes from the studio.',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Top of the page',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'headline',
              type: 'text',
              required: true,
              defaultValue: 'Every piece begins with',
              admin: { width: '60%' },
            },
            {
              name: 'headlineAccent',
              type: 'text',
              required: true,
              defaultValue: 'one thread.',
              admin: { width: '40%', description: 'Shown in blue italics.' },
            },
          ],
        },
        {
          name: 'cue',
          type: 'text',
          required: true,
          maxLength: 40,
          defaultValue: 'Scroll to follow the thread',
        },
      ],
    },
    {
      name: 'products',
      type: 'array',
      label: 'The seven products (in this order: bag, daisy, cozy, pouch, laptop, hat, panda)',
      minRows: 7,
      maxRows: 7,
      defaultValue: PRODUCTS,
      admin: { initCollapsed: true, isSortable: false },
      fields: [
        { name: 'name', type: 'text', required: true, maxLength: 40 },
        { name: 'description', type: 'textarea', required: true, maxLength: 160 },
        {
          name: 'tags',
          type: 'text',
          admin: { description: 'Small labels, separated by commas.' },
        },
        { name: 'alt', type: 'text', required: true, label: 'Photo description' },
      ],
    },
    {
      type: 'collapsible',
      label: 'End of the page',
      fields: [
        { name: 'endingEyebrow', type: 'text', required: true, defaultValue: 'Crochet Simplified' },
        {
          type: 'row',
          fields: [
            {
              name: 'endingTitle',
              type: 'text',
              required: true,
              defaultValue: 'One thread.',
              admin: { width: '40%' },
            },
            {
              name: 'endingAccent',
              type: 'text',
              required: true,
              defaultValue: 'Endless things to make.',
              admin: { width: '60%', description: 'Shown in blue italics.' },
            },
          ],
        },
        {
          name: 'endingText',
          type: 'textarea',
          required: true,
          defaultValue: 'Clear patterns, step by step tutorials and notes from the studio.',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'primaryButton',
              type: 'text',
              required: true,
              defaultValue: 'Browse patterns',
              admin: { width: '50%' },
            },
            {
              name: 'secondaryButton',
              type: 'text',
              required: true,
              defaultValue: 'Read the journal',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
  ],
};
