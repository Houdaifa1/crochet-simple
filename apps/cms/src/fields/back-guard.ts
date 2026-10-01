import type { Field } from 'payload';

// renders nothing; asks before the browser's back button drops unsaved changes
export const backGuard: Field = {
  name: 'backGuard',
  type: 'ui',
  admin: { components: { Field: '/components/BackGuard#BackGuard' } },
};
