// Applies migrations to DATABASE_URL and seeds the 14 built-in worksheets + default matching rules (idempotent).
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const ctx = await createContext(loadConfig());
const n = (await ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM toolkits'))!.n;
const r = (await ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM toolkit_rules'))!.n;
console.log(`Database ready: ${n} toolkits, ${r} matching rules.`);
await ctx.close();
