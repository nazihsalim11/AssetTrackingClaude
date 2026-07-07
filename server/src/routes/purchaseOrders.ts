import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  const result = await pool.query(
    `SELECT po.*, v.name AS vendor_name FROM purchase_orders po
     LEFT JOIN vendors v ON v.id = po.vendor_id
     ORDER BY po.order_date DESC`
  );
  res.json(result.rows);
});

const schema = z.object({
  poNumber: z.string().min(1),
  vendorId: z.number().int().nullable().optional(),
  orderDate: z.string().optional(),
  totalAmount: z.number().optional(),
  status: z.string().optional(),
});

router.post('/', requireRole('super_admin', 'finance', 'it_admin', 'facility_admin'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO purchase_orders (po_number, vendor_id, order_date, total_amount, status)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, COALESCE($5, 'open')) RETURNING *`,
      [d.poNumber, d.vendorId ?? null, d.orderDate ?? null, d.totalAmount ?? null, d.status ?? null]
    );
    await writeAuditLog(req.user!.id, 'create', 'purchase_order', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'PO number already exists' });
    throw err;
  }
});

router.patch('/:id/status', requireRole('super_admin', 'finance'), async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  const result = await pool.query(
    `UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Purchase order not found' });
  res.json(result.rows[0]);
});

export default router;
