import { Truck } from 'lucide-react';

export function PlatformBrand() {
  return <div className="relative isolate flex min-h-20 items-center overflow-hidden bg-linear-to-r from-[#07365f] to-[#0057A8] px-6 sm:px-9">
    <svg aria-hidden="true" focusable="false" viewBox="0 0 176 80" className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-auto max-[380px]:w-24" fill="none">
      <g stroke="#fff" strokeOpacity=".13">
        <path d="M17 -5 65 43h56l41 42M45 -8l45 45h40l46 45M89 -8l34 34h53M15 85l33-33h58l64-64M63 85l25-25h45l43-43M118 85l58-58" />
      </g>
      <path d="M56 56h35l24-24h29" stroke="#91ccff" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="56" cy="56" r="3.5" fill="#0b4b85" stroke="#91ccff" strokeWidth="2"/>
      <circle cx="144" cy="32" r="4" fill="#ffd200"/>
    </svg>
    <div className="flex items-center gap-3 text-white">
      <span className="grid size-9 place-items-center rounded-lg border border-white/25 bg-white/10"><Truck aria-hidden="true" size={21} strokeWidth={1.8}/></span>
      <span className="text-sm font-semibold tracking-wide">TMS / DMS Delivery</span>
    </div>
  </div>;
}
