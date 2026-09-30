import type { Field } from 'payload';

// these addresses belong to the pattern list pages
const RESERVED = new Set(['free', 'page', 'category']);

export const slugify = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

export function slugField(from: string): Field {
  return {
    name: 'slug',
    type: 'text',
    label: 'Web address',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Filled in from the title. Changing it later breaks old links, so set it once.',
    },
    hooks: {
      beforeValidate: [
        ({ value, siblingData }) =>
          value ? slugify(String(value)) : slugify(String(siblingData?.[from] ?? '')),
      ],
    },
    validate: (value: unknown) => {
      if (typeof value !== 'string' || !value)
        return 'Add a title first; the address is made from it.';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
        return 'Use lowercase letters, numbers and hyphens only.';
      if (RESERVED.has(value))
        return `"${value}" is used by the site itself; please choose another.`;
      return true;
    },
  };
}
