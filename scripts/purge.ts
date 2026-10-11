// Applies the retention policy (also runs every 15 minutes inside the server). Safe to run from cron.
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const ctx = createContext(loadConfig());
console.log('Purged:', ctx.reports.purgeExpired());
ctx.close();
