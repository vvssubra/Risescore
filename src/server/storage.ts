import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

/**
 * Private object storage for toolkit PDFs. Files are never served from a public directory:
 * every download goes through an authenticated route or a short-lived signed URL.
 * Swap `LocalObjectStore` for an S3/GCS adapter that implements this interface for multi-instance deployments.
 */
export interface ObjectStore {
  put(key: string, data: Buffer): Promise<void>;
  stream(key: string): Readable | null;
  delete(key: string): Promise<void>;
}

export class LocalObjectStore implements ObjectStore {
  private root: string;
  constructor(root: string) {
    this.root = resolve(root);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
  }
  private path(key: string) {
    if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error('Invalid storage key.');
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('Invalid storage key.');
    return p;
  }
  async put(key: string, data: Buffer) { writeFileSync(this.path(key), data, { mode: 0o600 }); }
  stream(key: string) { const p = this.path(key); return existsSync(p) ? createReadStream(p) : null; }
  async delete(key: string) { const p = this.path(key); if (existsSync(p)) unlinkSync(p); }
}
