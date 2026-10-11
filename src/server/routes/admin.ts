import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import type { Context } from '../context.ts';
import { safeEqual } from '../crypto.ts';
import { limit } from '../rateLimit.ts';
import { launchReadiness } from '../readiness.ts';
import { audit } from '../services/audit.ts';
import { userCreateSchema, type SessionInfo } from '../services/auth.ts';
import { HttpError, type Actor, type Role } from '../services/toolkits.ts';
import { ipKey } from './public.ts';

export const cookieName = (isProd: boolean) => (isProd ? '__Host-rise_admin' : 'rise_admin');

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

declare module 'express-serve-static-core' {
  interface Locals { session?: SessionInfo; sid?: string }
}

export function adminRoutes(ctx: Context): Router {
  const r = Router();
  const cname = cookieName(ctx.cfg.isProd);
  const ip = ipKey(ctx);

  const setCookie = (res: Response, sid: string, maxAgeSec: number) =>
    res.append('Set-Cookie', `${cname}=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${ctx.cfg.isProd ? '; Secure' : ''}`);

  // ---- auth ----
  r.post('/auth/login', limit(ctx.limiter, 'login-ip', 20, 15 * 60_000, ip), async (req, res) => {
    const body = z.object({ email: z.string().max(254), password: z.string().max(200) }).parse(req.body);
    const out = await ctx.auth.login(body.email, body.password, ip(req));
    setCookie(res, out.sid, ctx.cfg.sessionTtlHours * 3600);
    res.json({ user: out.user, csrfToken: out.csrf });
  });

  // everything below needs a valid session
  const session: RequestHandler = (req, res, next) => {
    const sid = readCookie(req, cname);
    const s = ctx.auth.session(sid);
    if (!s) { res.status(401).json({ error: 'unauthenticated', message: 'Please sign in.' }); return; }
    res.locals.session = s;
    res.locals.sid = sid;
    // CSRF: SameSite=Strict cookie + per-session token required on every state-changing call.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const t = req.get('x-csrf-token') ?? '';
      if (!safeEqual(t, s.csrf)) { res.status(403).json({ error: 'csrf', message: 'Security token missing or invalid. Reload and try again.' }); return; }
    }
    next();
  };
  r.use(session);

  const actor = (res: Response): Actor => { const u = res.locals.session!.user; return { id: u.id, email: u.email, role: u.role }; };
  const need = (...roles: Role[]): RequestHandler => (_req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(res.locals.session!.user.role)) { res.status(403).json({ error: 'forbidden', message: 'Your role cannot do this.' }); return; }
    next();
  };
  const ALL: Role[] = ['admin', 'reviewer', 'editor'];
  const id = (req: Request) => { const n = Number(req.params.id); if (!Number.isInteger(n) || n < 1) throw new HttpError(404, 'Not found.', 'not_found'); return n; };

  r.get('/auth/me', (_req, res) => res.json({ user: res.locals.session!.user, csrfToken: res.locals.session!.csrf }));
  r.post('/auth/logout', (_req, res) => { ctx.auth.logout(res.locals.sid); setCookie(res, '', 0); res.json({ ok: true }); });
  r.post('/auth/password', async (req, res) => {
    const b = z.object({ current: z.string().max(200), next: z.string().max(200) }).parse(req.body);
    await ctx.auth.changePassword(res.locals.session!.user.id, b.current, b.next);
    res.json({ ok: true });
  });

  // ---- toolkit library ----
  r.get('/toolkits', need(...ALL), (_req, res) => res.json({ toolkits: ctx.toolkits.listAdmin(), launchNote: 'Built-in worksheets need a compliance review before public launch.' }));
  r.post('/toolkits', need(...ALL), (req, res) => res.status(201).json(ctx.toolkits.create(req.body, actor(res))));
  r.patch('/toolkits/:tid', need(...ALL), (req, res) => {
    const a = actor(res);
    // Editors may edit details; only reviewers/admins may activate or deactivate (changes what the public sees).
    if (a.role === 'editor' && typeof req.body?.active === 'boolean') throw new HttpError(403, 'Only reviewers and admins can activate or deactivate toolkits.', 'forbidden');
    res.json(ctx.toolkits.update(String(req.params.tid), req.body, a));
  });
  r.post('/toolkits/:tid/compliance-review', need('admin', 'reviewer'), (req, res) => { ctx.toolkits.markComplianceReviewed(String(req.params.tid), actor(res)); res.json({ ok: true }); });

  r.put('/toolkits/:tid/versions', need(...ALL), limit(ctx.limiter, 'upload', 30, 3_600_000, ip), express.raw({ type: 'application/pdf', limit: ctx.cfg.maxPdfBytes + 1024 }), async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new HttpError(415, 'Send the PDF as the request body with Content-Type: application/pdf.', 'unsupported');
    let filename = 'toolkit.pdf';
    try { filename = decodeURIComponent(String(req.get('x-filename') ?? 'toolkit.pdf')); } catch { /* keep default */ }
    res.status(201).json(await ctx.toolkits.addVersion(String(req.params.tid), req.body, filename, actor(res)));
  });
  r.post('/versions/:id/submit', need(...ALL), (req, res) => res.json(ctx.toolkits.submitForReview(id(req), actor(res))));
  r.post('/versions/:id/review', need('admin', 'reviewer'), (req, res) => {
    const b = z.object({ decision: z.enum(['publish', 'reject']), note: z.string().max(500).optional(), reviewExpiresAt: z.string().max(40).optional() }).parse(req.body);
    res.json(ctx.toolkits.review(id(req), b.decision, b.note, b.reviewExpiresAt, actor(res)));
  });
  r.post('/versions/:id/archive', need('admin', 'reviewer'), (req, res) => res.json(ctx.toolkits.archiveVersion(id(req), actor(res))));
  r.delete('/versions/:id', need(...ALL), async (req, res) => { await ctx.toolkits.deleteVersion(id(req), actor(res)); res.status(204).end(); });
  r.get('/versions/:id/file', need(...ALL), (req, res) => {
    const { version, stream } = ctx.toolkits.storageStream(id(req));
    if (!stream) throw new HttpError(404, 'File missing from storage.', 'missing');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${version.filename.replace(/"/g, '')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    stream.pipe(res);
  });

  // ---- matching rules ----
  r.get('/rules', need(...ALL), (_req, res) => res.json({ rules: ctx.toolkits.rules() }));
  r.post('/rules', need('admin'), (req, res) => res.status(201).json(ctx.toolkits.upsertRule(null, req.body, actor(res))));
  r.put('/rules/:rid', need('admin'), (req, res) => res.json(ctx.toolkits.upsertRule(String(req.params.rid), req.body, actor(res))));
  r.delete('/rules/:rid', need('admin'), (req, res) => { ctx.toolkits.deleteRule(String(req.params.rid), actor(res)); res.status(204).end(); });

  // ---- users ----
  r.get('/users', need('admin'), (_req, res) => res.json({ users: ctx.auth.listUsers() }));
  r.post('/users', need('admin'), async (req, res) => res.status(201).json(await ctx.auth.createUser(userCreateSchema.parse(req.body), actor(res).email, true)));
  r.patch('/users/:uid', need('admin'), async (req, res) => {
    const b = z.object({ role: z.enum(['admin', 'reviewer', 'editor']).optional(), active: z.boolean().optional(), name: z.string().trim().min(1).max(100).optional(), newPassword: z.string().max(200).optional() }).parse(req.body);
    res.json(await ctx.auth.updateUser(String(req.params.uid), b, actor(res)));
  });

  // ---- leads (personal data: admin only, every access audited) ----
  r.get('/leads', need('admin'), (req, res) => {
    const limitN = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    audit(ctx.db, actor(res).email, 'leads.view', 'report_requests', undefined, { limit: limitN, offset });
    res.json({ leads: ctx.reports.listLeads(limitN, offset) });
  });
  r.get('/leads/export.csv', need('admin'), (_req, res) => {
    audit(ctx.db, actor(res).email, 'leads.export_marketing');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="marketing-opt-in.csv"');
    res.send(ctx.reports.marketingCsv());
  });

  r.get('/audit', need('admin'), (_req, res) => res.json({ entries: ctx.db.all('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200') }));
  r.get('/launch-readiness', need('admin'), (_req, res) => res.json({ checks: launchReadiness(ctx.cfg, ctx.db) }));

  return r;
}
