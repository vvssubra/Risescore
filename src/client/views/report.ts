import { PILLAR_ORDER } from '../../shared/engine.ts';
import type { ReportView } from '../lib/api.ts';
import { e, formatDate, icons } from '../lib/dom.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { state } from '../lib/store.ts';
import { printReport } from './report-print.ts';
import { pillarLabel, scoreDial } from './shared.ts';

export function reportLoading() {
  return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><div class="spinner" aria-hidden="true"></div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('report.loading'))}</h1></div></section>`;
}

export function reportError() {
  return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('report.error.h1'))}</h1><p role="alert">${e(state.error)}</p>
  <div class="state-actions"><button class="primary-btn" data-action="restart-now">${e(t('report.error.cta'))}</button></div></div></section>`;
}

export function deleted() {
  return `<section class="stage panel-width center-card" aria-labelledby="pageTitle"><div class="state-card"><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('report.privacy.deleted.h1'))}</h1><p>${e(t('report.privacy.deleted.p'))}</p>
  <div class="state-actions"><button class="primary-btn" data-action="restart-now">${e(t('report.error.cta'))}</button></div></div></section>`;
}

export function fullReport(r: ReportView) {
  const res = r.result;
  const trackName = res.track === 'financial' ? t('track.financial') : t('track.career');
  const lines = PILLAR_ORDER.map((k) => {
    const p = res.byPillar[k];
    return `<div class="pillar-line"><div class="pillar-name"><span>${k} · ${e(pillarLabel(k))}</span><span>${p.score === null ? e(t('bar.notEnough')) : p.score + '/100'}</span></div><div class="pillar-track" role="img" aria-label="${p.score === null ? e(t('bar.notEnough')) : p.score + ' / 100'}"><i data-w="${p.score ?? 0}"></i></div><div class="pillar-comment">${e(t('report.pillarCov', { level: p.level, n: p.coverage }))}</div></div>`;
  }).join('');
  const kitFor = (id: string) => r.toolkits.find((k) => k.id === id);
  const kitCard = (k: ReportView['toolkits'][number]) => `<div class="toolkit-card"><span class="kit-icon" aria-hidden="true">▤</span><div class="toolkit-body"><h4>${e(k.title)}</h4><p>${e(k.sub)} · ${e(k.minutes)}</p>
    <button type="button" class="text-action" data-kit="${e(k.id)}">${e(t('report.kit.open'))}<span class="sr-only"> — ${e(k.title)}</span></button>
    ${k.pdf ? `<a class="text-action" href="${e(k.pdf.url)}" target="_blank" rel="noopener noreferrer">${e(t('report.kit.pdf'))}<span class="sr-only"> — ${e(k.pdf.filename)}</span></a>` : ''}</div></div>`;
  const priorities = res.priorities.length
    ? res.priorities.map((p) => {
      const kit = kitFor(p.toolkit);
      return `<div class="priority-item"><div class="priority-head"><span class="step-num" aria-hidden="true">${p.number}</span><div><div class="eyebrow">${e(t('report.prio.label', { n: p.number, pillar: pillarLabel(p.pillar) }))}</div><h3>${e(p.title)}</h3></div></div>
      <p>${e(p.reason)}</p><ol class="action-list">${p.actions.map((s, i) => `<li><span class="step-num" aria-hidden="true">${i + 1}</span><span>${e(s)}</span></li>`).join('')}</ol>${kit ? kitCard(kit) : ''}</div>`;
    }).join('')
    : `<ol class="action-list">${res.steps.map((s, i) => `<li><span class="step-num" aria-hidden="true">${i + 1}</span><span>${e(s)}</span></li>`).join('')}</ol>`;
  const alerts = res.alerts.length
    ? res.alerts.slice(0, 4).map((a) => `<div class="alert-item"><strong>${e(a.title)}</strong><p>${e(a.reason)}</p></div>`).join('')
    : `<p class="fineprint">${e(t('report.alerts.none'))}</p>`;
  const why = res.reasons.length
    ? res.reasons.map((x) => `<p class="fineprint"><strong class="strong-navy">${e(x.response)}</strong><br>${e(x.question)}</p>`).join('')
    : `<p class="fineprint">${e(t('report.why.none'))}</p>`;
  const scored = res.complete && res.overall !== null;
  return `<section class="stage report-shell" aria-labelledby="pageTitle"><div class="report-top"><div><div class="eyebrow">${e(t('report.eyebrow'))}</div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('report.hello', { name: r.firstName }))}</h1>
  <p>${e(t('report.sub', { track: trackName, v: res.version }))}</p></div>
  <div class="report-top-actions no-print"><button class="ghost-btn" data-action="print">${e(t('report.pdf'))}</button><button class="ghost-btn" data-action="retake">${e(t('report.retake'))}</button></div></div>
  <div class="report-summary">${scoreDial(res)}<div><div class="eyebrow">${e(t('report.next', { pillar: pillarLabel(res.priority) }))}</div><h2>${e(res.headline)}</h2><p>${e(res.priorityReason)}</p>
  <div class="coverage-line">${e(t('report.coverage', { n: res.confidence, state: scored ? t('report.covered') : t('report.withheld') }))}</div></div></div>
  <div class="report-grid"><div>
  <article class="report-card"><div class="eyebrow">${e(t('report.s1.eyebrow'))}</div><h2>${e(t('report.s1.h3'))}</h2>${lines}<div class="report-note mt16">${e(t('report.s1.note'))}</div></article>
  <article class="report-card"><div class="eyebrow">${e(t('report.s2.eyebrow'))}</div><h2>${e(res.priorities.length > 1 ? t('report.s2.h3two') : t('report.s2.h3'))}</h2>${priorities}
  <p class="fineprint">${e(t('report.s3.p'))}</p><div class="report-note">${e(t('report.s3.note'))}</div></article></div>
  <aside aria-label="${e(t('report.alerts.h3'))}">
  <article class="report-card ${res.alerts.length ? 'has-alerts' : ''}" ${res.severity >= 2 ? 'role="alert"' : ''}><div class="eyebrow">${e(t('report.alerts.eyebrow'))}</div><h2>${e(t('report.alerts.h3'))}</h2>${alerts}</article>
  <article class="report-card"><div class="eyebrow">${e(t('report.why.eyebrow'))}</div><h2>${e(t('report.why.h3'))}</h2>${why}<div class="report-note">${e(t('report.why.note'))}</div></article>
  <div class="contact-panel no-print"><h2>${e(t('report.wa.h3'))}</h2><p>${e(t('report.wa.p'))}</p>
  <button type="button" class="whatsapp-btn full-width" id="waBtn" data-action="handover">${icons.whatsapp('icon-mini')} ${e(t('report.wa.btn'))}</button><p class="wa-foot">${e(t('report.wa.foot'))}</p></div>
  <article class="report-card no-print"><div class="eyebrow">${e(t('report.privacy.h3'))}</div>
  <label class="checkbox-label"><input id="reportMarketing" type="checkbox" ${r.consent.marketingOptIn ? 'checked' : ''}><span>${e(t('report.privacy.mkt'))}</span></label>
  <p class="fineprint" id="mktState" aria-live="polite">${e(r.consent.marketingOptIn ? t('report.privacy.mktOn') : t('report.privacy.mktOff'))}</p>
  <p class="fineprint">${e(t('report.expires', { date: formatDate(r.expiresAt, getLocale()) }))}</p>
  <button class="ghost-btn danger" data-action="erase">${e(t('report.privacy.delete'))}</button></article>
  <p class="report-note">${e(res.disclaimer)}<br><br>${e(t('report.advice'))}</p></aside></div>${printReport(r, location.href)}</section>`;
}
