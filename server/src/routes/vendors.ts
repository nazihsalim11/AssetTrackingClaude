import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(`SELECT * FROM vendors ORDER BY name`);
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(`SELECT * FROM vendors WHERE id = $1`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Vendor not found' });
  res.json(result.rows[0]);
});

const schema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

router.post('/', requireRole('super_admin', 'it_admin', 'facility_admin', 'finance'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO vendors (name, contact_email, contact_phone, address, gst_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.name, d.contactEmail ?? null, d.contactPhone ?? null, d.address ?? null, d.gstNumber ?? null]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
