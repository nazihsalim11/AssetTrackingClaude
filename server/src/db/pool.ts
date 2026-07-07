import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// Enable SSL for managed Postgres (e.g. Supabase). Supabase requires TLS; its
// server cert isn't in the default CA bundle, so we don't verify the chain.
// Toggle explicitly with DATABASE_SSL=true/false, otherwise auto-detect Supabase.
const sslEnabled =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_SSL !== 'false' && !!connectionString?.includes('supabase.'));

const config: PoolConfig = {
  connectionString,
  ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
};

export const pool = new Pool(config);
