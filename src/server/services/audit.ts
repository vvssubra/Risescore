import type { Queryable } from '../db.ts';

export async function audit(db: Queryable, actor: string | null, action: string, entity?: string, entityId?: string | number, detail?: unknown): Promise<void> {
  await db.run(
    'INSERT INTO audit_log (at, actor, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)',
    new Date().toISOString(), actor, action, entity ?? null, entityId === undefined ? null : String(entityId),
    detail === undefined ? null : JSON.stringify(detail).slice(0, 2000),
  );
}
