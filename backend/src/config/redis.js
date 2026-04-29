import Redis from 'ioredis';

const { REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;

const retryStrategy = (times) => {
  if (times >= 3) {
    console.error(`[${new Date().toISOString()}] Redis connection failed after ${times} attempts — exiting`);
    process.exit(1);
  }
  return Math.min(times * 500, 2000);
};

let redis;

if (REDIS_URL) {
  // Local Redis override — used during load testing to bypass Upstash free-tier limits.
  console.log(`[${new Date().toISOString()}] Redis: using local instance (${REDIS_URL})`);
  redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy });
} else {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.error(`[${new Date().toISOString()}] FATAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required`);
    process.exit(1);
  }

  // Upstash exposes a Redis-protocol endpoint at the same hostname on port 6379 over TLS.
  const host = new URL(UPSTASH_REDIS_REST_URL).hostname;

  redis = new Redis({
    host,
    port: 6379,
    password: UPSTASH_REDIS_REST_TOKEN,
    tls: {},
    maxRetriesPerRequest: null,
    retryStrategy,
  });
}

redis.on('connect', () => {
  console.log(`[${new Date().toISOString()}] Redis connected`);
});

redis.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Redis error: ${err.message}`);
});

export default redis;
