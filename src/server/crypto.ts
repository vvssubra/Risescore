import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const b64u = (b: Buffer) => b.toString('base64url');

/** 256-bit URL-safe random token. */
export const newToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256Hex = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export const hmacHex = (secret: string | Buffer, data: string) => createHmac('sha256', secret).update(data).digest('hex');
export const hmacB64u = (secret: string | Buffer, data: string) => createHmac('sha256', secret).update(data).digest('base64url');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * AES-256-GCM field encryption. `context` (e.g. "report_requests.email") is bound as AAD so a ciphertext
 * copied into another column or table fails authentication.
 */
export function encryptField(key: Buffer, plain: string, context: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(context));
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `v1.${b64u(iv)}.${b64u(c.getAuthTag())}.${b64u(ct)}`;
}

export function decryptField(key: Buffer, blob: string, context: string): string {
  const [v, iv, tag, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Unsupported ciphertext format.');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  d.setAAD(Buffer.from(context));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
}

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64u(salt)}$${b64u(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const got = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return timingSafeEqual(got, expected);
}

/** Dummy hash used to equalise timing when a login email does not exist. */
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + Buffer.alloc(64).toString('base64url');

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 12) return 'Password must be at least 12 characters.';
  if (pw.length > 200) return 'Password is too long.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use upper-case, lower-case and a number.';
  return null;
}
