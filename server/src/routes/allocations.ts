import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';
import { notifyRoles } from '../utils/notifications';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { assetId, employeeId, status } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (assetId) {
    params.push(assetId);
    conditions.push(`al.asset_id = $${params.length}`);
  }
  if (employeeId) {
    params.push(employeeId);
    conditions.push(`al.employee_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`al.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT al.*, a.name AS asset_name, a.asset_code, u.name AS employee_name
     FROM allocations al
     JOIN assets a ON a.id = al.asset_id
     JOIN users u ON u.id = al.employee_id
     ${where}
     ORDER BY al.created_at DESC`,
    params
  );
  res.json(result.rows);
});

const assignSchema = z.object({
  assetId: z.number().int(),
  employeeId: z.number().int(),
  notes: z.string().optional(),
});

router.post(
  '/assign',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { assetId, employeeId, notes } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const asset = await client.query(`SELECT status FROM assets WHERE id = $1 FOR UPDATE`, [assetId]);
      if (!asset.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Asset not found' });
      }
      if (asset.rows[0].status === 'assigned') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Asset is already assigned' });
      }

      const allocation = await client.query(
        `INSERT INTO allocations (asset_id, employee_id, notes, assigned_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [assetId, employeeId, notes ?? null, req.user!.id]
      );
      await client.query(`UPDATE assets SET status = 'assigned', updated_at = now() WHERE id = $1`, [assetId]);

      await client.query('COMMIT');
      await writeAuditLog(req.user!.id, 'assign', 'allocation', allocation.rows[0].id, { assetId, employeeId });
      res.status(201).json(allocation.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
);

router.post(
  '/:id/return',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const allocation = await client.query(
        `UPDATE allocations SET status = 'returned', returned_date = CURRENT_DATE
         WHERE id = $1 AND status = 'active' RETURNING *`,
        [req.params.id]
      );
      if (!allocation.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Active allocation not found' });
      }
      await client.query(`UPDATE assets SET status = 'available', updated_at = now() WHERE id = $1`, [
        allocation.rows[0].asset_id,
      ]);
      await client.query('COMMIT');
      await writeAuditLog(req.user!.id, 'return', 'allocation', Number(req.params.id));

      const info = await pool.query(
        `SELECT a.asset_code, a.name AS asset_name, u.name AS employee_name
         FROM allocations al
         JOIN assets a ON a.id = al.asset_id
         JOIN users u ON u.id = al.employee_id
         WHERE al.id = $1`,
        [req.params.id]
      );
      if (info.rows[0]) {
        const r = info.rows[0];
        await notifyRoles(
          ['super_admin', 'it_admin', 'facility_admin'],
          'asset_return',
          `${r.asset_code} - ${r.asset_name} was returned by ${r.employee_name}`
        );
      }

      res.json(allocation.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
);

export default router;
