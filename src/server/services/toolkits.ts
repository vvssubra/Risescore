import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Config } from '../config.ts';
import { sha256Hex } from '../crypto.ts';
import type { Db, Queryable, Row } from '../db.ts';
import type { ObjectStore } from '../storage.ts';
import { audit } from './audit.ts';
import { entitledToolkits } from '../../shared/priorities.ts';
import type { AssessmentResult } from '../../shared/types.ts';
import type { Workbook } from '../../shared/workbook.ts';
import { WORKBOOKS } from '../workbooks.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message); }
}

export type Role = 'admin' | 'reviewer' | 'editor';
export interface Actor { id: string; email: string; role: Role }

const nowIso = () => new Date().toISOString();

/** Admins may rename, re-describe or switch off a toolkit. Which toolkit a report unlocks is fixed by the V4.3 priority rules. */
export const toolkitPatchSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(300),
  minutes: z.string().trim().min(1).max(20),
  active: z.boolean(),
}).partial().strict();

const WORKBOOK_BY_ID: ReadonlyMap<string, Workbook> = new Map(WORKBOOKS.map((w) => [w.id, w]));

/** A toolkit as unlocked by one report: its interactive workbook plus (if published) a PDF. */
export interface PublicToolkit {
  id: string;
  title: string;
  sub: string;
  minutes: string;
  track: string;
  pillar: string;
  workbook: Workbook;
  pdf: { versionId: number; filename: string; sizeBytes: number } | null;
}

export class ToolkitService {
  constructor(private db: Db, private store: ObjectStore, private cfg: Config) {}

  /** Idempotent: inserts the eight V4.3 toolkits (TK01–TK08) if missing. Admin edits to title/description are kept. */
  async seedBuiltins() {
    const t = nowIso();
    await this.db.tx(async (tx) => {
      for (const w of WORKBOOKS) {
        await tx.run(
          `INSERT INTO toolkits (id,title,description,track,pillar,locale,minutes,builtin,sections_json,active,created_at,updated_at)
           VALUES (?,?,?,?,?,'en',?,1,NULL,1,?,?) ON CONFLICT (id) DO NOTHING`,
          w.id, w.title, w.subtitle, w.track, w.pillar, w.minutes, t, t,
        );
      }
    });
  }

  // ---------- reads ----------
  private hydrate(row: Row) {
    return { ...row, builtin: !!row.builtin, active: !!row.active, assignable: WORKBOOK_BY_ID.has(row.id), sections_json: undefined };
  }

  async listAdmin() {
    // Retired pre-V4.3 worksheets stay listed (inactive) so their PDF history remains auditable.
    const rows = await this.db.all('SELECT * FROM toolkits ORDER BY active DESC, id');
    return Promise.all(rows.map(async (r) => ({ ...this.hydrate(r), versions: await this.versions(r.id), currentPdf: await this.currentPdf(r.id) })));
  }

  async getToolkit(id: string) {
    const row = await this.db.get('SELECT * FROM toolkits WHERE id=?', id);
    if (!row) throw new HttpError(404, 'Toolkit not found.', 'not_found');
    return row;
  }

  async versions(toolkitId: string) {
    return (await this.db.all('SELECT * FROM toolkit_versions WHERE toolkit_id=? ORDER BY version DESC', toolkitId)).map((v) => this.clean(v));
  }

  async getVersion(id: number) {
    const v = await this.db.get('SELECT * FROM toolkit_versions WHERE id=?', id);
    if (!v) throw new HttpError(404, 'Version not found.', 'not_found');
    return v;
  }

  /** Version as exposed to the admin API: storage internals (object keys) never leave the server. */
  private clean(v: Row) {
    const { storage_key: _k, ...rest } = v;
    return rest;
  }

  /** Published and not past its review-expiry date. */
  async currentPdf(toolkitId: string): Promise<Row | undefined> {
    return this.db.get(
      `SELECT * FROM toolkit_versions WHERE toolkit_id=? AND status='published' AND (review_expires_at IS NULL OR review_expires_at > ?) ORDER BY version DESC LIMIT 1`,
      toolkitId, nowIso(),
    );
  }

  /**
   * The toolkits a report unlocks: ONLY the 1–2 named by its server-computed priorities, and only while the
   * toolkit is active. Unassigned toolkits are never returned, so there is no public library to browse.
   */
  async forResult(result: AssessmentResult): Promise<PublicToolkit[]> {
    const out: PublicToolkit[] = [];
    for (const id of entitledToolkits(result)) {
      const workbook = WORKBOOK_BY_ID.get(id);
      const t = await this.db.get('SELECT * FROM toolkits WHERE id=? AND active=1', id);
      if (!workbook || !t) continue;
      const pdf = await this.currentPdf(id);
      out.push({
        id, title: t.title, sub: t.description, minutes: t.minutes, track: t.track, pillar: t.pillar, workbook,
        pdf: pdf ? { versionId: pdf.id, filename: pdf.filename, sizeBytes: pdf.size_bytes } : null,
      });
    }
    return out;
  }

  // ---------- writes ----------
  async update(id: string, input: unknown, actor: Actor) {
    const d = toolkitPatchSchema.parse(input);
    const cur = await this.getToolkit(id);
    if (d.active === true && !WORKBOOK_BY_ID.has(id)) throw new HttpError(400, 'Retired worksheets cannot be re-activated: reports only unlock TK01–TK08.', 'retired');
    const next = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as Row;
    await this.db.run(
      'UPDATE toolkits SET title=?, description=?, minutes=?, active=?, updated_at=? WHERE id=?',
      next.title, next.description, next.minutes, typeof d.active === 'boolean' ? (d.active ? 1 : 0) : cur.active, nowIso(), id,
    );
    await audit(this.db, actor.email, 'toolkit.update', 'toolkit', id, d);
    return this.hydrate(await this.getToolkit(id));
  }

  async markComplianceReviewed(id: string, actor: Actor) {
    await this.getToolkit(id);
    await this.db.run('UPDATE toolkits SET compliance_reviewed_at=?, compliance_reviewer=?, updated_at=? WHERE id=?', nowIso(), actor.email, nowIso(), id);
    await audit(this.db, actor.email, 'toolkit.compliance_reviewed', 'toolkit', id);
  }

  async addVersion(toolkitId: string, data: Buffer, filename: string, actor: Actor) {
    await this.getToolkit(toolkitId);
    if (!data.length) throw new HttpError(400, 'Empty file.', 'empty');
    if (data.length > this.cfg.maxPdfBytes) throw new HttpError(413, `PDF is larger than ${Math.round(this.cfg.maxPdfBytes / 1048576)} MB.`, 'too_large');
    if (data.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpError(400, 'File is not a PDF.', 'not_pdf');
    // Basic active-content screen. Compressed object streams can hide these tokens, so reviewers should still scan uploads.
    const head = data.toString('latin1');
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(head)) throw new HttpError(400, 'PDF contains active or embedded content and was rejected.', 'active_content');
    const safeName = filename.replace(/[^\w.\- ]+/g, '_').replace(/\.pdf$/i, '').slice(0, 80).trim() || 'toolkit';
    const sha = sha256Hex(data);
    // Store the bytes first under a random key, then allocate the version number atomically: a per-toolkit advisory lock
    // serialises concurrent uploads so numbers are distinct and gapless. If the insert fails the orphan file is removed.
    const key = `${toolkitId}-${randomBytes(8).toString('hex')}.pdf`;
    await this.store.put(key, data);
    try {
      const row = await this.db.tx(async (tx: Queryable) => {
        await tx.run('SELECT pg_advisory_xact_lock(hashtext(?))', `toolkit-version:${toolkitId}`);
        const r = await tx.run(
          `INSERT INTO toolkit_versions (toolkit_id,version,storage_key,filename,size_bytes,sha256,status,uploaded_by,created_at)
           SELECT ?, COALESCE(MAX(version), 0) + 1, ?, ?, ?, ?, 'draft', ?, ? FROM toolkit_versions WHERE toolkit_id=? RETURNING id, version`,
          toolkitId, key, `${safeName}.pdf`, data.length, sha, actor.id, nowIso(), toolkitId,
        );
        return r.rows[0] as { id: number; version: number };
      });
      await audit(this.db, actor.email, 'toolkit.version_upload', 'toolkit', toolkitId, { version: row.version, sha256: sha });
      return this.clean(await this.getVersion(row.id));
    } catch (e) {
      await this.store.delete(key).catch(() => undefined);
      throw e;
    }
  }

  async submitForReview(versionId: number, actor: Actor) {
    const v = await this.getVersion(versionId);
    if (v.status !== 'draft' && v.status !== 'rejected') throw new HttpError(409, 'Only draft or rejected versions can be submitted.', 'bad_state');
    await this.db.run("UPDATE toolkit_versions SET status='in_review', submitted_at=?, review_note=NULL WHERE id=?", nowIso(), versionId);
    await audit(this.db, actor.email, 'version.submit', 'version', versionId);
    return this.clean(await this.getVersion(versionId));
  }

  /** Reviewer decision. Publishing supersedes any previously published version of the same toolkit. */
  async review(versionId: number, decision: 'publish' | 'reject', note: string | undefined, reviewExpiresAt: string | undefined, actor: Actor) {
    if (actor.role === 'editor') throw new HttpError(403, 'Only reviewers and admins can review.', 'forbidden');
    const v = await this.getVersion(versionId);
    if (v.status !== 'in_review') throw new HttpError(409, 'Version is not awaiting review.', 'bad_state');
    if (this.cfg.requireSeparateReviewer && v.uploaded_by === actor.id) throw new HttpError(403, 'A different person must review this upload (four-eyes rule).', 'separate_reviewer');
    if (decision === 'reject') {
      if (!note?.trim()) throw new HttpError(400, 'A rejection needs a note.', 'note_required');
      await this.db.run("UPDATE toolkit_versions SET status='rejected', reviewed_by=?, reviewed_at=?, review_note=? WHERE id=?", actor.id, nowIso(), note.trim().slice(0, 500), versionId);
    } else {
      if (reviewExpiresAt) {
        const t = Date.parse(reviewExpiresAt);
        if (Number.isNaN(t) || t <= Date.now()) throw new HttpError(400, 'Review expiry must be a future date.', 'bad_date');
      }
      await this.db.tx(async (tx: Queryable) => {
        await tx.run("UPDATE toolkit_versions SET status='archived' WHERE toolkit_id=? AND status='published'", v.toolkit_id);
        await tx.run(
          "UPDATE toolkit_versions SET status='published', reviewed_by=?, reviewed_at=?, review_note=?, review_expires_at=?, published_at=? WHERE id=?",
          actor.id, nowIso(), note?.trim().slice(0, 500) ?? null, reviewExpiresAt ? new Date(reviewExpiresAt).toISOString() : null, nowIso(), versionId,
        );
      });
    }
    await audit(this.db, actor.email, `version.${decision}`, 'version', versionId, { note });
    return this.clean(await this.getVersion(versionId));
  }

  async archiveVersion(versionId: number, actor: Actor) {
    if (actor.role === 'editor') throw new HttpError(403, 'Only reviewers and admins can archive.', 'forbidden');
    const v = await this.getVersion(versionId);
    if (v.status === 'archived') return this.clean(v);
    await this.db.run("UPDATE toolkit_versions SET status='archived' WHERE id=?", versionId);
    await audit(this.db, actor.email, 'version.archive', 'version', versionId);
    return this.clean(await this.getVersion(versionId));
  }

  async deleteVersion(versionId: number, actor: Actor) {
    const v = await this.getVersion(versionId);
    if (!['draft', 'rejected'].includes(v.status)) throw new HttpError(409, 'Only draft or rejected versions can be deleted; archive published ones.', 'bad_state');
    if (actor.role === 'editor' && v.uploaded_by !== actor.id) throw new HttpError(403, 'Editors can only delete their own uploads.', 'forbidden');
    await this.db.run('DELETE FROM toolkit_versions WHERE id=?', versionId);
    await this.store.delete(v.storage_key);
    await audit(this.db, actor.email, 'version.delete', 'version', versionId);
  }

  /** Reads a stored PDF (admin preview / signed download). */
  async readFile(versionId: number) {
    const v = await this.getVersion(versionId);
    return { version: v, data: await this.store.get(v.storage_key) };
  }
}
