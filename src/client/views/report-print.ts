import { PILLAR_ORDER } from '../../shared/engine.ts';
import type { PillarKey } from '../../shared/types.ts';
import type { ReportView } from '../lib/api.ts';
import { e, icons } from '../lib/dom.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { pillarLabel } from './shared.ts';

/**
 * Print-only A4 layout (two designed pages). Hidden on screen; `@media print` swaps it in for the interactive report,
 * so "Save as PDF" produces the branded document instead of a printout of the web page.
 */

const BRAND = 'BALLA DK';
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

const printDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(getLocale() === 'ms' ? 'ms-MY' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return iso; }
};

function ring(overall: number | null) {
  const pct = overall ?? 0;
  const dash = ((pct / 100) * RING_C).toFixed(1);
  const label = overall === null ? t('preview.notScored') : `${overall} ${t('preview.of100')}`;
  return `<div class="pr-ring" role="img" aria-label="${e(label)}"><svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">
    <circle cx="64" cy="64" r="${RING_R}" class="pr-ring-track"/>
    <circle cx="64" cy="64" r="${RING_R}" class="pr-ring-fill" stroke-dasharray="${dash} ${RING_C.toFixed(1)}" transform="rotate(-90 64 64)"/>
    <circle cx="64" cy="64" r="44" class="pr-ring-inner"/></svg>
    <div class="pr-ring-text"><span class="pr-ring-num">${overall ?? '—'}</span><span class="pr-ring-cap">${e(overall === null ? t('preview.notScored') : t('preview.of100'))}</span></div></div>`;
}

function masthead(r: ReportView) {
  const marker = '\u0000';
  const [before, after = ''] = t('report.hello', { name: marker }).split(marker);
  return `<header class="pr-hero"><div class="pr-bar"><span class="pr-mark" aria-hidden="true">R</span><span class="pr-eyebrow">${e(t('report.eyebrow'))}</span><span class="pr-brand">${BRAND}</span></div>
  <div class="pr-hero-body"><div><h1 class="pr-h1">${e(before.trim())}<br><em>${e(r.firstName)}${e(after)}</em></h1><div class="pr-rule"></div>
  <p class="pr-sub">${e(t('report.sub', { track: r.result.track === 'financial' ? t('track.financial') : t('track.career'), v: r.result.version }))}</p></div>
  ${ring(r.result.complete ? r.result.overall : null)}</div></header>`;
}

function nextStep(r: ReportView) {
  const res = r.result;
  const p = res.byPillar[res.priority];
  const scored = res.complete && res.overall !== null;
  return `<section class="pr-next"><div class="pr-next-badge"><span>${res.priority}</span><small>${p.score === null ? '—' : p.score + '/100'}</small></div>
  <div><div class="pr-eyebrow">${e(t('report.next', { pillar: pillarLabel(res.priority) }))}</div><h2 class="pr-next-h">${e(res.headline)}</h2><p class="pr-next-p">${e(res.priorityReason)}</p>
  <ul class="pr-checks"><li>${icons.check('pr-tick')}${e(t('print.coverage', { n: res.confidence }))}</li><li>${icons.check('pr-tick')}${e(scored ? t('report.covered') : t('report.withheld'))}</li></ul></div></section>`;
}

function pillarCard(r: ReportView, k: PillarKey) {
  const p = r.result.byPillar[k];
  const focus = k === r.result.priority;
  const score = p.score === null ? `<span class="pr-score">—</span>` : `<span class="pr-score">${p.score}<small>/100</small></span>`;
  return `<div class="pr-pillar${focus ? ' is-focus' : ''}"><div class="pr-pillar-head"><span class="pr-letter" aria-hidden="true">${k}</span>
  <div class="pr-pillar-name"><strong>${e(pillarLabel(k))}${focus ? `<span class="pr-focus">${e(t('print.focus'))}</span>` : ''}</strong><span>${e(p.score === null ? t('bar.notEnough') : p.level)}</span></div>${score}</div>
  <div class="pr-track"><i data-w="${p.score ?? 0}"></i></div><div class="pr-cov">${e(t('print.pillarCov', { n: p.coverage }))}</div></div>`;
}

function footer(r: ReportView, page: number) {
  return `<footer class="pr-foot"><span><b>R.I.S.E.™ ${e(t('print.scorecard'))}</b> · ${BRAND}</span><span>${e(printDate(r.generatedAt))} · ${e(t('print.page', { n: page, total: 2 }))}</span></footer>`;
}

function pageOne(r: ReportView) {
  return `<div class="pr-page pr-page-1">${masthead(r)}${nextStep(r)}
  <section class="pr-section"><div class="pr-eyebrow">${e(t('report.s1.eyebrow'))}</div><h2 class="pr-h2">${e(t('report.s1.h3'))}</h2>
  <div class="pr-pillars">${PILLAR_ORDER.map((k) => pillarCard(r, k)).join('')}</div><p class="pr-note">${e(t('report.s1.note'))}</p></section>
  ${footer(r, 1)}</div>`;
}

function attention(r: ReportView) {
  const res = r.result;
  if (res.alerts.length) {
    return res.alerts.slice(0, 4).map((a) => `<div class="pr-flag">${icons.shield('pr-shield')}<div><strong>${e(a.title)}</strong><p>${e(a.reason)}</p></div></div>`).join('');
  }
  const none = t('report.alerts.none');
  const cut = none.indexOf('. ');
  const [lead, rest] = cut > 0 ? [none.slice(0, cut + 1), none.slice(cut + 2)] : [none, ''];
  return `<div class="pr-flag">${icons.shield('pr-shield')}<strong>${e(lead)}</strong></div>${rest ? `<p class="pr-muted">${e(rest)}</p>` : ''}`;
}

function why(r: ReportView) {
  const reasons = r.result.reasons;
  if (!reasons.length) return `<p class="pr-why-q">${e(t('report.why.none'))}</p>`;
  return reasons.map((x) => `<div class="pr-why"><p class="pr-why-q">${e(x.question)}</p><p class="pr-why-a">${e(x.response)}</p></div>`).join('');
}

function toolkits(r: ReportView, reportUrl: string) {
  return r.toolkits.map((k) => `<div class="pr-kit"><span class="pr-kit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span>
  <div class="pr-kit-body"><h3>${e(k.title)}</h3><p>${e(k.sub)} · ${e(k.minutes)}</p></div><a class="pr-kit-btn" href="${e(reportUrl)}">${e(t('report.kit.open'))}</a></div>`).join('');
}

function priorities(r: ReportView) {
  const res = r.result;
  if (!res.priorities.length) return `<ol class="pr-steps">${res.steps.map((s, i) => `<li><span class="pr-step-num" aria-hidden="true">${i + 1}</span><span>${e(s)}</span></li>`).join('')}</ol>`;
  return res.priorities.map((p) => `<div class="pr-prio"><div class="pr-eyebrow">${e(t('report.prio.label', { n: p.number, pillar: pillarLabel(p.pillar) }))}</div><h3 class="pr-h3 pr-prio-h">${e(p.title)}</h3>
  <p class="pr-small">${e(p.reason)}</p><ol class="pr-steps">${p.actions.map((s, i) => `<li><span class="pr-step-num" aria-hidden="true">${i + 1}</span><span>${e(s)}</span></li>`).join('')}</ol></div>`).join('');
}

function pageTwo(r: ReportView, reportUrl: string) {
  const res = r.result;
  const overall = res.complete && res.overall !== null ? `${res.overall}` : '—';
  const dense = Math.min(res.alerts.length, 4) + r.toolkits.length + res.priorities.length >= 5;
  return `<div class="pr-page pr-page-2${dense ? ' pr-dense' : ''}"><div class="pr-bar pr-bar-solid"><span class="pr-mark" aria-hidden="true">R</span><span class="pr-eyebrow">${e(t('report.eyebrow'))}</span>
  <span class="pr-brand">${e(r.firstName.toUpperCase())} · ${e(t('print.overall'))} <b>${overall}</b> /100</span></div>
  <div class="pr-body">
  <section class="pr-section"><div class="pr-eyebrow">${e(t('report.s2.eyebrow'))}</div><h2 class="pr-h2">${e(res.priorities.length > 1 ? t('report.s2.h3two') : t('report.s2.h3'))}</h2>
  ${priorities(r)}</section>
  <div class="pr-duo"><article class="pr-card"><div class="pr-eyebrow">${e(t('report.alerts.eyebrow'))}</div><h3 class="pr-h3">${e(t('report.alerts.h3'))}</h3>${attention(r)}<hr><p class="pr-small">${e(t('report.why.note'))}</p></article>
  <article class="pr-card pr-card-dark"><div class="pr-eyebrow">${e(t('report.why.eyebrow'))}</div><h3 class="pr-h3">${e(t('report.why.h3'))}</h3>${why(r)}</article></div>
  <section class="pr-section"><div class="pr-eyebrow">${e(t('report.s3.eyebrow'))}</div><h2 class="pr-h2">${e(t('report.s3.h3'))}</h2><p class="pr-lede">${e(t('report.s3.p'))}</p>
  ${toolkits(r, reportUrl)}<p class="pr-small">${e(t('report.s3.note'))}</p></section>
  <p class="pr-disclaimer">${e(res.disclaimer)} ${e(t('report.advice'))}</p></div></div>`;
}

export function printReport(r: ReportView, reportUrl: string): string {
  return `<div class="print-report">${pageOne(r)}${pageTwo(r, reportUrl)}</div>`;
}
