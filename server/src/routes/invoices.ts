import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { paymentStatus, vendorId } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (paymentStatus) {
    params.push(paymentStatus);
    conditions.push(`i.payment_status = $${params.length}`);
  }
  if (vendorId) {
    params.push(vendorId);
    conditions.push(`i.vendor_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT i.*, v.name AS vendor_name, a.name AS asset_name, a.asset_code
     FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     LEFT JOIN assets a ON a.id = i.asset_id
     ${where}
     ORDER BY i.invoice_date DESC`,
    params
  );
  res.json(result.rows);
});

const schema = z.object({
  invoiceNumber: z.string().min(1),
  vendorId: z.number().int().nullable().optional(),
  poId: z.number().int().nullable().optional(),
  assetId: z.number().int().nullable().optional(),
  amount: z.number(),
  gstAmount: z.number().optional(),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  fileUrl: z.string().optional(),
});

router.post('/', requireRole('super_admin', 'finance'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO invoices (invoice_number, vendor_id, po_id, asset_id, amount, gst_amount, invoice_date, due_date, file_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [d.invoiceNumber, d.vendorId ?? null, d.poId ?? null, d.assetId ?? null, d.amount, d.gstAmount ?? 0, d.invoiceDate, d.dueDate ?? null, d.fileUrl ?? null]
  );
  await writeAuditLog(req.user!.id, 'create', 'invoice', result.rows[0].id);
  res.status(201).json(result.rows[0]);
});

router.patch('/:id/status', requireRole('super_admin', 'finance'), async (req, res) => {
  const statusSchema = z.enum(['pending', 'partially_paid', 'paid', 'overdue']);
  const parsed = statusSchema.safeParse(req.body.paymentStatus);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payment status' });
  const result = await pool.query(
    `UPDATE invoices SET payment_status = $1 WHERE id = $2 RETURNING *`,
    [parsed.data, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
  await writeAuditLog(req.user!.id, 'update_status', 'invoice', Number(req.params.id), { paymentStatus: parsed.data });
  res.json(result.rows[0]);
});

export default router;
