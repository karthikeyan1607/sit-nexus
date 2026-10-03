import React from 'react';
import caterpillarLogoUrl from '../assets/caterpillar-logo.svg';

interface CaterpillarLogoProps {
  className?: string;
  height?: number;
  alt?: string;
}

/**
 * Official Caterpillar Logo Asset
 * Renders the approved asset from /src/assets/caterpillar-logo.svg (and /public/assets/caterpillar-logo.svg).
 * Preserves official proportions without distortion.
 */
export const CaterpillarLogo: React.FC<CaterpillarLogoProps> = ({
  className = '',
  height = 36,
  alt = 'Caterpillar',
}) => {
  return (
    <img
      src={caterpillarLogoUrl || '/assets/caterpillar-logo.svg'}
      alt={alt}
      style={{ height: `${height}px`, width: 'auto' }}
      className={`shrink-0 object-contain select-none ${className}`}
      loading="eager"
    />
  );
};
