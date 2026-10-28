import React, { useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { 
  CENTRALIZED_ITERATION_PATHS, 
  normalizeIterationPath, 
  isUnwantedIterationPath, 
  DEFAULT_ITERATION_PATH 
} from '../../constants/paths';

export interface IterationPathSelectProps {
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

/**
 * Reusable IterationPathSelect component for SIT Nexus.
 * Provides a standardized dropdown for selecting Azure DevOps Iteration Paths.
 * Features:
 * - Verified sequential 2-week sprint schedule through December 2026 (Sprint 20 to Sprint 26)
 * - Automatic migration/normalization of legacy typo or placeholder paths
 * - Unwanted options (Sprint 18, Sprint 19, 2024) filtered out and defaulted cleanly
 * - Tooltip displaying the complete path
 * - Clean ellipsis truncation to protect responsive layouts
 * - Visible focus ring (#FFCD11) matching CAT styling
 * - Full keyboard accessibility
 */
export const IterationPathSelect: React.FC<IterationPathSelectProps> = ({
  value,
  onChange,
  id = 'iteration-path-select',
  name = 'iterationPath',
  className = '',
  disabled = false,
  showIcon = true,
  showLabel = false,
  label = 'ITERATION PATH',
  additionalOptions = [],
}) => {
  // Normalize legacy or placeholder values if present, or reset unwanted options to predictable default
  useEffect(() => {
    if (value) {
      if (isUnwantedIterationPath(value)) {
        onChange(DEFAULT_ITERATION_PATH);
      } else {
        const normalized = normalizeIterationPath(value);
        if (normalized !== value) {
          onChange(normalized);
        }
      }
    }
  }, [value, onChange]);

  // Combine centralized options, any dynamic options from ADO/backend, and current value
  const options = React.useMemo(() => {
    // Start with centralized verified paths (strictly excluding unwanted options & placeholders)
    const list = [...CENTRALIZED_ITERATION_PATHS].filter(
      (item) => !isUnwantedIterationPath(item.value) && !isUnwantedIterationPath(item.label)
    );

    // Merge any additional verified options from ADO or backend not already present
    additionalOptions.forEach((opt) => {
      if (!opt || isUnwantedIterationPath(opt)) return;
      const cleanOpt = normalizeIterationPath(opt);
      if (
        !isUnwantedIterationPath(cleanOpt) &&
        !list.some((item) => item.value === cleanOpt || item.label === cleanOpt)
      ) {
        list.push({
          value: cleanOpt,
          label: cleanOpt,
          isVerified: true,
        });
      }
    });

    // Ensure the current active value is present in the list (if valid and not unwanted)
    const cleanValue = normalizeIterationPath(value);
    if (
      cleanValue && 
      !isUnwantedIterationPath(cleanValue) && 
      !list.some((item) => item.value === cleanValue)
    ) {
      list.unshift({
        value: cleanValue,
        label: cleanValue,
        isVerified: true,
      });
    }

    return list;
  }, [value, additionalOptions]);



  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {showLabel && (
        <label
          htmlFor={id}
          className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold flex items-center gap-1 select-none"
        >
          {showIcon && <CalendarDays className="w-3 h-3 text-[#1C1C1C] shrink-0" />}
          <span>{label}</span>
        </label>
      )}

      <div className="relative w-full" title={value || 'Select Iteration Path'}>
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label || 'Select Iteration Path'}
          className="w-full h-9 bg-white border border-[#D1D5DB] focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-mono font-medium text-[#1F2937] rounded-lg pl-3 pr-8 py-1.5 appearance-none outline-none transition-all truncate cursor-pointer disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              title={opt.label}
              className="py-1 font-mono text-xs text-[#1F2937] bg-white"
            >
              {opt.label}
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
