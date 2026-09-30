// nightly backup (run by the Mac's scheduler, see setup-mac.sh)
import path from 'node:path';
import { backup } from '../src/publish/backup.ts';
import { BACKUP_DIR, CMS_ROOT, MEDIA_DIR } from '../src/paths.ts';

const url = process.env['DATABASE_URL'] ?? 'file:./data/cms.db';
const result = await backup(
  path.resolve(CMS_ROOT, url.replace(/^file:/, '')),
  MEDIA_DIR,
  BACKUP_DIR,
  'nightly',
);
console.log(`Backup saved: ${result.folder} (${result.files} files)`);
