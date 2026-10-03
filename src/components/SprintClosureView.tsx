import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  Download, 
  RefreshCw, 
  Globe2,
  CalendarDays,
  Layers,
  CheckCheck,
  X,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  WorkItemStory, 
  StoryStatus, 
  SprintClosureAuditRecord 
} from '../types';
import { 
  getClosurePreviewApi, 
  executeClosureApi, 
  getClosureHistoryApi, 
  ManagerProfileDTO,
  SprintClosurePreviewDTO
} from '../utils/api';
import { AVAILABLE_SPRINTS } from '../data/mockAdoData';
import { normalize } from '../utils/normalize';

interface SprintClosureViewProps {
  dynamicRegions: { region: string; count: number }[];
  activeManager: ManagerProfileDTO;
  initialIterationPath?: string;
  initialAreaPath?: string;
  initialRegion?: string;
  onClosureCompleted: () => void;
}

export const SprintClosureView: React.FC<SprintClosureViewProps> = ({
  dynamicRegions,
  activeManager,
  initialIterationPath,
  initialAreaPath,
  initialRegion,
  onClosureCompleted,
}) => {
  // Filters: Exact Iteration Path, Region, Area Path (NO Project filter - covers ALL PROJECTS)
  const [selectedSprint, setSelectedSprint] = useState(
    initialIterationPath || 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)'
  );
  const [selectedRegion, setSelectedRegion] = useState(
    initialRegion && initialRegion !== 'All' ? initialRegion : 'All Regions'
  );
  const [selectedAreaPath, setSelectedAreaPath] = useState(
    initialAreaPath || activeManager.areaPath || 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers'
  );

  // Preview state
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<SprintClosurePreviewDTO | null>(null);
  const [selectedStoryIds, setSelectedStoryIds] = useState<number[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showIneligible, setShowIneligible] = useState(false);

  // Confirmation Modal & Execution state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number } | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message: string;
    summary: {
      sprint: string;
      region: string;
      successfulUpdates: number;
      skippedUpdates: number;
      failedUpdates: number;
      totalPoints: number;
      failedItems: { id: number; title: string; reason: string }[];
      auditRecordId: string;
    };
  } | null>(null);

  // Subtabs: Closure Execution vs Audit Trail
  const [activeSubTab, setActiveSubTab] = useState<'closure' | 'history'>('closure');
  const [auditHistory, setAuditHistory] = useState<SprintClosureAuditRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load preview when filters change
  useEffect(() => {
    fetchPreview();
  }, [selectedSprint, selectedRegion, selectedAreaPath]);

  // Load history when tab opens
  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchAuditHistory();
    }
  }, [activeSubTab]);

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    setExecutionResult(null);

    try {
      const data = await getClosurePreviewApi({
        sprint: selectedSprint,
        iterationPath: selectedSprint,
        areaPath: selectedAreaPath,
        region: selectedRegion === 'All Regions' ? 'All' : selectedRegion,
        actionType: 'close_internal_review',
      });
      setPreviewData(data);
      // Select all eligible stories by default
      setSelectedStoryIds(data.stories.map((s) => s.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewError(msg);
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const fetchAuditHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getClosureHistoryApi();
      setAuditHistory(res.history || []);
    } catch (err) {
      console.error('Failed to fetch closure history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleSelectStory = (id: number) => {
    setSelectedStoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!previewData) return;
    if (selectedStoryIds.length === previewData.stories.length) {
      setSelectedStoryIds([]);
    } else {
      setSelectedStoryIds(previewData.stories.map((s) => s.id));
    }
  };

  // Bulk update execution with batches (Section 15, 16, 17, 18)
  const handleExecuteBulkClosure = async () => {
    if (!previewData || selectedStoryIds.length === 0) return;
    setIsExecuting(true);
    setIsConfirmModalOpen(false);

    const total = selectedStoryIds.length;
    setExecutionProgress({ current: 0, total });

    const interval = setInterval(() => {
      setExecutionProgress((prev) => {
        if (!prev) return { current: 1, total };
        const next = Math.min(prev.current + Math.ceil(total / 4), total);
        return { current: next, total };
      });
    }, 200);

    try {
      const res = await executeClosureApi({
        sprint: selectedSprint,
        iterationPath: selectedSprint,
        areaPath: selectedAreaPath,
        region: selectedRegion === 'All Regions' ? 'All' : selectedRegion,
        actionType: 'close_internal_review',
        storyIds: selectedStoryIds,
      });

      clearInterval(interval);
      setExecutionProgress({ current: total, total });
      setExecutionResult(res);
      onClosureCompleted();
      await fetchPreview();
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewError(`Closure execution failed: ${msg}`);
    } finally {
      setIsExecuting(false);
      setExecutionProgress(null);
    }
  };

  // Export Preview
  const handleExportPreview = () => {
    if (!previewData || previewData.stories.length === 0) return;
    const rows = previewData.stories.map((s) => ({
      'Story ID': s.id,
      'Story Title': s.title,
      'Resource': s.assignedTo,
      'Region': s.region,
      'Project / Tag': s.tag || s.project || '—',
      'Current State': s.status,
      'Target State': 'Closed',
      'Story Points': s.storyPoints || 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Closure Preview');
    XLSX.writeFile(workbook, `Sprint-Closure-Preview-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
      
      {/* Top Banner Card */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-[#1C1C1C]" />
            <h2 className="text-lg font-bold text-[#1F2937] tracking-tight font-sans">
              Sprint Closure
            </h2>
            <span className="text-xs font-mono font-bold bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A] px-2 py-0.5 rounded">
              Rule: Internal Review → Closed
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Review and close eligible User Stories for a completed sprint and region across <strong>ALL PROJECTS / ALL TAGS</strong>.
          </p>
        </div>

        {/* View Switcher: Closure Execution vs Audit Trail */}
        <div className="flex items-center gap-2">
          <div className="bg-[#F5F6F7] p-1 rounded border border-[#E5E7EB] flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('closure')}
              className={`px-3 py-1.5 font-bold rounded-sm transition-all cursor-pointer ${
                activeSubTab === 'closure'
                  ? 'bg-white text-[#1C1C1C] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Closure Execution
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 font-bold rounded-sm transition-all cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-white text-[#1C1C1C] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Audit Trail
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'closure' ? (
        <>
          {/* 1. FILTER CONTROLS (Dedicated Query: Exact Iteration Path, Region, Area Path - NO Project filter) */}
          <div className="bg-white border border-[#E5E7EB] rounded p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Sprint / Iteration Path Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
                  Sprint / Iteration Path
                </label>
                <input
                  type="text"
                  list="closure-sprint-list"
                  value={selectedSprint}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                  placeholder="Enter exact Iteration Path"
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
                />
                <datalist id="closure-sprint-list">
                  <option value="Cat Digital\2026\Sprint 20 (Sep 30 - Oct 13)" />
                  <option value="Cat Digital\2026\Sprint 19 (Sep 16 - Sep 29)" />
                  {AVAILABLE_SPRINTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Region Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
                  Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-semibold focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none cursor-pointer transition-all"
                >
                  <option value="All Regions">🌎 All Regions</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="Europe">🇪🇺 Europe</option>
                  <option value="USA">🇺🇸 USA</option>
                </select>
              </div>

              {/* Area Path Input */}
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
                  Area Path
                </label>
                <input
                  type="text"
                  list="closure-area-list"
                  value={selectedAreaPath}
                  onChange={(e) => setSelectedAreaPath(e.target.value)}
                  placeholder="Enter Area Path"
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
                />
                <datalist id="closure-area-list">
                  <option value="Cat Digital\Platform\System-Integration Testing\P - SIT Energizers" />
                  <option value="CAT Digital" />
                  <option value="SIT" />
                  <option value="SIT\India" />
                </datalist>
              </div>

            </div>

            {/* Scope Indicator & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F1F3F5]">
              <span className="text-xs text-[#6B7280] font-mono">
                Scope: <strong>{selectedSprint}</strong> · <strong>{selectedRegion}</strong> · <strong>ALL PROJECTS</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="h-9 px-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#4B5563] text-xs font-mono font-semibold rounded border border-[#E5E7EB] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>{showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchPreview}
                  disabled={isLoadingPreview}
                  className="h-9 px-4 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                  <span>{isLoadingPreview ? 'Querying Azure DevOps...' : 'Preview Closure'}</span>
                </button>

                {previewData && previewData.stories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportPreview}
                    className="h-9 px-3 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Preview</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SPRINT CLOSURE DIAGNOSTICS (Sections 10 & 11) */}
          {showDiagnostics && previewData && previewData.diagnostics && (
            <div className="bg-[#1C1C1C] text-white border border-neutral-800 rounded p-4 shadow-sm flex flex-col gap-3 font-mono text-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-neutral-700 pb-2">
                <span className="font-bold text-[#FFCC00] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#FFCC00]" />
                  <span>SPRINT CLOSURE DIAGNOSTICS</span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  Data Source: <strong>{previewData.dataSource.toUpperCase()}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">Organization</span>
                  <span className="font-bold text-white">{previewData.diagnostics.organization}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">Project</span>
                  <span className="font-bold text-white">{previewData.diagnostics.project}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">Work Item Type</span>
                  <span className="font-bold text-white">{previewData.diagnostics.workItemType}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase">Project Filter</span>
                  <span className="font-bold text-[#FFCC00]">{previewData.diagnostics.projectFilter}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-neutral-400 block text-[10px] uppercase">Area Path</span>
                  <span className="font-bold text-white truncate block" title={previewData.diagnostics.areaPath}>
                    {previewData.diagnostics.areaPath}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-neutral-400 block text-[10px] uppercase">Iteration Path</span>
                  <span className="font-bold text-white truncate block" title={previewData.diagnostics.iterationPath}>
                    {previewData.diagnostics.iterationPath}
                  </span>
                </div>
              </div>

              {/* Counts Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-neutral-800 text-[11px]">
                <div className="bg-neutral-800/80 p-2 rounded">
                  <span className="text-neutral-400 block text-[10px]">WIQL Results</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.wiqlResults}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded">
                  <span className="text-neutral-400 block text-[10px]">Internal Review</span>
                  <span className="text-base font-bold text-[#FFCC00]">{previewData.diagnostics.internalReviewCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded">
                  <span className="text-neutral-400 block text-[10px]">RM Matched</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.resourceMasterMatchedCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded">
                  <span className="text-neutral-400 block text-[10px]">Region Filtered</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.regionFilteredCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded border border-[#FFCC00]/50">
                  <span className="text-neutral-400 block text-[10px]">Eligible for Closure</span>
                  <span className="text-base font-bold text-emerald-400">{previewData.diagnostics.eligibleCount}</span>
                </div>
              </div>

              {/* Filter Isolation Debugging (Section 11) */}
              {previewData.diagnostics.filterIsolation && (
                <div className="pt-2 border-t border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1.5">
                    Filter Isolation Debugging (Query Stage Counts):
                  </span>
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                      Stage A (Project + User Story): <strong>{previewData.diagnostics.filterIsolation.stageA_ProjectUserStory}</strong>
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                      Stage B (+ Iteration Path): <strong>{previewData.diagnostics.filterIsolation.stageB_IterationPath}</strong>
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                      Stage C (+ Area Path): <strong>{previewData.diagnostics.filterIsolation.stageC_AreaPath}</strong>
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                      Stage D (Both Paths): <strong>{previewData.diagnostics.filterIsolation.stageD_BothPaths}</strong>
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700 text-[#FFCC00]">
                      Stage E (State = Internal Review): <strong>{previewData.diagnostics.filterIsolation.stageE_InternalReview}</strong>
                    </span>
                    <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700 text-emerald-400">
                      Stage F (RM Matched): <strong>{previewData.diagnostics.filterIsolation.stageF_ResourceMasterMatched}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Banner: Distinct Azure DevOps Connection Error (Section 19 & 20) */}
          {previewError && (
            <div className="p-4 bg-red-50 border border-red-300 rounded text-red-900 text-xs font-mono flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-sm block mb-1">Azure DevOps Query Failed</span>
                <p>{previewError}</p>
                <button
                  type="button"
                  onClick={fetchPreview}
                  className="mt-2 px-3 py-1 bg-red-600 text-white font-bold text-xs rounded hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Retry Query
                </button>
              </div>
            </div>
          )}

          {/* Execution Progress Bar */}
          {isExecuting && executionProgress && (
            <div className="bg-white border-2 border-[#FFCC00] p-4 rounded shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#1F2937] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#1C1C1C]" />
                  <span>Closing Internal Review stories in Azure DevOps...</span>
                </span>
                <span className="font-bold text-[#1F2937]">
                  {executionProgress.current} / {executionProgress.total} processed
                </span>
              </div>
              <div className="w-full bg-[#F5F6F7] h-2.5 rounded-full overflow-hidden border border-[#E5E7EB]">
                <div 
                  className="bg-[#FFCC00] h-full transition-all duration-300"
                  style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Execution Results Summary Banner */}
          {executionResult && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded text-xs font-mono text-emerald-900 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Sprint Closure Execution Completed</span>
                </div>
                <span className="text-[11px] text-[#6B7280]">
                  Audit ID: {executionResult.summary.auditRecordId}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 pt-1 text-xs">
                <span>Total Processed: <strong>{executionResult.summary.successfulUpdates + executionResult.summary.failedUpdates + executionResult.summary.skippedUpdates}</strong></span>
                <span className="text-emerald-700 font-bold">Closed Successfully: {executionResult.summary.successfulUpdates}</span>
                {executionResult.summary.failedUpdates > 0 && (
                  <span className="text-red-600 font-bold">Failed: {executionResult.summary.failedUpdates}</span>
                )}
                <span>Total Points Closed: <strong>{executionResult.summary.totalPoints}</strong></span>
              </div>

              {executionResult.summary.failedItems && executionResult.summary.failedItems.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-[11px]">
                  <span className="font-bold block mb-1">Failed Items:</span>
                  {executionResult.summary.failedItems.map((item) => (
                    <div key={item.id}>Story #{item.id}: {item.title} — {item.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. CLOSURE PREVIEW KPI METRICS (Affected Resources, Affected Stories, Total Points) */}
          {previewData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#1C1C1C] p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
                  Affected Resources
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                    {previewData.affectedResourcesCount}
                  </span>
                  <span className="text-xs text-[#6B7280]">engineers with items</span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#FFCC00] p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
                  Affected Stories
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                    {previewData.affectedStoriesCount}
                  </span>
                  <span className="text-xs text-amber-800 font-semibold">in Internal Review</span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#3B82F6] p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
                  Total Story Points
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                    {previewData.totalStoryPoints}
                  </span>
                  <span className="text-xs text-[#6B7280]">points to close</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. CLOSURE TABLE (Story ID, Story Title, Resource, Project/Tag, Current Status, Story Points) */}
          <div className="bg-white border border-[#E5E7EB] rounded shadow-sm overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-[#F1F3F5] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1F2937] font-mono uppercase">
                  Actionable Stories Ready For Closure ({previewData?.stories.length || 0})
                </span>
                {previewData && previewData.stories.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-[#4B5563] hover:text-[#1F2937] font-mono underline cursor-pointer"
                  >
                    {selectedStoryIds.length === previewData.stories.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {previewData && previewData.stories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isExecuting || selectedStoryIds.length === 0}
                  className="h-8 px-4 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Execute Closure ({selectedStoryIds.length})</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
                    <th className="py-2.5 px-3.5 font-bold w-12 text-center">
                      <input
                        type="checkbox"
                        checked={previewData ? selectedStoryIds.length === previewData.stories.length && previewData.stories.length > 0 : false}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3.5 font-bold w-20">Story ID</th>
                    <th className="py-2.5 px-3.5 font-bold min-w-[260px]">Story Title</th>
                    <th className="py-2.5 px-3.5 font-bold">Resource</th>
                    <th className="py-2.5 px-3.5 font-bold">Region</th>
                    <th className="py-2.5 px-3.5 font-bold">Project / Tag</th>
                    <th className="py-2.5 px-3.5 font-bold">Current Status</th>
                    <th className="py-2.5 px-3.5 font-bold text-right w-24">Story Points</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F1F3F5] font-sans">
                  {isLoadingPreview ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6B7280] font-mono">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#FFCC00]" />
                        <span>Querying Azure DevOps Backlog...</span>
                      </td>
                    </tr>
                  ) : !previewData || previewData.stories.length === 0 ? (
                    /* Clear distinction between 0 query results vs 0 Internal Review (Section 20) */
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6B7280] font-mono px-4">
                        {previewData?.diagnostics?.wiqlResults === 0 ? (
                          <div className="max-w-md mx-auto flex flex-col items-center gap-1.5">
                            <span className="font-bold text-[#1F2937] text-sm">No Matching User Stories Found</span>
                            <span className="text-xs text-[#6B7280]">
                              No User Stories were found in Azure DevOps matching Area Path and Iteration Path.
                            </span>
                          </div>
                        ) : (
                          <div className="max-w-md mx-auto flex flex-col items-center gap-1.5">
                            <span className="font-bold text-[#1F2937] text-sm">No Internal Review Stories Eligible for Closure</span>
                            <span className="text-xs text-[#6B7280]">
                              Found {previewData?.diagnostics?.wiqlResults || previewData?.allRetrievedStories?.length || 0} User Stories in this scope, but 0 are currently in "Internal Review" state.
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    previewData.stories.map((story) => {
                      const isChecked = selectedStoryIds.includes(story.id);
                      return (
                        <tr 
                          key={story.id} 
                          onClick={() => toggleSelectStory(story.id)}
                          className={`hover:bg-[#F9FAFB] transition-colors cursor-pointer ${
                            isChecked ? 'bg-[#FFFBEB]/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectStory(story.id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-[#1C1C1C]">
                            #{story.id}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-[#1F2937]">
                            {story.title}
                          </td>
                          <td className="py-2.5 px-3.5 text-[#374151]">
                            {story.assignedTo || 'Unassigned'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#6B7280]">
                            {story.region || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#6B7280]">
                            {story.tag || story.project || '—'}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                              {story.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#1F2937]">
                            {story.storyPoints ?? 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ineligible Stories Section (Collapsible) */}
          {previewData && previewData.ineligibleStories && previewData.ineligibleStories.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded shadow-sm overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setShowIneligible(!showIneligible)}
                className="p-3.5 bg-[#FAFAFA] border-b border-[#F1F3F5] flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#6B7280]" />
                  <span className="font-bold text-[#4B5563] font-mono uppercase">
                    Other Sprint Stories (Ineligible for Closure: {previewData.ineligibleStories.length})
                  </span>
                </div>
                {showIneligible ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
              </button>

              {showIneligible && (
                <div className="overflow-x-auto divide-y divide-[#F1F3F5] p-2 text-xs">
                  {previewData.ineligibleStories.map((story) => (
                    <div key={story.id} className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1C1C1C]">#{story.id}</span>
                        <span className="font-semibold text-[#374151]">{story.title}</span>
                        <span className="text-[#6B7280]">({story.assignedTo})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {story.status}
                        </span>
                        <span className="text-[11px] text-[#6B7280] font-mono italic">
                          {story.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. CONFIRMATION MODAL (Section 15 & 16: Strict Revalidation) */}
          {isConfirmModalOpen && previewData && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-xs font-sans">
                
                {/* Header */}
                <div className="bg-[#1C1C1C] text-white p-4 flex items-center justify-between border-b-2 border-[#FFCC00]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#FFCC00]" />
                    <h3 className="text-sm font-bold uppercase tracking-tight text-white">
                      Confirm Sprint Closure
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 text-[#374151]">
                  <p className="font-semibold text-[#1F2937]">
                    Are you sure you want to execute closure for <strong>{selectedStoryIds.length}</strong> User Stories?
                  </p>

                  <div className="bg-[#FEF9C3]/50 border border-[#FEF08A] p-3 rounded text-[11px] font-mono text-[#854D0E] space-y-1">
                    <div>• Action: <strong>Internal Review → Closed</strong></div>
                    <div>• Scope: <strong>{selectedSprint}</strong> ({selectedRegion})</div>
                    <div>• Area Path: <strong>{selectedAreaPath}</strong></div>
                    <div>• Project Scope: <strong>ALL PROJECTS / ALL TAGS</strong></div>
                    <div>• Stories will be re-validated in Azure DevOps prior to execution.</div>
                  </div>

                  <p className="text-[11px] text-[#6B7280]">
                    Only stories currently in 'Internal Review' will be transitioned. This action will be permanently recorded in the SIT Nexus Audit Trail.
                  </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="px-4 py-2 border border-[#D1D5DB] rounded text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkClosure}
                    disabled={isExecuting}
                    className="px-4 py-2 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Close ({selectedStoryIds.length})</span>
                  </button>
                </div>

              </div>
            </div>
          )}
        </>
      ) : (
        /* AUDIT TRAIL HISTORICAL LEDGER (Section 18) */
        <div className="bg-white border border-[#E5E7EB] rounded shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#F1F3F5] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1F2937]">Closure Audit Trail</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Historical ledger of all sprint closure transitions executed via SIT Nexus.</p>
            </div>
            <button
              type="button"
              onClick={fetchAuditHistory}
              disabled={isLoadingHistory}
              className="h-8 px-3 border border-[#D1D5DB] rounded text-xs font-semibold text-[#4B5563] hover:bg-[#F9FAFB] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
                  <th className="py-2.5 px-3.5 font-bold">Audit ID</th>
                  <th className="py-2.5 px-3.5 font-bold">Executed By</th>
                  <th className="py-2.5 px-3.5 font-bold">Date & Time</th>
                  <th className="py-2.5 px-3.5 font-bold">Sprint / Scope</th>
                  <th className="py-2.5 px-3.5 font-bold">Region</th>
                  <th className="py-2.5 px-3.5 font-bold text-right">Successful</th>
                  <th className="py-2.5 px-3.5 font-bold text-right">Failed</th>
                  <th className="py-2.5 px-3.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] font-sans">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#6B7280] font-mono">
                      Loading audit records...
                    </td>
                  </tr>
                ) : auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#6B7280] font-mono">
                      No closure operations recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-[#1C1C1C]">
                        {rec.id}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-[#1F2937]">
                        {rec.managerName}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#6B7280] font-mono text-[11px]">
                        {rec.date} {rec.time}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#374151]">
                        {rec.sprint}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#374151]">
                        {rec.region}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700">
                        {rec.successfulUpdates}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-red-600">
                        {rec.failedUpdates}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          rec.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.status === 'PARTIAL_SUCCESS'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {rec.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default SprintClosureView;
