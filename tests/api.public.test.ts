import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assess } from '../src/shared/engine.ts';
import { GOOD, Client, alertScenario, requestReport, startApp, submitAssessment, type TestApp } from './server-helpers.ts';
import { decryptField } from '../src/server/crypto.ts';

let app: TestApp;
let c: Client;
beforeAll(async () => { app = await startApp(); c = new Client(app.url); });
afterAll(async () => { await app.stop(); });

describe('assessments (server-side scoring)', () => {
  it('scores on the server and returns only a safe preview', async () => {
    const { status, data, sc } = await submitAssessment(c);
    expect(status).toBe(201);
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.sessionToken.length).toBeGreaterThan(30);
    const expected = assess(sc.profile, sc.answers);
    expect(data.preview.overall).toBe(expected.overall);
    expect(data.preview.priority).toBe('R');
    expect(data.preview.headline).toBe('Essential payments need attention');
    // gated content must not leak into the free preview
    for (const k of ['alerts', 'steps', 'toolkits', 'reasons', 'plan']) expect(data.preview).not.toHaveProperty(k);
    expect(JSON.stringify(data.preview)).not.toContain('Prioritise essentials');
  });

  it('preview needs no contact details and incomplete answers are not given a false score', async () => {
    const r = await c.post('/api/assessments', { profile: alertScenario().profile, answers: { f_r1: 'comfortable' } });
    expect(r.status).toBe(201);
    expect(r.data.preview.overall).toBeNull();
    expect(r.data.preview.complete).toBe(false);
    expect(r.data.preview.headline).toBe('More information is needed for a diagnostic');
  });

  it('rejects invalid profiles, unknown questions, bad options and inactive-module answers', async () => {
    const p = alertScenario().profile;
    expect((await c.post('/api/assessments', { profile: { ...p, track: 'x' }, answers: {} })).status).toBe(400);
    expect((await c.post('/api/assessments', { profile: { ...p, role: 'wizard' }, answers: {} })).status).toBe(400);
    expect((await c.post('/api/assessments', { profile: p, answers: { nope: 'x' } })).status).toBe(400);
    expect((await c.post('/api/assessments', { profile: p, answers: { f_r1: 'zzz' } })).status).toBe(400);
    expect((await c.post('/api/assessments', { profile: p, answers: { f_m_property: 'dominates' } })).status).toBe(400);
    expect((await c.post('/api/assessments', {})).status).toBe(400);
    const bad = await c.call('POST', '/api/assessments', { body: '{not json', headers: { 'content-type': 'application/json' } });
    expect(bad.status).toBe(400);
  });

  it('ignores any client-supplied score fields', async () => {
    const sc = alertScenario();
    const r = await c.post('/api/assessments', { ...sc, overall: 100, result: { overall: 100 }, preview: { overall: 100 } });
    expect(r.data.preview.overall).toBe(assess(sc.profile, sc.answers).overall);
  });

  it('stores profile + answers encrypted, never in plaintext', async () => {
    await submitAssessment(c);
    const raw = await app.rawDb();
    expect(raw).not.toContain('"f_r1"');
    expect(raw).not.toContain('overdue');
    const row = (await app.ctx.db.get('SELECT payload_enc, session_token_hash FROM assessments LIMIT 1'))!;
    expect(row.payload_enc.startsWith('v1.')).toBe(true);
    expect(row.session_token_hash).toHaveLength(64);
  });
});

describe('gated report', () => {
  it('requires processing consent, a valid session token and the current notice version', async () => {
    const a = (await submitAssessment(c)).data;
    expect((await requestReport(c, a, { processingConsent: false })).status).toBe(400);
    expect((await requestReport(c, a, { processingConsent: undefined })).status).toBe(400);
    expect((await requestReport(c, a, { sessionToken: 'x'.repeat(43) })).status).toBe(404);
    expect((await requestReport(c, { id: crypto.randomUUID(), sessionToken: a.sessionToken })).status).toBe(404);
    expect((await requestReport(c, a, { privacyNoticeVersion: 'old' })).status).toBe(409);
    expect((await requestReport(c, a, { email: 'not-an-email' })).status).toBe(400);
    expect((await requestReport(c, a, { firstName: '<script>' })).status).toBe(400);
  });

  it('honeypot submissions look successful but store nothing', async () => {
    const a = (await submitAssessment(c)).data;
    const before = (await app.ctx.db.get<{ n: number }>('SELECT COUNT(*) n FROM report_requests'))!.n;
    const r = await requestReport(c, a, { website: 'http://spam.example' });
    expect(r.status).toBe(202);
    expect((await app.ctx.db.get<{ n: number }>('SELECT COUNT(*) n FROM report_requests'))!.n).toBe(before);
  });

  it('issues an expiring link; the full report is recalculated server-side and carries alerts, steps, toolkits and WhatsApp', async () => {
    const { data: a, sc } = await submitAssessment(c);
    const r = await requestReport(c, a, { marketingOptIn: true });
    expect(r.status).toBe(201);
    expect(r.data.reportToken.length).toBeGreaterThan(30);
    const rep = await c.get(`/api/reports/${r.data.reportToken}`);
    expect(rep.status).toBe(200);
    const exp = assess(sc.profile, sc.answers);
    expect(rep.data.result).toEqual(JSON.parse(JSON.stringify(exp)));
    expect(rep.data.result.alerts.length).toBeGreaterThan(0);
    expect(rep.data.result.steps).toHaveLength(3);
    expect(Object.keys(rep.data.result.byPillar)).toEqual(['R', 'I', 'S', 'E']);
    // Only the planners named by the server-computed priorities are unlocked (max two), each with its workbook.
    expect(rep.data.result.priorities[0]).toMatchObject({ pillar: 'R', toolkit: 'TK04', kind: 'flag' });
    expect(rep.data.toolkits.map((k: any) => k.id)).toEqual(exp.priorities.map((x) => x.toolkit));
    expect(rep.data.toolkits.length).toBeLessThanOrEqual(2);
    expect(rep.data.toolkits[0].workbook.fields.length).toBeGreaterThan(3);
    for (const other of ['TK01', 'TK02', 'TK03', 'TK05', 'TK06', 'TK07', 'TK08'].filter((id) => !exp.priorities.some((x) => x.toolkit === id))) {
      expect(JSON.stringify(rep.data)).not.toContain(`"id":"${other}"`);
    }
    expect(rep.data.firstName).toBe(GOOD.firstName);
    expect(rep.data.whatsapp.number).toBe('60122202217');
    expect(rep.headers.get('cache-control')).toBe('no-store');
    expect(rep.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('encrypts name + email, hashes the link token, and records separate consent events', async () => {
    const a = (await submitAssessment(c)).data;
    const email = 'unique.privacy.check@example.org';
    const r = await requestReport(c, a, { email, firstName: 'Zainab', marketingOptIn: false });
    const raw = await app.rawDb();
    expect(raw).not.toContain(email);
    expect(raw).not.toContain('Zainab');
    expect(raw).not.toContain(r.data.reportToken);
    const req = (await app.ctx.db.get('SELECT * FROM report_requests WHERE assessment_id=?', a.id))!;
    expect(decryptField(app.ctx.cfg.encryptionKey, req.email_enc, 'report_requests.email')).toBe(email);
    expect(() => decryptField(app.ctx.cfg.encryptionKey, req.email_enc, 'report_requests.name')).toThrow(); // AAD binds ciphertext to its column
    const events = await app.ctx.db.all('SELECT kind, granted, notice_version FROM consent_events WHERE request_id=? ORDER BY id', req.id);
    expect(events).toEqual([
      { kind: 'processing', granted: 1, notice_version: expect.any(String) },
      { kind: 'marketing', granted: 0, notice_version: expect.any(String) },
    ]);
    expect(req.marketing_opt_in).toBe(0);
  });

  it('marketing opt-in is independent of processing consent and can be withdrawn', async () => {
    const a = (await submitAssessment(c)).data;
    const r = await requestReport(c, a, { marketingOptIn: true });
    const t = r.data.reportToken;
    expect((await app.ctx.db.get('SELECT marketing_opt_in m FROM report_requests WHERE assessment_id=?', a.id))!.m).toBe(1);
    expect((await c.post(`/api/reports/${t}/marketing`, { optIn: false })).data.marketingOptIn).toBe(false);
    expect((await app.ctx.db.get('SELECT marketing_opt_in m FROM report_requests WHERE assessment_id=?', a.id))!.m).toBe(0);
    expect((await app.ctx.db.all('SELECT granted FROM consent_events WHERE kind=\'marketing\' AND request_id=(SELECT id FROM report_requests WHERE assessment_id=?) ORDER BY id', a.id)).map((x) => x.granted)).toEqual([1, 0]);
    expect((await c.post(`/api/reports/${t}/marketing`, { optIn: 'yes' })).status).toBe(400);
  });

  it('expired, revoked and unknown links are refused; access is logged', async () => {
    const a = (await submitAssessment(c)).data;
    const t = (await requestReport(c, a)).data.reportToken;
    expect((await c.get(`/api/reports/${t}`)).status).toBe(200);
    expect((await c.get('/api/reports/' + 'A'.repeat(43))).status).toBe(404);
    expect((await c.get('/api/reports/short')).status).toBe(404);
    await app.ctx.db.run("UPDATE report_access SET expires_at='2000-01-01T00:00:00.000Z'");
    expect((await c.get(`/api/reports/${t}`)).status).toBe(410);
    const outcomes = (await app.ctx.db.all('SELECT outcome FROM report_access_events')).map((x) => x.outcome);
    expect(outcomes).toContain('ok');
    expect(outcomes).toContain('denied_expired');
    await app.ctx.db.run("UPDATE report_access SET expires_at='2999-01-01T00:00:00.000Z', revoked_at='2026-01-01T00:00:00.000Z'");
    expect((await c.get(`/api/reports/${t}`)).status).toBe(410);
  });

  it('"Delete my data" erases the request, consent log entries and the stored answers — even after the link expired', async () => {
    const a = (await submitAssessment(c)).data;
    const t = (await requestReport(c, a)).data.reportToken;
    await app.ctx.db.run("UPDATE report_access SET expires_at='2000-01-01T00:00:00.000Z'");
    expect((await c.del(`/api/reports/${t}`)).status).toBe(204);
    expect(await app.ctx.db.get('SELECT 1 x FROM assessments WHERE id=?', a.id)).toBeUndefined();
    expect(await app.ctx.db.get('SELECT 1 x FROM report_requests WHERE assessment_id=?', a.id)).toBeUndefined();
    expect((await c.get(`/api/reports/${t}`)).status).toBe(404);
  });

  it('a second request for the same assessment replaces the first (one live link)', async () => {
    const a = (await submitAssessment(c)).data;
    const t1 = (await requestReport(c, a)).data.reportToken;
    const t2 = (await requestReport(c, a, { email: 'second@example.com' })).data.reportToken;
    expect((await c.get(`/api/reports/${t1}`)).status).toBe(404);
    expect((await c.get(`/api/reports/${t2}`)).status).toBe(200);
  });

  it('queues the report link email in an encrypted outbox', async () => {
    const a = (await submitAssessment(c)).data;
    const r = await requestReport(c, a, { email: 'outbox.check@example.com', locale: 'ms' });
    const row = (await app.ctx.db.all('SELECT * FROM outbox ORDER BY created_at DESC'))[0];
    const body = decryptField(app.ctx.cfg.encryptionKey, row.body_enc, 'outbox.body');
    expect(body).toContain(`/report/${r.data.reportToken}`);
    expect(body).toContain('Laporan R.I.S.E.'); // Bahasa Malaysia email
    expect(await app.rawDb()).not.toContain(r.data.reportToken);
  });
});

describe('no public library + legal', () => {
  it('there is no browse-all toolkit endpoint', async () => {
    const r = await c.get('/api/toolkits');
    expect(r.status).toBe(404);
  });
  it('serves the bilingual privacy notice and consent wording with its version', async () => {
    const r = await c.get('/api/legal');
    expect(r.data.notice.en.sections.length).toBeGreaterThan(5);
    expect(r.data.notice.ms.title).toContain('Notis Privasi');
    expect(r.data.consent.processing.ms).toContain('Saya bersetuju');
    expect(r.data.consent.marketing.en).toMatch(/^Optional/);
    expect(r.data.version).toBe((await c.get('/api/config')).data.privacyNoticeVersion);
    expect(JSON.stringify(r.data.notice.en)).toContain('90 days');
  });
});

describe('HTTP hardening', () => {
  it('sends strict security headers and never caches API responses', async () => {
    const r = await c.get('/api/config');
    const csp = r.headers.get('content-security-policy')!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });
  it('refuses cross-origin state changes', async () => {
    const r = await c.call('POST', '/api/assessments', { json: alertScenario(), headers: { origin: 'https://evil.example' } });
    expect(r.status).toBe(403);
    const ok = await c.call('POST', '/api/assessments', { json: alertScenario(), headers: { origin: 'http://localhost:3999' } });
    expect(ok.status).toBe(201);
  });
  it('does not leak internals on errors', async () => {
    const r = await c.get('/api/nope');
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.data)).not.toMatch(/node_modules|at \w+ \(/);
  });
});

describe('rate limiting and abuse protection', () => {
  it('throttles the gate per email address and per IP', async () => {
    const limited = await startApp({ RATE_LIMIT_DISABLED: 'false' });
    try {
      const lc = new Client(limited.url);
      const a = (await submitAssessment(lc)).data;
      const statuses: number[] = [];
      for (let i = 0; i < 7; i++) statuses.push((await requestReport(lc, a, { email: 'same@example.com' })).status);
      expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
      expect(statuses[5]).toBe(429);
      const r = await requestReport(lc, a, { email: 'same@example.com' });
      expect(r.headers.get('retry-after')).toBeTruthy();
      const codes: number[] = [];
      for (let i = 0; i < 45; i++) codes.push((await lc.post('/api/assessments', alertScenario())).status);
      expect(codes).toContain(429);
    } finally { await limited.stop(); }
  });
});

describe('email-verified access mode', () => {
  it('withholds the report until the emailed one-time link is used', async () => {
    const v = await startApp({ REPORT_ACCESS_MODE: 'email_verified' });
    try {
      const vc = new Client(v.url);
      const a = (await submitAssessment(vc)).data;
      const r = await requestReport(vc, a);
      expect(r.status).toBe(202);
      expect(r.data.reportToken).toBeUndefined();
      const row = (await v.ctx.db.all('SELECT * FROM outbox'))[0];
      const body = decryptField(v.ctx.cfg.encryptionKey, row.body_enc, 'outbox.body');
      const verifyToken = body.match(/\/report\/verify\/([\w-]+)/)![1];
      const ver = await vc.post('/api/reports/verify', { token: verifyToken });
      expect(ver.status).toBe(200);
      expect((await vc.get(`/api/reports/${ver.data.reportToken}`)).status).toBe(200);
      expect((await vc.post('/api/reports/verify', { token: verifyToken })).status).toBe(410); // one-time
      expect((await v.ctx.db.get('SELECT email_verified_at e FROM report_requests'))!.e).toBeTruthy();
    } finally { await v.stop(); }
  });
});

describe('retention', () => {
  it('purges expired assessments, report requests and old outbox entries', async () => {
    const a = (await submitAssessment(c)).data;
    await requestReport(c, a, { email: 'retention@example.com' });
    const b = (await submitAssessment(c)).data; // never turned into a report
    await app.ctx.db.run("UPDATE assessments SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?", b.id);
    await app.ctx.db.run("UPDATE report_requests SET expires_at='2000-01-01T00:00:00.000Z' WHERE assessment_id=?", a.id);
    const out = await app.ctx.reports.purgeExpired();
    expect(out.reportRequests).toBeGreaterThanOrEqual(1);
    expect(out.assessments).toBeGreaterThanOrEqual(1);
    expect(await app.ctx.db.get('SELECT 1 x FROM assessments WHERE id=?', b.id)).toBeUndefined();
    expect((await c.post('/api/report-requests', { assessmentId: b.id, sessionToken: b.sessionToken })).status).toBe(400);
  });
});

describe('staging password gate', () => {
  it('protects everything except the health check when STAGING_BASIC_AUTH is set', async () => {
    const st = await startApp({ STAGING_BASIC_AUTH: 'tester:a-long-staging-pass' });
    try {
      expect((await fetch(st.url + '/api/health')).status).toBe(200);
      expect((await fetch(st.url + '/api/config')).status).toBe(401);
      expect((await fetch(st.url + '/api/assessments', { method: 'POST' })).status).toBe(401);
      const bad = await fetch(st.url + '/api/config', { headers: { authorization: 'Basic ' + Buffer.from('tester:wrong-password-xx').toString('base64') } });
      expect(bad.status).toBe(401);
      expect(bad.headers.get('www-authenticate')).toContain('Basic');
      const ok = await fetch(st.url + '/api/config', { headers: { authorization: 'Basic ' + Buffer.from('tester:a-long-staging-pass').toString('base64') } });
      expect(ok.status).toBe(200);
    } finally { await st.stop(); }
  });
});

describe('WhatsApp handover (V4.4)', () => {
  async function report() {
    const { data: a } = await submitAssessment(c);
    const r = await requestReport(c, a);
    return r.data.reportToken as string;
  }
  const tokenOf = (url: string) => url.split('/admin/handover/')[1];

  it('creates a staff-only link and a prefilled message with name, score and priority titles only', async () => {
    const t = await report();
    const h = await c.post(`/api/reports/${t}/handover`, {});
    expect(h.status).toBe(201);
    expect(h.data.url).toMatch(/\/admin\/handover\/[A-Za-z0-9_-]{43}$/);
    expect(h.data.message).toContain(`Name: ${GOOD.firstName}`);
    expect(h.data.message).toContain('1. Essential payments need attention');
    expect(h.data.message).not.toMatch(/overdue essential household|f_r1|@/);
    expect(h.data.whatsappUrl.startsWith('https://wa.me/60122202217?text=')).toBe(true);
    expect(decodeURIComponent(h.data.whatsappUrl.split('text=')[1])).toBe(h.data.message);
    expect(Date.parse(h.data.expiresAt) - Date.now()).toBeGreaterThan(47 * 3_600_000);
    expect(await app.rawDb()).not.toContain(tokenOf(h.data.url));
  });

  it('opens only for signed-in staff; anyone else gets nothing', async () => {
    const t = await report();
    const ht = tokenOf((await c.post(`/api/reports/${t}/handover`, {})).data.url);
    expect((await new Client(app.url).get(`/api/admin/handover/${ht}`)).status).toBe(401);
    const { makeUser, PW } = await import('./server-helpers.ts');
    await makeUser(app.ctx, 'editor', 'handover.editor@example.com');
    const staff = new Client(app.url);
    await staff.login('handover.editor@example.com', PW);
    const r = await staff.get(`/api/admin/handover/${ht}`);
    expect(r.status).toBe(200);
    expect(r.data.report.firstName).toBe(GOOD.firstName);
    expect(r.data.report.result.priorities.length).toBeGreaterThan(0);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect((await staff.get(`/api/admin/handover/${'x'.repeat(43)}`)).status).toBe(404);
    const audit = await app.ctx.db.all("SELECT * FROM audit_log WHERE action='handover.open'");
    expect(audit.length).toBeGreaterThan(0);
  });

  it('a new link replaces the old one; withdrawing, expiry and report deletion all revoke it', async () => {
    const { makeUser, PW } = await import('./server-helpers.ts');
    await makeUser(app.ctx, 'reviewer', 'handover.reviewer@example.com').catch(() => undefined);
    const staff = new Client(app.url);
    await staff.login('handover.reviewer@example.com', PW);
    const t = await report();
    const first = tokenOf((await c.post(`/api/reports/${t}/handover`, {})).data.url);
    const second = tokenOf((await c.post(`/api/reports/${t}/handover`, {})).data.url);
    expect((await staff.get(`/api/admin/handover/${first}`)).status).toBe(404);
    expect((await staff.get(`/api/admin/handover/${second}`)).status).toBe(200);
    expect((await c.del(`/api/reports/${t}/handover`)).status).toBe(204);
    expect((await staff.get(`/api/admin/handover/${second}`)).status).toBe(404);

    const third = tokenOf((await c.post(`/api/reports/${t}/handover`, {})).data.url);
    await app.ctx.db.run('UPDATE handover_links SET expires_at=?', new Date(Date.now() - 1000).toISOString());
    expect((await staff.get(`/api/admin/handover/${third}`)).status).toBe(404);

    const count = async () => (await app.ctx.db.get<{ n: number }>('SELECT COUNT(*)::int n FROM handover_links'))!.n;
    const fourth = tokenOf((await c.post(`/api/reports/${t}/handover`, {})).data.url);
    const withLink = await count();
    expect((await c.del(`/api/reports/${t}`)).status).toBe(204);
    expect((await staff.get(`/api/admin/handover/${fourth}`)).status).toBe(404);
    expect(await count()).toBe(withLink - 1); // removed with the report (FK cascade)
  });

  it('needs a valid report token', async () => {
    expect((await c.post(`/api/reports/${'a'.repeat(43)}/handover`, {})).status).toBe(404);
  });
});
