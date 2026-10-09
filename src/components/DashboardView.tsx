import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Layers, 
  Table as TableIcon, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Download, 
  CheckCircle2, 
  Clock, 
  Hash, 
  AlertTriangle,
  FolderGit2,
  CalendarDays,
  Globe2,
  X,
  ExternalLink,
  RotateCcw,
  Terminal,
  Activity,
  Copy,
  Check,
  Users
} from 'lucide-react';
import { 
  WorkItemStory, 
  ResourceGroup, 
  FilterState, 
  StoryStatus 
} from '../types';
import { AVAILABLE_SPRINTS } from '../data/mockAdoData';
import { normalize } from '../utils/normalize';
import { RegionFlag } from './RegionFlag';

interface DashboardViewProps {
  filter: FilterState;
  onChangeFilter: (updates: Partial<FilterState>) => void;
  onRunQuery: () => void;
  isQuerying: boolean;
  dynamicRegions: { region: string; count: number }[];
  totalMasterCount: number;
  availableProjects: string[];
  availableAreaPaths?: string[];
  warnings?: string[];
  resources: ResourceGroup[];
  stories: WorkItemStory[];
  summary: {
    totalResources: number;
    totalStories: number;
    totalStoryPoints: number;
  };
  reviewedCount?: number;
  onResetDailyReview?: () => void;
  onSelectStory: (story: WorkItemStory) => void;
  onUpdateStatus: (storyId: number, newStatus: StoryStatus) => void;
  onToggleReviewed: (resourceName: string) => void;
  onOpenStandupRunner: () => void;
  onExportCsv: () => void;
  diagnostics?: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  filter,
  onChangeFilter,
  onRunQuery,
  isQuerying,
  dynamicRegions,
  totalMasterCount,
  availableProjects,
  availableAreaPaths = ['CAT Digital', 'SIT', 'SIT\\India', 'SIT\\Europe', 'SIT\\USA'],
  warnings = [],
  resources,
  stories,
  summary,
  reviewedCount = 0,
  onResetDailyReview,
  onSelectStory,
  onUpdateStatus,
  onToggleReviewed,
  onOpenStandupRunner,
  onExportCsv,
  diagnostics,
}) => {
  const [viewMode, setViewMode] = useState<'resource' | 'table'>('resource');
  const [collapsedResources, setCollapsedResources] = useState<Record<string, boolean>>({});
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedWiql, setCopiedWiql] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Reset notice dismissal whenever a new query is executed or warnings change
  useEffect(() => {
    if (isQuerying) {
      setIsNoticeDismissed(false);
    }
  }, [isQuerying]);

  useEffect(() => {
    setIsNoticeDismissed(false);
  }, [warnings]);

  // Toggle collapse state for a resource card
  const toggleCollapse = (name: string) => {
    setCollapsedResources((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Professional subtle badge styling as specified in UI/UX Design System
  const renderStatusBadge = (status: StoryStatus) => {
    let classes = 'bg-gray-100 text-gray-700 border-gray-200';
    if (status === 'Active') {
      classes = 'bg-red-50 text-red-700 border-red-200';
    } else if (status === 'New') {
      classes = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (status === 'Internal Review') {
      classes = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (status === 'Resolved') {
      classes = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (status === 'Closed') {
      classes = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (status === 'Blocked') {
      classes = 'bg-red-100 text-red-800 border-red-300 font-bold';
    }

    return (
      <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${classes}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
      
      {/* ------------------------------------------------ */}
      {/* 1. QUERY CONTROL BAR                             */}
      {/* ------------------------------------------------ */}
      <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-4">
        
        {/* Step 1: Region Prominent Selector (4 compact cards) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937]">
            <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#6B7280]">
              <Globe2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
              <span>Step 1: Region Selection</span>
            </span>
            <span className="text-[11px] text-[#6B7280]">
              Current Scope: <strong>{filter.region}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {dynamicRegions.map(({ region, count }) => {
              const isSelected = normalize(filter.region) === normalize(region);
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => onChangeFilter({ region })}
                  className={`p-3 rounded-[10px] text-left transition-all border flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs'
                      : 'bg-white hover:bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1F2937] flex items-center gap-1.5">
                      <RegionFlag region={region} size={18} />
                      <span>{region}</span>
                    </span>
                    <span className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                      {count} Resources
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#CA8A04]" />
                  )}
                </button>
              );
            })}

            {/* All Card */}
            <button
              type="button"
              onClick={() => onChangeFilter({ region: 'All' })}
              className={`p-3 rounded-[10px] text-left transition-all border flex items-center justify-between cursor-pointer ${
                normalize(filter.region) === 'all'
                  ? 'bg-[#FEF9C3]/50 border-[#FFCD11] shadow-xs'
                  : 'bg-white hover:bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F2937] flex items-center gap-1.5">
                  <RegionFlag region="All" size={18} />
                  <span>All</span>
                </span>
                <span className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                  {totalMasterCount} Resources
                </span>
              </div>

              {normalize(filter.region) === 'all' && (
                <span className="w-2 h-2 rounded-full bg-[#CA8A04]" />
              )}
            </button>
          </div>
        </div>

        {/* Step 2, 3 & 4: Iteration Path, Area Path & Project Selectors + RUN QUERY Button */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#F1F3F5] items-end">
          
          {/* AREA PATH Manual Text Input (Section 3) */}
          <div className="sm:col-span-4 flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#1C1C1C]" />
              <span>AREA PATH</span>
            </label>
            <input
              type="text"
              value={filter.areaPath || ''}
              onChange={(e) => onChangeFilter({ areaPath: e.target.value })}
              placeholder="Enter Azure DevOps Area Path"
              className="w-full h-9 bg-white border border-[#D1D5DB] focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-mono font-medium text-[#1F2937] placeholder:text-[#9CA3AF] rounded-lg px-3 py-1.5 outline-none transition-all"
            />
          </div>

          {/* ITERATION PATH Manual Text Input (Sections 4 & 5) */}
          <div className="sm:col-span-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-[#1C1C1C]" />
                <span>ITERATION PATH</span>
              </label>
            </div>
            <input
              type="text"
              value={filter.iterationPath || ''}
              onChange={(e) => onChangeFilter({ iterationPath: e.target.value, sprint: e.target.value })}
              placeholder="Enter Azure DevOps Iteration Path"
              className="w-full h-9 bg-white border border-[#D1D5DB] focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-mono font-medium text-[#1F2937] placeholder:text-[#9CA3AF] rounded-lg px-3 py-1.5 outline-none transition-all"
            />
          </div>

          {/* Project Dropdown (Azure DevOps Tag) */}
          <div className="sm:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold flex items-center gap-1">
              <FolderGit2 className="w-3 h-3 text-[#1C1C1C]" />
              <span>PROJECT</span>
            </label>
            <div className="relative">
              <select
                value={filter.project}
                onChange={(e) => onChangeFilter({ project: e.target.value })}
                className="w-full h-9 bg-white border border-[#D1D5DB] focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] text-xs font-semibold text-[#1F2937] rounded-lg px-3 py-1.5 appearance-none outline-none cursor-pointer transition-all"
              >
                <option value="All Projects">All Projects ({availableProjects.length} Tags)</option>
                {availableProjects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#6B7280]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* RUN QUERY Action Button */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={onRunQuery}
              disabled={isQuerying}
              className="w-full h-9 bg-[#FFCC00] hover:bg-[#F2C200] active:bg-[#E5B800] text-[#1C1C1C] font-black uppercase text-xs tracking-wider rounded-lg transition-all duration-150 shadow-xs hover:shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
              <span>{isQuerying ? 'FETCHING...' : 'RUN QUERY'}</span>
            </button>
          </div>

        </div>

        {/* Identity Warnings Banner (Section 13 & 31) */}
        {!isNoticeDismissed && warnings && warnings.length > 0 && (
          <div 
            className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-[10px] flex items-start justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in"
            role="alert"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 pr-2">
                <span className="font-bold block">Identity Mapping Notice:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-amber-800">
                  {warnings.map((w, idx) => (
                    <li key={idx} className="break-words">{w}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNoticeDismissed(true)}
              className="text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 active:bg-amber-200 p-1 rounded-md transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              aria-label="Dismiss identity mapping notice"
              title="Dismiss identity mapping notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </section>

      {/* ------------------------------------------------ */}
      {/* 2. SUMMARY (Exactly 3 compact cards as specified)*/}
      {/* ------------------------------------------------ */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Card 1: Resources */}
        <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#1C1C1C] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
            Resources
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-[#1C1C1C] font-mono tracking-tight">
              {summary.totalResources}
            </span>
            <span className="text-xs text-[#6B7280]">engineers active</span>
          </div>
        </div>

        {/* Card 2: Stories */}
        <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#FFCC00] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
            Stories
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-[#1C1C1C] font-mono tracking-tight">
              {summary.totalStories}
            </span>
            <span className="text-xs text-[#6B7280]">Azure DevOps items</span>
          </div>
        </div>

        {/* Card 3: Story Points */}
        <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#3B82F6] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
            Story Points
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-[#1C1C1C] font-mono tracking-tight">
              {summary.totalStoryPoints}
            </span>
            <span className="text-xs text-[#6B7280]">points capacity</span>
          </div>
        </div>

      </section>

      {/* Standup Daily Clearance Progress Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[#6B7280] uppercase text-[11px] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
            <span>Standup Review ({filter.region}):</span>
          </span>
          <div className="w-36 sm:w-48 bg-[#F5F6F7] rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
            <div 
              className="bg-[#FFCC00] h-full transition-all duration-300"
              style={{ 
                width: `${summary.totalResources > 0 ? (reviewedCount / summary.totalResources) * 100 : 0}%` 
              }}
            />
          </div>
          <span className="font-mono font-bold text-[#1F2937]">
            {reviewedCount} / {summary.totalResources} reviewed
          </span>
        </div>

        {onResetDailyReview && (
          <button
            type="button"
            onClick={onResetDailyReview}
            className="text-[11px] font-mono text-[#6B7280] hover:text-[#1F2937] flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset review checkmarks for tomorrow"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Checks</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------ */}
      {/* 3. SEARCH & VIEW CONTROLS                        */}
      {/* ------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#E5E7EB] p-2.5 rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        
        {/* Search Field (Section 9) */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search resource, story title or ID..."
            value={filter.searchQuery}
            onChange={(e) => onChangeFilter({ searchQuery: e.target.value })}
            className="w-full h-9 pl-8 pr-7 bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#1F2937] placeholder:text-[#9CA3AF] rounded-lg focus:bg-white focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-colors font-mono"
          />
          {filter.searchQuery && (
            <button
              type="button"
              onClick={() => onChangeFilter({ searchQuery: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          
          {/* Standup Runner Facilitator - Primary CAT Yellow Action */}
          <button
            type="button"
            onClick={onOpenStandupRunner}
            className="h-9 px-3.5 bg-[#FFCD11] hover:bg-[#F2C200] active:bg-[#E5B800] text-[#1C1C1C] text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#1C1C1C] text-[#1C1C1C]" />
            <span>Standup Facilitator</span>
          </button>

          {/* Diagnostics Toggle - Secondary Control */}
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showDiagnostics
                ? 'bg-[#FEF9C3] text-[#854D0E] border-[#FFCD11] font-bold'
                : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
            }`}
            title="Toggle Query Diagnostics & Filter Isolation"
          >
            <Activity className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Diagnostics</span>
          </button>

          {/* View Mode Toggle */}
          <div className="h-9 flex items-center bg-[#F5F6F7] border border-[#E5E7EB] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('resource')}
              className={`h-7.5 flex items-center gap-1 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'resource'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Resource View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-7.5 flex items-center gap-1 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={onExportCsv}
            className="h-9 px-3 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-lg text-xs font-semibold text-[#4B5563] hover:text-[#1F2937] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export Backlog to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

        </div>

      </div>

      {/* ------------------------------------------------ */}
      {/* QUERY DIAGNOSTICS & FILTER ISOLATION (Sec 16, 17)*/}
      {/* ------------------------------------------------ */}
      {(showDiagnostics || (resources.length === 0 && diagnostics)) && diagnostics && (
        <section className="bg-white border-2 border-[#1C1C1C] rounded-[14px] p-4 sm:p-5 shadow-sm text-xs font-mono animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#1C1C1C]" />
              <span className="font-bold text-sm tracking-tight text-[#111827] uppercase">
                Query Diagnostics & Execution Telemetry
              </span>
            </div>
            {diagnostics.generatedWiql && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(diagnostics.generatedWiql);
                  setCopiedWiql(true);
                  setTimeout(() => setCopiedWiql(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-[11px] font-semibold cursor-pointer"
              >
                {copiedWiql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWiql ? 'Copied WIQL' : 'Copy WIQL'}</span>
              </button>
            )}
          </div>

          {/* Grid of Section 16 Query Diagnostics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F9FAFB] p-3 rounded-[10px] border border-[#E5E7EB] mb-3">
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Organization</span>
              <span className="text-[#111827] font-semibold">{diagnostics.organization || 'cat-digital'}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Project</span>
              <span className="text-[#111827] font-semibold">{diagnostics.project || 'Cat Digital'}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Work Item Type</span>
              <span className="text-[#111827] font-semibold">{diagnostics.workItemType || 'User Story'}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Selected Region</span>
              <span className="text-[#111827] font-semibold">{diagnostics.region}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Area Path</span>
              <span className="text-[#111827] font-semibold truncate block" title={diagnostics.areaPath}>
                {diagnostics.areaPath || '(None)'}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Iteration Path</span>
              <span className="text-[#111827] font-semibold truncate block" title={diagnostics.iterationPath}>
                {diagnostics.iterationPath || '(None)'}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Project Filter</span>
              <span className="text-[#111827] font-semibold">{filter.project || diagnostics.projectTag || 'All Projects'}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Resource Master</span>
              <span className="text-[#111827] font-semibold">{diagnostics.resourceMasterCount}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">WIQL Candidate IDs</span>
              <span className="text-[#111827] font-semibold">{diagnostics.returnedWorkItemIdsCount}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Final Stories Returned</span>
              <span className="text-[#111827] font-semibold">{diagnostics.finalStoryCount}</span>
            </div>
          </div>

          {/* Section 17 Filter Isolation Debugging results */}
          {diagnostics.filterIsolation && (
            <div className="border border-[#E5E7EB] rounded-[10px] p-3 bg-white">
              <div className="font-bold text-[#111827] mb-2 flex items-center gap-1.5 text-xs">
                <span>Filter Isolation Debugging Sequence (Section 17):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                <div className="p-2 bg-[#F3F4F6] rounded-lg">
                  <span className="block text-[#6B7280] font-bold">TEST A</span>
                  <span className="text-[10px] text-[#4B5563] block">Project + User Story</span>
                  <span className="text-sm font-bold text-[#111827]">{diagnostics.filterIsolation.testA} items</span>
                </div>
                <div className="p-2 bg-[#F3F4F6] rounded-lg">
                  <span className="block text-[#6B7280] font-bold">TEST B</span>
                  <span className="text-[10px] text-[#4B5563] block">+ Iteration Path</span>
                  <span className="text-sm font-bold text-[#111827]">{diagnostics.filterIsolation.testB} items</span>
                </div>
                <div className="p-2 bg-[#F3F4F6] rounded-lg">
                  <span className="block text-[#6B7280] font-bold">TEST C</span>
                  <span className="text-[10px] text-[#4B5563] block">+ Area Path</span>
                  <span className="text-sm font-bold text-[#111827]">{diagnostics.filterIsolation.testC} items</span>
                  {diagnostics.filterIsolation.testCUnder !== undefined && diagnostics.filterIsolation.testCUnder > 0 && (
                    <span className="text-[9px] text-[#2563EB] block">({diagnostics.filterIsolation.testCUnder} under)</span>
                  )}
                </div>
                <div className="p-2 bg-[#F3F4F6] rounded-lg">
                  <span className="block text-[#6B7280] font-bold">TEST D</span>
                  <span className="text-[10px] text-[#4B5563] block">Area + Iteration</span>
                  <span className="text-sm font-bold text-[#111827]">{diagnostics.filterIsolation.testD} items</span>
                  {diagnostics.filterIsolation.testDUnder !== undefined && diagnostics.filterIsolation.testDUnder > 0 && (
                    <span className="text-[9px] text-[#2563EB] block">({diagnostics.filterIsolation.testDUnder} under)</span>
                  )}
                </div>
                <div className="p-2 bg-[#F3F4F6] rounded-lg">
                  <span className="block text-[#6B7280] font-bold">TEST E</span>
                  <span className="text-[10px] text-[#4B5563] block">+ Project Tag</span>
                  <span className="text-sm font-bold text-[#111827]">{diagnostics.filterIsolation.testE ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {diagnostics.notes && (
            <div className="mt-2 text-[11px] text-[#047857] bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              💡 {diagnostics.notes}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ */}
      {/* 4. RESULT VIEW: RESOURCE VIEW OR TABLE VIEW      */}
      {/* ------------------------------------------------ */}
      {isQuerying ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FFCC00] mx-auto mb-2" />
          <p className="text-xs text-[#6B7280] font-mono">Fetching stories...</p>
        </div>
      ) : resources.length === 0 ? (
        /* Professional Empty State (Prompt Section 3) */
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center shadow-xs flex flex-col items-center max-w-lg mx-auto my-6">
          <div className="w-11 h-11 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-3 shadow-2xs">
            <Users className="w-5 h-5 text-[#64748B]" />
          </div>
          <h3 className="text-sm font-bold text-[#1E293B]">No resources available</h3>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-sm leading-relaxed">
            Import Resource Master data or run an Azure DevOps query to populate resources.
          </p>
          <button
            type="button"
            onClick={() => onChangeFilter({ region: 'All', project: 'All Projects' })}
            className="mt-4 px-3.5 py-1.5 bg-[#FFCD11] hover:bg-[#F2C200] active:scale-[0.98] text-[#1C1C1C] text-xs font-mono font-bold uppercase rounded-lg transition-all shadow-xs cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'resource' ? (
        /* ============================================== */
        /* COMPACT RESOURCE RESULT VIEW (Primary Standup) */
        /* ============================================== */
        <div className="flex flex-col gap-3">
          {resources.map((res) => {
            const isCollapsed = collapsedResources[res.name] || false;

            return (
              <div
                key={res.name}
                className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all"
              >
                {/* Resource Header */}
                <div 
                  onClick={() => toggleCollapse(res.name)}
                  className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F1F3F5] flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Compact Initial Monogram */}
                    <div className="w-7 h-7 rounded-lg bg-[#FEF9C3] border border-[#FFCD11] text-[#854D0E] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {(res.name || 'UN').slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1F2937]">
                          {res.name}
                        </span>
                        <span className="text-[#9CA3AF]">·</span>
                        <span className="text-xs text-[#6B7280]">
                          {res.region}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header: Story count, total points, expand arrow */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#1F2937] font-mono">
                      {res.stories.length} Stories • {res.totalPoints} Points
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleReviewed(res.name);
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        res.isReviewed 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold' 
                          : 'bg-white border border-[#D1D5DB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB]'
                      }`}
                      title="Toggle reviewed in standup"
                    >
                      {res.isReviewed ? '✓ Reviewed' : 'Mark Done'}
                    </button>

                    <div className="text-[#9CA3AF]">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Compact Story Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#F1F3F5]">
                    {res.stories.map((story) => (
                      <div
                        key={story.id}
                        className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAFAFA] transition-colors"
                      >
                        {/* Title and ID */}
                        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onSelectStory(story)}
                            className="font-mono text-xs font-bold text-[#1C1C1C] hover:underline shrink-0"
                          >
                            #{story.id}
                          </button>

                          <span 
                            onClick={() => onSelectStory(story)}
                            title={story.title}
                            className="text-xs font-semibold text-[#1F2937] hover:text-[#CA8A04] cursor-pointer truncate"
                          >
                            {story.title}
                          </span>

                          {story.tag && (
                            <span className="text-[10px] text-[#4B5563] font-mono bg-[#F3F4F6] px-1.5 py-0.5 rounded-md border border-[#E5E7EB] shrink-0">
                              {story.tag}
                            </span>
                          )}
                        </div>

                        {/* Status badge & Story points */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {/* Status Badge */}
                          <div onClick={() => onSelectStory(story)} className="cursor-pointer">
                            {renderStatusBadge(story.status)}
                          </div>

                          {/* Story Points (secondary text, not huge) */}
                          <span className="text-xs font-mono font-semibold text-[#4B5563] w-12 text-right">
                            {story.storyPoints} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================== */
        /* DETAILED TABLE VIEW (Section 8: Specified Columns) */
        /* ============================================== */
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
                  <th className="py-2.5 px-3.5 font-bold w-20">ID</th>
                  <th className="py-2.5 px-3.5 font-bold min-w-[260px]">Story Title</th>
                  <th className="py-2.5 px-3.5 font-bold">Assigned To</th>
                  <th className="py-2.5 px-3.5 font-bold">Status</th>
                  <th className="py-2.5 px-3.5 font-bold text-right w-24">Story Points</th>
                  {filter.project === 'All Projects' && (
                    <th className="py-2.5 px-3.5 font-bold">Project / Tag</th>
                  )}
                  <th className="py-2.5 px-3.5 font-bold text-right w-28">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] font-sans">
                {stories.map((story) => (
                  <tr 
                    key={story.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#1C1C1C]">
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="hover:underline cursor-pointer"
                      >
                        #{story.id ?? '—'}
                      </button>
                    </td>

                    <td className="py-2.5 px-3.5 text-[#1F2937] font-semibold">
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="text-left hover:text-[#FFCC00] hover:underline cursor-pointer"
                      >
                        {story.title || '—'}
                      </button>
                    </td>

                    <td className="py-2.5 px-3.5 text-[#374151] whitespace-nowrap">
                      {story.assignedTo || 'Unassigned'}
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {story.status ? renderStatusBadge(story.status) : '—'}
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-[#1F2937]">
                      {story.storyPoints ?? '—'}
                    </td>

                    {filter.project === 'All Projects' && (
                      <td className="py-2.5 px-3.5 text-[#6B7280] font-mono text-[11px] whitespace-nowrap">
                        {story.tag || story.project || '—'}
                      </td>
                    )}

                    <td className="py-2.5 px-3.5 text-right text-[#6B7280] font-mono text-[11px] whitespace-nowrap">
                      {story.lastUpdatedDate ? String(story.lastUpdatedDate).split('T')[0].split(' ')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
