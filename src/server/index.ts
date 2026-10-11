import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createContext } from './context.ts';

const cfg = loadConfig();
const ctx = await createContext(cfg);
const app = createApp(ctx);

const server = app.listen(cfg.port, () => console.log(`R.I.S.E. scorecard listening on :${cfg.port} (${cfg.env})`));

// Deliver queued emails and apply the retention policy on a schedule.
const tick = () => {
  ctx.mailer.flush().catch((e) => console.error('[mail]', e.message));
  ctx.reports.purgeExpired().then((out) => { if (out.assessments || out.reportRequests) console.log('[purge]', out); }).catch((e) => console.error('[purge]', (e as Error).message));
};
const timer = setInterval(tick, 15 * 60_000);
timer.unref();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { clearInterval(timer); server.close(() => { void ctx.close().finally(() => process.exit(0)); }); });
}
