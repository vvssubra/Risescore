import type { HandoverView, Notice } from '../lib/api.ts';
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

/**
 * V4.4 WhatsApp handover: shows exactly what will be shared before WhatsApp opens. The person sends the message
 * themselves; the secure link only opens for signed-in staff and can be withdrawn here.
 */
export function openHandover(h: HandoverView, expires: string, onWithdraw: () => Promise<boolean>) {
  const html = `<div class="modal-header"><div><div class="eyebrow">${e(t('ho.eyebrow'))}</div><h2 id="hoTitle">${e(t('ho.h2'))}</h2></div>
  <button type="button" class="close-btn" data-modal-close aria-label="${e(t('privacy.close'))}">×</button></div>
  <p class="fineprint">${e(t('ho.p', { date: expires }))}</p>
  <div class="ho-preview" aria-label="${e(t('ho.previewLabel'))}">${e(h.message).replace(/\n/g, '<br>')}</div>
  <ul class="ho-points"><li>${e(t('ho.li1'))}</li><li>${e(t('ho.li2'))}</li><li>${e(t('ho.li3'))}</li></ul>
  <div class="modal-foot"><button type="button" class="ghost-btn" data-ho-withdraw>${e(t('ho.withdraw'))}</button>
  <a class="whatsapp-btn" href="${e(h.whatsappUrl)}" target="_blank" rel="noopener noreferrer" data-modal-focus>${e(t('ho.open'))}</a></div>
  <p class="fineprint" id="hoState" aria-live="polite"></p>`;
  const root = openModal(html, 'hoTitle');
  root.querySelector('[data-ho-withdraw]')?.addEventListener('click', async () => {
    const ok = await onWithdraw();
    if (ok) closeModal(); else root.querySelector('#hoState')!.textContent = t('report.privacy.fail');
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
