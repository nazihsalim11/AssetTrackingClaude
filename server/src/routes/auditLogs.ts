import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('super_admin', 'auditor'));

router.get('/', async (req, res) => {
  const { entity, userId } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (entity) {
    params.push(entity);
    conditions.push(`al.entity = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conditions.push(`al.user_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT al.*, u.name AS user_name FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC LIMIT 200`,
    params
  );
  res.json(result.rows);
});

export default router;
