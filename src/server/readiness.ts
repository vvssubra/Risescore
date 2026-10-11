import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { PRIVACY_NOTICE_STATUS, privacyNotice } from '../shared/legal.ts';

export interface Check { id: string; label: string; ok: boolean; blocking: boolean; detail: string }

/** Everything that must be true before this app is shown to the public. Used by `npm run launch-check` and the admin console. */
export function launchReadiness(cfg: Config, db: Db): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, ok: boolean, detail: string, blocking = true) => checks.push({ id, label, ok, blocking, detail });

  add('prod-mode', 'NODE_ENV=production', cfg.isProd, cfg.isProd ? 'Production mode.' : `Currently "${cfg.env}".`);
  add('https', 'PUBLIC_BASE_URL uses HTTPS', cfg.publicBaseUrl.startsWith('https://'), cfg.publicBaseUrl);

  const text = JSON.stringify([privacyNotice('en', { assessmentDays: 1, reportDays: 1 }), privacyNotice('ms', { assessmentDays: 1, reportDays: 1 })]);
  add('privacy-approved', 'Privacy notice (EN + BM) approved by counsel', PRIVACY_NOTICE_STATUS === 'approved', `Status: ${PRIVACY_NOTICE_STATUS}. Set PRIVACY_NOTICE_STATUS to 'approved' in src/shared/legal.ts after legal review.`);
  add('privacy-placeholders', 'Privacy notice has no bracketed placeholders', !/\[[^\]]+\]/.test(text), 'Complete the provider list and privacy contact details.');

  const unreviewed = db.all("SELECT id FROM toolkits WHERE builtin=1 AND active=1 AND compliance_reviewed_at IS NULL").map((r) => r.id);
  add('toolkits-reviewed', 'Built-in toolkits compliance-reviewed', unreviewed.length === 0 || cfg.allowUnreviewedBuiltins,
    unreviewed.length ? `${unreviewed.length} awaiting review (${unreviewed.slice(0, 4).join(', ')}${unreviewed.length > 4 ? '…' : ''}).` : 'All reviewed.');

  const staff = db.get<{ a: number; r: number }>("SELECT SUM(role='admin' AND active=1) AS a, SUM(role='reviewer' AND active=1) AS r FROM users");
  add('admin-user', 'At least one active admin account', (staff?.a ?? 0) >= 1, `${staff?.a ?? 0} admin(s).`);
  add('reviewer', 'A reviewer or second admin exists for four-eyes publishing', !cfg.requireSeparateReviewer || ((staff?.a ?? 0) + (staff?.r ?? 0)) >= 2,
    cfg.requireSeparateReviewer ? `${(staff?.a ?? 0) + (staff?.r ?? 0)} reviewer-capable account(s); need 2.` : 'Four-eyes rule disabled.', false);
  add('mail', 'Transactional email provider configured', !!cfg.mailWebhookUrl, cfg.mailWebhookUrl ? 'Webhook configured.' : 'MAIL_WEBHOOK_URL not set: report emails stay queued.');
  add('rate-limit', 'Rate limiting enabled', !cfg.rateLimitDisabled, cfg.rateLimitDisabled ? 'Disabled!' : 'Enabled (in-memory; use an edge limiter if running multiple instances).');
  add('storage', 'PDF storage is private and persistent', true, `Local object store at ${cfg.storageDir}. Mount persistent storage or use an S3 adapter.`, false);
  return checks;
}
