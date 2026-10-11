import type { Db } from '../db.ts';

export function audit(db: Db, actor: string | null, action: string, entity?: string, entityId?: string | number, detail?: unknown) {
  db.run(
    'INSERT INTO audit_log (at, actor, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)',
    new Date().toISOString(), actor, action, entity ?? null, entityId === undefined ? null : String(entityId),
    detail === undefined ? null : JSON.stringify(detail).slice(0, 2000),
  );
}
