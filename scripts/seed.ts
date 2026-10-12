// Creates the database, applies migrations and seeds the 14 built-in worksheets + default matching rules (idempotent).
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const ctx = await createContext(loadConfig());
const n = (await ctx.db.get<{ n: number }>('SELECT COUNT(*)::int n FROM toolkits'))!.n;
const r = (await ctx.db.get<{ n: number }>('SELECT COUNT(*)::int n FROM toolkit_rules'))!.n;
console.log(`Database ready (${ctx.db.kind}): ${n} toolkits, ${r} matching rules.`);
await ctx.close();
