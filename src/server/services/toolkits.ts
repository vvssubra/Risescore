import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Config } from '../config.ts';
import { sha256Hex } from '../crypto.ts';
import type { Db, Row } from '../db.ts';
import type { ObjectStore } from '../storage.ts';
import { audit } from './audit.ts';
import { TOOLKIT_TEMPLATES, FALLBACK_TOOLKIT_ID, type WorksheetSection } from '../../shared/toolkit-templates.ts';
import { DEFAULT_RULES, matchToolkitIds, type MatchRule } from '../../shared/toolkit-rules.ts';
import type { AssessmentResult, Profile } from '../../shared/types.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message); }
}

export type Role = 'admin' | 'reviewer' | 'editor';
export interface Actor { id: string; email: string; role: Role }

const GENERIC_SECTIONS: WorksheetSection[] = [
  ['Understand', 'Describe the relevant facts and your present situation.'],
  ['Define', 'Write a specific goal and measure of progress.'],
  ['Consider', 'Compare options, costs, risks and alternatives.'],
  ['Act', 'Write one achievable next action and target date.'],
  ['Review', 'Check results and update your plan.'],
];

const nowIso = () => new Date().toISOString();

const toolkitInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(300),
  track: z.enum(['financial', 'career', 'both']),
  pillar: z.enum(['R', 'I', 'S', 'E']),
  minutes: z.string().trim().min(1).max(20).default('15 min'),
  locale: z.enum(['en', 'ms']).default('en'),
});
export const toolkitCreateSchema = toolkitInput;
export const toolkitPatchSchema = toolkitInput.partial().extend({ active: z.boolean().optional() });

const whenSchema = z.object({
  alert: z.enum(['cash_crisis', 'debt_arrears', 'fragile_buffer', 'dependent_cover', 'investing_essential', 'concentration', 'business_feasibility', 'career_arrears', 'switch_runway', 'sales_authorisation', 'unit_trust_age', 'weak_business_model']).optional(),
  priority: z.enum(['R', 'I', 'S', 'E']).optional(),
  allStrong: z.boolean().optional(),
  goals: z.array(z.string().max(40)).max(12).optional(),
  roles: z.array(z.string().max(40)).max(12).optional(),
  dependants: z.enum(['yes', 'no', 'unsure']).optional(),
}).strict();

export const ruleSchema = z.object({
  toolkitId: z.string().min(1).max(80),
  stage: z.enum(['fallback', 'alert', 'primary', 'profile']),
  track: z.enum(['financial', 'career', 'both']),
  order: z.number().int().min(0).max(1000),
  active: z.boolean().default(true),
  when: whenSchema.default({}),
}).superRefine((r, ctx) => {
  if (r.stage === 'alert' && !r.when.alert) ctx.addIssue({ code: 'custom', message: 'An alert rule needs an alert.', path: ['when', 'alert'] });
  if (r.stage === 'primary' && !r.when.allStrong && !r.when.priority) ctx.addIssue({ code: 'custom', message: 'A primary rule needs a priority pillar or "all strong".', path: ['when'] });
  if (r.stage === 'profile' && !Object.keys(r.when).length) ctx.addIssue({ code: 'custom', message: 'A profile rule needs at least one condition.', path: ['when'] });
});

export interface PublicToolkit {
  id: string;
  title: string;
  sub: string;
  minutes: string;
  track: string;
  pillar: string;
  sections: WorksheetSection[];
  pdf: { versionId: number; filename: string; sizeBytes: number } | null;
}

export class ToolkitService {
  constructor(private db: Db, private store: ObjectStore, private cfg: Config) {}

  /** Idempotent: inserts the 14 built-in worksheets and their default matching rules if missing. */
  seedBuiltins() {
    const t = nowIso();
    this.db.tx(() => {
      for (const k of TOOLKIT_TEMPLATES) {
        this.db.run(
          `INSERT OR IGNORE INTO toolkits (id,title,description,track,pillar,locale,minutes,builtin,sections_json,active,created_at,updated_at)
           VALUES (?,?,?,?,?,'en',?,1,?,1,?,?)`,
          k.id, k.title, k.sub, k.track, k.pillar, k.minutes, JSON.stringify(k.sections), t, t,
        );
      }
      for (const r of DEFAULT_RULES) {
        this.db.run(
          `INSERT OR IGNORE INTO toolkit_rules (id,toolkit_id,stage,track,sort_order,active,when_json,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
          r.id, r.toolkitId, r.stage, r.track, r.order, r.active ? 1 : 0, JSON.stringify(r.when), t,
        );
      }
    });
  }

  // ---------- reads ----------
  private hydrate(row: Row) {
    return { ...row, builtin: !!row.builtin, active: !!row.active, sections: row.sections_json ? (JSON.parse(row.sections_json) as WorksheetSection[]) : null, sections_json: undefined };
  }

  listAdmin() {
    return this.db.all('SELECT * FROM toolkits ORDER BY builtin DESC, title').map((r) => ({
      ...this.hydrate(r),
      versions: this.versions(r.id),
      currentPdf: this.currentPdf(r.id),
    }));
  }

  getToolkit(id: string) {
    const row = this.db.get('SELECT * FROM toolkits WHERE id=?', id);
    if (!row) throw new HttpError(404, 'Toolkit not found.', 'not_found');
    return row;
  }

  versions(toolkitId: string) {
    return this.db.all('SELECT * FROM toolkit_versions WHERE toolkit_id=? ORDER BY version DESC', toolkitId).map((v) => this.clean(v));
  }

  getVersion(id: number) {
    const v = this.db.get('SELECT * FROM toolkit_versions WHERE id=?', id);
    if (!v) throw new HttpError(404, 'Version not found.', 'not_found');
    return v;
  }

  /** Version as exposed to the admin API: storage internals (object keys) never leave the server. */
  private clean(v: Row) {
    const { storage_key: _k, ...rest } = v;
    return rest;
  }

  /** Published and not past its review-expiry date. */
  currentPdf(toolkitId: string): Row | undefined {
    return this.db.get(
      `SELECT * FROM toolkit_versions WHERE toolkit_id=? AND status='published' AND (review_expires_at IS NULL OR review_expires_at > ?) ORDER BY version DESC LIMIT 1`,
      toolkitId, nowIso(),
    );
  }

  /** Toolkits that may be offered to the public right now. */
  availableIds(): Set<string> {
    const ids = new Set<string>();
    for (const t of this.db.all('SELECT id, builtin FROM toolkits WHERE active=1')) {
      if (t.builtin || this.currentPdf(t.id)) ids.add(t.id);
    }
    return ids;
  }

  rules(): MatchRule[] {
    return this.db.all('SELECT * FROM toolkit_rules').map((r) => ({
      id: r.id, toolkitId: r.toolkit_id, stage: r.stage, track: r.track, order: r.sort_order, active: !!r.active, when: JSON.parse(r.when_json),
    }));
  }

  publicView(id: string): PublicToolkit | null {
    const t = this.db.get('SELECT * FROM toolkits WHERE id=? AND active=1', id);
    if (!t) return null;
    const pdf = this.currentPdf(id);
    const sections = t.sections_json ? (JSON.parse(t.sections_json) as WorksheetSection[]) : [];
    if (!t.builtin && !pdf) return null;
    return {
      id: t.id, title: t.title, sub: t.description, minutes: t.minutes, track: t.track, pillar: t.pillar,
      sections: sections.length ? sections : GENERIC_SECTIONS,
      pdf: pdf ? { versionId: pdf.id, filename: pdf.filename, sizeBytes: pdf.size_bytes } : null,
    };
  }

  /** Public library (titles only, published/active). */
  publicLibrary() {
    return [...this.availableIds()].map((id) => this.publicView(id)).filter((x): x is PublicToolkit => !!x)
      .map(({ sections, ...rest }) => ({ ...rest, hasPdf: !!rest.pdf, pdf: undefined }));
  }

  /** Matching: rules (DB) + availability (DB) + the pure shared matcher. Never returns an empty list. */
  matchFor(report: AssessmentResult, profile: Profile): PublicToolkit[] {
    const ids = matchToolkitIds(report, profile, this.rules(), this.availableIds());
    const views = ids.map((id) => this.publicView(id)).filter((x): x is PublicToolkit => !!x);
    if (views.length) return views;
    const fb = TOOLKIT_TEMPLATES.find((t) => t.id === FALLBACK_TOOLKIT_ID)!;
    return [{ id: fb.id, title: fb.title, sub: fb.sub, minutes: fb.minutes, track: fb.track, pillar: fb.pillar, sections: fb.sections, pdf: null }];
  }

  // ---------- writes ----------
  create(input: unknown, actor: Actor) {
    const d = toolkitCreateSchema.parse(input);
    const base = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'toolkit';
    let id = base;
    for (let i = 2; this.db.get('SELECT 1 FROM toolkits WHERE id=?', id); i++) id = `${base}-${i}`;
    const t = nowIso();
    this.db.run(
      `INSERT INTO toolkits (id,title,description,track,pillar,locale,minutes,builtin,sections_json,active,created_by,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,0,NULL,1,?,?,?)`,
      id, d.title, d.description, d.track, d.pillar, d.locale, d.minutes, actor.id, t, t,
    );
    audit(this.db, actor.email, 'toolkit.create', 'toolkit', id);
    return this.hydrate(this.getToolkit(id));
  }

  update(id: string, input: unknown, actor: Actor) {
    const d = toolkitPatchSchema.parse(input);
    const cur = this.getToolkit(id);
    if (cur.builtin && (d.track !== undefined || d.pillar !== undefined)) throw new HttpError(400, 'Built-in toolkits keep their track and pillar.', 'builtin_locked');
    if (d.active === false && id === FALLBACK_TOOLKIT_ID) throw new HttpError(400, 'The safe fallback toolkit cannot be deactivated.', 'fallback_required');
    const next = { ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) } as Row;
    this.db.run(
      'UPDATE toolkits SET title=?, description=?, track=?, pillar=?, minutes=?, locale=?, active=?, updated_at=? WHERE id=?',
      next.title, next.description, next.track, next.pillar, next.minutes, next.locale, typeof d.active === 'boolean' ? (d.active ? 1 : 0) : cur.active, nowIso(), id,
    );
    audit(this.db, actor.email, 'toolkit.update', 'toolkit', id, d);
    return this.hydrate(this.getToolkit(id));
  }

  markComplianceReviewed(id: string, actor: Actor) {
    this.getToolkit(id);
    this.db.run('UPDATE toolkits SET compliance_reviewed_at=?, compliance_reviewer=?, updated_at=? WHERE id=?', nowIso(), actor.email, nowIso(), id);
    audit(this.db, actor.email, 'toolkit.compliance_reviewed', 'toolkit', id);
  }

  async addVersion(toolkitId: string, data: Buffer, filename: string, actor: Actor) {
    this.getToolkit(toolkitId);
    if (!data.length) throw new HttpError(400, 'Empty file.', 'empty');
    if (data.length > this.cfg.maxPdfBytes) throw new HttpError(413, `PDF is larger than ${Math.round(this.cfg.maxPdfBytes / 1048576)} MB.`, 'too_large');
    if (data.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpError(400, 'File is not a PDF.', 'not_pdf');
    // Basic active-content screen. Compressed object streams can hide these tokens, so reviewers should still scan uploads.
    const head = data.toString('latin1');
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(head)) throw new HttpError(400, 'PDF contains active or embedded content and was rejected.', 'active_content');
    const safeName = filename.replace(/[^\w.\- ]+/g, '_').replace(/\.pdf$/i, '').slice(0, 80).trim() || 'toolkit';
    const sha = sha256Hex(data);
    const version = (this.db.get<{ m: number | null }>('SELECT MAX(version) AS m FROM toolkit_versions WHERE toolkit_id=?', toolkitId)?.m ?? 0) + 1;
    const key = `${toolkitId}-v${version}-${randomBytes(6).toString('hex')}.pdf`;
    await this.store.put(key, data);
    const info = this.db.run(
      `INSERT INTO toolkit_versions (toolkit_id,version,storage_key,filename,size_bytes,sha256,status,uploaded_by,created_at) VALUES (?,?,?,?,?,?, 'draft', ?, ?)`,
      toolkitId, version, key, `${safeName}.pdf`, data.length, sha, actor.id, nowIso(),
    );
    audit(this.db, actor.email, 'toolkit.version_upload', 'toolkit', toolkitId, { version, sha256: sha });
    return this.clean(this.getVersion(Number(info.lastInsertRowid)));
  }

  submitForReview(versionId: number, actor: Actor) {
    const v = this.getVersion(versionId);
    if (v.status !== 'draft' && v.status !== 'rejected') throw new HttpError(409, 'Only draft or rejected versions can be submitted.', 'bad_state');
    this.db.run("UPDATE toolkit_versions SET status='in_review', submitted_at=?, review_note=NULL WHERE id=?", nowIso(), versionId);
    audit(this.db, actor.email, 'version.submit', 'version', versionId);
    return this.clean(this.getVersion(versionId));
  }

  /** Reviewer decision. Publishing supersedes any previously published version of the same toolkit. */
  review(versionId: number, decision: 'publish' | 'reject', note: string | undefined, reviewExpiresAt: string | undefined, actor: Actor) {
    if (actor.role === 'editor') throw new HttpError(403, 'Only reviewers and admins can review.', 'forbidden');
    const v = this.getVersion(versionId);
    if (v.status !== 'in_review') throw new HttpError(409, 'Version is not awaiting review.', 'bad_state');
    if (this.cfg.requireSeparateReviewer && v.uploaded_by === actor.id) throw new HttpError(403, 'A different person must review this upload (four-eyes rule).', 'separate_reviewer');
    if (decision === 'reject') {
      if (!note?.trim()) throw new HttpError(400, 'A rejection needs a note.', 'note_required');
      this.db.run("UPDATE toolkit_versions SET status='rejected', reviewed_by=?, reviewed_at=?, review_note=? WHERE id=?", actor.id, nowIso(), note.trim().slice(0, 500), versionId);
    } else {
      if (reviewExpiresAt) {
        const t = Date.parse(reviewExpiresAt);
        if (Number.isNaN(t) || t <= Date.now()) throw new HttpError(400, 'Review expiry must be a future date.', 'bad_date');
      }
      this.db.tx(() => {
        this.db.run("UPDATE toolkit_versions SET status='archived' WHERE toolkit_id=? AND status='published'", v.toolkit_id);
        this.db.run(
          "UPDATE toolkit_versions SET status='published', reviewed_by=?, reviewed_at=?, review_note=?, review_expires_at=?, published_at=? WHERE id=?",
          actor.id, nowIso(), note?.trim().slice(0, 500) ?? null, reviewExpiresAt ? new Date(reviewExpiresAt).toISOString() : null, nowIso(), versionId,
        );
      });
    }
    audit(this.db, actor.email, `version.${decision}`, 'version', versionId, { note });
    return this.clean(this.getVersion(versionId));
  }

  archiveVersion(versionId: number, actor: Actor) {
    if (actor.role === 'editor') throw new HttpError(403, 'Only reviewers and admins can archive.', 'forbidden');
    const v = this.getVersion(versionId);
    if (v.status === 'archived') return this.clean(v);
    this.db.run("UPDATE toolkit_versions SET status='archived' WHERE id=?", versionId);
    audit(this.db, actor.email, 'version.archive', 'version', versionId);
    return this.clean(this.getVersion(versionId));
  }

  async deleteVersion(versionId: number, actor: Actor) {
    const v = this.getVersion(versionId);
    if (!['draft', 'rejected'].includes(v.status)) throw new HttpError(409, 'Only draft or rejected versions can be deleted; archive published ones.', 'bad_state');
    if (actor.role === 'editor' && v.uploaded_by !== actor.id) throw new HttpError(403, 'Editors can only delete their own uploads.', 'forbidden');
    this.db.run('DELETE FROM toolkit_versions WHERE id=?', versionId);
    await this.store.delete(v.storage_key);
    audit(this.db, actor.email, 'version.delete', 'version', versionId);
  }

  upsertRule(id: string | null, input: unknown, actor: Actor): MatchRule {
    const r = ruleSchema.parse(input);
    this.getToolkit(r.toolkitId);
    const ruleId = id ?? `rule-${randomBytes(5).toString('hex')}`;
    if (id && !this.db.get('SELECT 1 FROM toolkit_rules WHERE id=?', id)) throw new HttpError(404, 'Rule not found.', 'not_found');
    this.db.run(
      `INSERT INTO toolkit_rules (id,toolkit_id,stage,track,sort_order,active,when_json,updated_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET toolkit_id=excluded.toolkit_id, stage=excluded.stage, track=excluded.track, sort_order=excluded.sort_order,
         active=excluded.active, when_json=excluded.when_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
      ruleId, r.toolkitId, r.stage, r.track, r.order, r.active ? 1 : 0, JSON.stringify(r.when), actor.email, nowIso(),
    );
    audit(this.db, actor.email, id ? 'rule.update' : 'rule.create', 'rule', ruleId, r);
    return this.rules().find((x) => x.id === ruleId)!;
  }

  deleteRule(id: string, actor: Actor) {
    const info = this.db.run('DELETE FROM toolkit_rules WHERE id=?', id);
    if (!info.changes) throw new HttpError(404, 'Rule not found.', 'not_found');
    audit(this.db, actor.email, 'rule.delete', 'rule', id);
  }

  storageStream(versionId: number) {
    const v = this.getVersion(versionId);
    return { version: v, stream: this.store.stream(v.storage_key) };
  }
}
