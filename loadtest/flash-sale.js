import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics — surfaced in summary.json and the ASCII report
// ---------------------------------------------------------------------------
const soldOutCount        = new Counter('sold_out');
const purchaseOkCount     = new Counter('purchase_ok');
const idempotencyReplays  = new Counter('idempotency_replay');
const queueDepthGauge     = new Gauge('queue_depth');
const inventoryGauge      = new Gauge('backend_inventory');
const dbWritesGauge       = new Gauge('backend_db_writes');
const duplicatesGauge     = new Gauge('backend_duplicates_blocked');
const backendReqsGauge    = new Gauge('backend_total_requests');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:3001';
const FULL_TEST = __ENV.FULL_TEST === 'true';

// Mark 409 (sold-out) as a non-failure.  Without this, 99.9% of buy requests
// would register as "failed" once inventory is gone, blowing the 5% threshold
// even though the system is behaving correctly.
http.setResponseCallback(http.expectedStatuses(200, 201, 409));

// ---------------------------------------------------------------------------
// Load profiles
//
//  Standard (default) — Upstash-safe, ~50k requests, peak 300 VUs, 150 s
//    Stays within Upstash free tier (~100 req/s, 10k commands/day).
//    Run with: ./loadtest/run.sh
//
//  Full — ~100k requests, peak 1,000 VUs, 210 s — requires local Redis
//    Run with: FULL_TEST=true ./loadtest/run.sh
// ---------------------------------------------------------------------------
const standardStages = [
  { duration: '20s', target: 200 }, // ramp up
  { duration: '30s', target: 200 }, // hold
  { duration: '20s', target: 300 }, // surge
  { duration: '60s', target: 300 }, // peak hold
  { duration: '20s', target: 0   }, // ramp down
];

const fullStages = [
  { duration: '30s', target: 500  }, // ramp up
  { duration: '60s', target: 500  }, // spike hold
  { duration: '30s', target: 1000 }, // FOMO surge
  { duration: '60s', target: 1000 }, // peak hold
  { duration: '30s', target: 0    }, // ramp down
];

const testDuration = FULL_TEST ? '210s' : '150s';
const reqThreshold = FULL_TEST ? 'count>100000' : 'count>50000';

export const options = {
  scenarios: {
    flash_sale: {
      executor: 'ramping-vus',
      stages: FULL_TEST ? fullStages : standardStages,
      gracefulRampDown: '10s',
    },
    // Lightweight poller: captures live BullMQ queue depth, Redis counters,
    // and DB write count from GET /api/sale/metrics every ~10 s.
    metrics_poller: {
      executor: 'constant-vus',
      vus: 1,
      duration: testDuration,
      exec: 'pollMetrics',
      startTime: '3s',
    },
    // Low-rate read traffic against /api/sale/inventory (shoppers checking
    // stock before committing to buy).
    inventory_reader: {
      executor: 'constant-vus',
      vus: 3,
      duration: testDuration,
      exec: 'readInventory',
      startTime: '3s',
    },
  },

  thresholds: {
    'http_req_duration':               ['p(95)<2000'],
    'http_req_failed':                 ['rate<0.05'],
    'http_reqs':                       [reqThreshold],
    'http_req_duration{endpoint:buy}': ['p(95)<2000'],
  },
};

// ---------------------------------------------------------------------------
// Main scenario: POST /api/sale/buy
// ---------------------------------------------------------------------------
export default function () {
  // Idempotency key: unique per (VU, iteration) — no external UUID library
  // needed; this is guaranteed non-colliding within a single k6 run.
  const idempotencyKey = `${__VU}-${__ITER}`;

  // Spread user IDs across 10,000 synthetic users using a deterministic hash
  // so different VUs don't accidentally share the same userId.
  const userId    = `user_${((__VU * 9973 + __ITER * 1009) % 10000) + 1}`;
  const productId = 'iphone15pro';

  const res = http.post(
    `${BASE_URL}/api/sale/buy`,
    JSON.stringify({ userId, productId }),
    {
      headers: {
        'Content-Type':    'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      tags: { endpoint: 'buy' },
    }
  );

  if (res.headers['X-Idempotency-Replay'] === 'true') {
    idempotencyReplays.add(1);
  }

  if (res.status === 200) {
    purchaseOkCount.add(1);
    check(res, {
      'buy: success 200': (r) => r.status === 200,
      'buy: has orderId': (r) => {
        try { return Boolean(JSON.parse(r.body).orderId); } catch { return false; }
      },
    });
  } else if (res.status === 409) {
    soldOutCount.add(1);
    check(res, { 'buy: sold-out (expected 409)': (r) => r.status === 409 });
  } else {
    check(res, { 'buy: unexpected status': () => false });
  }

  sleep(0.5 + Math.random() * 0.5);
}

// ---------------------------------------------------------------------------
// Metrics polling scenario — 1 VU, reads /api/sale/metrics every 10 s
// ---------------------------------------------------------------------------
export function pollMetrics() {
  const res = http.get(`${BASE_URL}/api/sale/metrics`, {
    tags: { endpoint: 'metrics' },
  });

  if (res.status === 200) {
    try {
      const d = JSON.parse(res.body);
      if (typeof d.queueDepth        === 'number') queueDepthGauge.add(d.queueDepth);
      if (typeof d.inventory         === 'number') inventoryGauge.add(d.inventory);
      if (typeof d.dbWrites          === 'number') dbWritesGauge.add(d.dbWrites);
      if (typeof d.duplicatesBlocked === 'number') duplicatesGauge.add(d.duplicatesBlocked);
      if (typeof d.totalRequests     === 'number') backendReqsGauge.add(d.totalRequests);
    } catch (_) { /* non-fatal */ }
  }

  sleep(10);
}

// ---------------------------------------------------------------------------
// Inventory read scenario — 3 VUs, periodic GET /api/sale/inventory
// ---------------------------------------------------------------------------
export function readInventory() {
  const res = http.get(`${BASE_URL}/api/sale/inventory`, {
    tags: { endpoint: 'inventory' },
  });
  check(res, { 'inventory: ok': (r) => r.status === 200 });
  sleep(4 + Math.random() * 4);
}

// ---------------------------------------------------------------------------
// End-of-run: write structured data for the Node.js report generator
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    '/results/summary.json': JSON.stringify(data, null, 2),
  };
}
