import React from 'react';
import { CaterpillarLogo } from './CaterpillarLogo';

interface SitNexusBrandLockupProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'stacked';
  showSubtitle?: boolean;
  onClick?: () => void;
}

/**
 * Official SIT Nexus Enterprise Brand Lockup
 * Combines the official Caterpillar logo asset with SIT Nexus product identity.
 */
export const SitNexusBrandLockup: React.FC<SitNexusBrandLockupProps> = ({
  className = '',
  size = 'md',
  layout = 'horizontal',
  showSubtitle = true,
  onClick,
}) => {
  const logoHeight = size === 'sm' ? 30 : size === 'lg' ? 44 : 36;
  const scale = size === 'sm' ? 0.95 : size === 'lg' ? 1.25 : 1.08;

  const sitNexusContent = (
    <div className="flex flex-col justify-center leading-none">
      <div className="flex items-baseline gap-1.5 font-sans">
        <span
          style={{ fontSize: `${Math.round(19 * scale)}px` }}
          className="font-black text-[#111827] tracking-tight"
        >
          SIT
        </span>
        <span
          style={{ fontSize: `${Math.round(19 * scale)}px` }}
          className="font-black text-[#D97706] tracking-tight"
        >
          NEXUS
        </span>
      </div>

      {showSubtitle && (
        <span
          style={{ fontSize: `${Math.round(11 * scale)}px` }}
          className="font-medium text-[#64748B] tracking-tight mt-1 truncate"
        >
          Sprint Intelligence &amp; Execution Visibility Platform
        </span>
      )}
    </div>
  );

  if (layout === 'stacked') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col gap-2 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="SIT Nexus — Sprint Intelligence & Execution Visibility Platform"
      >
        <div className="flex items-center">
          <CaterpillarLogo height={logoHeight} />
        </div>

        <div className="flex items-center gap-2 pt-1.5 border-t border-[#F1F3F5]">
          {sitNexusContent}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title="SIT Nexus — Sprint Intelligence & Execution Visibility Platform"
    >
      <CaterpillarLogo height={logoHeight} />
      <div className="h-6 w-[1px] bg-[#E5E7EB] shrink-0" />
      {sitNexusContent}
    </div>
  );
};
