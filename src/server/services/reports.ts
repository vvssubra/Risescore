import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Config } from '../config.ts';
import { decryptField, encryptField, hmacB64u, newToken, safeEqual, sha256Hex } from '../crypto.ts';
import type { Db, Queryable, Row } from '../db.ts';
import type { Mailer } from '../mailer.ts';
import { assess } from '../../shared/engine.ts';
import { MARKETING_NOTICE_VERSION, PRIVACY_NOTICE_VERSION, type Locale } from '../../shared/legal.ts';
import type { AssessmentResult } from '../../shared/types.ts';
import { AssessmentService } from './assessments.ts';
import { audit } from './audit.ts';
import { HttpError, ToolkitService, type PublicToolkit } from './toolkits.ts';

const DAY = 86_400_000;
const nowIso = () => new Date().toISOString();

export const reportRequestSchema = z.object({
  assessmentId: z.string().uuid(),
  sessionToken: z.string().min(20).max(100),
  firstName: z.string().trim().min(1).max(70).refine((s) => !/[<>]/.test(s), 'Invalid characters in name.'),
  email: z.string().trim().toLowerCase().email().max(254),
  processingConsent: z.literal(true, { errorMap: () => ({ message: 'Processing consent is required to create your report.' }) }),
  marketingOptIn: z.boolean().default(false),
  privacyNoticeVersion: z.string().max(50),
  locale: z.enum(['en', 'ms']).default('en'),
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(200).optional(),
});

export interface FullReport {
  generatedAt: string;
  expiresAt: string;
  firstName: string;
  profile: { track: string; goal: string };
  result: AssessmentResult;
  toolkits: (Omit<PublicToolkit, 'pdf'> & { pdf: { url: string; filename: string; sizeBytes: number } | null })[];
  consent: { marketingOptIn: boolean };
  whatsapp: { number: string };
}

export class ReportService {
  constructor(
    private db: Db,
    private cfg: Config,
    private assessments: AssessmentService,
    private toolkits: ToolkitService,
    private mailer: Mailer,
  ) {}

  // ---------- signed file links ----------
  signFileUrl(versionId: number): string {
    const exp = Math.floor(Date.now() / 1000) + this.cfg.signedUrlTtlSeconds;
    return `/api/files/${versionId}?exp=${exp}&sig=${hmacB64u(this.cfg.signingSecret, `file:${versionId}:${exp}`)}`;
  }
  verifyFileSignature(versionId: number, exp: string, sig: string): boolean {
    const e = Number(exp);
    if (!Number.isInteger(e) || e < Math.floor(Date.now() / 1000)) return false;
    return safeEqual(sig, hmacB64u(this.cfg.signingSecret, `file:${versionId}:${e}`));
  }

  // ---------- gate ----------
  async request(input: unknown, ipHash: string) {
    void ipHash;
    const d = reportRequestSchema.parse(input);
    if (d.website) {
      // Honeypot tripped: pretend success without storing anything.
      return { status: 'pending_verification' as const, honeypot: true as const };
    }
    if (d.privacyNoticeVersion !== PRIVACY_NOTICE_VERSION) throw new HttpError(409, 'The privacy notice has been updated. Please reload the page and review it.', 'notice_outdated');
    const a = await this.assessments.authorise(d.assessmentId, d.sessionToken);
    const now = Date.now();
    const created = new Date(now).toISOString();
    const expires = new Date(now + this.cfg.reportRetentionDays * DAY).toISOString();
    const requestId = randomUUID();
    const immediate = this.cfg.reportAccessMode === 'immediate';
    const token = newToken();
    const tokenExpires = new Date(now + (immediate ? this.cfg.reportTtlDays * DAY : DAY)).toISOString();

    await this.db.tx(async (tx: Queryable) => {
      await tx.run('DELETE FROM report_requests WHERE assessment_id=?', a.id); // one live request per assessment
      await tx.run(
        `INSERT INTO report_requests (id,assessment_id,name_enc,email_enc,email_hash,locale,privacy_notice_version,processing_consent_at,marketing_opt_in,marketing_opt_in_at,marketing_notice_version,email_verified_at,status,created_at,expires_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        requestId, a.id,
        encryptField(this.cfg.encryptionKey, d.firstName, 'report_requests.name'),
        encryptField(this.cfg.encryptionKey, d.email, 'report_requests.email'),
        hmacB64u(this.cfg.signingSecret, `email:${d.email}`),
        d.locale, d.privacyNoticeVersion, created,
        d.marketingOptIn ? 1 : 0, d.marketingOptIn ? created : null, d.marketingOptIn ? MARKETING_NOTICE_VERSION : null,
        null, immediate ? 'ready' : 'pending_verification', created, expires,
      );
      await tx.run('INSERT INTO consent_events (request_id,kind,granted,notice_version,at) VALUES (?,?,?,?,?)', requestId, 'processing', 1, d.privacyNoticeVersion, created);
      await tx.run('INSERT INTO consent_events (request_id,kind,granted,notice_version,at) VALUES (?,?,?,?,?)', requestId, 'marketing', d.marketingOptIn ? 1 : 0, MARKETING_NOTICE_VERSION, created);
      await tx.run(
        'INSERT INTO report_access (id,request_id,token_hash,kind,expires_at,created_at) VALUES (?,?,?,?,?,?)',
        randomUUID(), requestId, sha256Hex(token), immediate ? 'report' : 'verify', tokenExpires, created,
      );
      await tx.run('UPDATE assessments SET expires_at=? WHERE id=?', expires, a.id); // keep the answers as long as the report request
    });

    const link = immediate ? `${this.cfg.publicBaseUrl}/report/${token}` : `${this.cfg.publicBaseUrl}/report/verify/${token}`;
    await this.mailer.enqueue({ to: d.email, subject: emailSubject(d.locale, immediate), text: emailBody(d.locale, d.firstName, link, immediate, this.cfg.reportTtlDays) });
    void this.mailer.flush().catch(() => undefined);

    return immediate
      ? { status: 'ready' as const, reportToken: token, reportPath: `/report/${token}`, expiresAt: tokenExpires }
      : { status: 'pending_verification' as const };
  }

  /** email_verified mode: the emailed one-time link proves control of the address, then issues the report token. */
  async verifyEmail(token: string) {
    const acc = await this.db.get("SELECT * FROM report_access WHERE token_hash=? AND kind='verify'", sha256Hex(token));
    if (!acc || acc.revoked_at || acc.expires_at < nowIso()) throw new HttpError(410, 'This confirmation link is invalid or has expired. Please request your report again.', 'link_expired');
    const reportToken = newToken();
    const t = nowIso();
    await this.db.tx(async (tx: Queryable) => {
      // Single-use: only the request that flips revoked_at from NULL wins, even if the link is opened twice at once.
      const won = await tx.run('UPDATE report_access SET revoked_at=? WHERE id=? AND revoked_at IS NULL', t, acc.id);
      if (!won.changes) throw new HttpError(410, 'This confirmation link is invalid or has expired. Please request your report again.', 'link_expired');
      await tx.run("UPDATE report_requests SET email_verified_at=?, status='ready' WHERE id=?", t, acc.request_id);
      await tx.run('INSERT INTO report_access (id,request_id,token_hash,kind,expires_at,created_at) VALUES (?,?,?,?,?,?)',
        randomUUID(), acc.request_id, sha256Hex(reportToken), 'report', new Date(Date.now() + this.cfg.reportTtlDays * DAY).toISOString(), t);
    });
    return { reportToken, reportPath: `/report/${reportToken}` };
  }

  // ---------- report ----------
  private async lookup(token: string, opts: { allowExpired?: boolean } = {}): Promise<{ acc: Row; req: Row }> {
    const acc = await this.db.get("SELECT * FROM report_access WHERE token_hash=? AND kind='report'", sha256Hex(token));
    if (!acc) throw new HttpError(404, 'Report not found.', 'report_not_found');
    const req = await this.db.get('SELECT * FROM report_requests WHERE id=?', acc.request_id);
    if (!req) throw new HttpError(404, 'Report not found.', 'report_not_found');
    if (acc.revoked_at || req.status !== 'ready') {
      await this.event(acc.id, null, 'denied_revoked');
      throw new HttpError(410, 'This report link is no longer active.', 'link_revoked');
    }
    if (!opts.allowExpired && acc.expires_at < nowIso()) {
      await this.event(acc.id, null, 'denied_expired');
      throw new HttpError(410, 'This report link has expired. You can retake the scorecard to get a new report.', 'link_expired');
    }
    return { acc, req };
  }

  private async event(accessId: string, ipHash: string | null, outcome: string) {
    await this.db.run('INSERT INTO report_access_events (access_id,at,ip_hash,outcome) VALUES (?,?,?,?)', accessId, nowIso(), ipHash, outcome);
  }

  async getReport(token: string, ipHash: string): Promise<FullReport> {
    const { acc, req } = await this.lookup(token);
    const row = await this.db.get('SELECT * FROM assessments WHERE id=?', req.assessment_id);
    if (!row) throw new HttpError(404, 'Report not found.', 'report_not_found');
    const stored = this.assessments.payload(row);
    const result = assess(stored.profile, stored.answers); // recalculated on every read — never trusted from the client
    const toolkits = (await this.toolkits.matchFor(result, stored.profile)).map((k) => ({
      ...k, pdf: k.pdf ? { url: this.signFileUrl(k.pdf.versionId), filename: k.pdf.filename, sizeBytes: k.pdf.sizeBytes } : null,
    }));
    await this.db.run('UPDATE report_access SET use_count=use_count+1, last_used_at=? WHERE id=?', nowIso(), acc.id);
    await this.event(acc.id, ipHash, 'ok');
    return {
      generatedAt: nowIso(), expiresAt: acc.expires_at,
      firstName: decryptField(this.cfg.encryptionKey, req.name_enc, 'report_requests.name'),
      profile: { track: stored.profile.track, goal: stored.profile.goal },
      result, toolkits, consent: { marketingOptIn: !!req.marketing_opt_in }, whatsapp: { number: this.cfg.whatsappNumber },
    };
  }

  /** Right to erasure from inside the report. Works even after the link has expired. */
  async eraseByToken(token: string) {
    const { req } = await this.lookup(token, { allowExpired: true });
    await this.db.tx(async (tx: Queryable) => {
      await tx.run('DELETE FROM consent_events WHERE request_id=?', req.id);
      await tx.run('DELETE FROM report_requests WHERE id=?', req.id);
      await tx.run('DELETE FROM assessments WHERE id=?', req.assessment_id);
    });
    await audit(this.db, null, 'report.erased_by_subject', 'report_request', req.id);
  }

  async setMarketing(token: string, optIn: boolean) {
    const { req } = await this.lookup(token);
    const t = nowIso();
    await this.db.tx(async (tx: Queryable) => {
      await tx.run('UPDATE report_requests SET marketing_opt_in=?, marketing_opt_in_at=?, marketing_notice_version=? WHERE id=?', optIn ? 1 : 0, optIn ? t : null, MARKETING_NOTICE_VERSION, req.id);
      await tx.run('INSERT INTO consent_events (request_id,kind,granted,notice_version,at) VALUES (?,?,?,?,?)', req.id, 'marketing', optIn ? 1 : 0, MARKETING_NOTICE_VERSION, t);
    });
    return { marketingOptIn: optIn };
  }

  // ---------- admin: leads ----------
  async listLeads(limit = 100, offset = 0) {
    const rows = await this.db.all(
      `SELECT r.*, a.track, a.overall, a.priority, a.alert_count FROM report_requests r JOIN assessments a ON a.id=r.assessment_id ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      limit, offset,
    );
    return rows.map((r) => ({
      id: r.id, name: decryptField(this.cfg.encryptionKey, r.name_enc, 'report_requests.name'), email: decryptField(this.cfg.encryptionKey, r.email_enc, 'report_requests.email'),
      track: r.track, overall: r.overall, priority: r.priority, alertCount: r.alert_count, locale: r.locale, status: r.status,
      marketingOptIn: !!r.marketing_opt_in, marketingOptInAt: r.marketing_opt_in_at, privacyNoticeVersion: r.privacy_notice_version,
      emailVerified: !!r.email_verified_at, createdAt: r.created_at, expiresAt: r.expires_at,
    }));
  }

  /** Only people who opted in to marketing, only status=ready (verified in email_verified mode). */
  async marketingCsv(): Promise<string> {
    const rows = (await this.listLeads(100000)).filter((l) => l.marketingOptIn && l.status === 'ready');
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    return ['first_name,email,track,consented_at,notice_version', ...rows.map((l) => [l.name, l.email, l.track, l.marketingOptInAt, l.privacyNoticeVersion].map(cell).join(','))].join('\n') + '\n';
  }

  // ---------- retention ----------
  async purgeExpired(now = new Date()) {
    const t = now.toISOString();
    const cutoff = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
    return this.db.tx(async (tx: Queryable) => {
      const out = { assessments: 0, reportRequests: 0, audit: 0, outbox: 0 };
      out.reportRequests = (await tx.run('DELETE FROM report_requests WHERE expires_at < ?', t)).changes;
      out.assessments = (await tx.run('DELETE FROM assessments WHERE expires_at < ?', t)).changes;
      out.audit = (await tx.run('DELETE FROM audit_log WHERE at < ?', cutoff(this.cfg.auditRetentionDays))).changes;
      out.outbox = (await tx.run("DELETE FROM outbox WHERE (status='sent' AND sent_at < ?) OR created_at < ?", cutoff(7), cutoff(30))).changes;
      await tx.run('DELETE FROM sessions WHERE expires_at < ?', t);
      return out;
    });
  }
}

function emailSubject(locale: Locale, immediate: boolean) {
  if (locale === 'ms') return immediate ? 'Pautan laporan R.I.S.E.™ anda' : 'Sahkan e-mel anda untuk membuka laporan R.I.S.E.™';
  return immediate ? 'Your R.I.S.E.™ report link' : 'Confirm your email to open your R.I.S.E.™ report';
}

function emailBody(locale: Locale, name: string, link: string, immediate: boolean, days: number) {
  if (locale === 'ms') {
    return immediate
      ? `Hai ${name},\n\nLaporan R.I.S.E.™ anda sedia. Pautan ini peribadi dan tamat tempoh dalam ${days} hari:\n${link}\n\nJangan kongsikan pautan ini. Anda boleh memadam data anda terus dalam laporan.\n\nIni ialah penilaian kendiri berbentuk pendidikan, bukan nasihat kewangan yang dikawal selia.\n`
      : `Hai ${name},\n\nSila sahkan e-mel anda untuk membuka laporan R.I.S.E.™ anda (pautan sah selama 24 jam):\n${link}\n\nJika anda tidak membuat permintaan ini, abaikan e-mel ini.\n`;
  }
  return immediate
    ? `Hi ${name},\n\nYour R.I.S.E.™ report is ready. This link is private and expires in ${days} days:\n${link}\n\nPlease don't share it. You can delete your data directly inside the report.\n\nThis is an educational self-assessment, not regulated financial advice.\n`
    : `Hi ${name},\n\nPlease confirm your email to open your R.I.S.E.™ report (link valid for 24 hours):\n${link}\n\nIf you didn't request this, you can ignore this email.\n`;
}
