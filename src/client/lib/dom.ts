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
    `<svg class="${c}" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false"><path d="M16 .9C7.65.9.9 7.62.9 15.96c0 2.67.7 5.25 2.02 7.53L.8 31.2l7.88-2.07A15 15 0 0 0 16 31c8.34 0 15.1-6.74 15.1-15.05S24.34.9 16 .9Zm0 27.55c-2.35 0-4.64-.62-6.64-1.82l-.47-.29-4.66 1.23 1.25-4.54-.31-.49A12.44 12.44 0 0 1 3.45 16C3.45 9.1 9.08 3.48 16 3.48c6.92 0 12.55 5.62 12.55 12.52 0 6.89-5.63 12.45-12.55 12.45ZM22.88 19.1c-.38-.2-2.22-1.09-2.55-1.22-.35-.12-.6-.19-.85.2-.25.37-.97 1.22-1.18 1.46-.22.25-.44.28-.82.1a10.2 10.2 0 0 1-3-1.84 11.2 11.2 0 0 1-2.07-2.56c-.21-.38-.02-.58.17-.76.17-.17.38-.43.57-.65.2-.21.26-.37.38-.61.12-.24.05-.46-.03-.65-.1-.2-.86-2.07-1.16-2.83-.3-.73-.6-.63-.85-.64l-.73-.01c-.25 0-.65.1-1 .47s-1.31 1.28-1.31 3.11 1.35 3.6 1.54 2.17 3.43 4.68c2.56 3.36 5.63 4.4 7.47 4.59 1.07.1 1.89-.1 2.6-.34.79-.26 2.22-.9 2.53-1.79.3-.88.3-1.64.2-1.8-.1-.17-.35-.26-.73-.45Z"/></svg>`,
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
