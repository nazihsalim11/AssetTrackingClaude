import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

const QR_DIR = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');
fs.mkdirSync(QR_DIR, { recursive: true });

const assetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.number().int().nullable().optional(),
  type: z.enum(['office', 'it']),
  serialNumber: z.string().optional(),
  status: z.enum(['available', 'assigned', 'in_repair', 'retired', 'disposed']).optional(),
  condition: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  vendorId: z.number().int().nullable().optional(),
  warrantyExpiry: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.number().int().nullable().optional(),
  imageUrl: z.string().optional(),
  depreciationRate: z.number().optional(),
  currentValue: z.number().optional(),
});

router.get('/', async (req, res) => {
  const { status, type, departmentId, categoryId, search } = req.query;
  const conditions: string[] = ['a.is_archived = false'];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`a.type = $${params.length}`);
  }
  if (departmentId) {
    params.push(departmentId);
    conditions.push(`a.department_id = $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`a.category_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(a.name ILIKE $${params.length} OR a.asset_code ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT a.*, c.name AS category_name, d.name AS department_name, v.name AS vendor_name
     FROM assets a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN departments d ON d.id = a.department_id
     LEFT JOIN vendors v ON v.id = a.vendor_id
     ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, c.name AS category_name, d.name AS department_name, v.name AS vendor_name
     FROM assets a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN departments d ON d.id = a.department_id
     LEFT JOIN vendors v ON v.id = a.vendor_id
     WHERE a.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
  res.json(result.rows[0]);
});

router.post(
  '/',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const parsed = assetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const d = parsed.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO assets (
          asset_code, name, category_id, type, serial_number, status, condition,
          purchase_date, purchase_cost, vendor_id, warranty_expiry, location,
          department_id, image_url, depreciation_rate, current_value, created_by
        ) VALUES (
          'TEMP', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING id`,
        [
          d.name, d.categoryId ?? null, d.type, d.serialNumber ?? null,
          d.status ?? 'available', d.condition ?? 'good', d.purchaseDate ?? null,
          d.purchaseCost ?? null, d.vendorId ?? null, d.warrantyExpiry ?? null,
          d.location ?? null, d.departmentId ?? null, d.imageUrl ?? null,
          d.depreciationRate ?? null, d.currentValue ?? null, req.user!.id,
        ]
      );
      const id = insertResult.rows[0].id;
      const assetCode = `AST-${String(id).padStart(5, '0')}`;

      const qrPayload = JSON.stringify({ assetCode, type: d.type, serialNumber: d.serialNumber ?? '' });
      const qrFileName = `${assetCode}.png`;
      await QRCode.toFile(path.join(QR_DIR, qrFileName), qrPayload, { width: 300 });
      const qrCodeUrl = `/uploads/qrcodes/${qrFileName}`;

      const updated = await client.query(
        `UPDATE assets SET asset_code = $1, qr_code_url = $2 WHERE id = $3 RETURNING *`,
        [assetCode, qrCodeUrl, id]
      );

      await client.query('COMMIT');
      await writeAuditLog(req.user!.id, 'create', 'asset', id, { assetCode });
      res.status(201).json(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
);

router.put(
  '/:id',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const parsed = assetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const d = parsed.data;

    const fields: string[] = [];
    const values: any[] = [];
    const map: Record<string, any> = {
      name: d.name, category_id: d.categoryId, type: d.type, serial_number: d.serialNumber,
      status: d.status, condition: d.condition, purchase_date: d.purchaseDate,
      purchase_cost: d.purchaseCost, vendor_id: d.vendorId, warranty_expiry: d.warrantyExpiry,
      location: d.location, department_id: d.departmentId, image_url: d.imageUrl,
      depreciation_rate: d.depreciationRate, current_value: d.currentValue,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        values.push(val);
        fields.push(`${col} = $${values.length}`);
      }
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE assets SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
    await writeAuditLog(req.user!.id, 'update', 'asset', Number(req.params.id));
    res.json(result.rows[0]);
  }
);

router.post(
  '/:id/archive',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const result = await pool.query(
      `UPDATE assets SET is_archived = true, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
    await writeAuditLog(req.user!.id, 'archive', 'asset', Number(req.params.id));
    res.json(result.rows[0]);
  }
);

router.post(
  '/:id/dispose',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE assets SET status = 'disposed', disposed_at = CURRENT_DATE, disposal_reason = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [reason ?? null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
    await writeAuditLog(req.user!.id, 'dispose', 'asset', Number(req.params.id), { reason });
    res.json(result.rows[0]);
  }
);

router.post(
  '/:id/image',
  requireRole('super_admin', 'it_admin', 'facility_admin'),
  async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    const result = await pool.query(
      `UPDATE assets SET image_url = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [imageUrl, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  }
);

router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  const result = await pool.query(`DELETE FROM assets WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Asset not found' });
  await writeAuditLog(req.user!.id, 'delete', 'asset', Number(req.params.id));
  res.status(204).send();
});

export default router;
