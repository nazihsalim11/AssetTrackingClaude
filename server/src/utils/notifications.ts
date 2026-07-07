import { pool } from '../db/pool';

export async function notifyRoles(roles: string[], type: string, message: string): Promise<number> {
  const users = await pool.query(`SELECT id FROM users WHERE role = ANY($1) AND is_active = true`, [roles]);
  let inserted = 0;
  for (const user of users.rows) {
    const existing = await pool.query(
      `SELECT id FROM notifications
       WHERE user_id = $1 AND type = $2 AND message = $3 AND created_at > now() - INTERVAL '24 hours'`,
      [user.id, type, message]
    );
    if (existing.rows.length) continue;
    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
      [user.id, type, message]
    );
    inserted += 1;
  }
  return inserted;
}

export async function generateNotifications(): Promise<number> {
  let total = 0;

  const amcExpiring = await pool.query(
    `SELECT ac.contract_number, a.asset_code, a.name, ac.end_date
     FROM amc_contracts ac JOIN assets a ON a.id = ac.asset_id
     WHERE ac.status = 'active' AND ac.end_date <= CURRENT_DATE + INTERVAL '30 days'`
  );
  for (const row of amcExpiring.rows) {
    total += await notifyRoles(
      ['super_admin', 'it_admin', 'facility_admin'],
      'amc_expiry',
      `AMC contract ${row.contract_number} for ${row.asset_code} - ${row.name} expires on ${new Date(row.end_date).toLocaleDateString()}`
    );
  }

  const warrantyExpiring = await pool.query(
    `SELECT asset_code, name, warranty_expiry FROM assets
     WHERE is_archived = false AND warranty_expiry IS NOT NULL
       AND warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'`
  );
  for (const row of warrantyExpiring.rows) {
    total += await notifyRoles(
      ['super_admin', 'it_admin', 'facility_admin'],
      'warranty_expiry',
      `Warranty for ${row.asset_code} - ${row.name} expires on ${new Date(row.warranty_expiry).toLocaleDateString()}`
    );
  }

  const serviceDue = await pool.query(
    `SELECT DISTINCT ON (ac.id) ac.contract_number, a.asset_code, a.name, s.next_service_date
     FROM amc_services s
     JOIN amc_contracts ac ON ac.id = s.amc_id
     JOIN assets a ON a.id = ac.asset_id
     WHERE s.next_service_date IS NOT NULL AND s.next_service_date <= CURRENT_DATE + INTERVAL '7 days'
     ORDER BY ac.id, s.next_service_date DESC`
  );
  for (const row of serviceDue.rows) {
    total += await notifyRoles(
      ['super_admin', 'it_admin', 'facility_admin'],
      'service_due',
      `Service due for ${row.asset_code} - ${row.name} (contract ${row.contract_number}) on ${new Date(row.next_service_date).toLocaleDateString()}`
    );
  }

  const pendingInvoices = await pool.query(
    `SELECT invoice_number, amount, payment_status FROM invoices
     WHERE payment_status IN ('pending', 'overdue')`
  );
  for (const row of pendingInvoices.rows) {
    total += await notifyRoles(
      ['super_admin', 'finance'],
      'pending_payment',
      `Invoice ${row.invoice_number} (${row.amount}) is ${row.payment_status}`
    );
  }

  return total;
}
