import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './pool';

dotenv.config();

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

  console.log('Applying schema...');
  await pool.query(schema);

  console.log('Applying seed data...');
  await pool.query(seed);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'super_admin')
     ON CONFLICT (email) DO NOTHING`,
    ['Super Admin', adminEmail, passwordHash]
  );

  console.log(`Migration complete. Admin login: ${adminEmail} / ${adminPassword}`);
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
