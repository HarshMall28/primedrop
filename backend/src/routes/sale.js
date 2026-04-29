import { Router } from "express";
import { idempotency } from "../middleware/idempotency.js";
import {
  buy,
  getInventoryHandler,
  getMetricsHandler,
  getOrderStatusHandler,
  reset,
} from "../controllers/saleController.js";

const router = Router();

router.post("/buy", idempotency, buy);
router.get("/inventory", getInventoryHandler);
router.get("/metrics", getMetricsHandler);
router.get("/status/:id", getOrderStatusHandler);
router.post("/reset", reset);

export { router as saleRouter };
