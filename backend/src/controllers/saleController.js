import { getInventory, decrementInventory, getMetrics, resetInventory } from '../services/inventoryService.js';
import { createOrder, getOrderStatus } from '../services/orderService.js';
import { orderQueue } from '../queues/orderQueue.js';

async function buy(req, res) {
  const { userId, productId } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: 'userId and productId are required' });
  }

  const { success, remaining } = await decrementInventory();
  if (!success) {
    return res.status(409).json({ error: 'Sold out', inventory: 0 });
  }

  const { orderId } = await createOrder(userId, productId);
  return res.status(200).json({
    success: true,
    orderId,
    remaining,
    message: 'Order queued successfully',
  });
}

async function getInventoryHandler(req, res) {
  const inventory = await getInventory();
  return res.status(200).json({ inventory, total: 100 });
}

async function getMetricsHandler(req, res) {
  const [metrics, queueDepth] = await Promise.all([
    getMetrics(),
    orderQueue.getWaitingCount(),
  ]);
  return res.status(200).json({ ...metrics, queueDepth });
}

async function getOrderStatusHandler(req, res) {
  const status = await getOrderStatus(req.params.orderId);
  if (!status) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.status(200).json({ orderId: req.params.orderId, status });
}

async function reset(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Reset not allowed in production' });
  }
  await resetInventory();
  return res.status(200).json({ success: true });
}

export { buy, getInventoryHandler, getMetricsHandler, getOrderStatusHandler, reset };
