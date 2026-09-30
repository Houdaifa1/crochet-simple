import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@crochet-simple/shared'],
  poweredByHeader: false,
  turbopack: { root: path.resolve(dirname, '../..') },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
