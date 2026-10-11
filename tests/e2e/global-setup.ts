import { rmSync } from 'node:fs';
import { loadConfig } from '../../src/server/config.ts';
import { createContext } from '../../src/server/context.ts';

export const STAFF_PW = 'Correct-Horse-9-battery';

/** Runs before the web server boots: fresh data dir + staff accounts. */
export default async function globalSetup() {
  // webServer starts first and migrates the schema; we only add users here (idempotent).
  const cfg = loadConfig({ NODE_ENV: 'development', DATA_DIR: './test-results/e2e-data', PUBLIC_BASE_URL: 'http://localhost:3100', DATABASE_URL: process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/rise_test', DB_SCHEMA: process.env.E2E_SCHEMA }, {});
  const ctx = await createContext(cfg);
  for (const [email, role] of [['admin@e2e.test', 'admin'], ['reviewer@e2e.test', 'reviewer'], ['editor@e2e.test', 'editor']] as const) {
    if (!(await ctx.db.get('SELECT 1 FROM users WHERE email=?', email))) await ctx.auth.createUser({ email, name: `E2E ${role}`, role, password: STAFF_PW }, 'e2e');
  }
  await ctx.close();
}
void rmSync;
