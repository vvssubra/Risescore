/**
 * V4.4 report handover: the prospect taps the green WhatsApp button, the server creates a random,
 * short-lived link to their report, and WhatsApp opens with a prefilled message the prospect must send.
 *
 * The link opens the report ONLY for a signed-in staff member (admin console session). The token is
 * stored hashed, expires after HANDOVER_TTL_HOURS, is replaced when a new one is created, and is deleted
 * with the report (FK cascade) or by the retention purge. WhatsApp cannot attach a PDF, so staff view the
 * report in the console and can save it as PDF from there.
 */
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.ts';
import { decryptField, newToken, sha256Hex } from '../crypto.ts';
import type { Db, Queryable } from '../db.ts';
import { assess } from '../../shared/engine.ts';
import { SCORECARD_VERSION } from '../../shared/questions.ts';
import type { Track } from '../../shared/types.ts';
import { audit } from './audit.ts';
import type { AssessmentService } from './assessments.ts';
import type { FullReport, ReportService } from './reports.ts';
import { HttpError, type Actor } from './toolkits.ts';

const HOUR = 3_600_000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const nowIso = () => new Date().toISOString();
const GONE = () => new HttpError(404, 'This report link is invalid, has expired or was withdrawn.', 'handover_not_found');

export interface HandoverSummary {
  name: string;
  track: Track;
  overall: number | null;
  priorities: string[];
}

export interface HandoverLink {
  url: string;
  expiresAt: string;
  message: string;
  whatsappUrl: string;
}

const TRACK_NAME: Record<Track, string> = { financial: 'Financial', career: 'Career & Income' };

/** The prefilled text. Contains name, score and up to two priority TITLES only — never raw answers. */
export function handoverMessage(advisor: string, s: HandoverSummary, url: string): string {
  const score = s.overall === null ? 'Score needs more information' : `Overall score: ${s.overall}/100`;
  const list = s.priorities.length ? s.priorities.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Priorities available in the report';
  return [
    `Hi ${advisor}, I have completed the R.I.S.E.™ ${TRACK_NAME[s.track]} Scorecard.`,
    `Name: ${s.name}`,
    score,
    'My next priorities:',
    list,
    `Secure report for your review: ${url}`,
    'I would like to discuss my next steps.',
  ].join('\n');
}

export class HandoverService {
  constructor(
    private db: Db,
    private cfg: Config,
    private assessments: AssessmentService,
    private reports: ReportService,
  ) {}

  private async summary(requestId: string): Promise<HandoverSummary> {
    const req = await this.db.get('SELECT * FROM report_requests WHERE id=?', requestId);
    const row = req && (await this.db.get('SELECT * FROM assessments WHERE id=?', req.assessment_id));
    if (!req || !row) throw new HttpError(404, 'Report not found.', 'report_not_found');
    if (row.scorecard_version !== SCORECARD_VERSION) throw new HttpError(410, 'Please take the scorecard again for an up-to-date report.', 'report_outdated');
    const stored = this.assessments.payload(row);
    const result = assess(stored.profile, stored.answers);
    return {
      name: decryptField(this.cfg.encryptionKey, req.name_enc, 'report_requests.name').slice(0, 70),
      track: stored.profile.track,
      overall: result.overall,
      priorities: result.priorities.slice(0, 2).map((p) => p.title.slice(0, 160)),
    };
  }

  /** Called by the prospect (report token holder). Replaces any earlier link for the same report. */
  async create(reportToken: string): Promise<HandoverLink> {
    const req = await this.reports.requestForToken(reportToken);
    const summary = await this.summary(req.id);
    const token = newToken();
    const now = Date.now();
    const expiresAt = new Date(now + this.cfg.handoverTtlHours * HOUR).toISOString();
    await this.db.tx(async (tx: Queryable) => {
      await tx.run('DELETE FROM handover_links WHERE request_id=?', req.id);
      await tx.run(
        'INSERT INTO handover_links (id,request_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)',
        randomUUID(), req.id, sha256Hex(token), new Date(now).toISOString(), expiresAt,
      );
    });
    const url = `${this.cfg.publicBaseUrl}/admin/handover/${token}`;
    const message = handoverMessage(this.cfg.advisorName, summary, url);
    return { url, expiresAt, message, whatsappUrl: `https://wa.me/${this.cfg.whatsappNumber}?text=${encodeURIComponent(message)}` };
  }

  /** Called by the prospect to withdraw the link before it expires. */
  async revoke(reportToken: string): Promise<void> {
    const req = await this.reports.requestForToken(reportToken);
    await this.db.run('DELETE FROM handover_links WHERE request_id=?', req.id);
  }

  /** Staff only (route requires an admin session). Every failure looks the same and reveals nothing. */
  async open(token: string, actor: Actor): Promise<{ report: FullReport; handoverExpiresAt: string }> {
    if (!TOKEN_RE.test(token)) throw GONE();
    const link = await this.db.get('SELECT * FROM handover_links WHERE token_hash=?', sha256Hex(token));
    if (!link || link.revoked_at || link.expires_at <= nowIso()) throw GONE();
    const req = await this.db.get("SELECT * FROM report_requests WHERE id=? AND status='ready' AND expires_at > ?", link.request_id, nowIso());
    if (!req) throw GONE();
    const report = await this.reports.assemble(req, link.expires_at);
    await this.db.run('UPDATE handover_links SET open_count=open_count+1, last_opened_at=?, last_opened_by=? WHERE id=?', nowIso(), actor.email, link.id);
    await audit(this.db, actor.email, 'handover.open', 'report_request', req.id);
    return { report, handoverExpiresAt: link.expires_at };
  }
}
