import type { Notice } from '../lib/api.ts';
import { e } from '../lib/dom.ts';
import { t } from '../lib/i18n.ts';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
let opener: HTMLElement | null = null;
let onKey: ((ev: KeyboardEvent) => void) | null = null;

export const modalIsOpen = () => !!document.querySelector('#modalRoot .modal-backdrop');

/** Accessible modal: focus moves in and is trapped, Escape closes, background is inert, focus returns to the opener. */
export function openModal(html: string, labelId: string, onClose?: () => void) {
  const root = document.getElementById('modalRoot')!;
  opener = document.activeElement as HTMLElement | null;
  root.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true" aria-labelledby="${labelId}" tabindex="-1">${html}</div></div>`;
  document.body.classList.add('no-scroll');
  for (const sel of ['.site-header', '#app', '.site-footer', '.topline']) document.querySelector<HTMLElement>(sel)?.setAttribute('inert', '');
  const modal = root.querySelector<HTMLElement>('.modal')!;
  const close = () => closeModal(onClose);
  root.querySelector('[data-modal-backdrop]')!.addEventListener('mousedown', (ev) => { if (ev.target === ev.currentTarget) close(); });
  root.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', close));
  onKey = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    if (ev.key !== 'Tab') return;
    const f = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey);
  (modal.querySelector<HTMLElement>('[data-modal-focus]') ?? modal).focus();
  return root;
}

export function closeModal(cb?: () => void) {
  const root = document.getElementById('modalRoot')!;
  root.innerHTML = '';
  document.body.classList.remove('no-scroll', 'modal-printing');
  for (const sel of ['.site-header', '#app', '.site-footer', '.topline']) document.querySelector<HTMLElement>(sel)?.removeAttribute('inert');
  if (onKey) { document.removeEventListener('keydown', onKey); onKey = null; }
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
  cb?.();
}

export interface WorksheetKit { id: string; title: string; sub: string; sections: [string, string][] }

export function openWorksheet(kit: WorksheetKit) {
  const html = `<div class="modal-header"><div><div class="eyebrow">${e(t('ws.eyebrow'))}</div><h2 id="wsTitle">${e(kit.title)}</h2><p class="fineprint">${e(kit.sub)}</p></div>
  <button type="button" class="close-btn no-print" data-modal-close data-modal-focus aria-label="${e(t('ws.closeLabel'))}">×</button></div>
  ${kit.sections.map(([step, prompt], i) => {
    const label = t('ws.step.' + step) === 'ws.step.' + step ? step : t('ws.step.' + step);
    return `<section class="worksheet-step"><h3>${i + 1}. ${e(label)}</h3><p id="wsp${i}">${e(prompt)}</p><textarea aria-label="${e(t('ws.noteLabel', { step: label }))}" aria-describedby="wsp${i}" placeholder="${e(t('ws.notes'))}"></textarea></section>`;
  }).join('')}
  <p class="fineprint">${e(t('ws.foot'))}</p>
  <div class="modal-foot no-print"><button class="ghost-btn" data-modal-close>${e(t('ws.close'))}</button><button class="primary-btn" data-ws-print>${e(t('ws.print'))}</button></div>`;
  const root = openModal(html, 'wsTitle');
  root.querySelector('[data-ws-print]')?.addEventListener('click', () => {
    document.body.classList.add('modal-printing');
    // The background is inert while the dialog is open; lift it just for printing.
    for (const sel of ['#app']) document.querySelector<HTMLElement>(sel)?.removeAttribute('inert');
    window.print();
    window.setTimeout(() => { document.body.classList.remove('modal-printing'); document.querySelector<HTMLElement>('#app')?.setAttribute('inert', ''); }, 300);
  });
}

export function openPrivacy(notices: { en: Notice; ms: Notice }, status: string, version: string, startLocale: 'en' | 'ms') {
  let loc = startLocale;
  const draw = () => {
    const n = notices[loc];
    const html = `<div class="modal-header"><div><div class="eyebrow">${loc === 'ms' ? 'NOTIS PRIVASI' : 'PRIVACY NOTICE'} · ${e(version)}</div><h2 id="pvTitle">${e(n.title)}</h2>
    ${status !== 'approved' ? `<p class="draft-flag" role="note">${e(t('privacy.draft'))}</p>` : ''}</div><button type="button" class="close-btn" data-modal-close data-modal-focus aria-label="${e(t('privacy.close'))}">×</button></div>
    <p class="fineprint" lang="${loc}">${e(n.intro)}</p>
    <div lang="${loc}">${n.sections.map((s) => `<section class="notice-sec"><h3>${e(s.heading)}</h3>${s.body.map((b) => `<p>${e(b)}</p>`).join('')}</section>`).join('')}</div>
    <div class="modal-foot"><button class="ghost-btn" data-pv-switch aria-label="${e(loc === 'en' ? 'Baca notis dalam Bahasa Malaysia' : 'Read the notice in English')}">${loc === 'en' ? 'Bahasa Malaysia' : 'English'}</button><button class="primary-btn" data-modal-close>${loc === 'ms' ? 'Tutup' : 'Close'}</button></div>`;
    return html;
  };
  const root = openModal(draw(), 'pvTitle');
  const bind = () => root.querySelector('[data-pv-switch]')?.addEventListener('click', () => {
    loc = loc === 'en' ? 'ms' : 'en';
    const modal = root.querySelector('.modal')!;
    modal.innerHTML = draw();
    modal.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => closeModal()));
    modal.querySelector<HTMLElement>('[data-modal-focus]')?.focus();
    bind();
  });
  bind();
}
