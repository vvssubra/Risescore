import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Config } from '../config.ts';
import { DUMMY_HASH, hashPassword, newToken, sha256Hex, validatePasswordStrength, verifyPassword } from '../crypto.ts';
import type { Db } from '../db.ts';
import { audit } from './audit.ts';
import { HttpError, type Actor, type Role } from './toolkits.ts';

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const nowIso = () => new Date().toISOString();

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(100),
  role: z.enum(['admin', 'reviewer', 'editor']),
  password: z.string().max(200),
});

export interface SessionInfo { user: Actor & { name: string; mustChangePassword: boolean }; csrf: string }

export class AuthService {
  constructor(private db: Db, private cfg: Config) {}

  async createUser(input: unknown, actorEmail: string | null, mustChange = false) {
    const d = userCreateSchema.parse(input);
    const weak = validatePasswordStrength(d.password);
    if (weak) throw new HttpError(400, weak, 'weak_password');
    if (this.db.get('SELECT 1 FROM users WHERE email=?', d.email)) throw new HttpError(409, 'A user with that email already exists.', 'duplicate');
    const id = randomUUID();
    this.db.run('INSERT INTO users (id,email,name,role,password_hash,must_change_password,created_at) VALUES (?,?,?,?,?,?,?)',
      id, d.email, d.name, d.role, await hashPassword(d.password), mustChange ? 1 : 0, nowIso());
    audit(this.db, actorEmail, 'user.create', 'user', id, { role: d.role });
    return this.publicUser(id);
  }

  private publicUser(id: string) {
    const u = this.db.get('SELECT id,email,name,role,active,must_change_password,created_at,last_login_at FROM users WHERE id=?', id);
    if (!u) throw new HttpError(404, 'User not found.', 'not_found');
    return { id: u.id, email: u.email, name: u.name, role: u.role as Role, active: !!u.active, mustChangePassword: !!u.must_change_password, createdAt: u.created_at, lastLoginAt: u.last_login_at };
  }

  listUsers() {
    return this.db.all('SELECT id FROM users ORDER BY created_at').map((r) => this.publicUser(r.id));
  }

  async login(email: string, password: string, ipHash: string) {
    const u = this.db.get('SELECT * FROM users WHERE email=?', email.trim().toLowerCase());
    const generic = new HttpError(401, 'Incorrect email or password.', 'invalid_credentials');
    if (!u) { await verifyPassword(password, DUMMY_HASH); throw generic; } // equalise timing
    if (u.locked_until && u.locked_until > nowIso()) throw new HttpError(423, 'Too many failed attempts. Try again in a few minutes.', 'locked');
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok || !u.active) {
      const fails = u.failed_logins + 1;
      this.db.run('UPDATE users SET failed_logins=?, locked_until=? WHERE id=?', fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null, u.id);
      audit(this.db, u.email, 'auth.login_failed', 'user', u.id);
      throw generic;
    }
    this.db.run('UPDATE users SET failed_logins=0, locked_until=NULL, last_login_at=? WHERE id=?', nowIso(), u.id);
    const sid = newToken();
    const csrf = newToken(24);
    const expires = new Date(Date.now() + this.cfg.sessionTtlHours * 3_600_000).toISOString();
    this.db.run('INSERT INTO sessions (id_hash,user_id,csrf_token,created_at,expires_at,ip_hash) VALUES (?,?,?,?,?,?)', sha256Hex(sid), u.id, csrf, nowIso(), expires, ipHash);
    audit(this.db, u.email, 'auth.login', 'user', u.id);
    return { sid, csrf, expires, user: this.publicUser(u.id) };
  }

  session(sid: string | undefined): SessionInfo | null {
    if (!sid) return null;
    const s = this.db.get(
      `SELECT s.csrf_token, s.expires_at, u.id, u.email, u.name, u.role, u.active, u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=?`, sha256Hex(sid));
    if (!s || s.expires_at < nowIso() || !s.active) return null;
    return { csrf: s.csrf_token, user: { id: s.id, email: s.email, name: s.name, role: s.role, mustChangePassword: !!s.must_change_password } };
  }

  logout(sid: string | undefined) { if (sid) this.db.run('DELETE FROM sessions WHERE id_hash=?', sha256Hex(sid)); }

  async changePassword(userId: string, current: string, next: string) {
    const u = this.db.get('SELECT * FROM users WHERE id=?', userId);
    if (!u || !(await verifyPassword(current, u.password_hash))) throw new HttpError(403, 'Current password is incorrect.', 'invalid_credentials');
    const weak = validatePasswordStrength(next);
    if (weak) throw new HttpError(400, weak, 'weak_password');
    this.db.run('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?', await hashPassword(next), userId);
    audit(this.db, u.email, 'auth.password_change', 'user', userId);
  }

  private activeAdmins(excludeId?: string) {
    return this.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1 AND id <> ?", excludeId ?? '')!.n;
  }

  async updateUser(id: string, patch: { role?: Role; active?: boolean; name?: string; newPassword?: string }, actor: Actor) {
    const u = this.db.get('SELECT * FROM users WHERE id=?', id);
    if (!u) throw new HttpError(404, 'User not found.', 'not_found');
    const losesAdmin = u.role === 'admin' && ((patch.role && patch.role !== 'admin') || patch.active === false);
    if (losesAdmin && this.activeAdmins(id) === 0) throw new HttpError(409, 'At least one active admin must remain.', 'last_admin');
    if (patch.newPassword !== undefined) {
      const weak = validatePasswordStrength(patch.newPassword);
      if (weak) throw new HttpError(400, weak, 'weak_password');
      this.db.run('UPDATE users SET password_hash=?, must_change_password=1, failed_logins=0, locked_until=NULL WHERE id=?', await hashPassword(patch.newPassword), id);
      this.db.run('DELETE FROM sessions WHERE user_id=?', id);
    }
    if (patch.role) this.db.run('UPDATE users SET role=? WHERE id=?', patch.role, id);
    if (patch.name) this.db.run('UPDATE users SET name=? WHERE id=?', patch.name.slice(0, 100), id);
    if (patch.active !== undefined) {
      this.db.run('UPDATE users SET active=? WHERE id=?', patch.active ? 1 : 0, id);
      if (!patch.active) this.db.run('DELETE FROM sessions WHERE user_id=?', id);
    }
    audit(this.db, actor.email, 'user.update', 'user', id, { role: patch.role, active: patch.active, passwordReset: patch.newPassword !== undefined });
    return this.publicUser(id);
  }
}
