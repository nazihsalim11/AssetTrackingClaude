import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (_req, res) => {
  const [
    totalAssets,
    byCategory,
    byDepartment,
    assignedVsAvailable,
    amcExpiring,
    warrantyExpiring,
    pendingPayments,
    recentAssets,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM assets WHERE is_archived = false`),
    pool.query(`
      SELECT c.name AS category, COUNT(*)::int AS count
      FROM assets a JOIN categories c ON c.id = a.category_id
      WHERE a.is_archived = false GROUP BY c.name ORDER BY count DESC`),
    pool.query(`
      SELECT d.name AS department, COUNT(*)::int AS count
      FROM assets a JOIN departments d ON d.id = a.department_id
      WHERE a.is_archived = false GROUP BY d.name ORDER BY count DESC`),
    pool.query(`
      SELECT status, COUNT(*)::int AS count FROM assets
      WHERE is_archived = false GROUP BY status`),
    pool.query(`
      SELECT ac.id, ac.contract_number, ac.end_date, a.name AS asset_name, a.asset_code
      FROM amc_contracts ac JOIN assets a ON a.id = ac.asset_id
      WHERE ac.status = 'active' AND ac.end_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY ac.end_date ASC LIMIT 10`),
    pool.query(`
      SELECT id, name, asset_code, warranty_expiry
      FROM assets
      WHERE is_archived = false AND warranty_expiry IS NOT NULL
        AND warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY warranty_expiry ASC LIMIT 10`),
    pool.query(`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::float AS total
      FROM invoices WHERE payment_status IN ('pending', 'overdue', 'partially_paid')`),
    pool.query(`
      SELECT id, name, asset_code, type, status, created_at
      FROM assets WHERE is_archived = false ORDER BY created_at DESC LIMIT 10`),
  ]);

  res.json({
    totalAssets: totalAssets.rows[0].count,
    assetsByCategory: byCategory.rows,
    assetsByDepartment: byDepartment.rows,
    assignedVsAvailable: assignedVsAvailable.rows,
    amcExpiring: amcExpiring.rows,
    warrantyExpiring: warrantyExpiring.rows,
    pendingPayments: pendingPayments.rows[0],
    recentAssets: recentAssets.rows,
  });
});

export default router;
