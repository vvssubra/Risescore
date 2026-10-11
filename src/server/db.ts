import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Row = Record<string, any>;

/** Thin wrapper over node:sqlite (built into Node 22 — no native build step). */
export class Db {
  readonly raw: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.raw = new DatabaseSync(path);
    this.raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  }
  run(sql: string, ...params: SQLInputValue[]) { return this.raw.prepare(sql).run(...params); }
  get<T = Row>(sql: string, ...params: SQLInputValue[]): T | undefined { return this.raw.prepare(sql).get(...params) as T | undefined; }
  all<T = Row>(sql: string, ...params: SQLInputValue[]): T[] { return this.raw.prepare(sql).all(...params) as T[]; }
  exec(sql: string) { this.raw.exec(sql); }
  tx<T>(fn: () => T): T {
    this.raw.exec('BEGIN IMMEDIATE');
    try { const out = fn(); this.raw.exec('COMMIT'); return out; }
    catch (e) { this.raw.exec('ROLLBACK'); throw e; }
  }
  close() { this.raw.close(); }
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

export function migrate(db: Db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set(db.all<{ version: number }>('SELECT version FROM schema_migrations').map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    db.tx(() => {
      db.exec(m.sql);
      db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', m.version, new Date().toISOString());
    });
  }
}
