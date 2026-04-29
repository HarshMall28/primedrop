import { v4 as uuidv4 } from 'uuid';
import redis from '../config/redis.js';
import { orderQueue } from '../queues/orderQueue.js';

const PRODUCT_PRICE = 79999;

async function createOrder(userId, productId) {
  try {
    const orderId = uuidv4();
    await orderQueue.add('process-order', { orderId, userId, productId, price: PRODUCT_PRICE });
    await redis.set(`order:${orderId}:status`, 'processing', 'EX', 3600);
    return { orderId };
  } catch (err) {
    throw new Error(`createOrder failed: ${err.message}`);
  }
}

async function getOrderStatus(orderId) {
  try {
    return await redis.get(`order:${orderId}:status`);
  } catch (err) {
    throw new Error(`getOrderStatus failed: ${err.message}`);
  }
}

export { createOrder, getOrderStatus };
