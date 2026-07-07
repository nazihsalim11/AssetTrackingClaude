import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { assetId } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (assetId) {
    params.push(assetId);
    conditions.push(`m.asset_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT m.*, a.name AS asset_name, a.asset_code,
            fd.name AS from_department_name, td.name AS to_department_name,
            u.name AS moved_by_name
     FROM asset_movements m
     JOIN assets a ON a.id = m.asset_id
     LEFT JOIN departments fd ON fd.id = m.from_department_id
     LEFT JOIN departments td ON td.id = m.to_department_id
     LEFT JOIN users u ON u.id = m.moved_by
     ${where}
     ORDER BY m.moved_at DESC`,
    params
  );
  res.json(result.rows);
});

const schema = z.object({
  assetId: z.number().int(),
  toDepartmentId: z.number().int().nullable().optional(),
  toLocation: z.string().optional(),
  reason: z.string().optional(),
});

router.post('/', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { assetId, toDepartmentId, toLocation, reason } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const asset = await client.query(
      `SELECT department_id, location FROM assets WHERE id = $1 FOR UPDATE`,
      [assetId]
    );
    if (!asset.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found' });
    }
    const { department_id: fromDepartmentId, location: fromLocation } = asset.rows[0];

    const movement = await client.query(
      `INSERT INTO asset_movements (asset_id, from_department_id, to_department_id, from_location, to_location, moved_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [assetId, fromDepartmentId, toDepartmentId ?? fromDepartmentId, fromLocation, toLocation ?? fromLocation, req.user!.id, reason ?? null]
    );

    await client.query(
      `UPDATE assets SET department_id = COALESCE($1, department_id), location = COALESCE($2, location), updated_at = now()
       WHERE id = $3`,
      [toDepartmentId ?? null, toLocation ?? null, assetId]
    );

    await client.query('COMMIT');
    await writeAuditLog(req.user!.id, 'transfer', 'asset', assetId, { toDepartmentId, toLocation, reason });
    res.status(201).json(movement.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
