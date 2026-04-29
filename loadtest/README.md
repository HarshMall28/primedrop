# ⚡ PrimeDrop Flash-Sale Load Test

k6-based load test that fires **100,000+ requests** at the PrimeDrop backend,
simulating a realistic flash-sale crowd with ramp-up, spike, FOMO surge, and drain phases.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- Node.js ≥ 18 (for the report generator)
- PrimeDrop backend running on port 3001

## Run in 3 commands

```bash
# 1. Start the backend (from repo root)
npm run dev --prefix backend

# 2. Make the runner executable (once)
chmod +x loadtest/run.sh

# 3. Fire 100,000 requests and generate the report
./loadtest/run.sh
```

Override the target URL for staging or CI:

```bash
BASE_URL=http://staging.example.com:3001 ./loadtest/run.sh
```

## Output

| File | Description |
|---|---|
| `results/run.log` | Full k6 stdout/stderr log |
| `results/summary.json` | Raw k6 metrics (all percentiles, counters, gauges) |
| `results/LOAD_TEST_REPORT.txt` | Screenshot-worthy ASCII art report |
| `results/LOAD_TEST_REPORT.md` | Markdown table ready to paste into a README |

## Load profile

| Phase | Duration | VUs |
|---|---|---|
| Ramp up | 30 s | 0 → 500 |
| Spike hold | 60 s | 500 |
| FOMO surge | 30 s | 500 → 1,000 |
| Peak hold | 60 s | 1,000 |
| Ramp down | 30 s | 1,000 → 0 |
| **Total** | **~210 s** | **peak 1,000** |

## Thresholds

| Metric | Target |
|---|---|
| p95 response time | < 2,000 ms |
| Error rate | < 5 % |
| Total requests | > 100,000 |

> **Note:** HTTP 409 (sold-out) responses are *not* counted as errors —
> they are the correct behaviour once the 100-unit inventory is exhausted.

## Scenarios

| Name | VUs | Purpose |
|---|---|---|
| `flash_sale` | 0–1,000 (ramping) | `POST /api/sale/buy` — main purchase load |
| `metrics_poller` | 1 | `GET /api/sale/metrics` every 10 s — captures queue depth, DB writes, Redis counters |
| `inventory_reader` | 3 | `GET /api/sale/inventory` — simulates shoppers checking stock |

## Re-generate report from an existing run

```bash
node loadtest/format-report.js
```
