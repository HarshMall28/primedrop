import redis from "../config/redis.js";

const METRICS_DUPLICATES = "metrics:duplicatesBlocked"; // ← make sure this matches your other files

async function idempotency(req, res, next) {
  const key = req.headers["idempotency-key"];
  if (!key) {
    return res
      .status(400)
      .json({ error: "Idempotency-Key header required" });
  }

  try {
    const cached = await redis.get(`idempotency:${key}`);
    if (cached) {
      const { status, body } = JSON.parse(cached);
      res.set("X-Idempotency-Replay", "true");
      await redis.incr(METRICS_DUPLICATES); // ← increment duplicate counter
      return res.status(status).json(body);
    }

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        const payload = JSON.stringify({
          status: res.statusCode,
          body,
        });
        await redis.set(`idempotency:${key}`, payload, "EX", 86400);
      } catch (err) {
        console.error(
          `[${new Date().toISOString()}] idempotency cache write failed: ${err.message}`,
        );
      }
      res.set("X-Idempotency-Replay", "false");
      return originalJson(body);
    };

    return next();
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] idempotency middleware error: ${err.message}`,
    );
    return next();
  }
}

export { idempotency };
