import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Admin user', plural: 'Admin users' },
  admin: { useAsTitle: 'username', group: 'Settings' },
  auth: {
    loginWithUsername: { allowEmailLogin: false, requireEmail: false },
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 24 * 14,
  },
  fields: [],
};
