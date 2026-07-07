import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('super_admin', 'it_admin', 'facility_admin', 'finance', 'auditor'));

router.get('/inventory', async (_req, res) => {
  const result = await pool.query(
    `SELECT a.asset_code, a.name, a.type, c.name AS category, a.status, a.condition,
            d.name AS department, a.location, a.serial_number, a.purchase_date, a.purchase_cost
     FROM assets a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN departments d ON d.id = a.department_id
     WHERE a.is_archived = false
     ORDER BY a.asset_code`
  );
  res.json(result.rows);
});

router.get('/employee-allocation', async (_req, res) => {
  const result = await pool.query(
    `SELECT a.asset_code, a.name AS asset_name, u.name AS employee, u.email,
            al.assigned_date, al.returned_date, al.status
     FROM allocations al
     JOIN assets a ON a.id = al.asset_id
     JOIN users u ON u.id = al.employee_id
     ORDER BY al.assigned_date DESC`
  );
  res.json(result.rows);
});

router.get('/vendor-assets', async (_req, res) => {
  const result = await pool.query(
    `SELECT v.name AS vendor, a.asset_code, a.name AS asset_name, a.purchase_date, a.purchase_cost
     FROM assets a JOIN vendors v ON v.id = a.vendor_id
     ORDER BY v.name, a.asset_code`
  );
  res.json(result.rows);
});

router.get('/amc-renewals', async (_req, res) => {
  const result = await pool.query(
    `SELECT ac.contract_number, a.asset_code, a.name AS asset_name, v.name AS vendor,
            ac.start_date, ac.end_date, ac.cost, ac.status
     FROM amc_contracts ac
     JOIN assets a ON a.id = ac.asset_id
     LEFT JOIN vendors v ON v.id = ac.vendor_id
     ORDER BY ac.end_date`
  );
  res.json(result.rows);
});

router.get('/invoice-status', async (_req, res) => {
  const result = await pool.query(
    `SELECT i.invoice_number, v.name AS vendor, a.asset_code, i.amount, i.gst_amount,
            i.invoice_date, i.due_date, i.payment_status
     FROM invoices i
     LEFT JOIN vendors v ON v.id = i.vendor_id
     LEFT JOIN assets a ON a.id = i.asset_id
     ORDER BY i.invoice_date DESC`
  );
  res.json(result.rows);
});

router.get('/asset-movement', async (_req, res) => {
  const result = await pool.query(
    `SELECT a.asset_code, a.name AS asset_name, fd.name AS from_department, td.name AS to_department,
            m.from_location, m.to_location, m.moved_at, u.name AS moved_by, m.reason
     FROM asset_movements m
     JOIN assets a ON a.id = m.asset_id
     LEFT JOIN departments fd ON fd.id = m.from_department_id
     LEFT JOIN departments td ON td.id = m.to_department_id
     LEFT JOIN users u ON u.id = m.moved_by
     ORDER BY m.moved_at DESC`
  );
  res.json(result.rows);
});

router.get('/disposal', async (_req, res) => {
  const result = await pool.query(
    `SELECT asset_code, name, type, disposed_at, disposal_reason, purchase_cost
     FROM assets WHERE status = 'disposed'
     ORDER BY disposed_at DESC`
  );
  res.json(result.rows);
});

export default router;
