import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';

export type Row = Record<string, any>;
type Param = string | number | boolean | null;

// COUNT(*)/SUM() come back as int8 (string by default); every count in this app is far below 2^53.
pg.types.setTypeParser(20, (v) => Number(v));

/** SQL uses `?` placeholders (kept from the original code); translate to $1, $2… outside string literals. */
export function toPg(sql: string): string {
  let out = '';
  let n = 0;
  let quoted = false;
  for (const ch of sql) {
    if (ch === "'") quoted = !quoted;
    out += ch === '?' && !quoted ? `$${++n}` : ch;
  }
  return out;
}

export interface DbOptions {
  /** Isolate everything in this schema (tests, previews). Created if missing. Default: the connection's default schema. */
  schema?: string;
  max?: number;
}

/**
 * Thin async wrapper over a pg Pool. Inside `tx()` every call on this object automatically uses the
 * transaction's connection (AsyncLocalStorage), so services never pass a client around.
 */
export class Db {
  private tx_ = new AsyncLocalStorage<pg.PoolClient>();
  private constructor(readonly pool: pg.Pool, readonly schema?: string) {}

  static async connect(url: string, opts: DbOptions = {}): Promise<Db> {
    const schema = opts.schema;
    if (schema && !/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('DB_SCHEMA must match [a-z_][a-z0-9_]*.');
    if (schema) {
      const boot = new pg.Pool({ connectionString: url, max: 1 });
      try { await boot.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`); } finally { await boot.end(); }
    }
    const pool = new pg.Pool({
      connectionString: url,
      max: opts.max ?? 10,
      idleTimeoutMillis: 30_000,
      ...(schema ? { options: `-c search_path=${schema}` } : {}),
    });
    pool.on('error', (e) => console.error('[db] idle client error', e.message)); // a dropped idle connection must not crash the process
    const db = new Db(pool, schema);
    await db.get('SELECT 1'); // fail fast with a clear error if the URL is wrong
    return db;
  }

  private q(sql: string, params: Param[]) {
    const client = this.tx_.getStore();
    return (client ?? this.pool).query(toPg(sql), params);
  }
  async run(sql: string, ...params: Param[]) { const r = await this.q(sql, params); return { changes: r.rowCount ?? 0 }; }
  async get<T = Row>(sql: string, ...params: Param[]): Promise<T | undefined> { return (await this.q(sql, params)).rows[0] as T | undefined; }
  async all<T = Row>(sql: string, ...params: Param[]): Promise<T[]> { return (await this.q(sql, params)).rows as T[]; }
  /** Multi-statement script, no parameters. */
  async exec(sql: string) { await (this.tx_.getStore() ?? this.pool).query(sql); }

  /** Runs fn in a transaction; nested calls join the outer one. Rolls back on any error. */
  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.tx_.getStore()) return fn();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out = await this.tx_.run(client, fn);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  async close() { await this.pool.end(); }
  /** Tests only: remove the isolated schema. */
  async dropSchema() { if (this.schema) await this.pool.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`); }
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
`,
  },
];

export async function migrate(db: Db) {
  await db.tx(async () => {
    await db.exec('SELECT pg_advisory_xact_lock(727274)'); // several instances may boot at once; one migrates, the rest wait
    await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    const done = new Set((await db.all<{ version: number }>('SELECT version FROM schema_migrations')).map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await db.exec(m.sql);
      await db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', m.version, new Date().toISOString());
    }
  });
}
