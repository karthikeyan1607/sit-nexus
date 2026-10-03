import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Globe2, 
  FolderGit2, 
  CalendarDays, 
  X,
  SlidersHorizontal
} from 'lucide-react';
import { FilterState } from '../types';
import { AVAILABLE_SPRINTS } from '../data/mockAdoData';

interface FilterBarProps {
  filter: FilterState;
  onChangeFilter: (updates: Partial<FilterState>) => void;
  onRunQuery: () => void;
  isQuerying: boolean;
  dynamicRegions: { region: string; count: number }[];
  totalMasterCount: number;
  availableProjects: string[];
  queryStats: {
    lastExecutedTime: string | null;
    durationMs: number;
    count: number;
  };
  onOpenProjectManager?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onChangeFilter,
  onRunQuery,
  isQuerying,
  dynamicRegions,
  totalMasterCount,
  availableProjects,
  queryStats,
  onOpenProjectManager,
}) => {
  return (
    <section className="bg-neutral-900/90 border border-neutral-800 rounded-md p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col gap-4">
        
        {/* Core Steps 1 - 4: Dynamic Region, Project, Sprint, RUN QUERY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          
          {/* Step 1: Dynamic Region Selection with Resource Counts */}
          <div className="lg:col-span-5 flex flex-col gap-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-[#FFCD11]" />
                <span>Step 1: Region</span>
              </span>
              <span className="text-[10px] text-neutral-500 font-normal">
                Generated dynamically from Resource Master
              </span>
            </label>
            
            {/* Dynamic Region Interactive Segmented Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded">
              {/* Individual dynamic regions (India, Europe, USA, etc.) */}
              {dynamicRegions.map(({ region, count }) => {
                const isActive = filter.region === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => onChangeFilter({ region })}
                    className={`py-1.5 px-2 text-center rounded-sm transition-all flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-[#FFCD11] text-neutral-950 shadow font-extrabold'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-850'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {region}
                    </span>
                    <span className={`text-[10px] font-mono leading-none mt-0.5 ${
                      isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                    }`}>
                      {count} Resources
                    </span>
                  </button>
                );
              })}

              {/* All Option with Total Count */}
              <button
                type="button"
                onClick={() => onChangeFilter({ region: 'All' })}
                className={`py-1.5 px-2 text-center rounded-sm transition-all flex flex-col items-center justify-center ${
                  filter.region === 'All'
                    ? 'bg-[#FFCD11] text-neutral-950 shadow font-extrabold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-850'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">
                  All
                </span>
                <span className={`text-[10px] font-mono leading-none mt-0.5 ${
                  filter.region === 'All' ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                }`}>
                  {totalMasterCount} Resources
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Project Selection (Discovered from ADO Tags) */}
          <div className="lg:col-span-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="project-select" 
                className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-[#FFCD11]" />
                <span>Step 2: Project / Tag</span>
              </label>
              {onOpenProjectManager && (
                <button
                  type="button"
                  onClick={onOpenProjectManager}
                  className="text-[10px] font-mono text-neutral-400 hover:text-[#FFCD11] flex items-center gap-0.5 transition-colors"
                  title="Manage visible project tags"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>Manage</span>
                </button>
              )}
            </div>
            
            <div className="relative">
              <select
                id="project-select"
                value={filter.project}
                onChange={(e) => onChangeFilter({ project: e.target.value })}
                className="w-full h-11 bg-neutral-950 border border-neutral-800 focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-semibold text-neutral-100 rounded px-3 py-2 appearance-none transition-colors cursor-pointer outline-none"
              >
                <option value="All Projects" className="bg-neutral-900 text-neutral-100">
                  All Projects ({availableProjects.length} Tags)
                </option>
                {availableProjects.map((project) => (
                  <option key={project} value={project} className="bg-neutral-900 text-neutral-100">
                    {project}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Step 3: Sprint Selection */}
          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <label 
              htmlFor="sprint-select" 
              className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#FFCD11]" />
              <span>Step 3: Sprint</span>
            </label>
            
            <div className="relative">
              <select
                id="sprint-select"
                value={filter.sprint}
                onChange={(e) => onChangeFilter({ sprint: e.target.value })}
                className="w-full h-11 bg-neutral-950 border border-neutral-800 focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-semibold text-neutral-100 rounded px-3 py-2 appearance-none transition-colors cursor-pointer outline-none"
              >
                {AVAILABLE_SPRINTS.map((sprint) => (
                  <option key={sprint} value={sprint} className="bg-neutral-900 text-neutral-100">
                    {sprint} {sprint === 'Sprint 19' ? '★ Active' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Step 4: RUN QUERY Action Button */}
          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold opacity-0 hidden lg:inline">
              Step 4
            </span>
            <button
              type="button"
              onClick={onRunQuery}
              disabled={isQuerying}
              className="h-11 w-full flex items-center justify-center gap-2 bg-[#FFCD11] hover:bg-[#ffe169] active:bg-[#e0b206] text-neutral-950 font-black uppercase tracking-wider text-xs rounded transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isQuerying ? 'animate-spin' : ''}`} />
              <span>{isQuerying ? 'EXECUTING...' : 'RUN QUERY'}</span>
            </button>
          </div>

        </div>

        {/* Secondary Row: Search & Status Filter */}
        <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search resource name, story title, work item #, or project tag..."
              value={filter.searchQuery}
              onChange={(e) => onChangeFilter({ searchQuery: e.target.value })}
              className="w-full h-9 pl-9 pr-8 bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500 rounded focus:outline-none focus:border-[#FFCD11] transition-colors"
            />
            {filter.searchQuery && (
              <button
                type="button"
                onClick={() => onChangeFilter({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Quick Filter & Query Telemetry */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            
            {/* Status selector */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="font-mono text-[11px] uppercase">Status:</span>
              <select
                value={filter.statusFilter}
                onChange={(e) => onChangeFilter({ statusFilter: e.target.value })}
                className="h-8 bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded px-2.5 outline-none focus:border-[#FFCD11] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="New">New</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            {/* Telemetry info */}
            {queryStats.lastExecutedTime && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                <span className="text-neutral-600">|</span>
                <span>WIQL:</span>
                <span className="text-[#FFCD11] font-semibold">{queryStats.count} stories</span>
                <span>({queryStats.durationMs}ms)</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
