import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateNotifications } from '../utils/notifications';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id]
  );
  res.json(result.rows);
});

router.patch('/:id/read', async (req, res) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user!.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Notification not found' });
  res.json(result.rows[0]);
});

router.post('/read-all', async (req, res) => {
  await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [req.user!.id]);
  res.json({ ok: true });
});

router.post('/generate', requireRole('super_admin', 'it_admin', 'facility_admin', 'finance'), async (_req, res) => {
  const count = await generateNotifications();
  res.json({ generated: count });
});

export default router;
