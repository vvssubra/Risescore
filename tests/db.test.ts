import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Db, migrate, toPg } from '../src/server/db.ts';
import { TEST_DATABASE_URL } from './server-helpers.ts';

describe('toPg placeholder translation', () => {
  it('numbers ? placeholders and leaves ? inside string literals alone', () => {
    expect(toPg("SELECT * FROM t WHERE a=? AND b='what?' AND c=?")).toBe("SELECT * FROM t WHERE a=$1 AND b='what?' AND c=$2");
  });
});

describe('Postgres layer', () => {
  let db: Db;
  beforeAll(async () => { db = await Db.connect(TEST_DATABASE_URL, { schema: `t_${randomBytes(6).toString('hex')}` }); });
  afterAll(async () => { await db.dropSchema(); await db.close(); });

  it('migrates idempotently, including when several instances boot at once', async () => {
    await Promise.all([migrate(db), migrate(db), migrate(db)]);
    await migrate(db);
    const v = await db.all<{ version: number }>('SELECT version FROM schema_migrations');
    expect(v).toEqual([{ version: 1 }]);
  });

  it('rolls a transaction back on error and commits on success', async () => {
    const now = new Date().toISOString();
    const insert = (id: string) => db.run('INSERT INTO users (id,email,name,role,password_hash,created_at) VALUES (?,?,?,?,?,?)', id, `${id}@x.test`, id, 'admin', 'h', now);
    await expect(db.tx(async () => { await insert('a'); throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await db.get('SELECT 1 FROM users WHERE id=?', 'a')).toBeUndefined();
    await db.tx(async () => { await insert('b'); await db.tx(async () => { await insert('c'); }); }); // nested joins the outer tx
    expect((await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM users'))!.n).toBe(2);
  });

  it('enforces the same constraints as before (CHECK, UNIQUE, FK cascade)', async () => {
    const now = new Date().toISOString();
    await expect(db.run('INSERT INTO users (id,email,name,role,password_hash,created_at) VALUES (?,?,?,?,?,?)', 'z', 'z@x.test', 'z', 'superuser', 'h', now)).rejects.toThrow();
    await expect(db.run('INSERT INTO users (id,email,name,role,password_hash,created_at) VALUES (?,?,?,?,?,?)', 'b2', 'b@x.test', 'b', 'admin', 'h', now)).rejects.toThrow(); // duplicate email
    await db.run('INSERT INTO sessions (id_hash,user_id,csrf_token,created_at,expires_at) VALUES (?,?,?,?,?)', 's1', 'b', 'c', now, now);
    await db.run('DELETE FROM users WHERE id=?', 'b');
    expect(await db.get('SELECT 1 FROM sessions WHERE id_hash=?', 's1')).toBeUndefined();
  });
});
