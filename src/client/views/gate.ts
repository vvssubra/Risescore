import type { Legal } from '../lib/api.ts';
import { e, icons } from '../lib/dom.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { state } from '../lib/store.ts';

export function gate(legal: Legal | null) {
  const loc = getLocale();
  const g = state.gate;
  const processing = legal?.consent.processing[loc] ?? '';
  const marketing = legal?.consent.marketing[loc] ?? '';
  return `<section class="stage report-shell" aria-labelledby="pageTitle"><div class="stage-heading"><div class="eyebrow">${e(t('gate.eyebrow'))}</div><h1 id="pageTitle" tabindex="-1" data-autofocus>${e(t('gate.h1'))}</h1><p>${e(t('gate.p'))}</p></div>
  <div class="gate-card gate-layout"><div class="gate-left"><div class="eyebrow light">${e(t('gate.left.eyebrow'))}</div><h2>${e(t('gate.left.h2'))}</h2><p>${e(t('gate.left.p'))}</p>
  <ul class="unlock-list">${['u1', 'u2', 'u3', 'u4'].map((k) => `<li class="unlock-item"><span class="unlock-icon" aria-hidden="true">✓</span><span>${e(t('gate.' + k))}</span></li>`).join('')}</ul></div>
  <div class="gate-form"><div class="eyebrow">${e(t('gate.form.eyebrow'))}</div><h2 class="gate-h">${e(t('gate.form.h3'))}</h2><p>${e(t('gate.form.p'))}</p>
  <form id="gateForm" novalidate>
   <div class="field"><label for="gateName">${e(t('gate.name'))}</label><input id="gateName" name="firstName" type="text" maxlength="70" autocomplete="given-name" required aria-required="true" placeholder="${e(t('gate.namePh'))}" value="${e(g.firstName)}"></div>
   <div class="field"><label for="gateEmail">${e(t('gate.email'))}</label><input id="gateEmail" name="email" type="email" inputmode="email" maxlength="254" autocomplete="email" autocapitalize="off" spellcheck="false" required aria-required="true" placeholder="${e(t('gate.emailPh'))}" value="${e(g.email)}"></div>
   <div class="hp" aria-hidden="true"><label>Website<input id="gateWebsite" name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
   <label class="checkbox-label"><input id="gateConsent" type="checkbox" required aria-required="true" ${g.consent ? 'checked' : ''}><span>${e(processing)}</span></label>
   <label class="checkbox-label"><input id="marketingConsent" type="checkbox" ${g.marketing ? 'checked' : ''}><span>${e(marketing)}</span></label>
   <p class="privacy-line"><button type="button" class="linklike" data-action="privacy">${e(t('gate.privacyRead'))}</button></p>
   <div id="gateError" class="inline-error" role="alert">${e(g.error)}</div>
   <button type="submit" class="primary-btn full-width" ${g.busy ? 'disabled aria-busy="true"' : ''}>${e(g.busy ? t('gate.sending') : t('gate.submit'))} <span class="arrow" aria-hidden="true">↗</span></button></form>
  <div class="demo-notice">${icons.shield()} <span>${e(t('gate.secure'))}</span></div>
  <div class="center mt14"><button class="linklike" data-action="back-preview">${e(t('gate.back'))}</button></div></div></div></section>`;
}
