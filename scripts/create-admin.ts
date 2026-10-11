// Usage: ADMIN_PASSWORD='...' npm run create-admin -- you@example.com "Your Name" [admin|reviewer|editor]
// If ADMIN_PASSWORD is not set a strong random password is generated, printed once, and a change is forced at first login.
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const [email, name, role = 'admin'] = process.argv.slice(2);
if (!email || !name) { console.error('Usage: npm run create-admin -- <email> "<name>" [admin|reviewer|editor]'); process.exit(2); }
const supplied = process.env.ADMIN_PASSWORD;
const password = supplied ?? `${randomBytes(12).toString('base64url')}Aa1`;
const ctx = createContext(loadConfig());
try {
  const user = await ctx.auth.createUser({ email, name, role, password }, 'cli', !supplied);
  console.log(`Created ${user.role} ${user.email}.`);
  if (!supplied) console.log(`Temporary password (shown once, must be changed at first sign-in): ${password}`);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally { ctx.close(); }
