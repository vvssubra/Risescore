import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/server/app.ts';
import { loadConfig } from '../src/server/config.ts';
import { createContext, type Context } from '../src/server/context.ts';
import { defaultProfile } from '../src/shared/profile.ts';
import { templateAnswers } from '../src/shared/engine.ts';
import type { Answers, Profile } from '../src/shared/types.ts';

export interface TestApp {
  ctx: Context;
  url: string;
  dir: string;
  stop(): Promise<void>;
  /** Raw bytes of the SQLite database (+WAL), to prove nothing sensitive is stored in plaintext. */
  rawDb(): string;
}

export async function startApp(env: Record<string, string> = {}): Promise<TestApp> {
  const dir = mkdtempSync(join(tmpdir(), 'rise-test-'));
  const cfg = loadConfig({ NODE_ENV: 'test', DATA_DIR: dir, PUBLIC_BASE_URL: 'http://localhost:3999', RATE_LIMIT_DISABLED: 'true', ...env }, {});
  const ctx = createContext(cfg);
  const app = createApp(ctx, { clientDir: join(dir, 'none') });
  const server: Server = await new Promise((res) => { const s = app.listen(0, '127.0.0.1', () => res(s)); });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    ctx, url, dir,
    async stop() { await new Promise((r) => server.close(() => r(null))); ctx.close(); rmSync(dir, { recursive: true, force: true }); },
    rawDb() {
      ctx.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      return [cfg.dbPath, cfg.dbPath + '-wal'].filter(existsSync).map((p) => readFileSync(p, 'latin1')).join('\n');
    },
  };
}

export class Client {
  cookie = '';
  csrf = '';
  constructor(public base: string) {}
  async call(method: string, path: string, opts: { json?: unknown; body?: Buffer | string; headers?: Record<string, string>; csrf?: boolean } = {}) {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.json !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers.cookie = this.cookie;
    if (this.csrf && opts.csrf !== false) headers['x-csrf-token'] = this.csrf;
    const res = await fetch(this.base + path, { method, headers, body: opts.json !== undefined ? JSON.stringify(opts.json) : (opts.body as BodyInit | undefined) });
    const sc = res.headers.get('set-cookie');
    if (sc) { const pair = sc.split(';')[0]; this.cookie = pair.endsWith('=') ? '' : pair; }
    const ct = res.headers.get('content-type') ?? '';
    const data = ct.includes('json') ? await res.json().catch(() => null) : ct.includes('text') ? await res.text() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data: data as any, headers: res.headers };
  }
  get = (p: string, o = {}) => this.call('GET', p, o);
  post = (p: string, json?: unknown, o = {}) => this.call('POST', p, { json, ...o });
  put = (p: string, json?: unknown, o = {}) => this.call('PUT', p, { json, ...o });
  patch = (p: string, json?: unknown, o = {}) => this.call('PATCH', p, { json, ...o });
  del = (p: string, o = {}) => this.call('DELETE', p, o);
  async login(email: string, password: string) {
    const r = await this.post('/api/admin/auth/login', { email, password });
    if (r.status === 200) this.csrf = r.data.csrfToken;
    return r;
  }
}

export const PW = 'Correct-Horse-9-battery';
export async function makeUser(ctx: Context, role: 'admin' | 'reviewer' | 'editor', email = `${role}@example.com`) {
  return ctx.auth.createUser({ email, name: `${role} user`, role, password: PW }, null);
}

export const minimalPdf = (extra = '') =>
  Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n${extra}\ntrailer<</Root 1 0 R>>\n%%EOF\n`, 'latin1');

/** A scenario with a critical alert so the full report differs visibly from the preview. */
export function alertScenario(): { profile: Profile; answers: Answers } {
  const profile = { ...defaultProfile('financial'), dependants: 'yes' } as Profile;
  return { profile, answers: { ...templateAnswers(profile, 'high'), f_r1: 'overdue', f_r4: 'gap' } };
}

export const GOOD = { firstName: 'Aisyah', email: 'aisyah.person@example.com' };

export async function submitAssessment(c: Client, sc = alertScenario()) {
  const r = await c.post('/api/assessments', sc);
  return { ...r, sc };
}

export async function requestReport(c: Client, a: { id: string; sessionToken: string }, over: Record<string, unknown> = {}) {
  const cfg = await c.get('/api/config');
  return c.post('/api/report-requests', {
    assessmentId: a.id, sessionToken: a.sessionToken, ...GOOD, processingConsent: true, marketingOptIn: false,
    privacyNoticeVersion: cfg.data.privacyNoticeVersion, locale: 'en', ...over,
  });
}
