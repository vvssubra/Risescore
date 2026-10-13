import { Router, type Request } from 'express';
import { z } from 'zod';
import { hmacB64u } from '../crypto.ts';
import type { Context } from '../context.ts';
import { limit } from '../rateLimit.ts';
import { HttpError } from '../services/toolkits.ts';
import { reportRequestSchema } from '../services/reports.ts';
import { MARKETING_NOTICE_VERSION, PRIVACY_NOTICE_STATUS, PRIVACY_NOTICE_VERSION, CONSENT_TEXT, privacyNotice } from '../../shared/legal.ts';
import { SCORECARD_VERSION } from '../../shared/questions.ts';

export const ipKey = (ctx: Context) => (req: Request) => hmacB64u(ctx.cfg.signingSecret, `ip:${req.ip ?? 'unknown'}`).slice(0, 22);

const tokenParam = z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/);

export function publicRoutes(ctx: Context): Router {
  const r = Router();
  const ip = ipKey(ctx);
  const L = ctx.limiter;

  r.get('/health', async (_req, res) => { await ctx.db.get('SELECT 1'); res.json({ ok: true }); });

  r.get('/config', (_req, res) => {
    res.json({
      scorecardVersion: SCORECARD_VERSION,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      marketingNoticeVersion: MARKETING_NOTICE_VERSION,
      privacyNoticeStatus: PRIVACY_NOTICE_STATUS,
      reportAccessMode: ctx.cfg.reportAccessMode,
      whatsappNumber: ctx.cfg.whatsappNumber,
      reportTtlDays: ctx.cfg.reportTtlDays,
    });
  });

  r.get('/legal', (_req, res) => {
    const params = { assessmentDays: ctx.cfg.assessmentRetentionDays, reportDays: ctx.cfg.reportRetentionDays, handoverHours: ctx.cfg.handoverTtlHours };
    res.json({ version: PRIVACY_NOTICE_VERSION, status: PRIVACY_NOTICE_STATUS, notice: { en: privacyNotice('en', params), ms: privacyNotice('ms', params) }, consent: CONSENT_TEXT });
  });

  r.post('/assessments', limit(L, 'assess', 40, 3_600_000, ip), async (req, res) => {
    const { profile, answers } = req.body ?? {};
    const out = await ctx.assessments.create(profile, answers);
    res.status(201).json(out);
  });

  r.post('/report-requests', limit(L, 'gate-ip', 12, 3_600_000, ip), (req, res, next) => {
    // Per-address throttle so one inbox cannot be spammed with report emails.
    const parsed = reportRequestSchema.shape.email.safeParse(req.body?.email);
    if (parsed.success) {
      const wait = L.hit(`gate-email:${hmacB64u(ctx.cfg.signingSecret, `email:${parsed.data}`)}`, 5, 3_600_000);
      if (wait > 0) { res.setHeader('Retry-After', String(wait)); res.status(429).json({ error: 'rate_limited', message: 'Too many requests for this email address. Please try later.', retryAfterSeconds: wait }); return; }
    }
    next();
  }, async (req, res) => {
    const out = await ctx.reports.request(req.body, ip(req));
    res.status(out.status === 'ready' ? 201 : 202).json(out);
  });

  r.post('/reports/verify', limit(L, 'verify', 20, 3_600_000, ip), async (req, res) => {
    const token = tokenParam.safeParse(req.body?.token);
    if (!token.success) throw new HttpError(400, 'Invalid link.', 'invalid_token');
    res.json(await ctx.reports.verifyEmail(token.data));
  });

  const withToken = (fn: (token: string, req: Request) => unknown, status = 200) => async (req: Request, res: import('express').Response) => {
    const token = tokenParam.safeParse(req.params.token);
    if (!token.success) throw new HttpError(404, 'Report not found.', 'report_not_found');
    const out = await fn(token.data, req);
    if (out === undefined) res.status(204).end(); else res.status(status).json(out);
  };

  r.get('/reports/:token', limit(L, 'report', 90, 60_000, ip), withToken((t, req) => ctx.reports.getReport(t, ip(req))));
  r.delete('/reports/:token', limit(L, 'erase', 10, 3_600_000, ip), withToken(async (t) => { await ctx.reports.eraseByToken(t); }));
  r.post('/reports/:token/marketing', limit(L, 'mkt', 30, 3_600_000, ip), withToken((t, req) => {
    if (typeof req.body?.optIn !== 'boolean') throw new HttpError(400, 'optIn must be true or false.', 'invalid');
    return ctx.reports.setMarketing(t, req.body.optIn);
  }));

  // V4.4 staff handover: created only when the prospect taps WhatsApp; the link needs a staff login to open.
  r.post('/reports/:token/handover', limit(L, 'handover', 10, 3_600_000, ip), withToken((t) => ctx.handovers.create(t), 201));
  r.delete('/reports/:token/handover', limit(L, 'handover-revoke', 20, 3_600_000, ip), withToken(async (t) => { await ctx.handovers.revoke(t); }));

  /** Signed, short-lived download. Only the currently published, unexpired version of an active toolkit can be fetched. */
  r.get('/files/:id', limit(L, 'file', 120, 60_000, ip), async (req, res) => {
    const id = Number(req.params.id);
    const exp = String(req.query.exp ?? '');
    const sig = String(req.query.sig ?? '');
    if (!Number.isInteger(id) || !ctx.reports.verifyFileSignature(id, exp, sig)) throw new HttpError(403, 'This download link is invalid or has expired.', 'bad_signature');
    const { version, data } = await ctx.toolkits.readFile(id);
    const tk = await ctx.db.get('SELECT active FROM toolkits WHERE id=?', version.toolkit_id);
    const current = await ctx.toolkits.currentPdf(version.toolkit_id);
    if (!tk?.active || !current || current.id !== version.id || !data) throw new HttpError(410, 'This resource is no longer available.', 'gone');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${version.filename.replace(/"/g, '')}"`);
    res.setHeader('Content-Length', String(data.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    res.end(data);
  });

  return r;
}
