import { useEffect, useState } from "react";

export default function Navbar() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const sections = ["hero", "demo", "architecture", "about"];
    const els = sections
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 h-14 2xl:h-16 bg-[#0d0d0d]/90 backdrop-blur-sm border-b border-[#1e2028] flex justify-center items-center">
      {/* The px-6 lg:px-12 2xl:px-20 adds equal safety padding to the left AND right.
        If the GitHub logo is still hiding, your browser has a horizontal scrollbar.
      */}
      <div className="max-w-[1400px] w-full h-full px-6 sm:px-10 flex items-center justify-between">
        {/* LEFT: Logo */}
        <a
          href="#hero"
          className="font-mono text-[#f59e0b] text-[15px] 2xl:text-[16px] font-medium tracking-tight"
        >
          ⚡ PrimeDrop
        </a>

        {/* CENTER: Links */}
        <div className="hidden sm:flex items-center gap-8 2xl:gap-10">
          <a
            href="#hero"
            className={`text-[13px] 2xl:text-[14px] font-mono text-[#6b7280] hover:text-[#e8eaf0] transition-colors cursor-pointer tracking-widest uppercase ${active === "hero" ? "text-[#e8eaf0]" : ""}`}
          >
            01
          </a>
          <a
            href="#demo"
            className={`text-[13px] 2xl:text-[14px] font-mono text-[#6b7280] hover:text-[#e8eaf0] transition-colors cursor-pointer tracking-widest uppercase ${active === "demo" ? "text-[#e8eaf0]" : ""}`}
          >
            02
          </a>
          <a
            href="#architecture"
            className={`text-[13px] 2xl:text-[14px] font-mono text-[#6b7280] hover:text-[#e8eaf0] transition-colors cursor-pointer tracking-widest uppercase ${active === "architecture" ? "text-[#e8eaf0]" : ""}`}
          >
            03
          </a>
          <a
            href="#about"
            className={`text-[13px] 2xl:text-[14px] font-mono text-[#6b7280] hover:text-[#e8eaf0] transition-colors cursor-pointer tracking-widest uppercase ${active === "about" ? "text-[#e8eaf0]" : ""}`}
          >
            04
          </a>
        </div>

        {/* RIGHT: GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 text-[#6b7280] hover:text-[#e8eaf0] transition-colors cursor-pointer flex-shrink-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="overflow-visible"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span className="text-[13px] 2xl:text-[14px]">GitHub</span>
        </a>
      </div>
    </nav>
  );
}
