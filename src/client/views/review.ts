/**
 * V4.3 "check your answers" screen: every profile choice and every question the person actually saw, grouped by
 * R.I.S.E.™ pillar, each with a Change button. Shown before scoring so a mis-tap cannot produce a misleading result.
 */
import { PILLAR_ORDER, SKIP } from '../../shared/engine.ts';
import { PROFILE_STEPS, choicesFor, profileKeys } from '../../shared/profile.ts';
import type { Question } from '../../shared/types.ts';
import { e } from '../lib/dom.ts';
import { optLabel, qText, t } from '../lib/i18n.ts';
import { visibleQueue } from '../lib/queue.ts';
import { state } from '../lib/store.ts';
import { pillarLabel } from './shared.ts';

function answerLabel(q: Question): string {
  const v = state.answers[q.id];
  if (v === undefined) return t('review.unanswered');
  if (v === SKIP) return t('q.notSure');
  return v.split('|').map((k) => optLabel(q.id, k, q.options.find((o) => o.key === k)?.label ?? k)).join(', ');
}

const row = (label: string, value: string, attr: string, muted = false) =>
  `<div class="review-row"><div class="review-q"><span class="review-label">${e(label)}</span><span class="review-answer${muted ? ' is-muted' : ''}">${e(value)}</span></div>
  <button type="button" class="text-action" ${attr} aria-label="${e(t('review.changeLabel', { q: label }))}">${e(t('review.change'))}</button></div>`;

export function review(): string {
  const track = state.track!;
  const profileRows = profileKeys(track).map((k, i) => {
    const value = (state.profile as unknown as Record<string, string>)[k];
    const label = choicesFor(k, track).find((c) => c[0] === value)?.[1] ?? value;
    return row(PROFILE_STEPS[k].title, label, `data-edit-profile="${i}"`);
  }).join('');

  const visible = visibleQueue();
  const answered = visible.filter((q) => state.answers[q.id] !== undefined && state.answers[q.id] !== SKIP).length;
  const groups = PILLAR_ORDER.map((p) => {
    const qs = visible.filter((q) => q.pillar === p);
    if (!qs.length) return '';
    const rows = qs.map((q) => {
      const v = state.answers[q.id];
      return row(qText(q).text, answerLabel(q), `data-edit-question="${e(q.id)}"`, v === undefined || v === SKIP);
    }).join('');
    return `<details class="review-section" open><summary>${e(pillarLabel(p))} · ${e(t('review.count', { n: qs.length }))}</summary>${rows}</details>`;
  }).join('');

  return `<section class="stage panel-width review-screen" aria-labelledby="pageTitle"><div class="stage-heading"><div class="eyebrow">${e(t('review.eyebrow'))}</div>
  <h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('review.h1'))}</h1><p>${e(t('review.p'))}</p></div>
  <div class="review-panel"><div class="review-top"><strong>${e(t('review.summary', { n: answered, total: visible.length }))}</strong><span class="fineprint">${e(t('review.notSureNote'))}</span></div>
  <details class="review-section" open><summary>${e(t('review.profile'))}</summary>${profileRows}</details>${groups}</div>
  <div class="preview-bottom"><button type="button" class="ghost-btn" data-action="previous">${e(t('q.prev'))}</button><button type="button" class="primary-btn" data-action="submit-review">${e(t('review.submit'))} <span class="arrow" aria-hidden="true">↗</span></button></div></section>`;
}
