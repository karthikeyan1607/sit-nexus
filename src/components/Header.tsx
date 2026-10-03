import React from 'react';
import { 
  Play, 
  Layers, 
  Table, 
  Download, 
  RotateCcw,
  Cpu,
  Users2,
  Tags,
  LayoutDashboard,
  CheckCheck,
  Settings2
} from 'lucide-react';
import { AdoConnectionConfig } from '../types';
import { CaterpillarLogo } from './CaterpillarLogo';

export type MainNavTab = 'sprint' | 'resources' | 'projects' | 'closure' | 'settings';

interface HeaderProps {
  activeTab: MainNavTab;
  setActiveTab: (tab: MainNavTab) => void;
  viewMode: 'resource' | 'table';
  setViewMode: (mode: 'resource' | 'table') => void;
  onOpenStandupMode: () => void;
  onOpenAdoSettings: () => void;
  onExportCsv: () => void;
  onResetData: () => void;
  adoConfig: AdoConnectionConfig;
  totalFilteredStories: number;
  reviewedCount: number;
  totalResourceCount: number;
  masterResourceCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  onOpenStandupMode,
  onOpenAdoSettings,
  onExportCsv,
  onResetData,
  adoConfig,
  totalFilteredStories,
  reviewedCount,
  totalResourceCount,
  masterResourceCount,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/95 sticky top-0 z-30 backdrop-blur-md">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-3">
          
          {/* CAT Style Branding */}
          <div className="flex items-center gap-3">
            <CaterpillarLogo height={28} />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase font-sans flex items-center gap-1.5">
                  SIT NEXUS
                  <span className="text-[#FFCD11] text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 border border-[#FFCD11]/40 bg-[#FFCD11]/10 rounded">
                    CAT ENTERPRISE
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                Sprint Intelligence & Execution Visibility Platform
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs as specified in Navigation hierarchy:
              ├── Dashboard
              ├── Resource Master
              ├── Projects
              ├── Sprint Closure
              └── Settings
          */}
          <div className="flex flex-wrap items-center bg-neutral-900 border border-neutral-800 rounded p-1 self-start lg:self-center gap-0.5">
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab('sprint')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'sprint'
                  ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            {/* 2. Resource Master */}
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'resources'
                  ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Resource Master</span>
              <span className={`text-[10px] font-mono font-semibold px-1 rounded ${
                activeTab === 'resources' ? 'bg-neutral-950/40 text-neutral-900' : 'bg-neutral-800 text-[#FFCD11]'
              }`}>
                {masterResourceCount}
              </span>
            </button>

            {/* 3. Projects */}
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'projects'
                  ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Tags className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>

            {/* 4. Sprint Closure (Separate Module with Warning Motif) */}
            <button
              type="button"
              onClick={() => setActiveTab('closure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'closure'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-neutral-800'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Sprint Closure</span>
            </button>

            {/* 5. Settings */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Contextual Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'sprint' && (
              <>
                {/* View Mode Switcher */}
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('resource')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
                      viewMode === 'resource'
                        ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Group stories by resource for standup review"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resource View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
                      viewMode === 'table'
                        ? 'bg-[#FFCD11] text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="View full tabular backlog with sorting & export"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Detailed Table</span>
                  </button>
                </div>

                {/* Standup Facilitator Button */}
                <button
                  type="button"
                  onClick={onOpenStandupMode}
                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#FFCD11] border border-[#FFCD11]/50 hover:border-[#FFCD11] text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
                  title="Launch focused resource-by-resource standup walkthrough mode"
                >
                  <Play className="w-3.5 h-3.5 fill-[#FFCD11]" />
                  <span>Standup Runner</span>
                  {totalResourceCount > 0 && (
                    <span className="text-[10px] bg-neutral-950/80 px-1 py-0.2 rounded font-mono text-neutral-300">
                      {reviewedCount}/{totalResourceCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Export CSV */}
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors"
              title="Export current view to CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* ADO Connection Settings Shortcut */}
            <button
              type="button"
              onClick={onOpenAdoSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors"
              title="Configure Azure DevOps connection & WIQL parameters"
            >
              <Cpu className="w-3.5 h-3.5 text-[#FFCD11]" />
              <span className="hidden sm:inline">ADO Connection</span>
            </button>

            {/* Reset Data */}
            <button
              type="button"
              onClick={onResetData}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors"
              title="Refresh / reset data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Sub-Bar */}
        <div className="py-1 border-t border-neutral-900 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-neutral-300 font-semibold">ADO CONNECTED</span>
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400 truncate max-w-[200px] sm:max-w-none">
              {adoConfig.orgUrl}
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300">{adoConfig.projectName}</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Resource Master:</span>
            <span className="text-[#FFCD11] font-bold">
              {masterResourceCount} registered resources
            </span>
            {activeTab === 'sprint' && (
              <>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400">
                  Standup cleared: <span className="text-emerald-400 font-semibold">{reviewedCount}</span> of {totalResourceCount}
                </span>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
