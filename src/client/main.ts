import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import './styles/base.css';
import './styles/app.css';
import './styles/print-report.css';

import { questionsFor } from '../shared/engine.ts';
import { choicesFor, defaultProfile, profileKeys } from '../shared/profile.ts';
import type { Profile, Track } from '../shared/types.ts';
import { ApiError, api, type Legal, type PublicConfig } from './lib/api.ts';
import { announce, hydrateStyles, safeSession, scrollTop } from './lib/dom.ts';
import { getLocale, initLocale, setLocale, t } from './lib/i18n.ts';
import { reset, snapshot, state, type Stage } from './lib/store.ts';
import { gate } from './views/gate.ts';
import { assessmentQuestion, pending, preview, profileQuestion, submitting, trackChoose, welcome } from './views/flow.ts';
import { closeModal, modalIsOpen, openPrivacy, openWorksheet } from './views/modals.ts';
import { deleted, fullReport, reportError, reportLoading } from './views/report.ts';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const app = $('#app');
const SESSION_KEY = 'rise_progress_v1';
const ADVANCE_MS = 220;

let config: PublicConfig | null = null;
let legal: Legal | null = null;
let timer: number | undefined;
/** True only between a pointer press on an answer and the click it produces. Keyboard selection never sets it, so it never auto-advances. */
let pointerSelect = false;

// ---------- data loading ----------
async function loadMeta(force = false) {
  try {
    if (force || !config) config = await api.config();
    if (force || !legal) legal = await api.legal();
  } catch { /* shown when the gate is submitted; the free flow does not depend on it */ }
}

// ---------- rendering ----------
function view(): string {
  switch (state.stage) {
    case 'welcome': return welcome();
    case 'track': return trackChoose();
    case 'profile': return profileQuestion();
    case 'question': return assessmentQuestion();
    case 'submitting': return submitting();
    case 'preview': return preview();
    case 'gate': return gate(legal);
    case 'pending': return pending();
    case 'report-loading': return reportLoading();
    case 'report': return fullReport(state.report!);
    case 'report-error': return reportError();
    case 'deleted': return deleted();
  }
}

function chrome() {
  document.documentElement.lang = getLocale();
  $('#skipLink').textContent = t('skip');
  $('#brandBy').textContent = t('brand.by');
  $('#navTrust').textContent = t('nav.trust');
  const lb = $('#langBtn');
  lb.innerHTML = `<span class="lang-full">${t('nav.lang')}</span><span class="lang-short" aria-hidden="true">${getLocale() === 'en' ? 'BM' : 'EN'}</span>`;
  lb.setAttribute('lang', getLocale() === 'en' ? 'ms' : 'en');
  lb.setAttribute('aria-label', t('nav.langLabel'));
  $('#restartBtn').innerHTML = `${t('nav.restart')} <span aria-hidden="true">↗</span>`;
  $('#footLeft').textContent = t('footer.left');
  $('#footRight').textContent = t('footer.right');
  $('#footPrivacy').textContent = t('footer.privacy');
}

function announceStage() {
  if (state.stage === 'question') announce(t('q.progress', { n: state.questionIndex + 1, total: state.queue.length }));
  else if (state.stage === 'profile') announce(t('q.progressP', { n: state.profileIndex + 1, total: profileKeys(state.track!).length }));
}

function render(focus = true) {
  pointerSelect = false;
  chrome();
  $('#restartBtn').hidden = state.stage === 'welcome';
  app.innerHTML = view();
  hydrateStyles(app);
  if (focus) {
    app.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    announceStage();
  }
  persist();
}

function persist() {
  const keep: Stage[] = ['profile', 'question', 'preview', 'gate'];
  safeSession(SESSION_KEY, keep.includes(state.stage) ? snapshot() : null);
}

// ---------- navigation (history-aware so the hardware Back button steps through the questions) ----------
function go(stage: Stage, mode: 'push' | 'replace' | 'none' = 'push') {
  clearTimeout(timer);
  state.stage = stage;
  if (mode === 'push') { state.depth++; history.pushState({ d: state.depth }, '', location.pathname); }
  else if (mode === 'replace') history.replaceState({ d: state.depth }, '', location.pathname);
  render();
  scrollTop();
}

function previous() {
  clearTimeout(timer);
  const s = state.stage;
  if (s === 'question') {
    if (state.questionIndex > 0) state.questionIndex--;
    else { state.stage = 'profile'; state.profileIndex = profileKeys(state.track!).length - 1; }
  } else if (s === 'submitting') { state.error = ''; state.stage = 'question'; state.questionIndex = state.queue.length - 1; }
  else if (s === 'profile') {
    if (state.profileIndex > 0) state.profileIndex--; else state.stage = 'track';
  } else if (s === 'track') state.stage = 'welcome';
  else if (s === 'preview') { state.stage = 'question'; state.questionIndex = state.queue.length - 1; }
  else if (s === 'gate' || s === 'pending') state.stage = 'preview';
  else if (['report', 'report-loading', 'report-error', 'deleted'].includes(s)) state.stage = state.assessment ? 'preview' : 'welcome';
  else return;
  render();
  scrollTop();
}

function back() { if (state.depth > 0) history.back(); else previous(); }

window.addEventListener('popstate', () => {
  if (modalIsOpen()) closeModal();
  if (state.depth > 0) state.depth--;
  const m = location.pathname.match(/^\/report\/([\w-]+)$/);
  if (m && !location.pathname.startsWith('/report/verify/')) { void openReport(m[1], false); return; }
  previous();
});

// ---------- flow ----------
function startTrack(track: Track) {
  state.track = track;
  state.profile = defaultProfile(track);
  state.profileIndex = 0;
  state.profileAnswered = {};
  state.answers = {};
  go('profile');
}

function buildQueue() {
  state.queue = questionsFor(state.profile);
  state.questionIndex = 0;
}

function nextProfile() {
  clearTimeout(timer);
  const keys = profileKeys(state.track!);
  if (!state.profileAnswered[keys[state.profileIndex]]) return;
  if (state.profileIndex < keys.length - 1) { state.profileIndex++; go('profile'); }
  else { buildQueue(); go('question'); }
}

function nextQuestion() {
  clearTimeout(timer);
  const q = state.queue[state.questionIndex];
  if (!state.answers[q.id]) return;
  if (state.questionIndex < state.queue.length - 1) { state.questionIndex++; go('question'); }
  else void submit();
}

async function submit() {
  state.error = '';
  go('submitting');
  // Only answers to questions that are active for this profile are sent (the server rejects anything else).
  const active = new Set(state.queue.map((q) => q.id));
  const answers = Object.fromEntries(Object.entries(state.answers).filter(([k]) => active.has(k)));
  try {
    const out = await api.createAssessment(state.profile as Profile, answers);
    state.assessment = { id: out.id, sessionToken: out.sessionToken, preview: out.preview };
    go('preview', 'replace');
  } catch (err) {
    state.error = err instanceof ApiError && err.status === 0 ? t('err.network') : err instanceof ApiError && err.status === 429 ? t('err.generic') : err instanceof ApiError ? err.message : t('err.generic');
    render();
  }
}

function selectOption(input: HTMLInputElement, advance: boolean) {
  const form = input.closest<HTMLFormElement>('form[data-form]');
  if (!form) return;
  const value = input.value;
  form.querySelectorAll('.answer-option').forEach((l) => l.classList.toggle('chosen', l.contains(input)));
  input.checked = true;
  const kind = form.dataset.form;
  if (kind === 'profile') {
    const key = profileKeys(state.track!)[state.profileIndex];
    (state.profile as unknown as Record<string, string>)[key] = value;
    state.profileAnswered[key] = true;
  } else {
    state.answers[state.queue[state.questionIndex].id] = value;
  }
  form.querySelector<HTMLElement>('[data-continue]')?.removeAttribute('hidden');
  form.querySelector<HTMLElement>('[data-continue-hint]')?.setAttribute('hidden', '');
  persist();
  clearTimeout(timer);
  if (advance && state.autoAdvance) timer = window.setTimeout(() => (kind === 'profile' ? nextProfile() : nextQuestion()), ADVANCE_MS);
}

// ---------- gate / report ----------
async function submitGate(form: HTMLFormElement) {
  const g = state.gate;
  g.firstName = form.querySelector<HTMLInputElement>('#gateName')!.value.trim();
  g.email = form.querySelector<HTMLInputElement>('#gateEmail')!.value.trim();
  g.consent = form.querySelector<HTMLInputElement>('#gateConsent')!.checked;
  g.marketing = form.querySelector<HTMLInputElement>('#marketingConsent')!.checked;
  const website = form.querySelector<HTMLInputElement>('#gateWebsite')!.value;
  const emailOk = form.querySelector<HTMLInputElement>('#gateEmail')!.checkValidity();
  const fail = (msg: string, focus?: string) => { g.error = msg; render(false); if (focus) app.querySelector<HTMLElement>(focus)?.focus(); };
  if (!g.firstName || !g.email || !emailOk) return fail(t('gate.err.fields'), !g.firstName ? '#gateName' : '#gateEmail');
  if (!g.consent) return fail(t('gate.err.consent'), '#gateConsent');
  if (!config) await loadMeta(true);
  if (!config || !state.assessment) return fail(t('err.network'));
  g.error = ''; g.busy = true; render(false);
  try {
    const out = await api.requestReport({
      assessmentId: state.assessment.id, sessionToken: state.assessment.sessionToken, firstName: g.firstName, email: g.email,
      processingConsent: true, marketingOptIn: g.marketing, privacyNoticeVersion: config.privacyNoticeVersion, locale: getLocale(), website,
    });
    g.busy = false;
    if (out.status === 'ready' && out.reportToken) {
      g.firstName = ''; g.email = ''; g.consent = false; g.marketing = false;
      await openReport(out.reportToken, true);
    } else {
      state.pendingEmail = g.email; g.firstName = ''; g.email = ''; g.consent = false; g.marketing = false;
      go('pending');
    }
  } catch (err) {
    g.busy = false;
    if (err instanceof ApiError && err.code === 'notice_outdated') { await loadMeta(true); fail(t('gate.err.outdated')); }
    else if (err instanceof ApiError && err.code === 'assessment_not_found') fail(t('err.expired'));
    else if (err instanceof ApiError && err.status === 0) fail(t('err.network'));
    else fail(err instanceof ApiError ? err.message : t('err.generic'));
  }
}

async function openReport(token: string, pushUrl: boolean) {
  state.reportToken = token;
  state.error = '';
  if (pushUrl) { state.depth++; history.pushState({ d: state.depth }, '', `/report/${token}`); }
  state.stage = 'report-loading';
  render();
  try {
    state.report = await api.report(token);
    state.stage = 'report';
    render();
    scrollTop();
  } catch (err) {
    state.error = err instanceof ApiError && err.status === 0 ? t('err.network') : err instanceof ApiError ? err.message : t('err.generic');
    state.stage = 'report-error';
    render();
  }
}

async function verifyAndOpen(token: string) {
  state.stage = 'report-loading'; render();
  try {
    const out = await api.verify(token);
    history.replaceState({ d: 0 }, '', out.reportPath);
    await openReport(out.reportToken, false);
  } catch (err) {
    state.error = err instanceof ApiError ? err.message : t('err.generic');
    state.stage = 'report-error';
    render();
  }
}

async function eraseData() {
  if (!state.reportToken || !window.confirm(t('report.privacy.confirm'))) return;
  try {
    await api.erase(state.reportToken);
    const auto = state.autoAdvance;
    reset(); state.autoAdvance = auto;
    safeSession(SESSION_KEY, null);
    history.replaceState({ d: 0 }, '', '/');
    state.stage = 'deleted';
    render();
  } catch { window.alert(t('report.privacy.fail')); }
}

function restartNow() {
  reset();
  safeSession(SESSION_KEY, null);
  state.depth = 0;
  history.pushState({ d: 0 }, '', '/');
  render();
  scrollTop();
}

async function showPrivacy() {
  await loadMeta();
  if (!legal) return;
  openPrivacy(legal.notice, legal.status, legal.version, getLocale());
}

// ---------- events (delegated) ----------
app.addEventListener('pointerdown', (ev) => { pointerSelect = !!(ev.target as HTMLElement).closest('.answer-option'); });

function selectedValue(form: HTMLFormElement): string | undefined {
  if (form.dataset.form === 'profile') { const k = profileKeys(state.track!)[state.profileIndex]; return state.profileAnswered[k] ? (state.profile as unknown as Record<string, string>)[k] : undefined; }
  return state.answers[state.queue[state.questionIndex].id];
}

// Taps/clicks select and (if enabled) auto-advance — including re-tapping an option that is already selected.
app.addEventListener('click', (ev) => {
  const el = ev.target as HTMLElement;
  if (!pointerSelect || !el.classList?.contains('opt-input')) return;
  pointerSelect = false;
  selectOption(el as HTMLInputElement, true);
});

app.addEventListener('change', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.classList.contains('opt-input')) {
    // Keyboard arrow navigation only selects; the person confirms with Continue/Enter, so they are never moved on unexpectedly.
    const form = el.closest<HTMLFormElement>('form[data-form]');
    if (form && selectedValue(form) === el.value) return;
    selectOption(el, false);
  } else if (el.id === 'autoAdvance') {
    state.autoAdvance = el.checked;
    persist();
  } else if (el.id === 'reportMarketing' && state.reportToken) {
    void api.setMarketing(state.reportToken, el.checked).then((r) => {
      state.report!.consent.marketingOptIn = r.marketingOptIn;
      $('#mktState').textContent = r.marketingOptIn ? t('report.privacy.mktOn') : t('report.privacy.mktOff');
    }).catch(() => { el.checked = !el.checked; window.alert(t('report.privacy.fail')); });
  }
});

app.addEventListener('keydown', (ev) => {
  pointerSelect = false;
  const el = ev.target as HTMLElement;
  // Number shortcuts only work while an answer option has focus (WCAG 2.1.4).
  if (el.classList?.contains('opt-input') && /^[1-9]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    const inputs = [...el.closest('fieldset')!.querySelectorAll<HTMLInputElement>('.opt-input')];
    const target = inputs[Number(ev.key) - 1];
    if (target) { ev.preventDefault(); target.focus(); selectOption(target, true); }
  }
});

app.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.target as HTMLFormElement;
  if (form.id === 'gateForm') void submitGate(form);
  else if (form.dataset.form === 'profile') nextProfile();
  else if (form.dataset.form === 'question') nextQuestion();
});

app.addEventListener('click', (ev) => {
  const target = ev.target as HTMLElement;
  const track = target.closest<HTMLElement>('[data-track]');
  if (track) return startTrack(track.dataset.track as Track);
  const kit = target.closest<HTMLElement>('[data-kit]');
  if (kit && state.report) {
    const k = state.report.toolkits.find((x) => x.id === kit.dataset.kit);
    if (k) openWorksheet(k as { id: string; title: string; sub: string; sections: [string, string][] });
    return;
  }
  const act = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  switch (act) {
    case 'choose': return go('track');
    case 'home': return restartNow();
    case 'previous': return back();
    case 'skip': {
      clearTimeout(timer);
      state.answers[state.queue[state.questionIndex].id] = '__skip__';
      return nextQuestionAfterSkip();
    }
    case 'retry-submit': return void submit();
    case 'edit-answers': state.questionIndex = state.queue.length - 1; return go('question');
    case 'gate': { void loadMeta(); return go('gate'); }
    case 'back-preview': return back();
    case 'privacy': return void showPrivacy();
    case 'print': return window.print();
    case 'retake': if (window.confirm(t('confirm.restart'))) restartNow(); return;
    case 'erase': return void eraseData();
    case 'restart-now': return restartNow();
  }
});

function nextQuestionAfterSkip() {
  if (state.questionIndex < state.queue.length - 1) { state.questionIndex++; go('question'); }
  else void submit();
}

$('#homeLink').addEventListener('click', (ev) => {
  ev.preventDefault();
  if (state.stage === 'welcome') return;
  const inFlow = ['profile', 'question', 'submitting', 'preview', 'gate'].includes(state.stage);
  if (!inFlow || window.confirm(t('confirm.home'))) restartNow();
});
$('#restartBtn').addEventListener('click', () => { if (window.confirm(t('confirm.restart'))) restartNow(); });
$('#langBtn').addEventListener('click', () => { setLocale(getLocale() === 'en' ? 'ms' : 'en'); render(false); announce(document.title); });
$('#footPrivacy').addEventListener('click', () => void showPrivacy());

// ---------- boot ----------
async function boot() {
  initLocale();
  const path = location.pathname;
  const verify = path.match(/^\/report\/verify\/([\w-]+)$/);
  const rep = path.match(/^\/report\/([\w-]+)$/);
  void loadMeta();
  if (verify) return void verifyAndOpen(verify[1]);
  if (rep) return void openReport(rep[1], false);

  const saved = safeSession<ReturnType<typeof snapshot>>(SESSION_KEY);
  if (saved && saved.track && ['profile', 'question', 'preview', 'gate'].includes(saved.stage)) {
    state.track = saved.track; state.profile = saved.profile; state.profileIndex = saved.profileIndex ?? 0;
    state.profileAnswered = saved.profileAnswered ?? {}; state.answers = saved.answers ?? {}; state.assessment = saved.assessment;
    state.autoAdvance = saved.autoAdvance ?? true;
    state.queue = questionsFor(state.profile);
    state.questionIndex = Math.min(saved.questionIndex ?? 0, state.queue.length - 1);
    state.stage = saved.stage === 'gate' || saved.stage === 'preview' ? (state.assessment ? saved.stage : 'question') : saved.stage;
    if (state.stage === 'question' && !state.queue.length) state.stage = 'welcome';
    // keep profile choices consistent with the allowed enumerations
    for (const k of profileKeys(state.track)) {
      const allowed = choicesFor(k, state.track).map((c) => c[0]);
      if (!allowed.includes((state.profile as unknown as Record<string, string>)[k])) { state.stage = 'welcome'; break; }
    }
  }
  history.replaceState({ d: 0 }, '', location.pathname);
  render();
}
void boot();
