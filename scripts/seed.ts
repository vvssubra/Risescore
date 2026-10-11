// Creates the database, applies migrations and seeds the 14 built-in worksheets + default matching rules (idempotent).
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';

const ctx = createContext(loadConfig());
const n = ctx.db.get<{ n: number }>('SELECT COUNT(*) n FROM toolkits')!.n;
const r = ctx.db.get<{ n: number }>('SELECT COUNT(*) n FROM toolkit_rules')!.n;
console.log(`Database ready at ${ctx.cfg.dbPath}: ${n} toolkits, ${r} matching rules.`);
ctx.close();
