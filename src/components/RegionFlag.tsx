import React from 'react';

interface RegionFlagProps {
  region: string;
  className?: string;
  size?: number;
}

export const RegionFlag: React.FC<RegionFlagProps> = ({ 
  region, 
  className = '', 
  size = 20 
}) => {
  const norm = (region || '').toLowerCase().trim();

  // Common flag container styling for 3:2 proportion
  const width = size * 1.35;
  const height = size * 0.9;

  if (norm.includes('india') || norm === 'in') {
    return (
      <span 
        role="img" 
        aria-label="India" 
        className={`inline-flex items-center shrink-0 ${className}`}
        title="India"
      >
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 30 20" 
          className="rounded-xs overflow-hidden shadow-2xs border border-neutral-300 shrink-0"
        >
          {/* Top Saffron Band */}
          <rect width="30" height="6.67" fill="#FF9933" />
          {/* Middle White Band */}
          <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
          {/* Bottom Green Band */}
          <rect y="13.34" width="30" height="6.67" fill="#138808" />
          {/* Ashoka Chakra Wheel in Center */}
          <circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="0.6" />
          <circle cx="15" cy="10" r="0.6" fill="#000080" />
          {/* Radiating spokes */}
          <path 
            d="M15,7.6 L15,12.4 M12.6,10 L17.4,10 M13.3,8.3 L16.7,11.7 M13.3,11.7 L16.7,8.3 M14.1,7.8 L15.9,12.2 M12.8,9.1 L17.2,10.9 M14.1,12.2 L15.9,7.8 M12.8,10.9 L17.2,9.1" 
            stroke="#000080" 
            strokeWidth="0.35" 
          />
        </svg>
      </span>
    );
  }

  if (norm.includes('europe') || norm.includes('eu')) {
    return (
      <span 
        role="img" 
        aria-label="Europe" 
        className={`inline-flex items-center shrink-0 ${className}`}
        title="Europe"
      >
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 30 20" 
          className="rounded-xs overflow-hidden shadow-2xs border border-neutral-300 shrink-0"
        >
          {/* EU Reflex Blue Background */}
          <rect width="30" height="20" fill="#003399" />
          {/* Circle of 12 Gold Stars */}
          <g fill="#FFCC00" transform="translate(15, 10)">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = 5.8;
              const x = r * Math.sin(rad);
              const y = -r * Math.cos(rad);
              return (
                <polygon 
                  key={i}
                  points="0,-0.9 0.27,-0.27 0.9,-0.27 0.42,0.14 0.6,0.8 0,0.38 -0.6,0.8 -0.42,0.14 -0.9,-0.27 -0.27,-0.27"
                  transform={`translate(${x}, ${y}) scale(0.9)`}
                />
              );
            })}
          </g>
        </svg>
      </span>
    );
  }

  if (norm.includes('usa') || norm.includes('us') || norm.includes('united states') || norm.includes('america')) {
    return (
      <span 
        role="img" 
        aria-label="USA" 
        className={`inline-flex items-center shrink-0 ${className}`}
        title="USA"
      >
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 30 20" 
          className="rounded-xs overflow-hidden shadow-2xs border border-neutral-300 shrink-0"
        >
          {/* 13 Red and White Stripes */}
          <rect width="30" height="20" fill="#B22234" />
          <rect y="1.54" width="30" height="1.54" fill="#FFFFFF" />
          <rect y="4.62" width="30" height="1.54" fill="#FFFFFF" />
          <rect y="7.69" width="30" height="1.54" fill="#FFFFFF" />
          <rect y="10.77" width="30" height="1.54" fill="#FFFFFF" />
          <rect y="13.85" width="30" height="1.54" fill="#FFFFFF" />
          <rect y="16.92" width="30" height="1.54" fill="#FFFFFF" />
          {/* Blue Canton (Union) */}
          <rect width="13" height="10.77" fill="#3C3B6E" />
          {/* Star Field Cluster */}
          <g fill="#FFFFFF">
            <circle cx="2.5" cy="2.2" r="0.65" />
            <circle cx="5.0" cy="2.2" r="0.65" />
            <circle cx="7.5" cy="2.2" r="0.65" />
            <circle cx="10.0" cy="2.2" r="0.65" />
            <circle cx="3.75" cy="4.2" r="0.65" />
            <circle cx="6.25" cy="4.2" r="0.65" />
            <circle cx="8.75" cy="4.2" r="0.65" />
            <circle cx="2.5" cy="6.2" r="0.65" />
            <circle cx="5.0" cy="6.2" r="0.65" />
            <circle cx="7.5" cy="6.2" r="0.65" />
            <circle cx="10.0" cy="6.2" r="0.65" />
            <circle cx="3.75" cy="8.2" r="0.65" />
            <circle cx="6.25" cy="8.2" r="0.65" />
            <circle cx="8.75" cy="8.2" r="0.65" />
          </g>
        </svg>
      </span>
    );
  }

  // Fallback for 'All' / 'All Regions' or Global
  return (
    <span 
      role="img" 
      aria-label="All Regions" 
      className={`inline-flex items-center shrink-0 ${className}`}
      title="All Regions"
    >
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#4B5563" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </span>
  );
};
