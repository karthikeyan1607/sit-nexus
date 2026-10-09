import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp,
  Search,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info
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

export interface AuditStoryRow {
  uniqueKey: string;
  auditId: string;
  storyId: number;
  title: string;
  resource: string;
  region: string;
  projectTag: string;
  sprint: string;
  areaPath: string;
  previousStatus: string;
  requestedStatus: string;
  resultingStatus: string;
  storyPoints: number;
  closureTime: string;
  closureDateRaw: string;
  executedBy: string;
  result: 'Success' | 'Failed' | 'Skipped';
  errorMessage?: string;
}

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
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Audit Trail Search & Filters
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditSprintFilter, setAuditSprintFilter] = useState('All');
  const [auditRegionFilter, setAuditRegionFilter] = useState('All');
  const [auditTagFilter, setAuditTagFilter] = useState('All');
  const [auditResultFilter, setAuditResultFilter] = useState<'All' | 'Success' | 'Failed' | 'Skipped'>('All');
  const [auditDateFilter, setAuditDateFilter] = useState('');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AuditStoryRow | null>(null);
  const auditPageSize = 10;

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
    setHistoryError(null);
    try {
      const res = await getClosureHistoryApi();
      setAuditHistory(res.history || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch closure history:', err);
      setHistoryError(msg);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Flatten batch audit history into individual story-level audit records (Requirement 5.1 & 5.2)
  const flatAuditStories = useMemo<AuditStoryRow[]>(() => {
    const rows: AuditStoryRow[] = [];
    for (const rec of auditHistory) {
      if (rec.details && rec.details.length > 0) {
        for (const d of rec.details) {
          rows.push({
            uniqueKey: d.id || `${rec.id}-${d.story_id}`,
            auditId: rec.id,
            storyId: d.story_id,
            title: d.story_title || `Story #${d.story_id}`,
            resource: d.resource_name || 'Unassigned',
            region: d.region || rec.region || 'All',
            projectTag: d.tag || d.project || '—',
            sprint: d.iteration_path || rec.sprint,
            areaPath: d.area_path || rec.area_path || '—',
            previousStatus: d.previous_state || 'Internal Review',
            requestedStatus: d.requested_state || 'Closed',
            resultingStatus: d.actual_state || d.new_state || (d.status === 'SUCCESS' ? 'Closed' : d.previous_state || 'Internal Review'),
            storyPoints: d.story_points ?? 0,
            closureTime: d.processed_at ? new Date(d.processed_at).toLocaleString() : `${rec.date} ${rec.time}`,
            closureDateRaw: d.processed_at || rec.executedAt || rec.date,
            executedBy: d.executing_user || rec.managerName || rec.manager_name || 'Manager',
            result: d.status === 'SUCCESS' ? 'Success' : d.status === 'SKIPPED' ? 'Skipped' : 'Failed',
            errorMessage: d.error_message,
          });
        }
      } else {
        // Fallback for older records without details
        if (rec.failedItems && rec.failedItems.length > 0) {
          for (const item of rec.failedItems) {
            rows.push({
              uniqueKey: `${rec.id}-${item.id}-failed`,
              auditId: rec.id,
              storyId: item.id,
              title: item.title || `Story #${item.id}`,
              resource: rec.managerName || '—',
              region: rec.region,
              projectTag: '—',
              sprint: rec.sprint,
              areaPath: rec.area_path || '—',
              previousStatus: 'Internal Review',
              requestedStatus: 'Closed',
              resultingStatus: 'Internal Review',
              storyPoints: 0,
              closureTime: rec.executedAt ? new Date(rec.executedAt).toLocaleString() : `${rec.date} ${rec.time}`,
              closureDateRaw: rec.executedAt || rec.date,
              executedBy: rec.managerName || 'Manager',
              result: 'Failed',
              errorMessage: item.reason,
            });
          }
        }
        if (rec.updatedItemIds && rec.updatedItemIds.length > 0) {
          for (const id of rec.updatedItemIds) {
            rows.push({
              uniqueKey: `${rec.id}-${id}-success`,
              auditId: rec.id,
              storyId: id,
              title: `User Story #${id}`,
              resource: 'Team Resource',
              region: rec.region,
              projectTag: '—',
              sprint: rec.sprint,
              areaPath: rec.area_path || '—',
              previousStatus: 'Internal Review',
              requestedStatus: 'Closed',
              resultingStatus: 'Closed',
              storyPoints: 0,
              closureTime: rec.executedAt ? new Date(rec.executedAt).toLocaleString() : `${rec.date} ${rec.time}`,
              closureDateRaw: rec.executedAt || rec.date,
              executedBy: rec.managerName || 'Manager',
              result: 'Success',
            });
          }
        }
      }
    }
    return rows;
  }, [auditHistory]);

  // Dynamic filter dropdown options based on recorded history
  const availableAuditSprints = useMemo(() => {
    const set = new Set<string>();
    flatAuditStories.forEach((r) => { if (r.sprint) set.add(r.sprint); });
    return Array.from(set).sort();
  }, [flatAuditStories]);

  const availableAuditRegions = useMemo(() => {
    const set = new Set<string>();
    flatAuditStories.forEach((r) => { if (r.region) set.add(r.region); });
    return Array.from(set).sort();
  }, [flatAuditStories]);

  const availableAuditTags = useMemo(() => {
    const set = new Set<string>();
    flatAuditStories.forEach((r) => { if (r.projectTag && r.projectTag !== '—') set.add(r.projectTag); });
    return Array.from(set).sort();
  }, [flatAuditStories]);

  // Filtered stories in Audit Trail
  const filteredAuditStories = useMemo(() => {
    return flatAuditStories.filter((item) => {
      // 1. Search Query (matches story ID or title or resource)
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.trim().toLowerCase();
        const matchesId = String(item.storyId).includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesResource = item.resource.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesResource) {
          return false;
        }
      }
      // 2. Sprint Filter
      if (auditSprintFilter !== 'All' && item.sprint !== auditSprintFilter) {
        return false;
      }
      // 3. Region Filter
      if (auditRegionFilter !== 'All' && item.region !== auditRegionFilter) {
        return false;
      }
      // 4. Project / Tag Filter
      if (auditTagFilter !== 'All' && item.projectTag !== auditTagFilter) {
        return false;
      }
      // 5. Execution Result Filter
      if (auditResultFilter !== 'All' && item.result !== auditResultFilter) {
        return false;
      }
      // 6. Closure Date Filter
      if (auditDateFilter.trim()) {
        const dateNeedle = auditDateFilter.trim().toLowerCase();
        const rawMatches = item.closureDateRaw.toLowerCase().includes(dateNeedle);
        const timeMatches = item.closureTime.toLowerCase().includes(dateNeedle);
        if (!rawMatches && !timeMatches) {
          return false;
        }
      }
      return true;
    });
  }, [
    flatAuditStories,
    auditSearchQuery,
    auditSprintFilter,
    auditRegionFilter,
    auditTagFilter,
    auditResultFilter,
    auditDateFilter,
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setAuditCurrentPage(1);
  }, [
    auditSearchQuery,
    auditSprintFilter,
    auditRegionFilter,
    auditTagFilter,
    auditResultFilter,
    auditDateFilter,
  ]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditStories.length / auditPageSize));
  const pagedAuditStories = useMemo(() => {
    const start = (auditCurrentPage - 1) * auditPageSize;
    return filteredAuditStories.slice(start, start + auditPageSize);
  }, [filteredAuditStories, auditCurrentPage, auditPageSize]);

  // Export Audit Trail to Excel (Requirement 5.2)
  const handleExportAuditTrail = () => {
    if (filteredAuditStories.length === 0) return;
    const rows = filteredAuditStories.map((r) => ({
      'Execution / Batch ID': r.auditId,
      'Story ID': r.storyId,
      'Story Title': r.title,
      'Resource': r.resource,
      'Region': r.region,
      'Project / Tag': r.projectTag,
      'Sprint / Iteration': r.sprint,
      'Area Path': r.areaPath,
      'Previous Status': r.previousStatus,
      'Requested Status': r.requestedStatus,
      'Resulting Status': r.resultingStatus,
      'Story Points': r.storyPoints,
      'Executed By': r.executedBy,
      'Closure Time': r.closureTime,
      'Result': r.result,
      'Error Details': r.errorMessage || 'None',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Closure Audit Trail');
    XLSX.writeFile(
      workbook,
      `SIT-Nexus-Closure-Audit-Trail-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
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
      <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-[#1C1C1C]" />
            <h2 className="text-lg font-bold text-[#1F2937] tracking-tight font-sans">
              Sprint Closure
            </h2>
            <span className="text-xs font-mono font-bold bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A] px-2.5 py-0.5 rounded-full">
              Rule: Internal Review → Closed
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Review and close eligible User Stories for a completed sprint and region across <strong>ALL PROJECTS / ALL TAGS</strong>.
          </p>
        </div>

        {/* View Switcher: Closure Execution vs Audit Trail */}
        <div className="flex items-center gap-2">
          <div className="bg-[#F5F6F7] p-1 rounded-lg border border-[#E5E7EB] flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('closure')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 font-bold rounded-md transition-all cursor-pointer ${
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
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-4">
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
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
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
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] font-semibold focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none cursor-pointer transition-all"
                >
                  <option value="All Regions">All Regions</option>
                  <option value="India">India</option>
                  <option value="Europe">Europe</option>
                  <option value="USA">USA</option>
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
                  className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded-lg text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
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
                  className="h-9 px-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#4B5563] text-xs font-mono font-semibold rounded-lg border border-[#E5E7EB] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>{showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchPreview}
                  disabled={isLoadingPreview}
                  className="h-9 px-4 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                  <span>{isLoadingPreview ? 'Querying Azure DevOps...' : 'Preview Closure'}</span>
                </button>

                {previewData && previewData.stories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportPreview}
                    className="h-9 px-3 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <div className="bg-[#1C1C1C] text-white border border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 font-mono text-xs animate-in fade-in">
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
                <div className="bg-neutral-800/80 p-2 rounded-lg">
                  <span className="text-neutral-400 block text-[10px]">WIQL Results</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.wiqlResults}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded-lg">
                  <span className="text-neutral-400 block text-[10px]">Internal Review</span>
                  <span className="text-base font-bold text-[#FFCC00]">{previewData.diagnostics.internalReviewCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded-lg">
                  <span className="text-neutral-400 block text-[10px]">RM Matched</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.resourceMasterMatchedCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded-lg">
                  <span className="text-neutral-400 block text-[10px]">Region Filtered</span>
                  <span className="text-base font-bold text-white">{previewData.diagnostics.regionFilteredCount}</span>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded-lg border border-[#FFCC00]/50">
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
            <div className="bg-white border-2 border-[#FFCC00] p-4 rounded-xl shadow-xs flex flex-col gap-2">
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
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs font-mono text-emerald-900 flex flex-col gap-2">
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
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px]">
                  <span className="font-bold block mb-1">Failed Items:</span>
                  {executionResult.summary.failedItems.map((item) => (
                    <div key={item.id}>Story #{item.id}: {item.title} — {item.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. CLOSURE PREVIEW KPI METRICS (Resources, Stories, Total Points) */}
          {previewData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#1C1C1C] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
                  Resources
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                    {previewData.affectedResourcesCount}
                  </span>
                  <span className="text-xs text-[#6B7280]">engineers with items</span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#FFCC00] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold">
                  Stories
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                    {previewData.affectedStoriesCount}
                  </span>
                  <span className="text-xs text-amber-800 font-semibold">in Internal Review</span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] border-t-3 border-t-[#3B82F6] p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between">
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
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
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
                  className="h-8 px-4 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
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
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
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
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
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
              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-xs font-sans">
                
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

                  <div className="bg-[#FEF9C3]/50 border border-[#FEF08A] p-3 rounded-[10px] text-[11px] font-mono text-[#854D0E] space-y-1">
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
                    className="px-4 py-2 border border-[#D1D5DB] rounded-lg text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkClosure}
                    disabled={isExecuting}
                    className="px-4 py-2 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        /* AUDIT TRAIL HISTORICAL LEDGER (Requirement 5.2) */
        <div className="flex flex-col gap-4">
          
          {/* Header & Action Controls */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1C1C1C]" />
                <h3 className="font-bold text-sm text-[#1F2937]">Closure Audit Trail</h3>
                <span className="text-[11px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full border border-neutral-200">
                  {flatAuditStories.length} {flatAuditStories.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Authoritative historical log of all sprint closure executions and Azure DevOps work item updates.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleExportAuditTrail}
                disabled={filteredAuditStories.length === 0}
                className="h-8 px-3 border border-[#D1D5DB] rounded-lg text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Export audit records to Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>Export Audit</span>
              </button>

              <button
                type="button"
                onClick={fetchAuditHistory}
                disabled={isLoadingHistory}
                className="h-8 px-3 bg-[#1C1C1C] hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Refresh audit history from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {flatAuditStories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-white border border-[#E5E7EB] p-3 rounded-xl shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Total Records</span>
                <span className="text-lg font-bold text-[#1C1C1C] mt-0.5">{flatAuditStories.length}</span>
              </div>
              <div className="bg-white border border-[#E5E7EB] border-l-4 border-l-emerald-500 p-3 rounded-xl shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Successfully Closed</span>
                <span className="text-lg font-bold text-emerald-700 mt-0.5">
                  {flatAuditStories.filter((s) => s.result === 'Success').length}
                </span>
              </div>
              <div className="bg-white border border-[#E5E7EB] border-l-4 border-l-red-500 p-3 rounded-xl shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Failed Operations</span>
                <span className="text-lg font-bold text-red-600 mt-0.5">
                  {flatAuditStories.filter((s) => s.result === 'Failed').length}
                </span>
              </div>
              <div className="bg-white border border-[#E5E7EB] p-3 rounded-xl shadow-2xs flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Filtered View</span>
                <span className="text-lg font-bold text-[#374151] mt-0.5">{filteredAuditStories.length}</span>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              
              {/* Search Box: Story ID or Title */}
              <div className="relative sm:col-span-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search by Story ID, title, or resource..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg outline-none focus:bg-white focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
                />
                {auditSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAuditSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sprint / Iteration Filter */}
              <div>
                <select
                  value={auditSprintFilter}
                  onChange={(e) => setAuditSprintFilter(e.target.value)}
                  aria-label="Filter by Sprint"
                  className="w-full py-1.5 px-2.5 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg outline-none focus:bg-white focus:border-[#FFCD11] transition-all cursor-pointer font-sans"
                >
                  <option value="All">All Sprints</option>
                  {availableAuditSprints.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <select
                  value={auditRegionFilter}
                  onChange={(e) => setAuditRegionFilter(e.target.value)}
                  aria-label="Filter by Region"
                  className="w-full py-1.5 px-2.5 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg outline-none focus:bg-white focus:border-[#FFCD11] transition-all cursor-pointer font-sans"
                >
                  <option value="All">All Regions</option>
                  {availableAuditRegions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Project / Tag Filter */}
              <div>
                <select
                  value={auditTagFilter}
                  onChange={(e) => setAuditTagFilter(e.target.value)}
                  aria-label="Filter by Project or Tag"
                  className="w-full py-1.5 px-2.5 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg outline-none focus:bg-white focus:border-[#FFCD11] transition-all cursor-pointer font-sans"
                >
                  <option value="All">All Projects / Tags</option>
                  {availableAuditTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Execution Result Filter */}
              <div>
                <select
                  value={auditResultFilter}
                  onChange={(e) => setAuditResultFilter(e.target.value as any)}
                  aria-label="Filter by Execution Result"
                  className="w-full py-1.5 px-2.5 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg outline-none focus:bg-white focus:border-[#FFCD11] transition-all cursor-pointer font-sans font-medium"
                >
                  <option value="All">All Results</option>
                  <option value="Success">Success Only</option>
                  <option value="Failed">Failed Only</option>
                  <option value="Skipped">Skipped Only</option>
                </select>
              </div>

            </div>

            {/* Active Filters Reset Row */}
            {(auditSearchQuery || auditSprintFilter !== 'All' || auditRegionFilter !== 'All' || auditTagFilter !== 'All' || auditResultFilter !== 'All' || auditDateFilter) && (
              <div className="flex items-center justify-between pt-1 border-t border-[#F1F3F5] text-xs">
                <span className="text-[#6B7280]">
                  Filtered to <strong>{filteredAuditStories.length}</strong> of {flatAuditStories.length} total records
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearchQuery('');
                    setAuditSprintFilter('All');
                    setAuditRegionFilter('All');
                    setAuditTagFilter('All');
                    setAuditResultFilter('All');
                    setAuditDateFilter('');
                  }}
                  className="text-xs text-[#B45309] hover:underline font-semibold cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {historyError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Failed to load audit history: {historyError}</span>
              </div>
              <button
                type="button"
                onClick={fetchAuditHistory}
                className="underline font-bold text-red-800 ml-3 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Audit Records Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
                    <th className="py-2.5 px-3.5 font-bold">Story ID</th>
                    <th className="py-2.5 px-3.5 font-bold">Title</th>
                    <th className="py-2.5 px-3.5 font-bold">Resource</th>
                    <th className="py-2.5 px-3.5 font-bold">Project / Tag</th>
                    <th className="py-2.5 px-3.5 font-bold">Previous Status</th>
                    <th className="py-2.5 px-3.5 font-bold">Resulting Status</th>
                    <th className="py-2.5 px-3.5 font-bold">Closure Time</th>
                    <th className="py-2.5 px-3.5 font-bold">Result</th>
                    <th className="py-2.5 px-3.5 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5] font-sans">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#FFCD11]" />
                          <span className="font-mono text-xs">Loading authoritative audit trail records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : flatAuditStories.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                          <ShieldCheck className="w-8 h-8 text-[#9CA3AF] mb-2" />
                          <h4 className="font-bold text-sm text-[#1F2937]">No closure operations recorded yet</h4>
                          <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                            When User Stories are transitioned from Internal Review to Closed during Sprint Closure, their complete audit details will be persistently stored here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAuditStories.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <Search className="w-8 h-8 text-[#9CA3AF] mb-2" />
                          <h4 className="font-bold text-sm text-[#1F2937]">No matching audit records found</h4>
                          <p className="text-xs text-[#6B7280] mt-1">
                            Try adjusting your search query or filter options to inspect other closure records.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAuditSearchQuery('');
                              setAuditSprintFilter('All');
                              setAuditRegionFilter('All');
                              setAuditTagFilter('All');
                              setAuditResultFilter('All');
                              setAuditDateFilter('');
                            }}
                            className="mt-3 px-3 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedAuditStories.map((row) => (
                      <tr 
                        key={row.uniqueKey} 
                        className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                        onClick={() => setSelectedAuditRecord(row)}
                      >
                        <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-[#1C1C1C] whitespace-nowrap">
                          #{row.storyId}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-[#1F2937] max-w-xs truncate" title={row.title}>
                          {row.title}
                        </td>
                        <td className="py-2.5 px-3.5 text-[#374151] whitespace-nowrap">
                          <div className="font-medium">{row.resource}</div>
                          <span className="text-[10px] text-[#9CA3AF] font-mono">{row.region}</span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#4B5563] whitespace-nowrap">
                          {row.projectTag}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                            {row.previousStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            row.resultingStatus === 'Closed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                          }`}>
                            {row.resultingStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-[#6B7280] font-mono text-[11px] whitespace-nowrap">
                          {row.closureTime}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                            row.result === 'Success'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.result === 'Skipped'
                              ? 'bg-gray-100 text-gray-700 border border-gray-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {row.result === 'Success' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : row.result === 'Skipped' ? (
                              <Info className="w-3 h-3 text-gray-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                            )}
                            <span>{row.result}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditRecord(row)}
                            className="p-1 text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] rounded-md transition-colors cursor-pointer"
                            title="Inspect full audit record details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredAuditStories.length > auditPageSize && (
              <div className="p-3 border-t border-[#F1F3F5] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#6B7280]">
                <span>
                  Showing <strong>{((auditCurrentPage - 1) * auditPageSize) + 1}</strong> - <strong>{Math.min(auditCurrentPage * auditPageSize, filteredAuditStories.length)}</strong> of <strong>{filteredAuditStories.length}</strong> records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAuditCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={auditCurrentPage === 1}
                    className="p-1 rounded-md border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono font-medium text-[#374151]">
                    Page {auditCurrentPage} of {totalAuditPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAuditCurrentPage((p) => Math.min(totalAuditPages, p + 1))}
                    disabled={auditCurrentPage === totalAuditPages}
                    className="p-1 rounded-md border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40 cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Record Inspection Detail Modal (Requirement 5.2) */}
          {selectedAuditRecord && (
            <div 
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setSelectedAuditRecord(null)}
            >
              <div 
                className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col text-xs font-sans animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Modal Header */}
                <div className="bg-[#1C1C1C] text-white p-4 flex items-center justify-between border-b-2 border-[#FFCC00]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#FFCC00]" />
                    <h3 className="text-sm font-bold uppercase tracking-tight text-white">
                      Closure Audit Record Detail
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAuditRecord(null)}
                    className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 flex flex-col gap-4 text-[#374151] max-h-[75vh] overflow-y-auto">
                  
                  {/* Top Item Summary */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#F1F3F5] gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-[#1C1C1C] text-sm">#{selectedAuditRecord.storyId}</span>
                        <span>·</span>
                        <span className="text-[#6B7280]">{selectedAuditRecord.projectTag}</span>
                      </div>
                      <h4 className="font-bold text-sm text-[#111827] mt-1">
                        {selectedAuditRecord.title}
                      </h4>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full font-mono shrink-0 ${
                      selectedAuditRecord.result === 'Success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : selectedAuditRecord.result === 'Skipped'
                        ? 'bg-gray-100 text-gray-800 border border-gray-300'
                        : 'bg-red-50 text-red-800 border border-red-300'
                    }`}>
                      {selectedAuditRecord.result === 'Success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      <span>{selectedAuditRecord.result}</span>
                    </span>
                  </div>

                  {/* Failure Details (if Failed) */}
                  {selectedAuditRecord.result === 'Failed' && selectedAuditRecord.errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
                      <span className="font-bold block mb-1 flex items-center gap-1.5 text-red-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Execution Error Details:</span>
                      </span>
                      <p className="font-mono text-[11px] leading-relaxed">
                        {selectedAuditRecord.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Key Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Assigned Resource</span>
                      <span className="font-bold text-[#1F2937]">{selectedAuditRecord.resource}</span>
                      <span className="text-[11px] text-[#6B7280] block font-mono">Region: {selectedAuditRecord.region}</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Story Points</span>
                      <span className="font-bold text-lg font-mono text-[#1F2937]">{selectedAuditRecord.storyPoints}</span>
                      <span className="text-[10px] text-[#6B7280] block uppercase font-mono">pts</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Previous Status</span>
                      <span className="font-bold text-amber-800">{selectedAuditRecord.previousStatus}</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Resulting Status</span>
                      <span className={`font-bold ${selectedAuditRecord.resultingStatus === 'Closed' ? 'text-emerald-700' : 'text-[#374151]'}`}>
                        {selectedAuditRecord.resultingStatus}
                      </span>
                    </div>

                    <div className="col-span-2 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB] font-mono text-[11px]">
                      <span className="text-[10px] text-[#6B7280] uppercase block">Sprint / Iteration Path</span>
                      <span className="font-semibold text-[#1F2937] break-all">{selectedAuditRecord.sprint}</span>
                    </div>

                    <div className="col-span-2 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB] font-mono text-[11px]">
                      <span className="text-[10px] text-[#6B7280] uppercase block">Area Path</span>
                      <span className="font-semibold text-[#1F2937] break-all">{selectedAuditRecord.areaPath}</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Execution Timestamp</span>
                      <span className="font-mono text-[11px] text-[#1F2937] font-semibold">{selectedAuditRecord.closureTime}</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Executed By</span>
                      <span className="font-medium text-[#1F2937]">{selectedAuditRecord.executedBy}</span>
                    </div>

                    <div className="col-span-2 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB] font-mono text-[11px]">
                      <span className="text-[10px] text-[#6B7280] uppercase block">Batch / Execution ID</span>
                      <span className="font-bold text-[#1C1C1C] break-all">{selectedAuditRecord.auditId}</span>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="p-3.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditRecord(null)}
                    className="px-4 py-1.5 bg-[#1C1C1C] hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default SprintClosureView;
