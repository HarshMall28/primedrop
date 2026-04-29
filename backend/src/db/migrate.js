import { query } from '../config/db.js';

const CREATE_ORDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS orders (
    id          UUID PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,
    product_id  VARCHAR(255) NOT NULL,
    quantity    INTEGER DEFAULT 1,
    price       INTEGER NOT NULL,
    status      VARCHAR(50) DEFAULT 'confirmed',
    created_at  TIMESTAMP DEFAULT NOW()
  )
`;

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)`,
];

async function runMigrations() {
  try {
    await query(CREATE_ORDERS_TABLE);
    for (const sql of CREATE_INDEXES) {
      await query(sql);
    }
    console.log(`[${new Date().toISOString()}] Migrations complete`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Migration failed: ${err.message}`);
    throw err;
  }
}

export { runMigrations };
