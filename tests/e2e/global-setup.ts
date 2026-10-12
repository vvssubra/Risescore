export const STAFF_PW = 'Correct-Horse-9-battery';
const BASE = 'http://localhost:3100';

async function call(path: string, method: string, body: unknown, cookie = '', csrf = '') {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify(body) });
  return { res, data: await res.json().catch(() => ({})) as any, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] };
}

/** Runs after the web server is up: the server bootstrapped the first admin from env; create the other staff through the real admin API. */
export default async function globalSetup() {
  const boot = await call('/api/admin/auth/login', 'POST', { email: 'admin@e2e.test', password: 'Bootstrap-Pass-12345' });
  if (boot.res.status !== 200) throw new Error(`bootstrap admin login failed: ${boot.res.status}`);
  let { cookie } = boot; let csrf = boot.data.csrfToken;
  const changed = await call('/api/admin/auth/password', 'POST', { current: 'Bootstrap-Pass-12345', next: STAFF_PW }, cookie, csrf);
  if (changed.res.status !== 200) throw new Error('could not set the e2e admin password');
  for (const role of ['reviewer', 'editor'] as const) {
    const made = await call('/api/admin/users', 'POST', { email: `${role}@e2e.test`, name: `E2E ${role}`, role, password: 'Temp-Password-12345' }, cookie, csrf);
    if (made.res.status !== 201) throw new Error(`could not create ${role}: ${made.res.status}`);
    const l = await call('/api/admin/auth/login', 'POST', { email: `${role}@e2e.test`, password: 'Temp-Password-12345' });
    const done = await call('/api/admin/auth/password', 'POST', { current: 'Temp-Password-12345', next: STAFF_PW }, l.cookie, l.data.csrfToken);
    if (done.res.status !== 200) throw new Error(`could not finalise ${role}`);
  }
  void csrf; void cookie;
}
