import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

interface SearchGroup {
  entity: string;
  label: string;
  items: Record<string, unknown>[];
}

// Unified search across assets, vendors, departments, categories, employees
// and invoices. Sensitive entities are gated by role so the results respect
// the same access rules as the rest of the app.
router.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json({ query: q, groups: [] });

  const like = `%${q}%`;
  const role = req.user!.role;
  const canManage = ['super_admin', 'it_admin', 'facility_admin'].includes(role);
  const canFinance = role === 'super_admin' || role === 'finance';
  const canAudit = role === 'auditor';

  const groups: SearchGroup[] = [];

  const assets = await pool.query(
    `SELECT a.id, a.asset_code, a.name, a.serial_number, a.status, a.location,
            c.name AS category_name, d.name AS department_name
     FROM assets a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN departments d ON d.id = a.department_id
     WHERE a.asset_code ILIKE $1 OR a.name ILIKE $1 OR a.serial_number ILIKE $1
        OR a.location ILIKE $1 OR c.name ILIKE $1 OR d.name ILIKE $1
     ORDER BY a.asset_code LIMIT 25`,
    [like]
  );
  groups.push({ entity: 'asset', label: 'Assets', items: assets.rows });

  const vendors = await pool.query(
    `SELECT id, name, contact_email, contact_phone, gst_number FROM vendors
     WHERE name ILIKE $1 OR contact_email ILIKE $1 OR gst_number ILIKE $1
     ORDER BY name LIMIT 25`,
    [like]
  );
  groups.push({ entity: 'vendor', label: 'Vendors', items: vendors.rows });

  const departments = await pool.query(
    `SELECT id, name FROM departments WHERE name ILIKE $1 ORDER BY name LIMIT 25`,
    [like]
  );
  groups.push({ entity: 'department', label: 'Departments', items: departments.rows });

  const categories = await pool.query(
    `SELECT id, name, type FROM categories WHERE name ILIKE $1 ORDER BY name LIMIT 25`,
    [like]
  );
  groups.push({ entity: 'category', label: 'Categories', items: categories.rows });

  if (canManage) {
    const employees = await pool.query(
      `SELECT id, name, email, role FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY name LIMIT 25`,
      [like]
    );
    groups.push({ entity: 'employee', label: 'Employees', items: employees.rows });
  }

  if (canFinance || canAudit) {
    const invoices = await pool.query(
      `SELECT i.id, i.invoice_number, i.amount, i.payment_status, v.name AS vendor_name
       FROM invoices i LEFT JOIN vendors v ON v.id = i.vendor_id
       WHERE i.invoice_number ILIKE $1 OR v.name ILIKE $1
       ORDER BY i.invoice_date DESC LIMIT 25`,
      [like]
    );
    groups.push({ entity: 'invoice', label: 'Invoices', items: invoices.rows });
  }

  res.json({ query: q, groups: groups.filter((g) => g.items.length > 0) });
});

export default router;
