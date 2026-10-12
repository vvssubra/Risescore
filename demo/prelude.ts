// Demo-only shims for the sandboxed artifact viewer. Runs before the app.
// 1) The viewer's confirm() always returns false, which would break "Start over" / "Delete my data": confirm automatically.
//    (Everything cleared here is in-memory demo state, so there is nothing to protect.)
window.confirm = () => true;
// 2) Sandboxed frames refuse URL changes: keep the history entries (so Back still steps through questions) but drop the URL.
const ps = history.pushState.bind(history);
const rs = history.replaceState.bind(history);
history.pushState = (s: unknown, t: string) => { try { ps(s, t); } catch { /* ignore */ } };
history.replaceState = (s: unknown, t: string) => { try { rs(s, t); } catch { /* ignore */ } };
