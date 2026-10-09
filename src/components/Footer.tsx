import React from 'react';
import { Info } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className={`border-t border-[#E5E7EB] bg-[#FAFAFA] py-2.5 px-6 text-xs text-[#6B7280] font-sans flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap justify-center text-center">
        <span>&copy; {currentYear} Caterpillar Inc. All rights reserved.</span>
        <span className="text-[#9CA3AF] hidden sm:inline">|</span>
        <span className="font-semibold text-[#374151]">SIT Nexus</span>
        <span className="text-[#9CA3AF] hidden sm:inline">|</span>
        <span className="inline-flex items-center gap-1.5 text-[#4B5563]">
          <span>Made by SIT Energizers</span>
          <span className="relative inline-flex items-center group">
            <button
              type="button"
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[#9CA3AF] hover:text-[#374151] focus:text-[#1F2937] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFCD11] transition-colors cursor-help"
              aria-describedby="creator-info-tooltip"
              aria-label="Creator info"
            >
              <Info className="w-3 h-3 stroke-[2.2]" />
            </button>
            <span
              id="creator-info-tooltip"
              role="tooltip"
              className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 px-2 py-0.5 bg-[#1F2937] text-white text-[11px] font-sans font-medium rounded shadow-md whitespace-nowrap"
            >
              Karthikeyan
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2937]" />
            </span>
          </span>
        </span>
      </div>
    </footer>
  );
};
