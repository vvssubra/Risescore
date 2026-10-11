// Exits non-zero while any blocking item stands between this deployment and a public launch.
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';
import { launchReadiness } from '../src/server/readiness.ts';

const ctx = await createContext(loadConfig());
const checks = await launchReadiness(ctx.cfg, ctx.db);
for (const c of checks) console.log(`${c.ok ? '✔' : c.blocking ? '✖' : '!'} ${c.label}${c.ok ? '' : ` — ${c.detail}`}`);
const blocked = checks.filter((c) => !c.ok && c.blocking);
console.log(blocked.length ? `\n${blocked.length} blocking item(s) remain. Do not launch publicly.` : '\nAll blocking launch checks pass.');
await ctx.close();
process.exit(blocked.length ? 1 : 0);
