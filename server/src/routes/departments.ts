import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(`SELECT * FROM departments ORDER BY name`);
  res.json(result.rows);
});

const schema = z.object({ name: z.string().min(1) });

router.post('/', requireRole('super_admin'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await pool.query(
      `INSERT INTO departments (name) VALUES ($1) RETURNING *`,
      [parsed.data.name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department already exists' });
    throw err;
  }
});

export default router;
