import { useEffect, useRef } from 'react';

export default function MetricCard({ label, value, color, sublabel, isUpdating }) {
  const numRef = useRef(null);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value && numRef.current) {
      numRef.current.classList.add('flash-update');
      const handleAnimationEnd = () => {
        numRef.current.classList.remove('flash-update');
      };
      numRef.current.addEventListener('animationend', handleAnimationEnd);
      return () => {
        numRef.current.removeEventListener('animationend', handleAnimationEnd);
      };
    }
    prev.current = value;
  }, [value]);

  return (
    <div className="bg-[#111318] border border-[#1e2028] rounded-lg p-5 2xl:p-6 flex flex-col gap-1 min-h-[120px] 2xl:min-h-[140px] justify-center">
      <div className="text-[10px] 2xl:text-[11px] font-mono uppercase tracking-[0.12em] text-[#6b7280] mb-1">
        {label}
      </div>
      <div
        ref={numRef}
        className={`font-mono font-medium leading-none tabular-nums text-[32px] 2xl:text-[40px] ${color} ${isUpdating ? 'flash-update' : ''}`}
      >
        {value.toLocaleString()}
      </div>
      {sublabel && (
        <div className="text-[11px] 2xl:text-[12px] text-[#374151] mt-1 font-mono">
          {sublabel}
        </div>
      )}
    </div>
  );
}