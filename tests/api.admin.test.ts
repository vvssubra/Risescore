import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PW, Client, alertScenario, makeUser, minimalPdf, requestReport, startApp, submitAssessment, type TestApp } from './server-helpers.ts';

let app: TestApp;
const login = async (email: string) => { const c = new Client(app.url); const r = await c.login(email, PW); expect(r.status).toBe(200); return c; };
const put = (c: Client, tid: string, pdf: Buffer, name = 'My Toolkit.pdf') =>
  c.call('PUT', `/api/admin/toolkits/${tid}/versions`, { body: pdf, headers: { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent(name) } });

beforeAll(async () => {
  app = await startApp();
  await makeUser(app.ctx, 'admin');
  await makeUser(app.ctx, 'reviewer');
  await makeUser(app.ctx, 'editor');
});
afterAll(async () => { await app.stop(); });

describe('staff authentication', () => {
  it('requires a session, sets a hardened cookie and rejects bad credentials generically', async () => {
    const anon = new Client(app.url);
    expect((await anon.get('/api/admin/toolkits')).status).toBe(401);
    const bad = await anon.login('admin@example.com', 'wrong-password');
    expect(bad.status).toBe(401);
    expect((await anon.login('nobody@example.com', 'wrong-password')).data.message).toBe(bad.data.message); // no user enumeration
    const c = new Client(app.url);
    const ok = await c.post('/api/admin/auth/login', { email: 'ADMIN@example.com', password: PW });
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(JSON.stringify(ok.data)).not.toContain('password');
    expect(await app.rawDb()).not.toContain(c.cookie.split('=')[1]); // session id stored only as a hash
  });

  it('enforces a CSRF token on every state-changing request', async () => {
    const c = await login('admin@example.com');
    const r = await c.call('PATCH', '/api/admin/toolkits/TK04', { json: { title: 'Csrf test' }, csrf: false });
    expect(r.status).toBe(403);
    expect(r.data.error).toBe('csrf');
    const wrong = await c.call('PATCH', '/api/admin/toolkits/TK04', { json: {}, headers: { 'x-csrf-token': 'nope' }, csrf: false });
    expect(wrong.status).toBe(403);
  });

  it('locks the account after repeated failures and logs out cleanly', async () => {
    await makeUser(app.ctx, 'editor', 'locky@example.com');
    const c = new Client(app.url);
    for (let i = 0; i < 5; i++) await c.login('locky@example.com', 'bad-password-1');
    expect((await c.login('locky@example.com', PW)).status).toBe(423);
    const a = await login('admin@example.com');
    expect((await a.post('/api/admin/auth/logout', {})).status).toBe(200);
    expect((await a.get('/api/admin/auth/me')).status).toBe(401);
  });

  it('enforces password strength and protects the last admin', async () => {
    const a = await login('admin@example.com');
    expect((await a.post('/api/admin/users', { email: 'weak@example.com', name: 'Weak', role: 'editor', password: 'short' })).status).toBe(400);
    const users = (await a.get('/api/admin/users')).data.users;
    const admin = users.find((u: any) => u.role === 'admin');
    expect((await a.patch(`/api/admin/users/${admin.id}`, { active: false })).data.error).toBe('last_admin');
    expect((await a.patch(`/api/admin/users/${admin.id}`, { role: 'editor' })).status).toBe(409);
  });
});

describe('role-based access', () => {
  it('admin-only areas reject editors and reviewers', async () => {
    for (const email of ['editor@example.com', 'reviewer@example.com']) {
      const c = await login(email);
      for (const p of ['/api/admin/users', '/api/admin/leads', '/api/admin/audit', '/api/admin/launch-readiness']) expect((await c.get(p)).status).toBe(403);
    }
  });
  it('editors cannot publish, review, archive or (de)activate', async () => {
    const e = await login('editor@example.com');
    expect((await e.patch('/api/admin/toolkits/TK04', { active: false })).status).toBe(403);
    expect((await e.post('/api/admin/toolkits/TK04/compliance-review', {})).status).toBe(403);
    expect((await e.post('/api/admin/versions/1/review', { decision: 'publish' })).status).toBe(403);
    expect((await e.post('/api/admin/versions/1/archive', {})).status).toBe(403);
  });
});

describe('toolkit PDF library: upload → review → publish → versioning', () => {
  // The alert scenario (overdue essentials) unlocks TK04 Debt & Cash Flow Reset.
  const tid = 'TK04';
  const reportKit = async () => {
    const pub = new Client(app.url);
    const a = (await submitAssessment(pub)).data;
    const t = (await requestReport(pub, a)).data.reportToken;
    const rep = await pub.get(`/api/reports/${t}`);
    return { pub, kit: rep.data.toolkits.find((k: any) => k.id === tid), ids: rep.data.toolkits.map((k: any) => k.id) };
  };
  it('the eight V4.3 planners are seeded; an assigned planner has no PDF until a reviewed one is published', async () => {
    const e = await login('editor@example.com');
    const kits = (await e.get('/api/admin/toolkits')).data.toolkits;
    expect(kits.filter((k: any) => k.assignable).map((k: any) => k.id)).toEqual(['TK01', 'TK02', 'TK03', 'TK04', 'TK05', 'TK06', 'TK07', 'TK08']);
    expect((await e.post('/api/admin/toolkits', { title: 'Custom' })).status).toBe(404); // no custom toolkits: reports only unlock TK01–TK08
    const { kit } = await reportKit();
    expect(kit.workbook.id).toBe(tid);
    expect(kit.pdf).toBeNull();
  });

  it('validates uploads: PDFs only, size limit, no active content', async () => {
    const e = await login('editor@example.com');
    expect((await put(e, tid, Buffer.from('not a pdf at all'))).data.error).toBe('not_pdf');
    expect((await put(e, tid, Buffer.alloc(0))).status).toBe(400);
    expect((await put(e, tid, minimalPdf('/OpenAction<</S/JavaScript /JS(app.alert(1))>>'))).data.error).toBe('active_content');
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(app.ctx.cfg.maxPdfBytes + 10)]);
    expect((await put(e, tid, big)).status).toBe(413);
    expect((await e.call('PUT', `/api/admin/toolkits/${tid}/versions`, { body: '%PDF-1.4 x', headers: { 'content-type': 'text/plain' } })).status).toBe(415);
  });

  it('draft → review: the uploader cannot approve their own PDF (four-eyes), a reviewer can', async () => {
    const admin = await login('admin@example.com');
    const up = await put(admin, tid, minimalPdf(), 'Takaful Basics v1.pdf');
    expect(up.status).toBe(201);
    expect(up.data.status).toBe('draft');
    expect(up.data.sha256).toHaveLength(64);
    expect(up.data.storage_key).toBeUndefined(); // storage internals never exposed
    const vid = up.data.id;
    expect((await admin.post(`/api/admin/versions/${vid}/review`, { decision: 'publish' })).data.error).toBe('bad_state'); // must be submitted first
    expect((await admin.post(`/api/admin/versions/${vid}/submit`, {})).data.status).toBe('in_review');
    expect((await admin.post(`/api/admin/versions/${vid}/review`, { decision: 'publish' })).data.error).toBe('separate_reviewer');
    const rev = await login('reviewer@example.com');
    expect((await rev.post(`/api/admin/versions/${vid}/review`, { decision: 'reject' })).data.error).toBe('note_required');
    expect((await rev.post(`/api/admin/versions/${vid}/review`, { decision: 'publish', reviewExpiresAt: '2001-01-01' })).data.error).toBe('bad_date');
    const pub = await rev.post(`/api/admin/versions/${vid}/review`, { decision: 'publish', note: 'Checked wording against SC guidance', reviewExpiresAt: '2999-12-31' });
    expect(pub.data.status).toBe('published');
    expect(pub.data.version).toBe(1);
  });

  it('once published, only reports that unlock the planner get a signed, short-lived PDF link', async () => {
    const { pub, kit } = await reportKit();
    const pdf = kit.pdf;
    expect(pdf.url).toMatch(/^\/api\/files\/\d+\?exp=\d+&sig=/);

    // signed download
    const dl = await pub.get(pdf.url);
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-type')).toBe('application/pdf');
    expect(dl.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.isBuffer(dl.data) && dl.data.subarray(0, 5).toString()).toBe('%PDF-');
    // tampered / expired / unsigned links are refused
    expect((await pub.get(pdf.url.replace(/sig=.{4}/, 'sig=AAAA'))).status).toBe(403);
    expect((await pub.get(pdf.url.replace(/exp=\d+/, 'exp=1'))).status).toBe(403);
    expect((await pub.get(pdf.url.split('?')[0])).status).toBe(403);
    const other = pdf.url.replace(/files\/\d+/, 'files/9999');
    expect((await pub.get(other)).status).toBe(403);
  });

  it('publishing a new version archives the previous one; archiving removes the toolkit from the public', async () => {
    const e = await login('editor@example.com');
    const rev = await login('reviewer@example.com');
    const v2 = (await put(e, tid, minimalPdf('% second edition'), 'v2.pdf')).data;
    expect(v2.version).toBe(2);
    await e.post(`/api/admin/versions/${v2.id}/submit`, {});
    const pub = await rev.post(`/api/admin/versions/${v2.id}/review`, { decision: 'publish' });
    expect(pub.data.status).toBe('published');
    const versions = (await rev.get('/api/admin/toolkits')).data.toolkits.find((t: any) => t.id === tid).versions;
    expect(versions.map((v: any) => [v.version, v.status])).toEqual([[2, 'published'], [1, 'archived']]);

    // an old signed link to the archived version no longer works
    const oldUrl = app.ctx.reports.signFileUrl(versions[1].id);
    expect((await new Client(app.url).get(oldUrl)).status).toBe(410);

    expect((await rev.post(`/api/admin/versions/${v2.id}/archive`, {})).data.status).toBe('archived');
  });

  it('after archive, the report keeps the interactive planner without a PDF', async () => {
    const { kit } = await reportKit();
    expect(kit.workbook.id).toBe(tid);
    expect(kit.pdf).toBeNull();
  });

  it('a review expiry date in the past hides the PDF automatically', async () => {
    const e = await login('editor@example.com');
    const rev = await login('reviewer@example.com');
    const v3 = (await put(e, tid, minimalPdf('% third'), 'v3.pdf')).data;
    await e.post(`/api/admin/versions/${v3.id}/submit`, {});
    await rev.post(`/api/admin/versions/${v3.id}/review`, { decision: 'publish', reviewExpiresAt: '2999-01-01' });
    expect((await reportKit()).kit.pdf).not.toBeNull();
    await app.ctx.db.run("UPDATE toolkit_versions SET review_expires_at='2020-01-01T00:00:00.000Z' WHERE id=?", v3.id);
    expect((await reportKit()).kit.pdf).toBeNull();
    expect((await new Client(app.url).get(app.ctx.reports.signFileUrl(v3.id))).status).toBe(410);
  });

  it('rejected and draft versions can be deleted (file removed); published cannot', async () => {
    const e = await login('editor@example.com');
    const rev = await login('reviewer@example.com');
    const v = (await put(e, tid, minimalPdf('% fourth'), 'v4.pdf')).data;
    await e.post(`/api/admin/versions/${v.id}/submit`, {});
    expect((await rev.post(`/api/admin/versions/${v.id}/review`, { decision: 'reject', note: 'Typos on page 2' })).data.status).toBe('rejected');
    expect((await e.del(`/api/admin/versions/${v.id}`)).status).toBe(204);
    expect(await app.ctx.db.get('SELECT 1 x FROM toolkit_versions WHERE id=?', v.id)).toBeUndefined();
    const published = (await app.ctx.db.get("SELECT id FROM toolkit_versions WHERE status='published' LIMIT 1"))!;
    expect((await e.del(`/api/admin/versions/${published.id}`)).data.error).toBe('bad_state');
  });

  it('admin can preview any stored PDF through the authenticated route only', async () => {
    const rev = await login('reviewer@example.com');
    const id = (await app.ctx.db.get('SELECT id FROM toolkit_versions LIMIT 1'))!.id;
    const r = await rev.get(`/api/admin/versions/${id}/file`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    expect((await new Client(app.url).get(`/api/admin/versions/${id}/file`)).status).toBe(401);
  });
});

describe('activation', () => {
  it('deactivating a planner removes it from reports without inventing a replacement', async () => {
    const rev = await login('reviewer@example.com');
    expect((await rev.patch('/api/admin/toolkits/TK04', { active: false })).status).toBe(200);
    const pub = new Client(app.url);
    const a = (await submitAssessment(pub)).data;
    const t = (await requestReport(pub, a)).data.reportToken;
    const rep = (await pub.get(`/api/reports/${t}`)).data;
    expect(rep.toolkits.map((k: any) => k.id)).not.toContain('TK04');
    expect(rep.result.priorities[0].toolkit).toBe('TK04');
    await rev.patch('/api/admin/toolkits/TK04', { active: true });
  });
  it('track/pillar cannot be changed and retired pre-V4.3 worksheets cannot be re-activated', async () => {
    const admin = await login('admin@example.com');
    expect((await admin.patch('/api/admin/toolkits/TK04', { track: 'career' })).status).toBe(400);
    const now = new Date().toISOString();
    await app.ctx.db.run("INSERT INTO toolkits (id,title,description,track,pillar,minutes,builtin,active,created_at,updated_at) VALUES ('financial-reset','30-Day Financial Reset','Retired worksheet','financial','R','15 min',1,0,?,?)", now, now);
    expect((await admin.patch('/api/admin/toolkits/financial-reset', { active: true })).data.error).toBe('retired');
    expect((await admin.patch('/api/admin/toolkits/TK04', { title: 'Debt and Cash Flow Reset' })).data.title).toBe('Debt and Cash Flow Reset');
  });
});

describe('leads (personal data)', () => {
  it('admin sees decrypted contacts and every view/export is audited; the CSV only includes opted-in contacts and neutralises formulas', async () => {
    const pub = new Client(app.url);
    const a1 = (await submitAssessment(pub)).data;
    await requestReport(pub, a1, { email: 'optin@example.com', firstName: '=HYPERLINK("http://x")', marketingOptIn: true });
    const a2 = (await submitAssessment(pub)).data;
    await requestReport(pub, a2, { email: 'optout@example.com', firstName: 'Nora', marketingOptIn: false });

    const admin = await login('admin@example.com');
    const leads = (await admin.get('/api/admin/leads')).data.leads;
    expect(leads.map((l: any) => l.email)).toEqual(expect.arrayContaining(['optin@example.com', 'optout@example.com']));
    const csv = (await admin.get('/api/admin/leads/export.csv')).data as string;
    expect(csv).toContain('optin@example.com');
    expect(csv).not.toContain('optout@example.com');
    expect(csv).toContain(`"'=HYPERLINK`);
    const actions = (await admin.get('/api/admin/audit')).data.entries.map((x: any) => x.action);
    expect(actions).toEqual(expect.arrayContaining(['leads.view', 'leads.export_marketing', 'toolkit.update', 'version.publish']));
  });
});

describe('launch readiness', () => {
  it('flags the blocking items that remain before public launch', async () => {
    const admin = await login('admin@example.com');
    const checks = (await admin.get('/api/admin/launch-readiness')).data.checks as { id: string; ok: boolean; blocking: boolean }[];
    const failing = checks.filter((c) => !c.ok && c.blocking).map((c) => c.id);
    expect(failing).toEqual(expect.arrayContaining(['privacy-approved', 'privacy-placeholders', 'toolkits-reviewed', 'mail', 'prod-mode', 'https']));
    // toolkit compliance sign-off flows through
    for (const t of (await admin.get('/api/admin/toolkits')).data.toolkits.filter((t: any) => t.builtin && t.active)) await admin.post(`/api/admin/toolkits/${t.id}/compliance-review`, {});
    const after = (await admin.get('/api/admin/launch-readiness')).data.checks.find((c: any) => c.id === 'toolkits-reviewed');
    expect(after.ok).toBe(true);
  });
});
