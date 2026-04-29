import { useCallback, useEffect, useRef, useState } from "react";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const MAX_LOG = 25;
const TOTAL_REQUESTS = 1000;
const INITIAL = {
  inventory: 100,
  totalRequests: 0,
  dbWrites: 0,
  duplicatesBlocked: 0,
  queueDepth: 0,
  responseTime: 9,
};

function nowStr() {
  const d = new Date(),
    pad = (n, l = 2) => String(n).padStart(l, "0");
  return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}]`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useSimulation() {
  const [metrics, setMetrics] = useState(INITIAL);
  const [activityLog, setLog] = useState([]);
  const [isSoldOut, setSoldOut] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  function addLog(message, type = "neutral") {
    setLog((prev) =>
      [{ message, type, timestamp: nowStr() }, ...prev].slice(
        0,
        MAX_LOG,
      ),
    );
  }

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/sale/metrics`);
      if (!res.ok) return;
      const data = await res.json();
      setMetrics({
        inventory: data.inventory ?? 0,
        totalRequests: data.totalRequests ?? 0,
        dbWrites: data.dbWrites ?? 0,
        duplicatesBlocked: data.duplicatesBlocked ?? 0,
        queueDepth: data.queueDepth ?? 0,
        responseTime: data.responseTime ?? 9,
      });
      if ((data.inventory ?? 0) <= 0) setSoldOut(true);
    } catch (err) {
      setError(`Metrics fetch failed: ${err.message}`);
    }
  }, []);

  // ── Polling — only runs when demo is active ──────────────────────────────
  useEffect(() => {
    if (!isDemoActive) {
      clearInterval(intervalRef.current);
      return;
    }

    function startPolling() {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchMetrics, 2000);
    }

    function stopPolling() {
      clearInterval(intervalRef.current);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        (async () => {
          await fetchMetrics();
          startPolling();
        })();
      } else {
        stopPolling();
      }
    }

    fetchMetrics(); // immediate fetch when demo starts
    startPolling();
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      stopPolling();
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [isDemoActive, fetchMetrics]);

  // ── One-time init on mount — reset + single metrics fetch, no polling ───
  useEffect(() => {
    async function init() {
      try {
        await fetch(`${BASE_URL}/api/sale/reset`, { method: "POST" });
      } catch {
        // non-fatal
      }
      await fetchMetrics();
    }
    init();
  }, [fetchMetrics]);

  // ── Buy ──────────────────────────────────────────────────────────────────
  async function handleBuy() {
    if (isLoading || isSoldOut) return;
    setLoading(true);
    setIsDemoActive(true); // start polling

    const UNIQUE_USERS = randInt(100, 500);
    const DUPLICATES = TOTAL_REQUESTS - UNIQUE_USERS;
    const baseRepeats = Math.floor(DUPLICATES / UNIQUE_USERS);
    const extraUsers = DUPLICATES % UNIQUE_USERS;

    const userPool = Array.from({ length: UNIQUE_USERS }, (_, i) => ({
      userId: `user-${i}`,
      idempotencyKey: crypto.randomUUID(),
      repeats: baseRepeats + (i < extraUsers ? 1 : 0),
    }));

    addLog(
      `Wave 1 — ${UNIQUE_USERS} unique users fire simultaneously (${DUPLICATES} duplicates queued for wave 2)...`,
      "neutral",
    );
    const t0 = Date.now();

    const wave1Results = await Promise.allSettled(
      userPool.map(({ userId, idempotencyKey }) =>
        fetch(`${BASE_URL}/api/sale/buy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ userId, productId: "iphone15pro" }),
        })
          .then((res) => ({ status: res.status }))
          .catch(() => ({ status: 0 })),
      ),
    );

    const ms1 = Date.now() - t0;
    let succeeded = 0,
      soldOut = 0,
      w1Errors = 0;
    for (const r of wave1Results) {
      const s = r.value?.status ?? 0;
      if (s === 200) succeeded++;
      else if (s === 409) soldOut++;
      else w1Errors++;
    }

    addLog(
      `Wave 1 done in ${ms1}ms — ${succeeded} orders placed · ${soldOut} sold out`,
      succeeded > 0 ? "success" : "neutral",
    );
    if (succeeded > 0)
      addLog(
        `Redis Lua script claimed ${succeeded} inventory slots atomically — no oversell possible`,
        "success",
      );

    addLog(
      `Wave 2 — ${DUPLICATES} duplicate requests (same users re-clicking, same idempotency keys)...`,
      "neutral",
    );
    const t1 = Date.now();

    const wave2Results = await Promise.allSettled(
      userPool.flatMap(({ userId, idempotencyKey, repeats }) =>
        Array.from({ length: repeats }, () =>
          fetch(`${BASE_URL}/api/sale/buy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify({
              userId,
              productId: "iphone15pro",
            }),
          })
            .then((res) => ({
              replay:
                res.headers.get("X-Idempotency-Replay") === "true",
            }))
            .catch(() => ({ replay: false })),
        ),
      ),
    );

    const ms2 = Date.now() - t1;
    let blocked = 0;
    for (const r of wave2Results) {
      if (r.value?.replay) blocked++;
    }

    addLog(`Wave 2 done in ${ms2}ms`, "neutral");
    addLog(
      `${blocked} duplicate requests blocked by idempotency — same UUID, cached response returned, zero extra DB writes`,
      blocked > 0 ? "error" : "neutral",
    );
    addLog(
      `Total: ${TOTAL_REQUESTS.toLocaleString()} requests → ${succeeded} orders · ${soldOut} sold out · ${blocked} idempotency blocks`,
      "neutral",
    );

    if (soldOut > 0 || succeeded === 0) setSoldOut(true);

    await fetchMetrics();
    setLoading(false);
    setIsDemoActive(false); // stop polling — demo complete
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  async function handleReset() {
    try {
      setIsDemoActive(false); // stop polling immediately
      clearInterval(intervalRef.current);
      await fetch(`${BASE_URL}/api/sale/reset`, { method: "POST" });
      setMetrics(INITIAL);
      setLog([]);
      setSoldOut(false);
      setError(null);
      await fetchMetrics(); // one final fetch to show reset state
      addLog("System reset — inventory restocked to 100", "neutral");
    } catch (err) {
      addLog(`Reset failed: ${err.message}`, "error");
    }
  }

  return {
    ...metrics,
    activityLog,
    isSoldOut,
    isLoading,
    error,
    handleBuy,
    handleReset,
  };
}
