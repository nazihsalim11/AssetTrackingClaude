import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateNotifications } from '../utils/notifications';

const router = Router();
router.use(requireAuth);

// The bell polls this endpoint every 60s while the app is open, so piggyback
// notification generation here (throttled) instead of relying solely on the
// daily Vercel Cron — the free plan can't run cron more than once a day, but
// this gives near-real-time freshness for any active session at no cost.
// Duplicate-safe: generateNotifications() itself skips anything already
// created for the same user in the last 24h.
let lastGeneratedAt = 0;
const GENERATE_THROTTLE_MS = 5 * 60 * 1000;

async function maybeGenerateNotifications() {
  if (Date.now() - lastGeneratedAt < GENERATE_THROTTLE_MS) return;
  lastGeneratedAt = Date.now();
  try {
    await generateNotifications();
  } catch (err) {
    console.error('Notification generation failed:', err);
  }
}

router.get('/', async (req, res) => {
  await maybeGenerateNotifications();
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
