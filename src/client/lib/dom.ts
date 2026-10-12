export const e = (x: unknown): string =>
  String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const svg = (inner: string, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const icons = {
  shield: (c = '') => svg('<path d="m12 22 7-4V6l-7-3-7 3v12z"/><path d="m9 12 2 2 4-4"/>', c),
  trend: (c = '') => svg('<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>', c),
  lock: (c = '') => svg('<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>', c),
  check: (c = '') => svg('<path d="M4 12l5 5L20 6"/>', c),
  whatsapp: (c = '') =>
    `<svg class="${c}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
};

/** Announce a message to screen readers without moving focus. */
export function announce(msg: string) {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  window.setTimeout(() => { el.textContent = msg; }, 30);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scrollTop() { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); }

export function safeSession<T>(key: string, value?: T | null): T | null {
  try {
    if (value === undefined) { const raw = sessionStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; }
    if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* sessionStorage can be blocked: the app works without it */ }
  return null;
}

export function formatDate(iso: string, locale: string) {
  try { return new Date(iso).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-MY', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return iso; }
}

/**
 * The CSP forbids inline style attributes, so dynamic sizes travel as data-* attributes and are applied through the CSSOM
 * (which CSP allows): data-w -> width %, data-pct -> --pct custom property (score dial).
 */
export function hydrateStyles(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => { el.style.width = `${Number(el.dataset.w) || 0}%`; });
  root.querySelectorAll<HTMLElement>('[data-pct]').forEach((el) => { el.style.setProperty('--pct', `${Number(el.dataset.pct) || 0}%`); });
}
