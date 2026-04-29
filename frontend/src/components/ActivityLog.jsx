export default function ActivityLog({ entries }) {
  const TYPE_COLOR = {
    success: 'text-[#10b981]',
    error:   'text-[#ef4444]',
    neutral: 'text-gray-300',
    warning: 'text-[#f59e0b]',
  };

  return (
    <div className="w-full">
      <div className="text-[11px] 2xl:text-[13px] font-mono uppercase tracking-[0.12em] text-gray-400 mb-3 flex items-center gap-2">
        ACTIVITY LOG · 1,000 REQUESTS PER CLICK
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse inline-block" />
      </div>
      <div className="bg-[#0a0a0a] border border-[#1e2028] rounded-lg h-[300px] lg:h-[350px] 2xl:h-[400px] min-[1920px]:h-[450px] overflow-y-auto p-4 scrollbar-thin font-mono text-[13px] 2xl:text-[15px] min-[1920px]:text-[16px] leading-relaxed">
        {[...entries].slice(0, 25).reverse().map((entry, i) => (
          <div key={i} className="flex gap-3 mb-1.5">
            <span className="text-[#374151] flex-shrink-0 select-none">
              [{entry.timestamp}]
            </span>
            <span className={`${TYPE_COLOR[entry.type] || TYPE_COLOR.neutral} text-gray-300`}>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}