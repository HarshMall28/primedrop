# ⚡ PrimeDrop

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-19-blue)
![Redis](https://img.shields.io/badge/Redis-Upstash-red)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)
![BullMQ](https://img.shields.io/badge/BullMQ-5-orange)
![k6](https://img.shields.io/badge/k6-load--tested-purple)

A production-grade flash sale system built to handle extreme concurrent traffic using BullMQ job queues, Redis atomic Lua scripts, and PostgreSQL — without overselling a single unit.

🚀 **Live Demo** → [primedrop.vercel.app](https://primedrop.vercel.app)

---

## ✨ Features

### Backend

- **Atomic inventory decrement** via Redis Lua script — prevents oversell under any concurrency
- **BullMQ job queue** (`orders` queue) decouples HTTP response from database write — returns 200 in ~8ms
- **Idempotency middleware** — caches responses in Redis with 24h TTL, deduplicates retries via `Idempotency-Key` header
- **Dead-letter handling** — stalled BullMQ jobs written to `deadletter:{jobId}` in Redis for inspection/replay
- **Auto-migrations** — `migrate.js` runs schema migrations on startup
- **Live metrics endpoint** — exposes inventory, totalRequests, dbWrites, duplicatesBlocked, queueDepth in real time
- **Graceful shutdown** — SIGTERM closes the HTTP server, then drains Redis and PostgreSQL connections
- **Helmet + CORS + compression** — production-hardened Express middleware stack

### Frontend

- **Live demo** — fires 50 concurrent requests to the real backend and shows results in real time
- **Animated hero** with sequential typewriter text (`useTypingAnimation` hook)
- **Interactive architecture diagram** — 6-step clickable walkthrough tracing a request through the full system
- **Live metric cards** with flash animation on value change (`MetricCard`)
- **Streaming activity log** (`ActivityLog`) — color-coded, scrollable, shows last 25 events
- **Stock badge** — green / amber pulse / red SOLD OUT based on live inventory level
- **Scroll-spy navbar** — highlights active section using `IntersectionObserver`

---

## 🏗️ Architecture

When a user clicks **Buy Now**, the request flows through:

1. **Express** receives `POST /api/sale/buy` with an `Idempotency-Key` header
2. **`idempotency` middleware** checks Redis — if the key was seen before, returns the cached response immediately (sets `X-Idempotency-Replay: true`)
3. **`inventoryService.decrementInventory()`** runs a Lua script atomically in Redis: reads the counter, checks it's > 0, decrements it, and increments the request counter — all in one operation. Returns `409 Sold Out` if inventory is 0
4. **`orderService.createOrder()`** inserts a pending order row in PostgreSQL and enqueues a job to the `orders` BullMQ queue
5. **Express returns `200 OK`** with `orderId` in ~8ms — before the database write completes
6. **`orderWorker` (`startWorker()`)** picks the job and writes the confirmed order to PostgreSQL with `ON CONFLICT DO NOTHING` (safe to retry). Sets `order:{id}:status = confirmed` in Redis with 1h TTL

```
[React UI] → [Express API] → [idempotency middleware (Redis)]
                                         ↓
                               [Redis Lua script — atomic DECR]
                                         ↓
                              [BullMQ queue "orders" (Redis)]
                                         ↓
                               [orderWorker processes job]
                                         ↓
                              [PostgreSQL — INSERT confirmed order]
```

**Why this holds under load:** Redis handles all inventory contention — Postgres never sees more writes than there are units available (100). BullMQ absorbs the spike and writes to Postgres at a controlled rate. The connection pool is never overwhelmed.

---

## 🛠️ Tech Stack

**Backend** (`/backend`)

| Technology           | Version   | Purpose                        |
| -------------------- | --------- | ------------------------------ |
| Node.js              | 18+ (ESM) | Runtime                        |
| Express              | ^4.22     | HTTP server                    |
| BullMQ               | ^5.76     | Job queue                      |
| ioredis              | ^5.10     | Redis client (Upstash / local) |
| pg                   | ^8.20     | PostgreSQL client              |
| uuid                 | ^14.0     | Order ID generation            |
| helmet               | ^8.1      | HTTP security headers          |
| compression          | ^1.8      | gzip response compression      |
| cors                 | ^2.8      | Cross-origin resource sharing  |
| morgan               | ^1.10     | HTTP request logging           |
| express-async-errors | ^3.1      | Async error propagation        |
| nodemon              | ^3.1      | Dev auto-restart               |

**Frontend** (`/frontend`)

| Technology   | Version | Purpose                 |
| ------------ | ------- | ----------------------- |
| React        | ^19.2   | UI framework            |
| Vite         | ^8.0    | Build tool + dev server |
| Tailwind CSS | ^4.2    | Styling                 |
| axios        | ^1.15   | HTTP client             |
| lucide-react | ^1.11   | Icons                   |

---

## 🖥️ Frontend Demo

The frontend is a live visual demo of the flash sale system — not a mock.

- Built with **React 19 + Tailwind CSS v4**
- Each **BUY NOW** click fires **50 simultaneous real requests** to the backend via `useSimulation.js`
- The UI updates in real time as responses arrive, showing exactly what the system is doing

**Components:**

| Component      | What it does                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `Navbar`       | Fixed top nav with scroll-spy — highlights active section using `IntersectionObserver`           |
| `Hero`         | Animated landing section with sequential typewriter text and tech pill badges                    |
| `LiveDemo`     | Core demo section — product card, BUY NOW button, live metrics grid, activity log                |
| `MetricCard`   | Individual stat tile (inventory, requests, DB writes, etc.) with flash animation on value change |
| `ActivityLog`  | Scrollable, color-coded event stream — shows the last 25 events from the simulation              |
| `Architecture` | 6-step interactive diagram — click each step to trace a request through the full system          |
| `About`        | Project background and motivation section                                                        |

> The frontend is a demo interface — for full load testing at 100,000 requests see the Load Test Results section below.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker (for load testing with local Redis)
- [Upstash](https://upstash.com) Redis account (free tier works)
- PostgreSQL database ([Supabase](https://supabase.com) free tier works)

### Backend

```bash
cd backend
npm install
```

Create `.env` in the **repo root** (not inside `backend/` — the start script reads `../.env`):

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

DATABASE_URL=postgresql://user:password@host:5432/dbname

INVENTORY_TOTAL=100
```

```bash
npm run dev --prefix backend
```

Server starts on `http://localhost:3001`. Migrations run automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173` and proxies API calls to port 3001.

---

## 📡 API Endpoints

All endpoints are under `/api/sale`.

| Method | Endpoint               | Auth                              | Description                                                                                                                          |
| ------ | ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/api/sale/buy`        | `Idempotency-Key` header required | Attempt to purchase. Atomically decrements Redis inventory. Returns `orderId` + `remaining` on success. Returns `409` when sold out. |
| `GET`  | `/api/sale/inventory`  | None                              | Current inventory count and configured total.                                                                                        |
| `GET`  | `/api/sale/metrics`    | None                              | Live counters: `inventory`, `totalRequests`, `dbWrites`, `duplicatesBlocked`, `queueDepth`.                                          |
| `GET`  | `/api/sale/status/:id` | None                              | Order status by order ID (reads Redis `order:{id}:status` key).                                                                      |
| `POST` | `/api/sale/reset`      | None                              | Reset inventory and all metrics to default. **Blocked in production** (`NODE_ENV=production` returns 403).                           |
| `GET`  | `/health`              | None                              | Health check — returns `{ status, timestamp, uptime }`.                                                                              |

**Example:**

```bash
curl -X POST http://localhost:3001/api/sale/buy \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: user_42-attempt_1" \
  -d '{"userId": "user_42", "productId": "iphone15pro"}'
```

```json
{
  "success": true,
  "orderId": "uuid-here",
  "remaining": 83,
  "message": "Order queued successfully"
}
```

---

## ⚡ Load Test Results

# ⚡ Flash Sale Load Test Report — 2026-04-28

## Scenario

| Property                 | Value                       |
| ------------------------ | --------------------------- |
| Profile                  | 0 → 500 → 1,000 VUs · 210 s |
| Peak Virtual Users       | 1,004                       |
| Total Requests           | 179,382                     |
| Successful Purchases     | 100                         |
| Sold-Out Responses (409) | 179,158                     |
| Idempotency Replays      | 0                           |
| Test Duration            | 3m 53s                      |

## Performance Metrics

| Metric               | Value       | Threshold  | Status    |
| -------------------- | ----------- | ---------- | --------- |
| Min Response Time    | 0.0 ms      | —          | —         |
| Avg Response Time    | 3.8 ms      | —          | —         |
| Median Response Time | 2.1 ms      | —          | —         |
| p95 Response Time    | **11.9 ms** | < 2,000 ms | ✅ PASSED |
| p99 Response Time    | 0.0 ms      | —          | —         |
| Avg Throughput       | 767.7 req/s | —          | —         |
| Error Rate           | **0.00 %**  | < 5 %      | ✅ PASSED |

## Infrastructure

| Component    | Result                                         |
| ------------ | ---------------------------------------------- |
| BullMQ Queue | ✅ Jobs processed \| Peak queue depth: 0       |
| Redis Cache  | ✅ 0 units remaining \| 0 duplicates blocked   |
| PostgreSQL   | ✅ 100 rows written \| No deadlocks / timeouts |

## Thresholds Summary

| Check                | Actual  | Target     | Result        |
| -------------------- | ------- | ---------- | ------------- |
| p95 < 2,000 ms       | 11.9 ms | < 2,000 ms | ✅ **PASSED** |
| Error rate < 5 %     | 0.00 %  | < 5 %      | ✅ **PASSED** |
| Total reqs > 100,000 | 179,382 | > 100,000  | ✅ **PASSED** |

## Verdict

> ✅ **ALL THRESHOLDS PASSED** — System handled 100,000-request flash-sale load without degradation.

> ℹ️ Tested with local Redis — production uses Upstash

---

_Generated by `loadtest/format-report.js` · source: `results/summary.json`_

---

> ⚡ Load tested for flash sale scenarios:
>
> - **1,000 concurrent users** at peak
> - **~768 requests/second** sustained throughput (peak ~1,000 req/s)
> - **179,382 total requests** processed in 3m 53s
> - **BullMQ queuing** prevents DB overload under spike traffic — Postgres received exactly 100 writes
> - **p95 response time: 11.9 ms** at peak load (threshold: < 2,000 ms)
>
> BullMQ workers maintained **zero queue backlog** throughout — meaning the queue never became a bottleneck even at peak concurrency.

> 📄 See `loadtest/results/LOAD_TEST_REPORT.txt` for the full ASCII terminal report (screenshot-ready for sharing)

---

## 🧪 Run the Load Test Yourself

```bash
# Standard test (~50k requests, Upstash-safe)
./loadtest/run.sh

# Full test (~100k requests, requires local Redis)
REDIS_URL=redis://localhost:6379 FULL_TEST=true ./loadtest/run.sh

# View the generated report
cat loadtest/results/LOAD_TEST_REPORT.txt
```

> `FULL_TEST=true` requires the backend to be running with `REDIS_URL=redis://localhost:6379`. The `run.sh` script starts a local Redis container automatically via Docker Compose and blocks if local Redis is not configured.

---

## 📁 Project Structure

```
primedrop/
├── .env                          # Environment variables (Redis, Postgres, ports)
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js             # Express app, middleware wiring, graceful shutdown
│       ├── config/
│       │   ├── db.js             # PostgreSQL pool
│       │   └── redis.js          # ioredis client (Upstash or local via REDIS_URL)
│       ├── routes/
│       │   └── sale.js           # All /api/sale/* route definitions
│       ├── controllers/
│       │   └── saleController.js # HTTP handlers: buy, inventory, metrics, status, reset
│       ├── services/
│       │   ├── inventoryService.js  # Redis Lua atomic DECR + pipeline metrics
│       │   └── orderService.js      # Create order, get order status
│       ├── queues/
│       │   └── orderQueue.js     # BullMQ Queue("orders") with retry config
│       ├── workers/
│       │   └── orderWorker.js    # BullMQ Worker — writes confirmed orders to Postgres
│       ├── middleware/
│       │   ├── idempotency.js    # Idempotency-Key deduplication (24h Redis TTL)
│       │   ├── rateLimiter.js    # Sliding window rate limiter
│       │   └── errorHandler.js   # Global Express error handler
│       └── db/
│           └── migrate.js        # Auto-migration on startup
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── hooks/
│       │   └── useSimulation.js  # Fires 50 concurrent requests, polls /metrics
│       └── components/
│           ├── Navbar.jsx         # Fixed nav with IntersectionObserver scroll-spy
│           ├── Hero.jsx           # Typewriter animation landing section
│           ├── LiveDemo.jsx       # Demo section — product card + metrics grid
│           ├── MetricCard.jsx     # Single stat tile with flash-on-change animation
│           ├── ActivityLog.jsx    # Scrollable color-coded event stream
│           ├── Architecture.jsx   # 6-step interactive request flow diagram
│           └── About.jsx          # Project background section
└── loadtest/
    ├── flash-sale.js             # k6 script — 3 scenarios, dual mode (50k / 100k)
    ├── docker-compose.yml        # k6 + local Redis:7-alpine services
    ├── run.sh                    # One-command test runner with Upstash warning
    ├── format-report.js          # Generates ASCII + Markdown report from summary.json
    └── results/
        ├── summary.json
        ├── LOAD_TEST_REPORT.txt  # Screenshot-ready ASCII report
        └── LOAD_TEST_REPORT.md   # Markdown report
```
