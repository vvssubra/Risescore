import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const bool = (d: boolean) => z.enum(['true', 'false', '1', '0']).default(d ? 'true' : 'false').transform((v) => v === 'true' || v === '1');

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default(''),
  TRUST_PROXY: z.string().default('false'),
  DATA_DIR: z.string().default('./data'),
  DB_PATH: z.string().optional(),
  STORAGE_DIR: z.string().optional(),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  SIGNING_SECRET: z.string().optional(),
  REPORT_TTL_DAYS: z.coerce.number().int().positive().default(30),
  ASSESSMENT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  REPORT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  REPORT_ACCESS_MODE: z.enum(['immediate', 'email_verified']).default('immediate'),
  MAX_PDF_MB: z.coerce.number().positive().default(15),
  REQUIRE_SEPARATE_REVIEWER: bool(true),
  ALLOW_UNREVIEWED_BUILTINS: bool(false),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(8),
  RATE_LIMIT_DISABLED: bool(false),
  MAIL_FROM: z.string().default('R.I.S.E. Scorecard <no-reply@localhost>'),
  MAIL_WEBHOOK_URL: z.string().url().optional(),
  MAIL_WEBHOOK_TOKEN: z.string().optional(),
  STAGING_BASIC_AUTH: z.string().regex(/^[^:\s]+:.{12,}$/, 'Use user:password with a 12+ character password').optional(),
  WHATSAPP_NUMBER: z.string().regex(/^\d{8,15}$/).default('60122202217'),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  isProd: boolean;
  port: number;
  publicBaseUrl: string;
  allowedOrigins: string[];
  trustProxy: boolean | number | string;
  dataDir: string;
  dbPath: string;
  storageDir: string;
  encryptionKey: Buffer;
  signingSecret: string;
  reportTtlDays: number;
  assessmentRetentionDays: number;
  reportRetentionDays: number;
  auditRetentionDays: number;
  signedUrlTtlSeconds: number;
  reportAccessMode: 'immediate' | 'email_verified';
  maxPdfBytes: number;
  requireSeparateReviewer: boolean;
  allowUnreviewedBuiltins: boolean;
  sessionTtlHours: number;
  rateLimitDisabled: boolean;
  mailFrom: string;
  mailWebhookUrl?: string;
  mailWebhookToken?: string;
  whatsappNumber: string;
  /** user:password. When set, the whole site (except /api/health) sits behind HTTP Basic auth — for staging. */
  stagingBasicAuth?: string;
}

/** Secrets are mandatory in production. In dev/test they are generated once and kept under DATA_DIR. */
export function loadConfig(overrides: Record<string, string | undefined> = {}, source: NodeJS.ProcessEnv = process.env): Config {
  const e = Env.parse({ ...source, ...overrides });
  const isProd = e.NODE_ENV === 'production';
  const dataDir = resolve(e.DATA_DIR);
  mkdirSync(dataDir, { recursive: true });

  let key = e.DATA_ENCRYPTION_KEY;
  let signing = e.SIGNING_SECRET;
  if (isProd) {
    if (!key || !signing) throw new Error('DATA_ENCRYPTION_KEY and SIGNING_SECRET are required in production.');
  } else if (!key || !signing) {
    const file = join(dataDir, '.dev-secrets.json');
    let saved: { key?: string; signing?: string } = {};
    if (existsSync(file)) saved = JSON.parse(readFileSync(file, 'utf8'));
    saved.key ??= randomBytes(32).toString('base64');
    saved.signing ??= randomBytes(32).toString('base64url');
    writeFileSync(file, JSON.stringify(saved), { mode: 0o600 });
    key ??= saved.key;
    signing ??= saved.signing;
  }
  const keyBuf = Buffer.from(key as string, 'base64');
  if (keyBuf.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32).');
  if ((signing as string).length < 32) throw new Error('SIGNING_SECRET must be at least 32 characters.');

  const tp = e.TRUST_PROXY;
  const trustProxy = tp === 'true' ? true : tp === 'false' ? false : /^\d+$/.test(tp) ? Number(tp) : tp;
  const base = new URL(e.PUBLIC_BASE_URL);
  return {
    env: e.NODE_ENV,
    isProd,
    port: e.PORT,
    publicBaseUrl: e.PUBLIC_BASE_URL.replace(/\/$/, ''),
    allowedOrigins: [base.origin, ...e.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)],
    trustProxy,
    dataDir,
    dbPath: e.DB_PATH ? resolve(e.DB_PATH) : join(dataDir, 'rise.sqlite'),
    storageDir: e.STORAGE_DIR ? resolve(e.STORAGE_DIR) : join(dataDir, 'files'),
    encryptionKey: keyBuf,
    signingSecret: signing as string,
    reportTtlDays: e.REPORT_TTL_DAYS,
    assessmentRetentionDays: e.ASSESSMENT_RETENTION_DAYS,
    reportRetentionDays: e.REPORT_RETENTION_DAYS,
    auditRetentionDays: e.AUDIT_RETENTION_DAYS,
    signedUrlTtlSeconds: e.SIGNED_URL_TTL_SECONDS,
    reportAccessMode: e.REPORT_ACCESS_MODE,
    maxPdfBytes: Math.floor(e.MAX_PDF_MB * 1024 * 1024),
    requireSeparateReviewer: e.REQUIRE_SEPARATE_REVIEWER,
    allowUnreviewedBuiltins: e.ALLOW_UNREVIEWED_BUILTINS,
    sessionTtlHours: e.SESSION_TTL_HOURS,
    rateLimitDisabled: e.RATE_LIMIT_DISABLED,
    mailFrom: e.MAIL_FROM,
    mailWebhookUrl: e.MAIL_WEBHOOK_URL,
    mailWebhookToken: e.MAIL_WEBHOOK_TOKEN,
    whatsappNumber: e.WHATSAPP_NUMBER,
    stagingBasicAuth: e.STAGING_BASIC_AUTH,
  };
}
