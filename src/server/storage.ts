import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { Db } from './db.ts';

/**
 * Private object storage for toolkit PDFs. Files are never served from a public directory:
 * every download goes through an authenticated route or a short-lived signed URL.
 */
export interface ObjectStore {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const KEY_RE = /^[A-Za-z0-9._-]+$/;

/** Default: PDFs live in Postgres (bytea) next to the metadata, so backups are one thing and the app server holds no state. */
export class DbObjectStore implements ObjectStore {
  constructor(private db: Db) {}
  async put(key: string, data: Buffer) {
    if (!KEY_RE.test(key)) throw new Error('Invalid storage key.');
    await this.db.run('INSERT INTO files (key, data, size_bytes, created_at) VALUES (?,?,?,?) ON CONFLICT (key) DO UPDATE SET data=excluded.data, size_bytes=excluded.size_bytes', key, data, data.length, new Date().toISOString());
  }
  async get(key: string) {
    const row = await this.db.get<{ data: Uint8Array }>('SELECT data FROM files WHERE key=?', key);
    return row ? Buffer.from(row.data) : null;
  }
  async delete(key: string) { await this.db.run('DELETE FROM files WHERE key=?', key); }
}

/** Optional (STORAGE_DRIVER=fs): files on a mounted disk. */
export class LocalObjectStore implements ObjectStore {
  private root: string;
  constructor(root: string) {
    this.root = resolve(root);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
  }
  private path(key: string) {
    if (!KEY_RE.test(key)) throw new Error('Invalid storage key.');
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('Invalid storage key.');
    return p;
  }
  async put(key: string, data: Buffer) { writeFileSync(this.path(key), data, { mode: 0o600 }); }
  async get(key: string) { const p = this.path(key); return existsSync(p) ? readFileSync(p) : null; }
  async delete(key: string) { const p = this.path(key); if (existsSync(p)) unlinkSync(p); }
}
