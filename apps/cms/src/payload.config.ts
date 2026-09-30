import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Articles } from './collections/Articles.ts';
import { Categories } from './collections/Categories.ts';
import { Media } from './collections/Media.ts';
import { Patterns } from './collections/Patterns.ts';
import { Users } from './collections/Users.ts';
import { publishEndpoints } from './endpoints/publish.ts';
import { bodyEditor } from './fields/body.ts';
import { Homepage } from './globals/Homepage.ts';
import { Listings } from './globals/Listings.ts';
import { About, Privacy, Terms } from './globals/Pages.ts';
import { Settings } from './globals/Settings.ts';
import { migrations } from './migrations/index.ts';
import { CMS_ROOT } from './paths.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  serverURL: process.env['ADMIN_URL'] ?? 'http://127.0.0.1:3000',
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' · Crochet Simple admin' },
    dateFormat: 'MMM d, yyyy',
    components: {
      beforeDashboard: ['/components/PublishPanel#PublishPanel'],
      afterNavLinks: ['/components/PublishLink#PublishLink'],
    },
  },
  collections: [Patterns, Categories, Articles, Media, Users],
  globals: [Homepage, Listings, About, Privacy, Terms, Settings],
  editor: bodyEditor,
  endpoints: publishEndpoints,
  secret: process.env['PAYLOAD_SECRET'] ?? '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: sqliteAdapter({
    client: { url: process.env['DATABASE_URL'] ?? `file:${path.join(CMS_ROOT, 'data/cms.db')}` },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  hooks: {
    // production builds drop validation details; restore them so errors show under each field
    afterError: [
      ({ error, result }) => {
        const e = error as Error & { data?: Record<string, unknown>; status?: number };
        const fieldErrors = e.data?.['errors'];
        if (Array.isArray(fieldErrors) && result && !JSON.stringify(result).includes('"data"')) {
          return {
            response: { errors: [{ name: 'ValidationError', data: e.data, message: e.message }] },
            status: e.status ?? 400,
          };
        }
        return undefined;
      },
    ],
  },
  graphQL: { disable: true },
  telemetry: false,
  sharp,
});
