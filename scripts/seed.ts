// Creates the database, applies migrations and seeds the eight V4.3 toolkits TK01–TK08 (idempotent).
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const ctx = await createContext(loadConfig());
const n = (await ctx.db.get<{ n: number }>('SELECT COUNT(*)::int n FROM toolkits WHERE active=1'))!.n;
console.log(`Database ready (${ctx.db.kind}): ${n} active toolkits.`);
await ctx.close();
