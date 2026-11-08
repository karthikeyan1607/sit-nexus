import React from 'react';
import { Layers, ChevronDown } from 'lucide-react';

export interface AreaPathSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
  showLabel?: boolean;
  label?: string;
  additionalOptions?: string[];
}

/** Area Path choices are supplied exclusively by the live Azure DevOps API. */
export const AreaPathSelect: React.FC<AreaPathSelectProps> = ({
  value,
  onChange,
  id = 'area-path-select',
  name = 'areaPath',
  className = '',
  disabled = false,
  showIcon = true,
  showLabel = false,
  label = 'AREA PATH',
  additionalOptions = [],
}) => {
  const options = React.useMemo(() => {
    const list = [...new Set(additionalOptions.filter(Boolean))];
    if (value && !list.includes(value)) list.unshift(value);
    return list;
  }, [value, additionalOptions]);

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {showLabel && (
        <label
          htmlFor={id}
          className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold flex items-center gap-1 select-none"
        >
          {showIcon && <Layers className="w-3 h-3 text-[#1C1C1C] shrink-0" />}
          <span>{label}</span>
        </label>
      )}

      <div className="relative w-full" title={value || 'Select Area Path'}>
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || options.length === 0}
          aria-label={label || 'Select Area Path'}
          className="w-full h-9 bg-white border border-[#D1D5DB] focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-mono font-medium text-[#1F2937] rounded-lg pl-3 pr-8 py-1.5 appearance-none outline-none transition-all truncate cursor-pointer disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
        >
          <option value="">{options.length ? 'Select Area Path' : 'Connect Azure DevOps to load Area Paths'}</option>
          {options.map((option) => (
            <option key={option} value={option} title={option} className="py-1 font-mono text-xs text-[#1F2937] bg-white">
              {option}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B7280]">
          <ChevronDown className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>
    </div>
  );
};
