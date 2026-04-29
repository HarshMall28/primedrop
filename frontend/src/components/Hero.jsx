import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const LINES = [
  {
    text: "What happens when 100,000 users",
    color: "#e8eaf0",
    weight: "font-light",
    speed: 55,
  },
  {
    text: "click Buy Now at the same time?",
    color: "#e8eaf0",
    weight: "font-light",
    speed: 55,
    pauseBefore: 700,
  },
  {
    text: "This is the engineering behind",
    color: "#f59e0b",
    weight: "font-medium",
    speed: 45,
    pauseBefore: 900,
  },
  {
    text: "every major flash sale.",
    color: "#f59e0b",
    weight: "font-medium",
    speed: 45,
    pauseBefore: 600,
  },
];

function useTypingAnimation() {
  const [typed, setTyped] = useState(["", "", "", ""]);
  const [ctaVisible, setCta] = useState(false);
  const [pillsVisible, setPills] = useState(false);
  const caretLine = useRef(0);

  useEffect(() => {
    let dead = false;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    async function typeOut(idx, text, speed) {
      for (let i = 0; i <= text.length; i++) {
        if (dead) return;
        caretLine.current = idx;
        setTyped((prev) => {
          const n = [...prev];
          n[idx] = text.slice(0, i);
          return n;
        });
        await delay(speed);
      }
    }

    async function run() {
      await delay(400);
      for (let i = 0; i < LINES.length; i++) {
        if (LINES[i].pauseBefore) await delay(LINES[i].pauseBefore);
        await typeOut(i, LINES[i].text, LINES[i].speed);
      }
      await delay(900);
      if (!dead) setCta(true);
      await delay(400);
      if (!dead) setPills(true);
    }

    run();
    return () => {
      dead = true;
    };
  }, []);

  return { typed, ctaVisible, pillsVisible, caretLine };
}

export default function Hero() {
  const { typed, ctaVisible, pillsVisible, caretLine } =
    useTypingAnimation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center pt-12">
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      {/* 1. PARENT CONTAINER: Now handles the massive gap using vh units */}
      <div className="relative w-full max-w-[1400px] px-6 sm:px-10 flex flex-col items-center text-center z-10 gap-24 lg:gap-[16vh] 2xl:gap-[20vh] min-[1920px]:gap-[24vh]">
        {/* TEXT BLOCK */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 max-w-3xl 2xl:max-w-4xl">
          {LINES.map((line, i) => (
            <span
              key={i}
              className={`block text-[32px] sm:text-[38px] lg:text-[44px] 2xl:text-[52px] leading-[1.3] ${line.color} ${line.weight}`}
            >
              {typed[i]}
              {caretLine.current === i && (
                <span className="cursor-blink" />
              )}
            </span>
          ))}
        </div>

        {/* 2. BUTTON & PILLS WRAPPER: Removed all mt- (margin-top) classes */}
        <div
          className={`w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 2xl:gap-14 transition-opacity duration-300 ${ctaVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("demo")
                .scrollIntoView({ behavior: "smooth" });
            }}
            className={`inline-flex items-center gap-3 px-10 py-6 lg:px-12 lg:py-6 2xl:px-14 2xl:py-8 rounded-xl border-2 border-[#f59e0b] text-[#f59e0b] text-[16px] lg:text-[18px] 2xl:text-[20px] font-medium hover:bg-[#f59e0b] hover:text-black transition-all duration-200 cursor-pointer flex-shrink-0 ${ctaVisible ? "fade-in-up" : ""}`}
          >
            Watch it happen →
          </a>

          <div
            className={`flex flex-wrap items-center justify-center lg:justify-start gap-3 2xl:gap-4 transition-opacity duration-300 ${pillsVisible ? "opacity-100 fade-in-up" : "opacity-0"}`}
          >
            {[
              "Redis Lua Scripts",
              "BullMQ Queues",
              "Idempotency Keys",
            ].map((p) => (
              <span
                key={p}
                className="px-5 py-3 2xl:px-6 2xl:py-3.5 rounded-full text-[12px] 2xl:text-[13px] font-mono text-[#6b7280] border border-[#1e2028] bg-[#111318]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        href="#demo"
        aria-label="Scroll to demo"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#374151] bounce-slow"
      >
        <ChevronDown size={24} />
      </a>
    </div>
  );
}
