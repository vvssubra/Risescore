import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './admin.css';

import { CAREER_GOALS, FIN_GOALS, ROLES } from '../../shared/profile.ts';

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const e = (x: unknown) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const main = $('#main');

type Role = 'admin' | 'reviewer' | 'editor';
interface User { id: string; email: string; name: string; role: Role; mustChangePassword?: boolean; active?: boolean }
let user: User | null = null;
let csrf = '';
let tab = 'toolkits';
let toolkits: any[] = [];
let rules: any[] = [];
/** Version panels the user has expanded; kept across re-renders so actions don't collapse their workspace. */
const openKits = new Set<string>();

class Err extends Error { constructor(public status: number, m: string) { super(m); } }
async function api<T = any>(method: string, path: string, body?: unknown, raw?: { data: BodyInit; headers: Record<string, string> }): Promise<T> {
  const headers: Record<string, string> = { ...(raw?.headers ?? {}) };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch('/api/admin' + path, { method, headers, body: raw ? raw.data : body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Err(res.status, (data as any)?.message ?? 'Request failed');
  return data as T;
}

const toast = (m: string) => { const t = $('#toast'); t.textContent = ''; setTimeout(() => (t.textContent = m), 20); };
const fail = (err: unknown) => { const m = (err as Error).message; toast(m); const box = main.querySelector('.flash') ?? Object.assign(document.createElement('div'), { className: 'err flash', role: 'alert' }); box.textContent = m; main.prepend(box); window.scrollTo({ top: 0 }); };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const size = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');

/** Native <dialog> prompt. Returns form values or null if cancelled. */
function ask(title: string, fields: string, submit = 'Confirm'): Promise<Record<string, FormDataEntryValue> | null> {
  const dlg = $('#dlg') as HTMLDialogElement;
  dlg.innerHTML = `<form method="dialog"><h2>${e(title)}</h2>${fields}<div class="actions"><button class="btn primary" value="ok">${e(submit)}</button><button class="btn" value="cancel" formnovalidate>Cancel</button></div></form>`;
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => {
      if (dlg.returnValue !== 'ok') return resolve(null);
      resolve(Object.fromEntries(new FormData(dlg.querySelector('form')!)));
    }, { once: true });
    dlg.returnValue = '';
    dlg.showModal();
  });
}

// ---------- shell ----------
function chrome() {
  $('#who').innerHTML = user ? `<span>${e(user.name)} · <strong>${e(user.role)}</strong></span><button class="btn sm" id="pwBtn">Change password</button><button class="btn sm" id="outBtn">Sign out</button>` : '';
  const tabs = [['toolkits', 'Toolkit library'], ['rules', 'Matching rules']];
  if (user?.role === 'admin') tabs.push(['leads', 'Leads'], ['users', 'Staff'], ['audit', 'Audit log'], ['launch', 'Launch readiness']);
  $('#nav').innerHTML = user ? tabs.map(([k, l]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</button>`).join('') : '';
  $('#pwBtn')?.addEventListener('click', changePassword);
  $('#outBtn')?.addEventListener('click', async () => { await api('POST', '/auth/logout', {}).catch(() => 0); user = null; csrf = ''; start(); });
  document.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab!; show(); }));
}

async function changePassword() {
  const v = await ask('Change password', `<div><label for="c">Current password</label><input id="c" name="current" type="password" autocomplete="current-password" required></div><div><label for="n">New password (12+ characters, upper, lower, number)</label><input id="n" name="next" type="password" autocomplete="new-password" required minlength="12"></div>`, 'Change password');
  if (!v) return;
  try { await api('POST', '/auth/password', v); toast('Password changed.'); if (user) user.mustChangePassword = false; show(); } catch (err) { fail(err); }
}

function loginView() {
  main.innerHTML = `<form class="card login" id="loginForm"><h1>Staff sign-in</h1><p class="lead">Authorised Balla DK staff only.</p><div id="lerr" role="alert"></div>
  <div><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div><div class="mt12"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>
  <p><button class="btn primary w100">Sign in</button></p></form>`;
  $('#em').focus();
  $('#loginForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const r = await api('POST', '/auth/login', { email: ($('#em') as HTMLInputElement).value, password: ($('#pw') as HTMLInputElement).value });
      user = r.user; csrf = r.csrfToken; tab = 'toolkits'; await show();
      if (user?.mustChangePassword) await changePassword();
    } catch (err) { $('#lerr').innerHTML = `<div class="err">${e((err as Error).message)}</div>`; }
  });
}

async function show() {
  chrome();
  main.innerHTML = '<p class="muted">Loading…</p>';
  try {
    if (tab === 'toolkits') await toolkitsView();
    else if (tab === 'rules') await rulesView();
    else if (tab === 'leads') await leadsView();
    else if (tab === 'users') await usersView();
    else if (tab === 'audit') await auditView();
    else if (tab === 'launch') await launchView();
  } catch (err) {
    if (err instanceof Err && err.status === 401) { user = null; start(); return; }
    main.innerHTML = `<div class="err" role="alert">${e((err as Error).message)}</div>`;
  }
  main.focus({ preventScroll: true });
}

const statusChip = (s: string) => `<span class="chip ${s === 'published' ? 'ok' : s === 'in_review' ? 'warn' : s === 'rejected' ? 'bad' : ''}">${e(s.replace('_', ' '))}</span>`;
const canReview = () => user?.role === 'admin' || user?.role === 'reviewer';

// ---------- toolkits ----------
async function toolkitsView() {
  toolkits = (await api('GET', '/toolkits')).toolkits;
  const unreviewed = toolkits.filter((t) => t.builtin && !t.compliance_reviewed_at).length;
  main.innerHTML = `<h1>Toolkit library</h1><p class="lead">Upload PDFs, send them for review, publish and version them. Nothing reaches the public until a different person approves it. Built-in interactive worksheets always remain as the safe fallback.</p>
  ${unreviewed ? `<div class="card warn-card"><strong>${unreviewed} built-in worksheet(s) still need a compliance review</strong> before public launch (Malaysian regulatory wording, no product recommendations or return claims).</div>` : ''}
  <details class="card"><summary>Add a new toolkit</summary><form id="newKit" class="grid mt12">
   <div><label for="nt">Title</label><input id="nt" name="title" required minlength="3" maxlength="120"></div>
   <div class="span-all"><label for="nd">Short description</label><input id="nd" name="description" required minlength="10" maxlength="300"></div>
   <div><label for="ntr">Assessment</label><select id="ntr" name="track"><option value="financial">Financial</option><option value="career">Career & Income</option><option value="both">Both</option></select></div>
   <div><label for="np">Pillar</label><select id="np" name="pillar"><option value="R">R · Restore</option><option value="I">I · Income</option><option value="S">S · Sustain</option><option value="E">E · Empire</option></select></div>
   <div><label for="nm">Time</label><input id="nm" name="minutes" value="15 min"></div>
   <div class="align-end"><button class="btn primary">Create toolkit</button></div></form></details>
  ${toolkits.map(kitCard).join('')}`;
  $('#newKit').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try { await api('POST', '/toolkits', Object.fromEntries(new FormData(ev.target as HTMLFormElement))); toast('Toolkit created. Upload a PDF to publish it.'); await show(); } catch (err) { fail(err); }
  });
  main.querySelectorAll<HTMLDetailsElement>('details[data-kit]').forEach((d) => d.addEventListener('toggle', () => { if (d.open) openKits.add(d.dataset.kit!); else openKits.delete(d.dataset.kit!); }));
  main.querySelectorAll<HTMLElement>('[data-act]').forEach((b) => b.addEventListener('click', () => onKitAction(b)));
  main.querySelectorAll<HTMLInputElement>('input[data-upload]').forEach((i) => i.addEventListener('change', () => onUpload(i)));
}

function kitCard(t: any) {
  const cur = t.currentPdf;
  return `<article class="card"><div class="row"><div><h2>${e(t.title)}</h2><div class="small muted">${e(t.id)} · ${e(t.track)} · pillar ${e(t.pillar)} · ${e(t.minutes)}</div></div>
  <div class="actions">${canReview() ? `<button class="btn sm" data-act="${t.active ? 'deactivate' : 'activate'}" data-id="${e(t.id)}">${t.active ? 'Deactivate' : 'Activate'}</button>` : ''}</div></div>
  <p class="small mt8">${e(t.description)}</p>
  <div>${t.builtin ? '<span class="chip gold">built-in worksheet</span>' : '<span class="chip">custom (PDF only)</span>'}<span class="chip ${t.active ? 'ok' : 'bad'}">${t.active ? 'active' : 'inactive'}</span>
  ${cur ? `<span class="chip ok">PDF v${cur.version} live${cur.review_expires_at ? ' until ' + e(fmt(cur.review_expires_at)) : ''}</span>` : '<span class="chip">no PDF live</span>'}
  ${t.builtin ? (t.compliance_reviewed_at ? `<span class="chip ok">compliance reviewed ${e(fmt(t.compliance_reviewed_at))}</span>` : '<span class="chip warn">compliance review pending</span>') : ''}</div>
  <details class="mt8" data-kit="${e(t.id)}" ${openKits.has(t.id) ? 'open' : ''}><summary>Versions (${t.versions.length}) &amp; upload</summary>
   <div class="tablewrap"><table><thead><tr><th>Ver</th><th>File</th><th>Status</th><th>Uploaded</th><th>Review</th><th></th></tr></thead><tbody>
   ${t.versions.map((v: any) => `<tr><td>v${v.version}</td><td>${e(v.filename)}<div class="muted small">${size(v.size_bytes)} · sha256 ${e(v.sha256.slice(0, 10))}…</div></td><td>${statusChip(v.status)}</td><td>${e(fmt(v.created_at))}</td>
   <td class="small">${v.review_note ? e(v.review_note) : ''}${v.reviewed_at ? `<div class="muted">${e(fmt(v.reviewed_at))}</div>` : ''}</td>
   <td><div class="actions"><button class="btn sm" data-act="preview" data-vid="${v.id}">Preview</button>
   ${['draft', 'rejected'].includes(v.status) ? `<button class="btn sm primary" data-act="submit" data-vid="${v.id}">Submit for review</button>` : ''}
   ${v.status === 'in_review' && canReview() ? `<button class="btn sm primary" data-act="review" data-vid="${v.id}">Review…</button>` : ''}
   ${v.status === 'published' && canReview() ? `<button class="btn sm" data-act="archive" data-vid="${v.id}">Archive</button>` : ''}
   ${['draft', 'rejected'].includes(v.status) ? `<button class="btn sm danger" data-act="delvers" data-vid="${v.id}">Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No PDFs uploaded yet.</td></tr>'}
   </tbody></table></div>
   <div class="mt12"><label for="up-${e(t.id)}">Upload a new PDF version (max 15 MB, no scripts or embedded files)</label><input id="up-${e(t.id)}" type="file" accept="application/pdf" data-upload="${e(t.id)}"></div>
   ${t.builtin && canReview() ? `<p class="mt12"><button class="btn sm" data-act="compliance" data-id="${e(t.id)}">Mark worksheet content as compliance-reviewed</button></p>` : ''}
  </details></article>`;
}

async function onUpload(input: HTMLInputElement) {
  const f = input.files?.[0];
  if (!f) return;
  try {
    await api('PUT', `/toolkits/${input.dataset.upload}/versions`, undefined, { data: f, headers: { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent(f.name) } });
    toast('Uploaded as a draft. Submit it for review when ready.'); await show();
  } catch (err) { fail(err); input.value = ''; }
}

async function onKitAction(b: HTMLElement) {
  const { act, id, vid } = b.dataset;
  try {
    if (act === 'activate' || act === 'deactivate') await api('PATCH', `/toolkits/${id}`, { active: act === 'activate' });
    else if (act === 'compliance') { if (!confirm('Confirm this worksheet’s wording has been reviewed for Malaysian compliance?')) return; await api('POST', `/toolkits/${id}/compliance-review`, {}); }
    else if (act === 'submit') await api('POST', `/versions/${vid}/submit`, {});
    else if (act === 'archive') { if (!confirm('Archive this version? It will stop being served immediately.')) return; await api('POST', `/versions/${vid}/archive`, {}); }
    else if (act === 'delvers') { if (!confirm('Delete this version and its file?')) return; await api('DELETE', `/versions/${vid}`); }
    else if (act === 'preview') { window.open(`/api/admin/versions/${vid}/file`, '_blank', 'noopener'); return; }
    else if (act === 'review') {
      const v = await ask('Review PDF', `<div><label for="dec">Decision</label><select id="dec" name="decision"><option value="publish">Approve and publish</option><option value="reject">Reject (needs a note)</option></select></div>
        <div><label for="nt2">Note ${'(required when rejecting)'}</label><textarea id="nt2" name="note" rows="3" maxlength="500"></textarea></div>
        <div><label for="ex">Review expires on (optional — the PDF is hidden automatically after this date)</label><input id="ex" name="reviewExpiresAt" type="date"></div>`, 'Submit decision');
      if (!v) return;
      await api('POST', `/versions/${vid}/review`, { decision: v.decision, note: String(v.note ?? '') || undefined, reviewExpiresAt: v.reviewExpiresAt ? `${v.reviewExpiresAt}T23:59:59` : undefined });
    }
    toast('Done.'); await show();
  } catch (err) { fail(err); }
}

// ---------- rules ----------
const STAGE_HELP: Record<string, string> = {
  fallback: 'Used when answers are too incomplete to score. Always keep one.',
  alert: 'Shown first when a specific critical alert fires (severe alerts take precedence).',
  primary: 'Default toolkit for the priority pillar, or the annual review when everything is strong.',
  profile: 'Extra specialist toolkit chosen by goal, role or dependants. Max 3 toolkits are shown overall.',
};
const ALERTS = ['cash_crisis', 'debt_arrears', 'fragile_buffer', 'dependent_cover', 'investing_essential', 'concentration', 'business_feasibility', 'career_arrears', 'switch_runway', 'sales_authorisation', 'unit_trust_age', 'weak_business_model'];
const condText = (w: any) => [w.alert && `alert = ${w.alert}`, w.priority && `priority = ${w.priority}`, w.allStrong && 'all pillars strong, no alerts', w.goals && `goal ∈ ${w.goals.join(', ')}`, w.roles && `role ∈ ${w.roles.join(', ')}`, w.dependants && `dependants = ${w.dependants}`].filter(Boolean).join(' · ') || 'always';

async function rulesView() {
  [rules, toolkits] = await Promise.all([api('GET', '/rules').then((r) => r.rules), api('GET', '/toolkits').then((r) => r.toolkits)]);
  const rank: Record<string, number> = { fallback: 0, alert: 1, primary: 2, profile: 3 };
  rules.sort((a, b) => rank[a.stage] - rank[b.stage] || a.order - b.order);
  const title = (id: string) => toolkits.find((t) => t.id === id)?.title ?? id;
  const admin = user?.role === 'admin';
  main.innerHTML = `<h1>Matching rules</h1><p class="lead">Decide which toolkit appears for which result — no code changes needed. Rules run in this order: fallback → alert → primary → profile; the first three available toolkits are shown.</p>
  ${admin ? '<p><button class="btn primary" id="addRule">Add rule</button></p>' : '<p class="muted">Only admins can change rules.</p>'}
  <div class="card tablewrap"><table><thead><tr><th>Stage</th><th>Track</th><th>When</th><th>Toolkit</th><th>Order</th><th>Active</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>
  ${rules.map((r) => `<tr><td><strong>${e(r.stage)}</strong><div class="muted small">${e(STAGE_HELP[r.stage])}</div></td><td>${e(r.track)}</td><td class="small">${e(condText(r.when))}</td><td>${e(title(r.toolkitId))}</td><td>${r.order}</td><td>${r.active ? '<span class="chip ok">on</span>' : '<span class="chip bad">off</span>'}</td>
  ${admin ? `<td><div class="actions"><button class="btn sm" data-r="edit" data-id="${e(r.id)}">Edit</button><button class="btn sm danger" data-r="del" data-id="${e(r.id)}">Delete</button></div></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  $('#addRule')?.addEventListener('click', () => editRule());
  main.querySelectorAll<HTMLElement>('[data-r]').forEach((b) => b.addEventListener('click', async () => {
    const r = rules.find((x) => x.id === b.dataset.id);
    if (b.dataset.r === 'edit') editRule(r);
    else if (confirm('Delete this rule?')) { try { await api('DELETE', `/rules/${r.id}`); await show(); } catch (err) { fail(err); } }
  }));
}

async function editRule(r?: any) {
  const w = r?.when ?? {};
  const opts = (arr: [string, string][], sel: string[] = []) => arr.map(([k, l]) => `<option value="${e(k)}" ${sel.includes(k) ? 'selected' : ''}>${e(l)}</option>`).join('');
  const v = await ask(r ? 'Edit rule' : 'Add rule', `
   <div><label for="rs">Stage</label><select id="rs" name="stage">${opts(Object.keys(STAGE_HELP).map((k) => [k, k]), [r?.stage ?? 'alert'])}</select></div>
   <div><label for="rt">Track</label><select id="rt" name="track">${opts([['financial', 'financial'], ['career', 'career'], ['both', 'both']], [r?.track ?? 'financial'])}</select></div>
   <div><label for="rk">Toolkit</label><select id="rk" name="toolkitId">${opts(toolkits.map((t) => [t.id, t.title]), [r?.toolkitId ?? ''])}</select></div>
   <div><label for="ro">Order (lower first)</label><input id="ro" name="order" type="number" min="0" max="1000" value="${r?.order ?? 10}"></div>
   <div><label for="ra">When alert fires (alert stage)</label><select id="ra" name="alert"><option value="">—</option>${opts(ALERTS.map((a) => [a, a]), [w.alert ?? ''])}</select></div>
   <div><label for="rp">When priority pillar is</label><select id="rp" name="priority"><option value="">—</option>${opts([['R', 'R'], ['I', 'I'], ['S', 'S'], ['E', 'E']], [w.priority ?? ''])}</select></div>
   <div class="check"><input id="rsg" type="checkbox" name="allStrong" ${w.allStrong ? 'checked' : ''}><label for="rsg">All pillars strong and no alerts (annual review)</label></div>
   <div><label for="rg">Goals (any of; hold Ctrl/Cmd)</label><select id="rg" name="goals" multiple size="5">${opts([...new Map([...FIN_GOALS, ...CAREER_GOALS].map((g) => [g[0], g])).values()].map((g) => [g[0], g[1]]), w.goals ?? [])}</select></div>
   <div><label for="rr">Roles (any of)</label><select id="rr" name="roles" multiple size="4">${opts(ROLES.map((x) => [x[0], x[1]]), w.roles ?? [])}</select></div>
   <div><label for="rd">Dependants</label><select id="rd" name="dependants"><option value="">—</option>${opts([['yes', 'yes'], ['no', 'no'], ['unsure', 'unsure']], [w.dependants ?? ''])}</select></div>
   <div class="check"><input id="rac" type="checkbox" name="active" ${(r?.active ?? true) ? 'checked' : ''}><label for="rac">Active</label></div>`, 'Save rule');
  if (!v) return;
  const dlg = $('#dlg') as HTMLDialogElement;
  const sel = (id: string) => [...(dlg.querySelector<HTMLSelectElement>(`#${id}`)?.selectedOptions ?? [])].map((o) => o.value);
  const when: Record<string, unknown> = {};
  if (v.alert) when.alert = v.alert;
  if (v.priority) when.priority = v.priority;
  if (v.allStrong) when.allStrong = true;
  if (sel('rg').length) when.goals = sel('rg');
  if (sel('rr').length) when.roles = sel('rr');
  if (v.dependants) when.dependants = v.dependants;
  try {
    const body = { toolkitId: v.toolkitId, stage: v.stage, track: v.track, order: Number(v.order), active: !!v.active, when };
    if (r) await api('PUT', `/rules/${r.id}`, body); else await api('POST', '/rules', body);
    toast('Rule saved.'); await show();
  } catch (err) { fail(err); }
}

// ---------- leads ----------
async function leadsView() {
  const { leads } = await api('GET', '/leads');
  main.innerHTML = `<h1>Report requests</h1><p class="lead">Personal data. Every view and export is recorded in the audit log. Only people who ticked the separate marketing box appear in the export.</p>
  <p><a class="btn primary" href="/api/admin/leads/export.csv">Export marketing opt-ins (CSV)</a></p>
  <div class="card tablewrap"><table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Track</th><th>Score</th><th>Alerts</th><th>Marketing</th><th>Status</th></tr></thead><tbody>
  ${leads.map((l: any) => `<tr><td>${e(fmt(l.createdAt))}</td><td>${e(l.name)}</td><td>${e(l.email)}</td><td>${e(l.track)}</td><td>${l.overall ?? '—'}</td><td>${l.alertCount}</td><td>${l.marketingOptIn ? '<span class="chip ok">opted in</span>' : '<span class="chip">no</span>'}</td><td>${e(l.status)}${l.emailVerified ? ' ✓' : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No requests yet.</td></tr>'}</tbody></table></div>`;
}

// ---------- users ----------
async function usersView() {
  const { users } = await api('GET', '/users');
  main.innerHTML = `<h1>Staff</h1><p class="lead"><strong>Editors</strong> upload and edit drafts. <strong>Reviewers</strong> also approve, publish, archive and activate. <strong>Admins</strong> additionally manage rules, staff, leads and the audit log.</p>
  <details class="card" open><summary>Add a staff member</summary><form id="newUser" class="grid mt12"><div><label for="un">Name</label><input id="un" name="name" required></div><div><label for="ue">Email</label><input id="ue" name="email" type="email" required autocomplete="off"></div>
  <div><label for="ur">Role</label><select id="ur" name="role"><option value="editor">Editor</option><option value="reviewer">Reviewer</option><option value="admin">Admin</option></select></div>
  <div><label for="up">Temporary password (12+ chars)</label><input id="up" name="password" type="password" required minlength="12" autocomplete="new-password"></div><div class="align-end"><button class="btn primary">Create</button></div></form></details>
  <div class="card tablewrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead><tbody>${users.map((u: any) => `<tr><td>${e(u.name)}</td><td>${e(u.email)}</td><td>${e(u.role)}</td><td>${e(fmt(u.lastLoginAt))}</td><td>${u.active ? '<span class="chip ok">active</span>' : '<span class="chip bad">disabled</span>'}</td>
  <td><div class="actions"><select aria-label="Role for ${e(u.email)}" data-role="${e(u.id)}">${['editor', 'reviewer', 'admin'].map((r) => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select><button class="btn sm" data-u="toggle" data-id="${e(u.id)}" data-active="${u.active}">${u.active ? 'Disable' : 'Enable'}</button><button class="btn sm" data-u="reset" data-id="${e(u.id)}">Reset password</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $('#newUser').addEventListener('submit', async (ev) => { ev.preventDefault(); try { await api('POST', '/users', Object.fromEntries(new FormData(ev.target as HTMLFormElement))); toast('Staff member created; they must change the password at first sign-in.'); await show(); } catch (err) { fail(err); } });
  main.querySelectorAll<HTMLSelectElement>('select[data-role]').forEach((s) => s.addEventListener('change', async () => { try { await api('PATCH', `/users/${s.dataset.role}`, { role: s.value }); toast('Role updated.'); await show(); } catch (err) { fail(err); await show(); } }));
  main.querySelectorAll<HTMLElement>('[data-u]').forEach((b) => b.addEventListener('click', async () => {
    try {
      if (b.dataset.u === 'toggle') await api('PATCH', `/users/${b.dataset.id}`, { active: b.dataset.active !== 'true' });
      else { const v = await ask('Reset password', '<div><label for="np2">New temporary password (12+ chars)</label><input id="np2" name="p" type="password" required minlength="12" autocomplete="new-password"></div>', 'Reset'); if (!v) return; await api('PATCH', `/users/${b.dataset.id}`, { newPassword: v.p }); }
      toast('Updated.'); await show();
    } catch (err) { fail(err); }
  }));
}

async function auditView() {
  const { entries } = await api('GET', '/audit');
  main.innerHTML = `<h1>Audit log</h1><p class="lead">Latest 200 events. Contains no passwords, tokens or report contents.</p><div class="card tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>${entries.map((x: any) => `<tr><td>${e(fmt(x.at))}</td><td>${e(x.actor ?? 'system')}</td><td>${e(x.action)}</td><td>${e([x.entity, x.entity_id].filter(Boolean).join(' '))}</td><td class="small muted">${e(x.detail ?? '')}</td></tr>`).join('')}</tbody></table></div>`;
}

async function launchView() {
  const { checks } = await api('GET', '/launch-readiness');
  const blocked = checks.filter((c: any) => !c.ok && c.blocking).length;
  main.innerHTML = `<h1>Launch readiness</h1><p class="lead">${blocked ? `<strong>${blocked} blocking item(s)</strong> must be resolved before the scorecard is shown to the public.` : 'All blocking checks pass.'}</p><div class="card"><ul class="checks">${checks.map((c: any) => `<li><span class="chip ${c.ok ? 'ok' : c.blocking ? 'bad' : 'warn'}">${c.ok ? 'OK' : c.blocking ? 'BLOCKING' : 'NOTE'}</span><div><strong>${e(c.label)}</strong><div class="muted small">${e(c.detail)}</div></div></li>`).join('')}</ul></div>`;
}

async function start() {
  try { const r = await api('GET', '/auth/me'); user = r.user; csrf = r.csrfToken; await show(); if (user?.mustChangePassword) await changePassword(); }
  catch { chrome(); loginView(); }
}
void start();
