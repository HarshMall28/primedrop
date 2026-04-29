export default function About() {
  return (
    <section
      id="about"
      className="w-full flex justify-center pt-32 lg:pt-[20vh] min-[1920px]:pt-[25vh] pb-24 min-[1920px]:pb-[15vh] scroll-mt-48 lg:scroll-mt-[12vh] min-[1920px]:scroll-mt-[15vh]"
    >
      <div className="w-full max-w-[1400px] px-6 sm:px-10 flex flex-col items-center justify-center gap-12 min-[1920px]:gap-[10vh]">
        {/* Reading Column for Content */}
        <div className="w-full max-w-3xl 2xl:max-w-4xl mx-auto self-center flex flex-col gap-8 2xl:gap-10 text-left">
          <h2 className="text-[#e8eaf0] text-[40px] 2xl:text-[52px] font-medium leading-tight">
            Why I built this
          </h2>

          <div className="text-[#d1d5db] text-[16px] 2xl:text-[18px] min-[1920px]:text-[20px] leading-[1.8] flex flex-col gap-6 2xl:gap-8">
            <p>
              Most tutorials teach you how to build CRUD apps, Create,
              Read, Update, Delete. And that is fine for learning the
              basics. But real production systems have to handle
              problems that tutorials never mention: what happens when
              100,000 people click the same button at the same
              millisecond? What stops your database from crashing?
              What prevents a user from buying something twice because
              their phone lagged?
            </p>
            <p>
              PrimeDrop is my attempt to build one level below the
              tutorial to implement the patterns that actually run
              major flash sales at scale. Not because I was asked to,
              but because I wanted to understand what separates a
              junior developer's CRUD app from a system that does not
              fall over when it matters most.
            </p>
            <p>
              Every technique: Redis Lua Scripts for atomic inventory,
              BullMQ for async decoupling, Idempotency Keys for
              deduplication — is lifted from how production systems
              operate at scale. I built it myself from scratch so I
              could explain every line in an interview without
              hesitation.
            </p>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-3 lg:gap-4 mt-2">
            {[
              "100 iPhones",
              "100,000 simulated users",
              "0 oversells",
            ].map((chip) => (
              <span
                key={chip}
                className="border border-[#1e2028] rounded-full px-5 py-2.5 2xl:px-6 2xl:py-3 text-[12px] 2xl:text-[13px] font-mono text-[#6b7280] bg-[#111318]"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 mt-4 lg:mt-6">
            <a
              href="#"
              className="border-2 border-[#f59e0b] text-[#f59e0b] px-6 py-3 lg:px-8 lg:py-4 rounded-lg text-[15px] 2xl:text-[16px] font-medium hover:bg-[#f59e0b] hover:text-black transition-all duration-200"
            >
              View on GitHub →
            </a>
            <a
              href="#"
              className="border border-[#1e2028] text-[#e8eaf0] px-6 py-3 lg:px-8 lg:py-4 rounded-lg text-[15px] 2xl:text-[16px] hover:border-[#2a2d38] transition-all"
            >
              Connect on LinkedIn →
            </a>
          </div>

          {/* Technology stack footer */}
          <div className="mt-8 lg:mt-12 text-[#374151] text-[13px] 2xl:text-[14px] font-mono border-t border-[#1e2028] pt-8">
            Node.js · Redis · PostgreSQL · BullMQ · React
          </div>
        </div>
      </div>
    </section>
  );
}
