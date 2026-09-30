import path from 'node:path';
import { fileURLToPath } from 'node:url';

// every place the admin reads or writes; tests point these at temporary folders
const here = path.dirname(fileURLToPath(import.meta.url));
export const CMS_ROOT = path.resolve(here, '..');
export const REPO_ROOT = path.resolve(CMS_ROOT, '../..');
export const WEB_ROOT = path.join(REPO_ROOT, 'apps/web');

const fromEnv = (name: string, fallback: string): string =>
  process.env[name] ? path.resolve(CMS_ROOT, process.env[name]!) : fallback;

export const MEDIA_DIR = fromEnv('MEDIA_DIR', path.join(CMS_ROOT, 'media'));
export const DATA_DIR = fromEnv('DATA_DIR', path.join(CMS_ROOT, 'data'));
export const CONTENT_DIR = fromEnv('CONTENT_OUT', path.join(WEB_ROOT, '.content'));
export const SITE_OUT = fromEnv('SITE_OUT', path.join(WEB_ROOT, 'dist'));
export const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(process.env.HOME ?? CMS_ROOT, 'Crochet Simple Backups');
