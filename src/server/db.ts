import { mkdirSync } from 'node:fs';
import pg from 'pg';
import type { PGlite } from '@electric-sql/pglite';

export type Row = Record<string, any>;
export interface RunResult { changes: number; rows: Row[] }
type Param = string | number | boolean | null | undefined | Buffer | Uint8Array;

/** Minimal async query surface shared by the pool and by an open transaction. SQL uses `?` placeholders. */
export interface Queryable {
  run(sql: string, ...params: Param[]): Promise<RunResult>;
  get<T = Row>(sql: string, ...params: Param[]): Promise<T | undefined>;
  all<T = Row>(sql: string, ...params: Param[]): Promise<T[]>;
  /** Multi-statement SQL without parameters (migrations). */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  readonly kind: 'postgres' | 'pglite';
  tx<T>(fn: (t: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** `?` → `$1, $2…` (no literal question marks appear inside SQL strings in this codebase). */
export function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
const norm = (p: Param) => (p === undefined ? null : p instanceof Uint8Array && !Buffer.isBuffer(p) ? Buffer.from(p) : p);

function wrap(query: (sql: string, params: unknown[]) => Promise<{ rows: Row[]; changes: number }>, exec: (sql: string) => Promise<void>): Queryable {
  const run = async (sql: string, ...params: Param[]): Promise<RunResult> => query(toPgSql(sql), params.map(norm));
  return {
    run,
    get: async <T>(sql: string, ...params: Param[]) => (await run(sql, ...params)).rows[0] as T | undefined,
    all: async <T>(sql: string, ...params: Param[]) => (await run(sql, ...params)).rows as T[],
    exec,
  };
}

export interface DbOptions {
  /** postgres://… for a real server; omit to use embedded PGlite (development / tests only). */
  url?: string;
  ssl?: 'off' | 'require' | 'verify';
  schema?: string;
  /** PGlite data directory, or "memory://" for an ephemeral in-process database. */
  pglitePath?: string;
  poolMax?: number;
}

const SCHEMA_RE = /^[a-z_][a-z0-9_]{0,40}$/;

export async function openDb(o: DbOptions): Promise<Db> {
  if (o.schema && !SCHEMA_RE.test(o.schema)) throw new Error('DATABASE_SCHEMA must be a simple lower-case identifier.');
  return o.url ? openPg(o) : openPglite(o);
}

async function openPg(o: DbOptions): Promise<Db> {
  pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (COUNT, identity) → JS number
  const ssl = o.ssl === 'require' ? { rejectUnauthorized: false } : o.ssl === 'verify' ? { rejectUnauthorized: true } : o.ssl === 'off' ? false : undefined;
  const base = { connectionString: o.url, ssl, max: o.poolMax ?? 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 };
  if (o.schema) {
    // CREATE SCHEMA IF NOT EXISTS races when several instances boot together, so serialise it with an advisory lock.
    const boot = new pg.Pool({ ...base, max: 1 });
    const c = await boot.connect();
    try {
      await c.query('SELECT pg_advisory_lock(727273)');
      await c.query(`CREATE SCHEMA IF NOT EXISTS "${o.schema}"`);
    } finally { await c.query('SELECT pg_advisory_unlock(727273)').catch(() => undefined); c.release(); await boot.end(); }
  }
  const pool = new pg.Pool({ ...base, ...(o.schema ? { options: `-c search_path=${o.schema}` } : {}) });
  pool.on('error', (e) => console.error('[db] idle client error', e.message));
  const exec = async (sql: string) => { await pool.query(sql); };
  const q = wrap(async (sql, params) => { const r = await pool.query(sql, params as any[]); return { rows: r.rows, changes: r.rowCount ?? 0 }; }, exec);
  return {
    kind: 'postgres', ...q,
    async tx<T>(fn: (t: Queryable) => Promise<T>) {
      const c = await pool.connect();
      const t = wrap(async (sql, params) => { const r = await c.query(sql, params as any[]); return { rows: r.rows, changes: r.rowCount ?? 0 }; }, async (s) => { await c.query(s); });
      try { await c.query('BEGIN'); const out = await fn(t); await c.query('COMMIT'); return out; }
      catch (e) { await c.query('ROLLBACK').catch(() => undefined); throw e; }
      finally { c.release(); }
    },
    async close() { await pool.end(); },
  };
}

async function openPglite(o: DbOptions): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const path = o.pglitePath ?? 'memory://';
  if (!path.startsWith('memory://')) mkdirSync(path, { recursive: true });
  const db: PGlite = new PGlite(path);
  await db.waitReady;
  const mk = (target: Pick<PGlite, 'query' | 'exec'>) =>
    wrap(async (sql, params) => { const r = await target.query<Row>(sql, params as any[]); return { rows: r.rows, changes: r.affectedRows ?? 0 }; }, async (s) => { await target.exec(s); });
  const q = mk(db);
  return {
    kind: 'pglite', ...q,
    tx: <T>(fn: (t: Queryable) => Promise<T>) => db.transaction((t) => fn(mk(t as unknown as PGlite))),
    async close() { await db.close(); },
  };
}

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','reviewer','editor')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip_hash TEXT
);
CREATE TABLE audit_log (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT
);
CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  scorecard_version TEXT NOT NULL,
  track TEXT NOT NULL,
  overall INTEGER,
  priority TEXT,
  alert_count INTEGER NOT NULL DEFAULT 0,
  payload_enc TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_assessments_expires ON assessments(expires_at);
CREATE TABLE report_requests (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  name_enc TEXT NOT NULL,
  email_enc TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  privacy_notice_version TEXT NOT NULL,
  processing_consent_at TEXT NOT NULL,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  marketing_opt_in_at TEXT,
  marketing_notice_version TEXT,
  email_verified_at TEXT,
  status TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_report_requests_email ON report_requests(email_hash);
CREATE INDEX idx_report_requests_expires ON report_requests(expires_at);
CREATE INDEX idx_report_requests_assessment ON report_requests(assessment_id);
CREATE TABLE consent_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('processing','marketing')),
  granted INTEGER NOT NULL,
  notice_version TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE TABLE report_access (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES report_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('report','verify')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT
);
CREATE TABLE report_access_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  access_id TEXT NOT NULL REFERENCES report_access(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  ip_hash TEXT,
  outcome TEXT NOT NULL
);
CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  to_enc TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE toolkits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('financial','career','both')),
  pillar TEXT NOT NULL CHECK (pillar IN ('R','I','S','E')),
  locale TEXT NOT NULL DEFAULT 'en',
  minutes TEXT NOT NULL DEFAULT '15 min',
  builtin INTEGER NOT NULL DEFAULT 0,
  sections_json TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  compliance_reviewed_at TEXT,
  compliance_reviewer TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE toolkit_versions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  toolkit_id TEXT NOT NULL REFERENCES toolkits(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','in_review','published','rejected','archived')),
  uploaded_by TEXT NOT NULL,
  submitted_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  review_expires_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (toolkit_id, version)
);
CREATE TABLE toolkit_rules (
  id TEXT PRIMARY KEY,
  toolkit_id TEXT NOT NULL REFERENCES toolkits(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('fallback','alert','primary','profile')),
  track TEXT NOT NULL CHECK (track IN ('financial','career','both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  when_json TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT,
  updated_at TEXT NOT NULL
);
-- Private object storage for toolkit PDFs (default driver). Keeps the app stateless: no volume or bucket required.
CREATE TABLE files (
  key TEXT PRIMARY KEY,
  data BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
`,
  },
];

/** Applies pending migrations under a transaction-scoped advisory lock so several instances can boot at once. */
export async function migrate(db: Db) {
  await db.tx(async (t) => {
    // Lock FIRST: even CREATE TABLE IF NOT EXISTS is not safe to run concurrently on Postgres.
    await t.run('SELECT pg_advisory_xact_lock(727274)');
    await t.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    const done = new Set((await t.all<{ version: number }>('SELECT version FROM schema_migrations')).map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await t.exec(m.sql);
      await t.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', m.version, new Date().toISOString());
    }
  });
}
