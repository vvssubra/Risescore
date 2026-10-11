import { PROFILE_STEPS, choicesFor, profileKeys } from '../../shared/profile.ts';
import { e, icons } from '../lib/dom.ts';
import { optLabel, qText, t } from '../lib/i18n.ts';
import { state } from '../lib/store.ts';
import { pillarBars, pillarLabel, progress, scoreDial } from './shared.ts';

const trackName = () => (state.track === 'financial' ? t('track.financial') : t('track.career'));

export function welcome() {
  const stats: [string, number][] = [['R', 78], ['I', 58], ['S', 64], ['E', 39]];
  return `<section class="stage hero-layout" aria-labelledby="pageTitle">
  <div class="hero-copy"><div class="eyebrow">${e(t('welcome.eyebrow'))}</div>
  <h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('welcome.h1a'))} <span class="golden">${e(t('welcome.h1b'))}</span></h1>
  <p>${e(t('welcome.p'))}</p>
  <div class="hero-cta"><button type="button" class="primary-btn" data-action="choose">${e(t('welcome.cta'))} <span class="arrow" aria-hidden="true">↗</span></button><span class="pill">${e(t('welcome.pill'))}</span></div>
  <div class="tiny-trust">${icons.shield('icon-mini')} <span>${e(t('welcome.trust'))}</span></div></div>
  <div class="preview-panel" aria-hidden="true"><div class="mini-top"><span>${e(t('welcome.panelTop'))}</span><span class="mini-num">${e(t('welcome.illustrative'))}</span></div>
  <div class="mini-title">${t('welcome.panelTitle')}</div><div class="mini-desc">${e(t('welcome.panelDesc'))}</div>
  <div class="mini-stats">${stats.map(([k, w]) => `<div class="mini-stat"><div class="lit">${k}.</div><span class="cap">${e(t('pillar.' + k))}</span><div class="track"><i data-w="${w}"></i></div></div>`).join('')}</div>
  <div class="mini-footer"><span>${e(t('welcome.panelFoot'))}</span><span>R.I.S.E.™</span></div></div></section>`;
}

export function trackChoose() {
  return `<section class="stage panel-width" aria-labelledby="pageTitle"><div class="stage-heading"><div class="eyebrow">${e(t('track.eyebrow'))}</div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('track.h1'))}</h1><p>${e(t('track.p'))}</p></div>
  <div class="track-options">
  <button class="track-card" data-track="financial"><span class="track-icon">${icons.shield()}</span><h2>${e(t('track.fin.title'))}</h2><p>${e(t('track.fin.desc'))}</p><span class="card-link">${e(t('track.fin.link'))} <span class="arrow" aria-hidden="true">↗</span></span></button>
  <button class="track-card" data-track="career"><span class="track-icon">${icons.trend()}</span><h2>${e(t('track.car.title'))}</h2><p>${e(t('track.car.desc'))}</p><span class="card-link">${e(t('track.car.link'))} <span class="arrow" aria-hidden="true">↗</span></span></button></div>
  <div class="select-footer">${e(t('track.footer'))} <button class="linklike" data-action="home">${e(t('track.back'))}</button></div></section>`;
}

function options(items: readonly (readonly [string, string])[], selected: string, name: string, labelledBy: string, describedBy: string) {
  return `<fieldset class="answer-options" aria-labelledby="${labelledBy}" aria-describedby="${describedBy}"><legend class="sr-only">${e(t('q.optionHint'))}</legend>${items
    .map(([key, label], i) => `<label class="answer-option ${selected === key ? 'chosen' : ''}"><input class="opt-input" type="radio" name="${name}" value="${e(key)}" ${selected === key ? 'checked' : ''} data-index="${i}"><span class="opt-num" aria-hidden="true">${i + 1}</span><span class="opt-text">${e(label)}</span><span class="option-check" aria-hidden="true">${icons.check('icon-mini')}</span></label>`)
    .join('')}</fieldset>`;
}

const autoToggle = () => `<label class="auto-toggle no-print"><input type="checkbox" id="autoAdvance" ${state.autoAdvance ? 'checked' : ''}><span>${e(t('q.auto'))}</span></label>`;

export function profileQuestion() {
  const keys = profileKeys(state.track!);
  const key = keys[state.profileIndex];
  const step = PROFILE_STEPS[key];
  const choices = choicesFor(key, state.track!);
  const selected = String((state.profile as unknown as Record<string, string>)[key] ?? '');
  const chosen = state.profileAnswered?.[key] ? selected : '';
  return `<section class="stage assessment-layout" aria-labelledby="qTitle">${progress(t('profile.label'), state.profileIndex + 1, keys.length, trackName())}
  <form class="assessment-card" data-form="profile" novalidate><span class="question-category">${e(t('profile.category'))}</span>
  <h1 id="qTitle" tabindex="-1" data-autofocus>${e(step.title)}</h1><p class="question-help" id="qHelp">${e(step.help)}</p>
  ${options(choices, chosen, 'answer', 'qTitle', 'qHelp')}
  <div class="question-bottom"><button type="button" class="back-link" data-action="previous">${e(t('q.prev'))}</button><div class="question-side"><span class="fineprint" data-continue-hint ${chosen ? 'hidden' : ''}>${e(t('profile.select'))}</span><button type="submit" class="primary-btn small" data-continue ${chosen ? '' : 'hidden'}>${e(t('q.continue'))}</button></div></div>${autoToggle()}</form>
  <div class="helper-label">${e(t('profile.helper'))}</div></section>`;
}

export function assessmentQuestion() {
  const q = state.queue[state.questionIndex];
  const selected = state.answers[q.id] && state.answers[q.id] !== '__skip__' ? state.answers[q.id] : '';
  const { text, tip } = qText(q);
  const isModule = q.id.includes('_m_');
  const ctx = isModule ? t('q.followup') : pillarLabel(q.pillar).charAt(0) + pillarLabel(q.pillar).slice(1).toLowerCase();
  const items = q.options.map((o) => [o.key, optLabel(q.id, o.key, o.label)] as const);
  const n = state.questionIndex + 1;
  return `<section class="stage assessment-layout" aria-labelledby="qTitle">${progress(t('q.assessment'), n, state.queue.length, trackName())}
  <form class="assessment-card" data-form="question" novalidate><span class="question-category">${e(ctx)} · ${isModule ? e(t('q.additional')) : `${e(t('q.pillar'))} ${q.pillar}`}</span>
  <h1 id="qTitle" tabindex="-1" data-autofocus>${e(text)}</h1><p class="question-help" id="qHelp">${e(tip || t('q.default.tip'))}</p>
  ${options(items, selected, 'answer', 'qTitle', 'qHelp')}
  <div class="question-bottom"><button type="button" class="back-link" data-action="previous">${e(t('q.prev'))}</button><div class="question-side"><button type="button" class="skip-link" data-action="skip">${e(t('q.notSure'))}</button><button type="submit" class="primary-btn small" data-continue ${selected ? '' : 'hidden'}>${e(t('q.continue'))}</button></div></div>${autoToggle()}</form>
  <div class="helper-label">${e(t('q.helper', { n, total: state.queue.length }))}</div></section>`;
}

export function submitting() {
  if (state.error) {
    return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('submit.error'))}</h1><p role="alert">${e(state.error)}</p>
    <div class="state-actions"><button class="ghost-btn" data-action="previous">${e(t('submit.back'))}</button><button class="primary-btn" data-action="retry-submit">${e(t('submit.retry'))}</button></div></div></section>`;
  }
  return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><div class="spinner" aria-hidden="true"></div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('submit.title'))}</h1><p>${e(t('submit.p'))}</p></div></section>`;
}

export function preview() {
  const r = state.assessment!.preview;
  return `<section class="stage report-shell" aria-labelledby="pageTitle"><div class="report-intro"><div class="eyebrow">${e(t('preview.eyebrow'))}</div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('preview.h1'))}</h1><p>${e(t('preview.p'))}</p></div>
  <div class="summary-card"><div class="report-snapshot">${scoreDial(r)}<div class="snapshot-head"><span class="focus-badge">${e(t('preview.badge', { pillar: pillarLabel(r.priority) }))}</span><h2>${e(r.headline)}</h2><p>${e(r.priorityReason)}</p>
  <div class="tag-row"><span class="pill">${e(trackName())}</span><span class="pill">${e(t('preview.coverage', { n: r.confidence }))}</span></div></div></div><div class="four-bars">${pillarBars(r.byPillar)}</div>
  ${r.complete ? '' : `<p class="fineprint mt16">${e(t('preview.notScoredNote'))}</p>`}</div>
  <div class="locked-preview"><span class="lock-icon">${icons.lock()}</span><div class="grow"><h2>${e(t('preview.lockedTitle'))}</h2><p>${e(t('preview.lockedP'))}</p></div></div>
  <div class="preview-bottom"><button class="ghost-btn" data-action="edit-answers">${e(t('preview.review'))}</button><button class="primary-btn" data-action="gate">${e(t('preview.view'))} <span class="arrow" aria-hidden="true">↗</span></button></div>
  <p class="fineprint center mt15">${e(t('preview.note'))}</p></section>`;
}

export function pending() {
  return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('pending.h1'))}</h1><p>${e(t('pending.p', { email: state.pendingEmail }))}</p><p class="fineprint">${e(t('pending.p2'))}</p>
  <div class="state-actions"><button class="ghost-btn" data-action="back-preview">${e(t('pending.back'))}</button></div></div></section>`;
}
