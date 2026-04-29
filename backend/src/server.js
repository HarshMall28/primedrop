import "dotenv/config";
import "express-async-errors";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";

import { runMigrations } from "./db/migrate.js";
import { startWorker } from "./workers/orderWorker.js";
import { saleRouter } from "./routes/sale.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { pool } from "./config/db.js";
import redis from "./config/redis.js";

const PORT = parseInt(process.env.PORT, 10) || 3001;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: FRONTEND_URL,
    exposedHeaders: ["X-Idempotency-Replay"],
  }),
);
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}
app.use(express.json({ limit: "10kb" }));

app.use("/api/sale", saleRouter);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1"); // ← keeps Supabase alive
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: err.message,
    });
  }
});

app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    startWorker();
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `[${new Date().toISOString()}] Server running on port ${PORT}`,
      );
    });

    process.on("SIGTERM", () => {
      console.log(
        `[${new Date().toISOString()}] SIGTERM received — shutting down`,
      );
      server.close(async () => {
        await redis.quit();
        await pool.end();
        console.log(
          `[${new Date().toISOString()}] Shutdown complete`,
        );
        process.exit(0);
      });
    });
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Startup failed: ${err.message}`,
    );
    process.exit(1);
  }
}

start();
