import { rmSync } from 'node:fs';
import { loadConfig } from '../../src/server/config.ts';
import { createContext } from '../../src/server/context.ts';

export const STAFF_PW = 'Correct-Horse-9-battery';

/** Runs before the web server boots: fresh data dir + staff accounts. */
export default async function globalSetup() {
  // webServer starts first and creates the DB; we only add users here (idempotent, WAL-safe).
  const cfg = loadConfig({ NODE_ENV: 'development', DATA_DIR: './test-results/e2e-data', PUBLIC_BASE_URL: 'http://localhost:3100' }, {});
  const ctx = createContext(cfg);
  for (const [email, role] of [['admin@e2e.test', 'admin'], ['reviewer@e2e.test', 'reviewer'], ['editor@e2e.test', 'editor']] as const) {
    if (!ctx.db.get('SELECT 1 FROM users WHERE email=?', email)) await ctx.auth.createUser({ email, name: `E2E ${role}`, role, password: STAFF_PW }, 'e2e');
  }
  ctx.close();
}
void rmSync;
