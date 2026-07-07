import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { type } = req.query;
  const params: any[] = [];
  let where = '';
  if (type) {
    params.push(type);
    where = `WHERE type = $1`;
  }
  const result = await pool.query(`SELECT * FROM categories ${where} ORDER BY name`, params);
  res.json(result.rows);
});

const schema = z.object({ name: z.string().min(1), type: z.enum(['office', 'it']) });

router.post('/', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await pool.query(
      `INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING *`,
      [parsed.data.name, parsed.data.type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    throw err;
  }
});

export default router;
