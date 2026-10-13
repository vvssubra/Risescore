/**
 * V4.3 interactive planning toolkit: six guided steps with live calculations. Only the 1–2 workbooks a report
 * unlocks are ever present in the page (they arrive inside the report response). Entries stay in memory unless
 * the person explicitly saves them on this device; nothing is sent to the server.
 */
import { WORKBOOK_STEPS, calculate, rm, type Workbook, type WorkbookField, type WorkbookState } from '../../shared/workbook.ts';
import type { ReportView } from '../lib/api.ts';
import { e } from '../lib/dom.ts';
import { t } from '../lib/i18n.ts';
import type { PlannerState } from '../lib/store.ts';

export const LAST_STEP = WORKBOOK_STEPS.length - 1;
const FIRST_FIELDS = 4;

type Kit = ReportView['toolkits'][number];

const str = (v: WorkbookState, k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '');

function input(f: WorkbookField, v: WorkbookState): string {
  const id = `wb-${e(f.id)}`;
  if (f.kind === 'checkbox') {
    return `<label class="wb-check"><input id="${id}" type="checkbox" data-wb-field="${e(f.id)}" ${v[f.id] ? 'checked' : ''}><span>${e(f.label)}</span></label>`;
  }
  if (f.kind === 'select') {
    const opts = (f.options ?? []).map(([k, label]) => `<option value="${e(k)}" ${str(v, f.id) === k ? 'selected' : ''}>${e(label)}</option>`).join('');
    return `<label class="wb-field" for="${id}">${e(f.label)}<select id="${id}" data-wb-field="${e(f.id)}"><option value="">${e(t('wb.choose'))}</option>${opts}</select></label>`;
  }
  const text = f.kind === 'text';
  const attrs = text ? 'type="text" maxlength="250"' : 'type="number" min="0" step="any" inputmode="decimal"';
  const ph = text ? t('wb.textPh') : f.kind === 'money' ? 'RM' : '0';
  return `<label class="wb-field" for="${id}">${e(f.label)}<input id="${id}" ${attrs} data-wb-field="${e(f.id)}" value="${e(str(v, f.id))}" placeholder="${e(ph)}"></label>`;
}

const notes = (key: string, label: string, v: WorkbookState) =>
  `<label class="wb-field" for="wb-${key}">${e(label)}<textarea id="wb-${key}" data-wb-field="${key}" rows="3" maxlength="900" placeholder="${e(t('wb.notesPh'))}">${e(str(v, key))}</textarea></label>`;

const list = (title: string, items: string[]) => `<div class="wb-light"><strong>${e(title)}</strong><ul>${items.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>`;

export function plannerResults(w: Workbook, v: WorkbookState): string {
  return calculate(w.id, v).map((x) => `<div class="wb-result${x.warn ? ' wb-warn' : ''}"><span>${e(x.title)}</span><strong>${e(x.result)}</strong><small>${e(x.detail)}</small></div>`).join('');
}

function body(w: Workbook, p: PlannerState): string {
  const v = p.values;
  const first = w.fields.slice(0, FIRST_FIELDS);
  const rest = w.fields.slice(FIRST_FIELDS);
  switch (p.step) {
    case 0: return `<span class="wb-number">01 / ${e(t('wb.s0'))}</span><h2>${e(w.promise)}</h2><p>${e(w.prep)}</p>${list(t('wb.startWith'), w.check)}<p class="fineprint">${e(w.snapshotTip)}</p><p class="fineprint">${e(t('wb.private'))}</p>`;
    case 1: return `<span class="wb-number">02 / ${e(t('wb.s1'))}</span><h2>${e(t('wb.s1h'))}</h2><p>${e(t('wb.s1p'))}</p><div class="wb-fields">${first.map((f) => input(f, v)).join('')}</div>${notes('situationNote', t('wb.situationNote'), v)}`;
    case 2: return `<span class="wb-number">03 / ${e(t('wb.s2'))}</span><h2>${e(w.mathTitle)}</h2><p>${e(w.mathIntro)}</p><p class="fineprint">${e(w.mathExample)}</p>
      ${rest.length ? `<div class="wb-fields">${rest.map((f) => input(f, v)).join('')}</div>` : ''}
      <div class="wb-results-title">${e(t('wb.live'))} <small>${e(t('wb.liveNote'))}</small></div><div class="wb-results" id="wbLiveResults" aria-live="polite">${plannerResults(w, v)}</div>
      <div class="wb-tip">${e(w.mathRead)}</div><p class="fineprint">${e(w.mathPause)}</p>`;
    case 3: return `<span class="wb-number">04 / ${e(t('wb.s3'))}</span><h2>${e(t('wb.s3h'))}</h2><p>${e(t('wb.s3p'))}</p>
      <fieldset class="wb-choices"><legend class="sr-only">${e(t('wb.s3h'))}</legend>${w.options.map(([name, detail], i) => `<label class="wb-choice"><input type="radio" name="wb-option" id="wb-opt-${i}" data-wb-field="choice" value="${e(name)}" ${str(v, 'choice') === name ? 'checked' : ''}><span><strong>${e(name)}</strong><small>${e(detail)}</small></span></label>`).join('')}</fieldset>
      ${list(t('wb.askBefore'), w.askBefore)}${notes('choiceReason', t('wb.choiceReason'), v)}`;
    case 4: return `<span class="wb-number">05 / ${e(t('wb.s4'))}</span><h2>${e(t('wb.s4h'))}</h2><p>${e(t('wb.s4p'))}</p>
      <div class="wb-weeks">${w.weeks.map(([wk, title, detail], i) => `<label class="wb-week"><input type="checkbox" data-wb-field="week${i}" ${v[`week${i}`] ? 'checked' : ''}><span><strong>${e(wk)} · ${e(title)}</strong><small>${e(detail)}</small></span></label>`).join('')}</div>
      ${notes('firstAction', t('wb.firstAction'), v)}${notes('support', t('wb.support'), v)}`;
    default: return `<span class="wb-number">06 / ${e(t('wb.s5'))}</span><h2>${e(t('wb.s5h'))}</h2><p>${e(t('wb.s5p'))}</p><div class="wb-results">${plannerResults(w, v)}</div>
      ${list(t('wb.after30'), w.reflect)}${notes('reviewNotes', t('wb.reviewNotes'), v)}
      <div class="wb-actions"><button type="button" class="primary-btn" data-wb-nav="print">${e(t('wb.print'))}</button><button type="button" class="ghost-btn" data-wb-nav="save">${e(t('wb.save'))}</button><button type="button" class="ghost-btn" data-wb-nav="clear">${e(t('wb.clear'))}</button></div>
      <p class="fineprint" id="wbSaveFeedback" aria-live="polite">${e(w.help)} ${e(t('wb.saveNote'))}</p>`;
  }
}

/** Print-only summary of the person's plan (hidden on screen). */
function printable(w: Workbook, v: WorkbookState): string {
  const answered = w.fields.filter((f) => v[f.id] !== undefined && v[f.id] !== '' && v[f.id] !== false);
  const shown = (f: WorkbookField) => {
    if (f.kind === 'checkbox') return v[f.id] ? t('wb.yes') : t('wb.no');
    if (f.kind === 'select') return f.options?.find(([k]) => k === v[f.id])?.[1] ?? '';
    if (f.kind === 'money') { const n = Number(str(v, f.id)); return Number.isFinite(n) ? rm(n) : str(v, f.id); }
    return str(v, f.id);
  };
  return `<div class="wb-print" aria-hidden="true"><div class="eyebrow">R.I.S.E.™ · ${e(t('wb.printTitle'))}</div><h1>${e(w.title)}</h1><p>${e(w.subtitle)}</p>
  <h2>${e(t('wb.printSituation'))}</h2><table><tbody>${answered.map((f) => `<tr><th>${e(f.label)}</th><td>${e(shown(f))}</td></tr>`).join('')}</tbody></table>
  <h2>${e(t('wb.printNumbers'))}</h2>${calculate(w.id, v).map((x) => `<p><strong>${e(x.title)}: ${e(x.result)}</strong> — ${e(x.detail)}</p>`).join('')}
  <h2>${e(t('wb.printChoice'))}</h2><p>${e(str(v, 'choice'))}</p><p>${e(str(v, 'choiceReason'))}</p>
  <h2>${e(t('wb.printWeeks'))}</h2>${w.weeks.map(([wk, title, detail], i) => `<p>${v[`week${i}`] ? '✓' : '□'} ${e(wk)}: ${e(title)}. ${e(detail)}</p>`).join('')}
  <h2>${e(t('wb.printCommit'))}</h2><p>${e(str(v, 'firstAction'))}</p><p>${e(str(v, 'support'))}</p>
  <h2>${e(t('wb.printReview'))}</h2><p>${e(str(v, 'reviewNotes'))}</p><p class="fineprint">${e(t('wb.printFoot'))}</p></div>`;
}

export function planner(kit: Kit, p: PlannerState): string {
  const w = kit.workbook;
  const pdf = kit.pdf ? `<a class="ghost-btn" href="${e(kit.pdf.url)}" target="_blank" rel="noopener noreferrer">${e(t('wb.pdf'))}<span class="sr-only"> — ${e(kit.pdf.filename)}</span></a>` : '';
  const steps = WORKBOOK_STEPS.map((_, i) => `<button type="button" class="${i === p.step ? 'active' : ''}${i < p.step ? ' done' : ''}" data-wb-step="${i}" ${i === p.step ? 'aria-current="step"' : ''}><span>${i + 1}</span><small>${e(t(`wb.step${i}`))}</small></button>`).join('');
  const prev = p.step === 0 ? `<button type="button" class="ghost-btn" data-wb-nav="exit">${e(t('wb.toReport'))}</button>` : `<button type="button" class="ghost-btn" data-wb-nav="prev">${e(t('q.prev'))}</button>`;
  const next = p.step === LAST_STEP ? `<button type="button" class="primary-btn" data-wb-nav="exit">${e(t('wb.backToReport'))}</button>` : `<button type="button" class="primary-btn" data-wb-nav="next">${e(t('wb.next'))}</button>`;
  return `<section class="stage wb-shell" aria-labelledby="pageTitle"><div class="wb-top no-print"><div><div class="eyebrow">${e(t('wb.eyebrow'))}</div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(w.title)}</h1><p>${e(w.subtitle)} · ${e(w.minutes)}</p></div>
  <div class="wb-top-actions">${pdf}<button type="button" class="ghost-btn" data-wb-nav="exit">${e(t('wb.myReport'))}</button></div></div>
  <nav class="wb-step-track no-print" aria-label="${e(t('wb.stepsLabel'))}">${steps}</nav>
  <div class="wb-card no-print"><div class="wb-content">${body(w, p)}</div><div class="wb-foot">${prev}<span class="wb-foot-step">${e(t('wb.stepOf', { n: p.step + 1, total: WORKBOOK_STEPS.length }))}</span>${next}</div></div>
  <div class="wb-bottom no-print"><span>${e(t('wb.educational'))}</span></div>${printable(w, p.values)}</section>`;
}
