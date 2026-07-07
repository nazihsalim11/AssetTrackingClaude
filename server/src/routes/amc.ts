import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { expiringInDays } = req.query;
  const params: any[] = [];
  let where = '';
  if (expiringInDays) {
    params.push(Number(expiringInDays));
    where = `WHERE ac.end_date <= CURRENT_DATE + ($1 || ' days')::interval AND ac.status = 'active'`;
  }
  const result = await pool.query(
    `SELECT ac.*, a.name AS asset_name, a.asset_code, v.name AS vendor_name
     FROM amc_contracts ac
     JOIN assets a ON a.id = ac.asset_id
     LEFT JOIN vendors v ON v.id = ac.vendor_id
     ${where}
     ORDER BY ac.end_date ASC`,
    params
  );
  res.json(result.rows);
});

const schema = z.object({
  assetId: z.number().int(),
  vendorId: z.number().int().nullable().optional(),
  contractNumber: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  cost: z.number().optional(),
  serviceSchedule: z.string().optional(),
  agreementDocUrl: z.string().optional(),
});

router.post('/', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO amc_contracts (asset_id, vendor_id, contract_number, start_date, end_date, cost, service_schedule, agreement_doc_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [d.assetId, d.vendorId ?? null, d.contractNumber, d.startDate, d.endDate, d.cost ?? null, d.serviceSchedule ?? null, d.agreementDocUrl ?? null]
  );
  await writeAuditLog(req.user!.id, 'create', 'amc_contract', result.rows[0].id);
  res.status(201).json(result.rows[0]);
});

router.post('/:id/services', requireRole('super_admin', 'it_admin', 'facility_admin'), async (req, res) => {
  const { serviceDate, nextServiceDate, notes } = req.body;
  if (!serviceDate) return res.status(400).json({ error: 'serviceDate is required' });
  const result = await pool.query(
    `INSERT INTO amc_services (amc_id, service_date, next_service_date, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.id, serviceDate, nextServiceDate ?? null, notes ?? null]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
