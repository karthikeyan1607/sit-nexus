import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className={`border-t border-[#E5E7EB] bg-[#FAFAFA] py-2.5 px-6 text-xs text-[#6B7280] font-sans flex flex-col items-center justify-center gap-0.5 select-none shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap justify-center text-center">
        <span>&copy; {currentYear} Caterpillar Inc. All rights reserved.</span>
        <span className="text-[#D1D5DB] hidden sm:inline">&bull;</span>
        <span className="font-semibold text-[#374151]">SIT Nexus</span>
        <span className="text-[#D1D5DB] hidden sm:inline">&bull;</span>
        <span className="text-[#4B5563]">Made by SIT Energizers</span>
      </div>

      {/* Subtle, understated creator reference in a noticeably smaller, lower-emphasis font */}
      <div className="text-[9.5px] text-[#9CA3AF] font-sans tracking-wide">
        Karthikeyan
      </div>
    </footer>
  );
};
