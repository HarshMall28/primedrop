import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import { query } from '../config/db.js';

const INSERT_ORDER = `
  INSERT INTO orders (id, user_id, product_id, quantity, price, status)
  VALUES ($1, $2, $3, 1, $4, 'confirmed')
  ON CONFLICT (id) DO NOTHING
`;

function startWorker() {
  const worker = new Worker(
    'orders',
    async (job) => {
      const { orderId, userId, productId, price } = job.data;
      await query(INSERT_ORDER, [orderId, userId, productId, price]);
      await redis.set(`order:${orderId}:status`, 'confirmed', 'EX', 3600);
      await redis.incr('metrics:dbWrites');
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[${new Date().toISOString()}] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`
    );
  });

  worker.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Worker error: ${err.message}`);
  });

  // Stalled jobs are written to a dead-letter key so they can be inspected/replayed
  worker.on('stalled', async (jobId) => {
    const details = JSON.stringify({ jobId, stalledAt: new Date().toISOString() });
    await redis.set(`deadletter:${jobId}`, details, 'EX', 86400);
    console.error(`[${new Date().toISOString()}] Job ${jobId} stalled — written to dead-letter`);
  });

  console.log(`[${new Date().toISOString()}] Order worker started`);
  return worker;
}

export { startWorker };
