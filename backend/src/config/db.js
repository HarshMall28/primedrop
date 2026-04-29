import pg from 'pg';

const { Pool } = pg;
const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error(`[${new Date().toISOString()}] FATAL: DATABASE_URL is required`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] FATAL: Postgres connection failed: ${err.message}`);
    process.exit(1);
  }
  release();
  console.log(`[${new Date().toISOString()}] Postgres connected`);
});

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    throw new Error(`DB query failed: ${err.message}`);
  }
}

export { query, pool };
