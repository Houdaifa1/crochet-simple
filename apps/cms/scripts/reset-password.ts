// usage: pnpm --filter @crochet-simple/cms reset-password <username> <new password>
import { getPayload } from 'payload';
import config from '../src/payload.config.ts';

const [username, password] = process.argv.slice(-2);
if (!username || !password || password.length < 10) {
  console.error('Give a username and a new password of at least 10 characters.');
  process.exit(1);
}
const payload = await getPayload({ config });
const found = await payload.find({
  collection: 'users',
  where: { username: { equals: username } },
  limit: 1,
});
const user = found.docs[0];
if (!user) {
  console.error(`No admin user called "${username}".`);
  process.exit(1);
}
await payload.update({
  collection: 'users',
  id: user.id,
  data: { password, loginAttempts: 0, lockUntil: null },
});
console.log(`Password changed for ${username}.`);
process.exit(0);
