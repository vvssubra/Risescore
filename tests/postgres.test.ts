import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/server/config.ts';
import { createContext } from '../src/server/context.ts';
import { decryptField } from '../src/server/crypto.ts';
import { migrate, openDb } from '../src/server/db.ts';
import { Client, PW, TEST_DB_URL, makeUser, minimalPdf, requestReport, startApp, submitAssessment, type TestApp } from './server-helpers.ts';

let app: TestApp;
beforeAll(async () => { app = await startApp({ REPORT_ACCESS_MODE: 'email_verified' }); });
afterAll(async () => { await app.stop(); });

describe(`database layer (${TEST_DB_URL ? 'real Postgres server' : 'embedded Postgres'})`, () => {
  it('reports its kind and runs on Postgres SQL', async () => {
    expect(app.ctx.db.kind).toBe(TEST_DB_URL ? 'postgres' : 'pglite');
    expect((await app.ctx.db.get<{ v: string }>('SELECT version() v'))!.v).toMatch(/PostgreSQL/);
    expect((await app.ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM toolkits'))!.n).toBe(8); // bigint comes back as a JS number
  });

  it('migrations are idempotent', async () => {
    await migrate(app.ctx.db);
    await migrate(app.ctx.db);
    expect((await app.ctx.db.all('SELECT version FROM schema_migrations')).length).toBe(2);
  });

  it('transactions roll back completely on error', async () => {
    await expect(app.ctx.db.tx(async (t) => {
      await t.run("INSERT INTO audit_log (at, action) VALUES ('2026-01-01', 'tx.probe')");
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(await app.ctx.db.get("SELECT 1 AS x FROM audit_log WHERE action='tx.probe'")).toBeUndefined();
  });

  it('a one-time verification link can only be redeemed once, even when opened twice at the same moment', async () => {
    const c = new Client(app.url);
    const a = (await submitAssessment(c)).data;
    await requestReport(c, a, { email: 'race@example.com' });
    const row = (await app.ctx.db.all('SELECT * FROM outbox ORDER BY created_at DESC'))[0];
    const token = decryptField(app.ctx.cfg.encryptionKey, row.body_enc, 'outbox.body').match(/\/report\/verify\/([\w-]+)/)![1];
    const results = await Promise.all([c.post('/api/reports/verify', { token }), c.post('/api/reports/verify', { token })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 410]);
    expect((await app.ctx.db.get<{ n: number }>("SELECT COUNT(*)::int AS n FROM report_access WHERE kind='report'"))!.n).toBe(1);
  });

  it('concurrent PDF uploads get distinct, gapless version numbers', async () => {
    await makeUser(app.ctx, 'admin');
    const admin = new Client(app.url);
    expect((await admin.login('admin@example.com', PW)).status).toBe(200);
    const up = (n: number) => admin.call('PUT', '/api/admin/toolkits/TK04/versions', { body: minimalPdf(`% concurrent ${n}`), headers: { 'content-type': 'application/pdf', 'x-filename': `c${n}.pdf` } });
    const rs = await Promise.all([1, 2, 3, 4].map(up));
    expect(rs.every((r) => r.status === 201)).toBe(true);
    expect(rs.map((r) => r.data.version).sort()).toEqual([1, 2, 3, 4]);
  });

  it('stores PDFs in the database (no filesystem state) and serves exactly the bytes uploaded', async () => {
    const files = await app.ctx.db.all<{ key: string; size_bytes: number }>('SELECT key, size_bytes FROM files');
    expect(files.length).toBeGreaterThanOrEqual(4);
    const v = (await app.ctx.db.get<{ id: number; storage_key: string }>('SELECT id, storage_key FROM toolkit_versions ORDER BY id LIMIT 1'))!;
    const admin = new Client(app.url);
    await admin.login('admin@example.com', PW);
    const got = await admin.get(`/api/admin/versions/${v.id}/file`);
    expect(Buffer.isBuffer(got.data) && got.data.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await app.ctx.store.get(v.storage_key))!.length).toBe(got.data.length);
    expect(await app.ctx.store.get('nope.pdf')).toBeNull();
    await expect(app.ctx.store.put('../evil', Buffer.from('x'))).rejects.toThrow(/Invalid storage key/);
  });

  it('deleting a draft removes its stored file', async () => {
    const admin = new Client(app.url);
    await admin.login('admin@example.com', PW);
    const up = await admin.call('PUT', '/api/admin/toolkits/TK04/versions', { body: minimalPdf('% to delete'), headers: { 'content-type': 'application/pdf' } });
    const key = (await app.ctx.db.get<{ storage_key: string }>('SELECT storage_key FROM toolkit_versions WHERE id=?', up.data.id))!.storage_key;
    expect(await app.ctx.store.get(key)).not.toBeNull();
    expect((await admin.del(`/api/admin/versions/${up.data.id}`)).status).toBe(204);
    expect(await app.ctx.store.get(key)).toBeNull();
  });
});

describe('bootstrap admin (no shell needed on the host)', () => {
  it('creates the first admin from env once, forces a password change, and never overwrites later', async () => {
    const b = await startApp({ BOOTSTRAP_ADMIN_EMAIL: 'first@example.com', BOOTSTRAP_ADMIN_PASSWORD: 'Bootstrap-Pass-12345', BOOTSTRAP_ADMIN_NAME: 'First Admin' });
    try {
      const c = new Client(b.url);
      const r = await c.login('first@example.com', 'Bootstrap-Pass-12345');
      expect(r.status).toBe(200);
      expect(r.data.user.role).toBe('admin');
      expect(r.data.user.mustChangePassword).toBe(true);
      await b.ctx.auth.bootstrapAdmin({ email: 'second@example.com', password: 'Another-Pass-123456', name: 'X' });
      expect((await b.ctx.db.get<{ n: number }>("SELECT COUNT(*)::int AS n FROM users"))!.n).toBe(1);
    } finally { await b.stop(); }
  });
});

describe('configuration safety', () => {
  it('production refuses to start without DATABASE_URL (embedded DB is development-only)', () => {
    const env = { NODE_ENV: 'production', DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), SIGNING_SECRET: 'x'.repeat(40), PUBLIC_BASE_URL: 'https://x.example', DATA_DIR: app.dir };
    expect(() => loadConfig(env, {})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...env, DATABASE_URL: 'mysql://nope' }, {})).toThrow();
    expect(loadConfig({ ...env, DATABASE_URL: 'postgres://u:p@h:5432/db' }, {}).databaseUrl).toContain('postgres://');
  });
  it('rejects unsafe schema names', async () => {
    await expect(openDb({ url: 'postgres://u@localhost:1/x', schema: 'a"; DROP TABLE users;--' })).rejects.toThrow(/DATABASE_SCHEMA/);
  });
});

describe.skipIf(!TEST_DB_URL)('real Postgres: concurrent boots', () => {
  it('several instances can start and migrate at once (advisory lock)', async () => {
    const schema = `boot_${Date.now().toString(36)}`;
    const mk = () => createContext(loadConfig({ NODE_ENV: 'test', DATA_DIR: app.dir, DATABASE_URL: TEST_DB_URL, DATABASE_SCHEMA: schema, DATABASE_POOL_MAX: '3', PUBLIC_BASE_URL: 'http://localhost:3999' }, {}));
    const ctxs = await Promise.all([mk(), mk(), mk()]);
    try {
      expect((await ctxs[0].db.get<{ n: number }>('SELECT COUNT(*)::int n FROM toolkits'))!.n).toBe(8);
    } finally {
      await ctxs[0].db.exec(`DROP SCHEMA "${schema}" CASCADE`);
      await Promise.all(ctxs.map((c) => c.close()));
    }
  });
});
