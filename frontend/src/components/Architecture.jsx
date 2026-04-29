import { useState } from "react";

const STEPS = [
  {
    nodes: {
      user: "path",
      idem: "path",
      redis: "path",
      queue: "path",
      api: "path",
      worker: "path",
      pg: "path",
    },
    arrows: { a1: "path", a2: "path", a3: "path" },
    badge: null,
    title: "Full system overview",
    body: "This is the complete <strong>PrimeDrop</strong> request flow. Every box is a system component. Click each numbered step above to trace exactly what happens from the moment a user clicks <strong>Buy Now</strong> to when the order lands in the database.",
    analogy: null,
    pitfalls: null,
  },
  {
    badge: { cls: "scl", text: "Scaling" },
    title: "100,000 users click simultaneously",
    body: "Every user clicks <strong>Buy Now</strong> at the same millisecond. In a naive system, each click fires a direct SQL query to Postgres.",
    analogy:
      "Think of a railway station with one ticket window. If 100,000 people rush at once, it collapses.",
    pitfalls: [
      {
        t: "What if you skip this?",
        b: "Direct DB writes exhaust the connection pool instantly.",
      },
      {
        t: "Alternative considered",
        b: "PgBouncer helps but does not solve the fundamental write volume problem.",
      },
    ],
    nodes: {
      user: "active",
      idem: "dim",
      redis: "dim",
      queue: "dim",
      api: "dim",
      worker: "dim",
      pg: "dim",
    },
    arrows: { a1: "", a2: "", a3: "" },
  },
  {
    badge: { cls: "sec", text: "Security" },
    title: "Duplicate request filter",
    body: "Before anything else, the server checks the <strong>Idempotency Key</strong>. Redis checks if this key was seen before.",
    analogy:
      "Like a cheque number. If you present the same cheque twice, the second is rejected instantly.",
    pitfalls: [
      {
        t: "What if you skip this?",
        b: "Network retries cause duplicate orders.",
      },
      {
        t: "Where the key is stored",
        b: "Idempotency keys stored in Redis with a 24-hour TTL.",
      },
    ],
    nodes: {
      user: "path",
      idem: "active",
      redis: "dim",
      queue: "dim",
      api: "dim",
      worker: "dim",
      pg: "dim",
    },
    arrows: { a1: "path", a2: "", a3: "" },
  },
  {
    badge: { cls: "opt", text: "Optimization" },
    title: "Atomic inventory decrement",
    body: "Redis executes a <strong>Lua script</strong> that checks and decrements inventory in a single atomic operation.",
    analogy:
      "Like a single turnstile at a stadium gate. Only one passes at a time.",
    pitfalls: [
      {
        t: "Why Lua script?",
        b: "Plain DECR goes negative. Lua checks count > 0 first.",
      },
      {
        t: "Alternative: DB transactions",
        b: "Postgres SELECT FOR UPDATE causes lock contention under load.",
      },
    ],
    nodes: {
      user: "path",
      idem: "path",
      redis: "active",
      queue: "dim",
      api: "dim",
      worker: "dim",
      pg: "dim",
    },
    arrows: { a1: "path", a2: "active", a3: "" },
  },
  {
    badge: { cls: "scl", text: "Scaling" },
    title: "Job enqueued, response sent",
    body: "Server pushes a job into <strong>BullMQ</strong> and immediately returns <strong>200 OK</strong> in under 10ms.",
    analogy:
      "Restaurant takes your order instantly. Kitchen processes it when ready.",
    pitfalls: [
      {
        t: "What if BullMQ crashes?",
        b: "Jobs persist in Redis. Worker auto-retries with exponential backoff.",
      },
    ],
    nodes: {
      user: "path",
      idem: "path",
      redis: "path",
      queue: "active",
      api: "success",
      worker: "dim",
      pg: "dim",
    },
    arrows: { a1: "path", a2: "path", a3: "active" },
  },
  {
    badge: { cls: "opt", text: "Optimization" },
    title: "Worker commits to Postgres",
    body: "A <strong>BullMQ worker</strong> picks up jobs and writes confirmed orders to Postgres in controlled batches.",
    analogy:
      "Kitchen processes orders calmly. If a dish fails, the chef retries.",
    pitfalls: [
      {
        t: "Postgres indexes matter",
        b: "Need composite index on (user_id, product_id, created_at).",
      },
    ],
    nodes: {
      user: "path",
      idem: "path",
      redis: "path",
      queue: "path",
      api: "path",
      worker: "active",
      pg: "success",
    },
    arrows: { a1: "path", a2: "path", a3: "path" },
  },
  {
    badge: { cls: "sec", text: "Security" },
    title: "Idempotency rejection",
    body: "Duplicate taps hit the idempotency check and immediately return <strong>cached success response</strong>.",
    analogy:
      "Submit form 3 times. Well-built system ignores second and third click.",
    pitfalls: [
      {
        t: "Key expiry timing",
        b: "24-hour TTL balances catching retries and memory usage.",
      },
    ],
    nodes: {
      user: "path",
      idem: "blocked",
      redis: "dim",
      queue: "dim",
      api: "dim",
      worker: "dim",
      pg: "dim",
    },
    arrows: { a1: "blocked", a2: "", a3: "" },
  },
];

const PILLS = [
  { key: "overview", label: "Overview" },
  { key: "s1", label: "1. User clicks" },
  { key: "s2", label: "2. Idempotency" },
  { key: "s3", label: "3. Redis atomic" },
  { key: "s4", label: "4. BullMQ queue" },
  { key: "s5", label: "5. DB write" },
  { key: "s6", label: "6. Duplicate blocked" },
];

const NODE_STYLES = {
  active: "border-[#f59e0b] bg-[#1c1400] text-[#f59e0b]",
  path: "border-[#185FA5] bg-[#0a1020] text-[#93c5fd]",
  success: "border-[#10b981] bg-[#071a10] text-[#10b981]",
  blocked: "border-[#ef4444] bg-[#1f0a0a] text-[#ef4444]",
  dim: "opacity-20",
  "": "border-[#1e2028] bg-[#1a1d24] text-[#e8eaf0]",
};

function DiagramNode({ title, sub, state }) {
  return (
    <div
      className={`arch-node border rounded-xl py-4 lg:py-5 2xl:py-6 min-h-[70px] 2xl:min-h-[90px] flex-1 text-center transition-all duration-200 flex flex-col justify-center gap-1 2xl:gap-1.5 ${NODE_STYLES[state] || NODE_STYLES[""]}`}
    >
      <div className="text-[13px] 2xl:text-[15px] font-medium leading-tight">{title}</div>
      {sub && (
        <div className="font-mono text-[10px] 2xl:text-[11px] opacity-80 uppercase tracking-wide">
          {sub}
        </div>
      )}
    </div>
  );
}

function Arrow({ label, state }) {
  const colorClass =
    {
      path: "bg-[#185FA5]",
      active: "bg-[#f59e0b]",
      success: "bg-[#10b981]",
      blocked: "bg-[#ef4444]",
    }[state] || "bg-[#1e2028]";

  return (
    <div className="my-4 2xl:my-6 flex items-center gap-2">
      <div className={`flex-1 h-px ${colorClass}`} />
      <span className="font-mono text-[9px] 2xl:text-[10px] text-[#374151] px-2">
        {label}
      </span>
      <div className={`flex-1 h-px ${colorClass}`} />
    </div>
  );
}

export default function Architecture() {
  const [activeStep, setActiveStep] = useState(0);
  const data = STEPS[activeStep];

  return (
    <section 
      id="architecture" 
      className="w-full flex justify-center pt-20 lg:pt-[8vh] pb-12 lg:pb-[5vh] bg-[#0a0a0a] scroll-mt-48 lg:scroll-mt-[12vh]"
    >
      <div className="w-full max-w-[1400px] px-6 sm:px-10 flex flex-col items-center gap-10 lg:gap-12 min-[1920px]:gap-16">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-[#e8eaf0] text-[28px] lg:text-[32px] 2xl:text-[40px] font-medium mb-4">
            How it actually works
          </h2>
          <p className="text-[#6b7280] text-[16px] 2xl:text-[18px]">
            Trace a single request through the system
          </p>
        </div>

        {/* Problem vs Solution */}
        <div className="w-full max-w-4xl 2xl:max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          <div className="rounded-xl py-4 px-8 bg-[#1a0a0a] border border-[#1e2028] border-l-4 border-l-[#ef4444] flex flex-col gap-4 min-h-[120px] 2xl:min-h-[140px] justify-center">
            <div className="pl-6 lg:pl-10 2xl:pl-14 min-[1920px]:pl-16 flex flex-col gap-4">
              <div className="font-mono text-[#ef4444] text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em]">
                WITHOUT THIS ARCHITECTURE
              </div>
              <div className="text-[#6b7280] text-[14px] 2xl:text-[15px] leading-relaxed space-y-1">
                {[
                  "100,000 requests hit Postgres simultaneously",
                  "→ Connection pool (max ~500) exhausted",
                  "→ Database crashes instantly",
                  "→ Race conditions cause overselling",
                  "→ Refunds, outages, headlines",
                ].map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl py-4 px-8 bg-[#071a10] border border-[#1e2028] border-l-4 border-l-[#10b981] flex flex-col gap-4 min-h-[120px] 2xl:min-h-[140px] justify-center">
            <div className="pl-6 lg:pl-10 2xl:pl-14 min-[1920px]:pl-16 flex flex-col gap-4">
              <div className="font-mono text-[#10b981] text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em]">
                WITH PRIMEDROP
              </div>
              <div className="text-[#6b7280] text-[14px] 2xl:text-[15px] leading-relaxed space-y-1">
                {[
                  "100,000 requests → Redis absorbs all",
                  "→ 100 confirmed atomically",
                  "→ 99,900 get sold out instantly",
                  "→ Postgres receives exactly 100 writes",
                  "→ Zero oversells. Zero crashes.",
                ].map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trace Layer / Diagram Section */}
        <div className="w-full max-w-5xl 2xl:max-w-6xl flex flex-col items-center gap-10 lg:gap-14">
          <div className="flex flex-col gap-6 w-full">
            <div className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] text-[#6b7280] text-center">
              TRACE A REQUEST THROUGH THE SYSTEM
            </div>

            {/* Step pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {PILLS.map(({ key, label }, index) => (
                <button
                  key={key}
                  onClick={() => setActiveStep(index)}
                  className={`px-5 py-2.5 rounded-full text-[11px] 2xl:text-[12px] font-mono border cursor-pointer transition-all duration-150 outline-none ${
                    activeStep === index
                      ? "bg-[#f59e0b] text-black border-[#f59e0b] font-medium"
                      : "bg-transparent text-[#6b7280] border-[#1e2028] hover:border-[#2a2d38] hover:text-[#9ca3af]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Diagram */}
          <div className="w-full max-w-3xl 2xl:max-w-4xl mx-auto self-center bg-[#111318] border border-[#1e2028] rounded-2xl p-6 lg:p-8 min-[1920px]:p-12 flex flex-col gap-4 lg:gap-6 min-[1920px]:gap-8">
            <div className="flex flex-col gap-3">
              <div className="font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                CLIENT LAYER
              </div>
              <DiagramNode
                title="100k users"
                sub="Flash sale click"
                state={data.nodes.user}
              />
            </div>

            <Arrow
              label="HTTP POST /buy + Idempotency-Key header"
              state={data.arrows.a1}
            />

            <div className="flex flex-col gap-3">
              <div className="font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                API SERVER — NODE.JS
              </div>
              <div className="flex gap-4 flex-wrap">
                <DiagramNode
                  title="Idempotency check"
                  sub="Redis key lookup"
                  state={data.nodes.idem}
                />
                <DiagramNode
                  title="Redis Lua script"
                  sub="Atomic DECR inventory"
                  state={data.nodes.redis}
                />
              </div>
            </div>

            <Arrow
              label="Enqueue job (non-blocking)"
              state={data.arrows.a2}
            />

            <div className="flex flex-col gap-3">
              <div className="font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                QUEUE LAYER
              </div>
              <div className="flex gap-4 flex-wrap">
                <DiagramNode
                  title="BullMQ queue"
                  sub="Job enqueued"
                  state={data.nodes.queue}
                />
                <DiagramNode
                  title="API response"
                  sub="200 OK — ~8ms"
                  state={data.nodes.api}
                />
              </div>
            </div>

            <Arrow
              label="Worker picks job ~5s later"
              state={data.arrows.a3}
            />

            <div className="flex flex-col gap-3">
              <div className="font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                DATABASE LAYER
              </div>
              <div className="flex gap-4 flex-wrap">
                <DiagramNode
                  title="BullMQ worker"
                  sub="Picks job after 5s"
                  state={data.nodes.worker}
                />
                <DiagramNode
                  title="Postgres write"
                  sub="Order committed"
                  state={data.nodes.pg}
                />
              </div>
            </div>
          </div>

          {/* Step Detail Explanation */}
          <div className="flex flex-col gap-8">
            <div className="bg-[#111318] border border-[#1e2028] rounded-xl p-8 lg:p-10 min-[1920px]:p-12">
              <div className="flex items-center gap-4 mb-5">
                {data.badge && (
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.12em] ${
                      data.badge.cls === "opt"
                        ? "bg-[#1c1400] text-[#f59e0b] border border-[#f59e0b33]"
                        : data.badge.cls === "scl"
                          ? "bg-[#071a10] text-[#10b981] border border-[#10b98133]"
                          : "bg-[#0a1020] text-[#3b82f6] border border-[#3b82f633]"
                    }`}
                  >
                    {data.badge.text}
                  </span>
                )}
                <h3 className="text-[#e8eaf0] text-[18px] 2xl:text-[20px] font-medium">
                  {data.title}
                </h3>
              </div>
              <div
                className="arch-body text-[#d1d5db] text-[14px] 2xl:text-[16px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.body }}
              />
              {data.analogy && (
                <div className="mt-8 pl-5 py-3 border-l-2 border-[#f59e0b] text-[#9ca3af] text-[14px] 2xl:text-[15px] italic leading-relaxed bg-[#1a1d24]/50">
                  {data.analogy}
                </div>
              )}
            </div>

            {/* Pitfalls Grid */}
            {data.pitfalls && (
              <div className="flex flex-col gap-5">
                <div className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] text-[#374151]">
                  PITFALLS & ALTERNATIVES
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {data.pitfalls.map((p, i) => (
                    <div
                      key={i}
                      className="bg-[#0d0d0d] border border-[#1e2028] rounded-xl p-8 lg:p-10 min-h-[160px] flex flex-col justify-center"
                    >
                      <div className="text-[#e8eaf0] text-[14px] font-medium mb-3">
                        {p.t}
                      </div>
                      <div className="text-[#9ca3af] text-[13px] leading-relaxed">
                        {p.b}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Core Techniques Grid */}
        <div className="w-full max-w-5xl 2xl:max-w-6xl flex flex-col gap-8">
          <div className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] text-[#374151] text-center">
            CORE TECHNIQUES
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-[#111318] border border-[#1e2028] rounded-xl p-8 lg:p-10 min-h-[200px] 2xl:min-h-[240px] flex flex-col gap-5 justify-center">
              <span className="w-fit px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.12em] bg-[#1c1400] text-[#f59e0b] border border-[#f59e0b33]">
                Optimization
              </span>
              <div>
                <div className="text-[#e8eaf0] text-[16px] 2xl:text-[18px] font-medium">
                  Redis Lua Scripts
                </div>
                <div className="text-[#9ca3af] text-[13px] mt-2 italic">
                  A single turnstile — only one passes at a time
                </div>
              </div>
              <div className="font-mono text-[#10b981] text-[12px] mt-2">
                → Inventory never oversells
              </div>
            </div>
            <div className="bg-[#111318] border border-[#1e2028] rounded-xl p-8 lg:p-10 min-h-[200px] 2xl:min-h-[240px] flex flex-col gap-5 justify-center">
              <span className="w-fit px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.12em] bg-[#071a10] text-[#10b981] border border-[#10b98133]">
                Scaling
              </span>
              <div>
                <div className="text-[#e8eaf0] text-[16px] 2xl:text-[18px] font-medium">
                  BullMQ Queue Decoupling
                </div>
                <div className="text-[#9ca3af] text-[13px] mt-2 italic">
                  Restaurant takes your order; kitchen processes later
                </div>
              </div>
              <div className="font-mono text-[#10b981] text-[12px] mt-2">
                → DB receives 100 writes, not 100,000
              </div>
            </div>
            <div className="bg-[#111318] border border-[#1e2028] rounded-xl p-8 lg:p-10 min-h-[200px] 2xl:min-h-[240px] flex flex-col gap-5 justify-center">
              <span className="w-fit px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.12em] bg-[#0a1020] text-[#3b82f6] border border-[#3b82f633]">
                Security
              </span>
              <div>
                <div className="text-[#e8eaf0] text-[16px] 2xl:text-[18px] font-medium">
                  Idempotency Keys
                </div>
                <div className="text-[#9ca3af] text-[13px] mt-2 italic">
                  A cheque number — presenting twice gets rejected
                </div>
              </div>
              <div className="font-mono text-[#10b981] text-[12px] mt-2">
                → 10 taps = exactly 1 order
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
