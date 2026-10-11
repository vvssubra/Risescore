import { randomUUID } from 'node:crypto';
import type { Config } from './config.ts';
import { decryptField, encryptField } from './crypto.ts';
import type { Db } from './db.ts';

export interface MailMessage { to: string; subject: string; text: string }

/**
 * Emails are written to an encrypted outbox first (the report link inside is a secret), then delivered by
 * `flush()`. Delivery is intentionally pluggable: set MAIL_WEBHOOK_URL to POST each message to a
 * transactional-email function/provider of Balla DK's choice. With no provider configured, messages stay
 * queued (visible to ops through the outbox) and nothing leaves the server.
 */
export class Mailer {
  constructor(private db: Db, private cfg: Config) {}

  async enqueue(msg: MailMessage): Promise<string> {
    const id = randomUUID();
    await this.db.run(
      'INSERT INTO outbox (id, to_enc, subject, body_enc, created_at) VALUES (?,?,?,?,?)',
      id, encryptField(this.cfg.encryptionKey, msg.to, 'outbox.to'), msg.subject,
      encryptField(this.cfg.encryptionKey, msg.text, 'outbox.body'), new Date().toISOString(),
    );
    return id;
  }

  async flush(): Promise<{ sent: number; failed: number; skipped: number }> {
    const rows = await this.db.all("SELECT * FROM outbox WHERE status IN ('queued','failed') AND attempts < 5 ORDER BY created_at LIMIT 50");
    let sent = 0, failed = 0, skipped = 0;
    for (const r of rows) {
      if (!this.cfg.mailWebhookUrl) { skipped++; continue; }
      try {
        const res = await fetch(this.cfg.mailWebhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(this.cfg.mailWebhookToken ? { authorization: `Bearer ${this.cfg.mailWebhookToken}` } : {}) },
          body: JSON.stringify({
            from: this.cfg.mailFrom,
            to: decryptField(this.cfg.encryptionKey, r.to_enc, 'outbox.to'),
            subject: r.subject,
            text: decryptField(this.cfg.encryptionKey, r.body_enc, 'outbox.body'),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await this.db.run("UPDATE outbox SET status='sent', sent_at=?, attempts=attempts+1, error=NULL WHERE id=?", new Date().toISOString(), r.id);
        sent++;
      } catch (e) {
        await this.db.run("UPDATE outbox SET status='failed', attempts=attempts+1, error=? WHERE id=?", String((e as Error).message).slice(0, 200), r.id);
        failed++;
      }
    }
    return { sent, failed, skipped };
  }
}
