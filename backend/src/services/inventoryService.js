import redis from '../config/redis.js';

const INVENTORY_KEY = 'inventory:iphone15pro';
const METRICS_REQUESTS = 'metrics:totalRequests';
const METRICS_DB_WRITES = 'metrics:dbWrites';
const METRICS_DUPLICATES = 'metrics:duplicatesBlocked';

// Lua guarantees the read-check-decrement is atomic — no two concurrent requests
// can both read count=1 and both succeed, which is the core oversell prevention.
const DECREMENT_LUA = `
  local current = redis.call('GET', KEYS[1])
  if not current or tonumber(current) <= 0 then
    return {0, 0}
  end
  local remaining = redis.call('DECR', KEYS[1])
  redis.call('INCR', KEYS[2])
  return {1, remaining}
`;

async function getInventory() {
  try {
    const val = await redis.get(INVENTORY_KEY);
    if (val === null) {
      const total = parseInt(process.env.INVENTORY_TOTAL, 10) || 100;
      await redis.set(INVENTORY_KEY, total);
      return total;
    }
    return parseInt(val, 10);
  } catch (err) {
    throw new Error(`getInventory failed: ${err.message}`);
  }
}

async function decrementInventory() {
  try {
    const result = await redis.eval(DECREMENT_LUA, 2, INVENTORY_KEY, METRICS_REQUESTS);
    return { success: result[0] === 1, remaining: parseInt(result[1], 10) };
  } catch (err) {
    throw new Error(`decrementInventory failed: ${err.message}`);
  }
}

async function getMetrics() {
  try {
    const pipeline = redis.pipeline();
    pipeline.get(INVENTORY_KEY);
    pipeline.get(METRICS_REQUESTS);
    pipeline.get(METRICS_DB_WRITES);
    pipeline.get(METRICS_DUPLICATES);
    const results = await pipeline.exec();
    return {
      inventory:         parseInt(results[0][1], 10) || 0,
      totalRequests:     parseInt(results[1][1], 10) || 0,
      dbWrites:          parseInt(results[2][1], 10) || 0,
      duplicatesBlocked: parseInt(results[3][1], 10) || 0,
    };
  } catch (err) {
    throw new Error(`getMetrics failed: ${err.message}`);
  }
}

async function resetInventory() {
  try {
    const total = parseInt(process.env.INVENTORY_TOTAL, 10) || 100;
    const pipeline = redis.pipeline();
    pipeline.set(INVENTORY_KEY, total);
    pipeline.set(METRICS_REQUESTS, 0);
    pipeline.set(METRICS_DB_WRITES, 0);
    pipeline.set(METRICS_DUPLICATES, 0);
    await pipeline.exec();
  } catch (err) {
    throw new Error(`resetInventory failed: ${err.message}`);
  }
}

export { getInventory, decrementInventory, getMetrics, resetInventory };
