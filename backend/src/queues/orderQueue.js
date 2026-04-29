import { Queue } from 'bullmq';
import redis from '../config/redis.js';

const orderQueue = new Queue('orders', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export { orderQueue };
