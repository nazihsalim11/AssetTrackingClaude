import { pool } from '../db/pool';

export async function writeAuditLog(
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  details?: Record<string, unknown>
) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entity, entityId, details ? JSON.stringify(details) : null]
  );
}
