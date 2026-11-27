import '../lib/env.js';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/dagangai';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message);
});
