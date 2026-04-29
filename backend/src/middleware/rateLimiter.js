import redis from '../config/redis.js';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10;

async function rateLimiter(req, res, next) {
  const key = `ratelimit:${req.ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(key, now, now.toString());
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(WINDOW_MS / 1000));
    const results = await pipeline.exec();

    const count = results[2][1];
    if (count > MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }
    return next();
  } catch (err) {
    // Fail open on Redis errors — blocking legitimate traffic due to infra issues is worse than rate limit bypass
    console.error(`[${new Date().toISOString()}] rateLimiter error: ${err.message}`);
    return next();
  }
}

export { rateLimiter };
