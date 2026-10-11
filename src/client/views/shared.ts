import { PILLAR_ORDER } from '../../shared/engine.ts';
import type { PillarKey, PreviewResult } from '../../shared/types.ts';
import { e } from '../lib/dom.ts';
import { t } from '../lib/i18n.ts';

export const pillarLabel = (k: PillarKey) => t(`pillar.${k}`);

export function progress(label: string, current: number, total: number, title: string) {
  const pct = Math.max(3, Math.round((current / total) * 100));
  return `<div class="progress-top"><span class="step-mark">${e(label)} <strong>· ${e(title)}</strong></span><span class="progress-count">${e(current)} / ${e(total)}</span></div>
  <div class="progress-line" role="progressbar" aria-valuemin="1" aria-valuemax="${e(total)}" aria-valuenow="${e(current)}" aria-label="${e(t('q.progress', { n: current, total }))}"><span data-w="${pct}"></span></div>`;
}

export function scoreDial(r: Pick<PreviewResult, 'complete' | 'overall'>) {
  const scored = r.complete && r.overall !== null;
  return `<div class="score-dial" data-pct="${scored ? r.overall : 0}" role="img" aria-label="${scored ? `${r.overall} ${e(t('preview.of100'))}` : e(t('preview.notScored'))}"><div class="score-dial-inner"><span class="dial-number">${scored ? r.overall : '—'}</span><span class="dial-caption">${scored ? e(t('preview.of100')) : e(t('preview.notScored'))}</span></div></div>`;
}

export function pillarBars(by: PreviewResult['byPillar']) {
  return PILLAR_ORDER.map((k) => {
    const item = by[k];
    const v = item.score;
    return `<div class="bar-cell"><div class="bar-top"><strong>${k} · ${e(pillarLabel(k))}</strong><span>${v === null ? '—' : v}</span></div><div class="mini-bar" role="img" aria-label="${v === null ? e(t('bar.notEnough')) : v + ' / 100'}"><i data-w="${v ?? 0}"></i></div></div>`;
  }).join('');
}
