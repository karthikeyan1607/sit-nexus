import React from 'react';
import { Users, FileText, BarChart3, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface SummaryCardsProps {
  totalResources: number;
  totalStories: number;
  totalStoryPoints: number;
  activePoints: number;
  completedPoints: number;
  blockedCount: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalResources,
  totalStories,
  totalStoryPoints,
  activePoints,
  completedPoints,
  blockedCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      
      {/* 1. Total Resources */}
      <div className="bg-neutral-900 border-l-4 border-l-[#FFCD11] border-y border-r border-neutral-800 p-4 rounded-sm shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Total Resources
          </span>
          <Users className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono tracking-tight">
            {totalResources}
          </span>
          <span className="text-xs text-neutral-400 font-sans">engineers active</span>
        </div>
      </div>

      {/* 2. Total Stories */}
      <div className="bg-neutral-900 border-l-4 border-l-amber-500 border-y border-r border-neutral-800 p-4 rounded-sm shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Total Stories
          </span>
          <FileText className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono tracking-tight">
            {totalStories}
          </span>
          <span className="text-xs text-neutral-400 font-sans">Azure DevOps items</span>
        </div>
      </div>

      {/* 3. Total Story Points */}
      <div className="bg-neutral-900 border-l-4 border-l-sky-500 border-y border-r border-neutral-800 p-4 rounded-sm shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Total Story Points
          </span>
          <BarChart3 className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-[#FFCD11] font-mono tracking-tight">
            {totalStoryPoints}
          </span>
          <span className="text-xs text-neutral-400 font-sans">sprint capacity pts</span>
        </div>
      </div>

      {/* 4. Active Execution */}
      <div className="bg-neutral-900 border-l-4 border-l-emerald-500 border-y border-r border-neutral-800 p-4 rounded-sm shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Active / In Flight
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            {activePoints}
          </span>
          <span className="text-xs text-neutral-400 font-sans">
            pts in progress ({completedPoints} pts done)
          </span>
        </div>
      </div>

      {/* 5. Blocked / Standup Alerts */}
      <div className={`p-4 rounded-sm shadow-sm flex flex-col justify-between border-l-4 border-y border-r transition-colors ${
        blockedCount > 0 
          ? 'bg-red-950/20 border-l-red-500 border-red-900/60 text-red-200' 
          : 'bg-neutral-900 border-l-neutral-700 border-neutral-800 text-neutral-400'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Standup Blockers
          </span>
          <AlertOctagon className={`w-4 h-4 ${blockedCount > 0 ? 'text-red-400' : 'text-neutral-500'}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-3xl font-black font-mono tracking-tight ${blockedCount > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
            {blockedCount}
          </span>
          <span className="text-xs text-neutral-400 font-sans">
            {blockedCount > 0 ? 'items need unblocking' : 'no active blockers'}
          </span>
        </div>
      </div>

    </div>
  );
};
