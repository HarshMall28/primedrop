import { useSimulation } from "../hooks/useSimulation.js";
import MetricCard from "./MetricCard.jsx";
import ActivityLog from "./ActivityLog.jsx";

function StockTag({ inventory }) {
  if (inventory === 0) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono bg-[#1f0a0a] text-[#ef4444] border border-[#ef444433]">
        SOLD OUT
      </span>
    );
  }
  if (inventory <= 20) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono bg-[#1c1a00] text-[#f59e0b] border border-[#f59e0b33] pulse-amber">
        Only {inventory} left!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono bg-[#052e16] text-[#10b981] border border-[#10b98133]">
      {inventory} in stock
    </span>
  );
}

export default function LiveDemo() {
  const {
    inventory,
    totalRequests,
    dbWrites,
    duplicatesBlocked,
    queueDepth,
    responseTime,
    activityLog,
    isSoldOut,
    isLoading,
    error,
    handleBuy,
    handleReset,
  } = useSimulation();

  return (
    <section
      id="demo"
      className="w-full flex flex-col items-center justify-center pt-32 lg:pt-[12vh] pb-24 scroll-mt-48 lg:scroll-mt-[15vh]"
    >
      <div className="relative w-full max-w-[1400px] px-6 sm:px-10 z-10">
        {/* SCENARIO BANNER */}
        <div className="w-full mb-12 lg:mb-16 min-[1920px]:mb-[8vh] rounded-xl bg-[#111318] border border-[#1e2028] border-l-4 border-l-[#f59e0b] px-8 py-8 2xl:px-10 2xl:py-10">
          <div className="font-mono text-[#f59e0b] text-[11px] 2xl:text-[12px] uppercase tracking-[0.15em] mb-4 2xl:mb-5">
            THE SCENARIO
          </div>
          <p className="text-[#e8eaf0] text-[18px] 2xl:text-[20px] leading-relaxed mb-4">
            It is Big Billion Day. Flipkart has exactly{" "}
            <strong className="font-medium text-white">
              20 iPhone 15 Pros
            </strong>{" "}
            available.
            <strong className="font-medium text-white">
              50 users
            </strong>{" "}
            have been waiting for the sale to start. The moment it
            begins, all of them click{" "}
            <strong className="font-medium text-white">
              Buy Now
            </strong>{" "}
            at the exact same second.
          </p>
          <p className="text-[#d1d5db] text-[15px] 2xl:text-[16px] leading-relaxed">
            In a normal system — the database crashes. Every time.
            PrimeDrop shows what happens instead.
          </p>
          <p className="font-mono text-[#f59e0b] text-[12px] 2xl:text-[13px] mt-4">
            → Each click simulates 50 concurrent requests hitting the
            system simultaneously.
          </p>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-12 lg:gap-16 2xl:gap-24 items-start w-full">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-8">
            {/* Product card */}
            <div className="bg-[#111318] border border-[#1e2028] rounded-xl p-6 2xl:p-10 flex flex-col gap-5">
              <div className="w-full aspect-video rounded-lg bg-[#1a1d24] border border-[#1e2028] flex items-center justify-center">
                <img
                  src="/iphone15pro.png"
                  alt="iPhone 15 Pro"
                  loading="lazy"
                  className="h-full w-full object-contain p-4"
                />
              </div>

              <div>
                <div className="text-[#e8eaf0] text-[20px] 2xl:text-[22px] font-medium">
                  iPhone 15 Pro
                </div>
                <div className="font-mono text-[#e8eaf0] text-[32px] 2xl:text-[36px] font-medium mt-1">
                  ₹79,999
                </div>
              </div>

              <div>
                <StockTag inventory={inventory} />
              </div>

              <button
                onClick={handleBuy}
                disabled={isSoldOut || isLoading}
                className={`w-full py-5 2xl:py-6 rounded-xl text-[16px] 2xl:text-[18px] font-medium transition-all duration-200 ${
                  isSoldOut || isLoading
                    ? "bg-[#1e2028] text-[#374151] cursor-not-allowed"
                    : isLoading
                      ? "bg-[#92610a] text-[#1a1200] cursor-wait"
                      : "bg-[#f59e0b] text-black hover:bg-[#d97706]"
                }`}
              >
                {isSoldOut
                  ? "Sold Out"
                  : isLoading
                    ? "Processing..."
                    : "BUY NOW"}
              </button>

              <p className="text-[#d1d5db] text-[13px] 2xl:text-[15px] min-[1920px]:text-[16px] leading-relaxed font-mono">
                Each click = 1,000 simultaneous users attempting to
                buy. Watch how Redis and BullMQ absorb the spike.
              </p>

              {/* LOAD TEST NOTE CARD */}
              <div className="bg-[#0d0d0d] rounded-lg p-5 2xl:p-6 border border-[#1e2028] border-l-2 border-[#f59e0b] flex flex-col gap-4">
                <div className="font-mono text-[#f59e0b] text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] text-center w-full">
                  WHY ONLY 50 REQUESTS?
                </div>
                <p className="text-[#e8eaf0] text-[13px] 2xl:text-[15px] min-[1920px]:text-[16px] leading-relaxed">
                  This demo simulates 50 concurrent requests per click
                  due to free hosting constraints.
                </p>
                <p className="text-[#d1d5db] text-[13px] 2xl:text-[15px] min-[1920px]:text-[16px] leading-relaxed">
                  Locally load tested with k6 at 100,000 concurrent
                  requests. Zero oversells. Postgres received exactly
                  100 writes.
                </p>
                <p className="text-[#d1d5db] text-[13px] 2xl:text-[15px] min-[1920px]:text-[16px] leading-relaxed">
                  Full results and k6 scripts{" "}
                  <a
                    href="https://github.com/HarshMall28/primedrop/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3b82f6] hover:underline cursor-pointer"
                  >
                    on GitHub →
                  </a>
                </p>
                <p className="text-gray-500 text-[11px] 2xl:text-[12px] italic">
                  To run locally: clone repo → docker-compose up → k6
                  run loadtest/primedrop.test.js
                </p>
              </div>

              {/* Reset button */}
              <div className="flex justify-start">
                <button
                  onClick={handleReset}
                  className="text-[12px] 2xl:text-[13px] font-mono border border-[#374151] text-gray-300 hover:bg-[#1e2028] hover:border-gray-400 hover:text-white transition-colors bg-[#111318] rounded px-4 py-2.5 2xl:px-5 2xl:py-3"
                >
                  ↺ Reset simulation
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-8 w-full">
            {/* Metrics Section */}
            <div className="flex flex-col gap-6">
              <div className="font-mono text-[11px] 2xl:text-[13px] uppercase tracking-[0.15em] text-[#6b7280]">
                LIVE SYSTEM METRICS
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 2xl:gap-8 w-full">
                <MetricCard
                  label="INVENTORY REMAINING"
                  value={inventory}
                  sublabel="iPhones remaining"
                  color={
                    inventory > 20
                      ? "text-[#10b981]"
                      : inventory > 0
                        ? "text-[#f59e0b]"
                        : "text-[#ef4444]"
                  }
                  isUpdating={false}
                />
                <MetricCard
                  label="REQUESTS FIRED"
                  value={totalRequests}
                  sublabel="users attempted to buy"
                  color="text-[#3b82f6]"
                  isUpdating={false}
                />
                <MetricCard
                  label="QUEUE DEPTH"
                  value={queueDepth}
                  sublabel="jobs in BullMQ"
                  color="text-[#f59e0b]"
                  isUpdating={false}
                />
                <MetricCard
                  label="DB WRITES"
                  value={dbWrites}
                  sublabel="Postgres commits"
                  color="text-[#10b981]"
                  isUpdating={false}
                />
                <MetricCard
                  label="DUPLICATES BLOCKED"
                  value={duplicatesBlocked}
                  sublabel="blocked by idempotency"
                  color="text-[#ef4444]"
                  isUpdating={false}
                />
                <MetricCard
                  label="RESPONSE TIME"
                  value={responseTime}
                  sublabel="avg response (ms)"
                  color="text-[#10b981]"
                  isUpdating={false}
                />
              </div>
            </div>

            {/* KEY INSIGHT BOX */}
            <div className="bg-[#071a10] border border-[#10b98122] rounded-lg p-6 2xl:p-10 font-mono text-[14px] 2xl:text-[15px] leading-relaxed text-[#d1d5db] min-h-[100px] 2xl:min-h-[120px] flex items-center">
              {totalRequests === 0 ? (
                "Click BUY NOW to start the simulation."
              ) : !isSoldOut ? (
                <>
                  {totalRequests.toLocaleString()} requests fired ·
                  Redis handled all in ~{responseTime}ms · Postgres
                  wrote {dbWrites} times · 0 oversells
                </>
              ) : (
                <>
                  Sold out. {totalRequests.toLocaleString()} total
                  requests. Postgres wrote exactly {dbWrites} times.
                  Redis protected the DB from all direct hits.
                </>
              )}
            </div>

            {/* ActivityLog component */}
            <div className="w-full">
              <ActivityLog entries={activityLog} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
