import React from 'react';
import { 
  CheckCircle2, 
  CircleDashed, 
  AlertTriangle, 
  ExternalLink, 
  Clock, 
  Hash, 
  ChevronRight,
  MessageSquarePlus,
  Flame,
  UserCheck
} from 'lucide-react';
import { ResourceGroup, WorkItemStory, StoryStatus } from '../types';

interface ResourceViewProps {
  resources: ResourceGroup[];
  onSelectStory: (story: WorkItemStory) => void;
  onUpdateStatus: (storyId: number, newStatus: StoryStatus) => void;
  onToggleReviewed: (resourceName: string) => void;
  onAddQuickNote: (story: WorkItemStory) => void;
}

export const ResourceView: React.FC<ResourceViewProps> = ({
  resources,
  onSelectStory,
  onUpdateStatus,
  onToggleReviewed,
  onAddQuickNote,
}) => {
  if (resources.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center shadow-xs flex flex-col items-center max-w-lg mx-auto my-6">
        <CircleDashed className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#1E293B]">No resources available</h3>
        <p className="text-xs text-[#64748B] mt-1.5 max-w-sm leading-relaxed">
          Import Resource Master data or run an Azure DevOps query to populate resources.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Standup header banner */}
      <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-wider text-neutral-300 font-semibold">
            Resource-Wise Sprint Workload
          </span>
          <span className="text-neutral-600">/</span>
          <span>{resources.length} Team Members</span>
        </div>
        <div className="text-[11px] text-neutral-500 font-mono">
          Tip: Click any story to view acceptance criteria or update status during standup
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {resources.map((res) => {
          return (
            <div
              key={res.name}
              className={`bg-neutral-900 border rounded-sm transition-all shadow-sm ${
                res.hasBlockers
                  ? 'border-red-900/70 hover:border-red-600'
                  : res.isReviewed
                  ? 'border-emerald-800/50 hover:border-neutral-700 bg-neutral-900/80'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Resource Header */}
              <div className="p-4 border-b border-neutral-800/90 bg-neutral-950/40 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar / Monogram */}
                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm font-mono border ${
                    res.isReviewed 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                      : 'bg-neutral-800 text-[#FFCD11] border-neutral-700'
                  }`}>
                    {res.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white tracking-tight">
                        {res.name}
                      </h3>
                      {/* Region as clean quiet unboxed text */}
                      <span className="text-xs text-neutral-400 font-mono">
                        · {res.region}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="truncate max-w-[220px]">{res.email}</span>
                    </div>
                  </div>
                </div>

                {/* Right Header Stats & Standup Reviewed Checkbox */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#FFCD11]">
                      {res.totalPoints} pts
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      ({res.stories.length} {res.stories.length === 1 ? 'story' : 'stories'})
                    </span>
                  </div>

                  {/* Mark as reviewed in standup button */}
                  <button
                    type="button"
                    onClick={() => onToggleReviewed(res.name)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wider uppercase rounded transition-colors ${
                      res.isReviewed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700'
                    }`}
                    title={res.isReviewed ? 'Marked as discussed today' : 'Mark as discussed in standup'}
                  >
                    {res.isReviewed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Discussed</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Standup Check</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stories List for this Resource */}
              <div className="p-4 divide-y divide-neutral-800/80">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2.5 flex items-center justify-between">
                  <span>Assigned Stories</span>
                  <span>Execution Status & Points</span>
                </div>

                {res.stories.map((story) => {
                  return (
                    <div 
                      key={story.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Title and ID */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              type="button"
                              onClick={() => onSelectStory(story)}
                              className="text-xs font-mono font-bold text-[#FFCD11] hover:underline flex items-center gap-0.5"
                            >
                              <Hash className="w-3 h-3" />
                              <span>{story.id}</span>
                            </button>

                            <span className="text-neutral-600">·</span>
                            <span className="text-[11px] text-neutral-400 font-medium">
                              {story.project}
                            </span>

                            {story.tag && (
                              <>
                                <span className="text-neutral-600">·</span>
                                <span className="text-[11px] text-neutral-400">
                                  {story.tag}
                                </span>
                              </>
                            )}

                            {story.priority === 'P1' && (
                              <>
                                <span className="text-neutral-600">·</span>
                                <span className="text-[10px] font-mono font-bold text-red-400 uppercase">
                                  HIGH P1
                                </span>
                              </>
                            )}
                          </div>

                          <h4 
                            onClick={() => onSelectStory(story)}
                            className="text-sm font-semibold text-neutral-100 hover:text-[#FFCD11] cursor-pointer transition-colors leading-snug"
                          >
                            {story.title}
                          </h4>
                        </div>

                        {/* Interactive Status Dropdown & Points */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-2">
                            {/* Status Selector */}
                            <select
                              value={story.status}
                              onChange={(e) => onUpdateStatus(story.id, e.target.value as StoryStatus)}
                              className={`text-xs font-mono font-semibold py-1 px-2 rounded border appearance-none cursor-pointer outline-none transition-colors ${
                                story.status === 'Active'
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                                  : story.status === 'New'
                                  ? 'bg-sky-950/40 text-sky-300 border-sky-800'
                                  : story.status === 'Resolved' || story.status === 'Closed'
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                                  : 'bg-red-950/40 text-red-300 border-red-800 font-bold'
                              }`}
                            >
                              <option value="Active" className="bg-neutral-900 text-neutral-100">Active</option>
                              <option value="New" className="bg-neutral-900 text-neutral-100">New</option>
                              <option value="Resolved" className="bg-neutral-900 text-neutral-100">Resolved</option>
                              <option value="Closed" className="bg-neutral-900 text-neutral-100">Closed</option>
                              <option value="Blocked" className="bg-neutral-900 text-red-400">Blocked</option>
                            </select>

                            {/* Points Display */}
                            <span className="text-xs font-mono font-bold text-white bg-neutral-800 px-2 py-1 rounded border border-neutral-700">
                              {story.storyPoints} pts
                            </span>
                          </div>

                          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{story.lastUpdatedDate.split(' ')[0]}</span>
                          </span>
                        </div>
                      </div>

                      {/* Standup Notes or Blocker alerts if present */}
                      {(story.standupNotes || story.blockedReason) && (
                        <div className={`mt-1 text-xs p-2 rounded border text-left ${
                          story.status === 'Blocked' || story.blockedReason
                            ? 'bg-red-950/30 border-red-900/60 text-red-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5">
                              {story.status === 'Blocked' && (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                                  Standup Update:
                                </span>
                                <span>{story.blockedReason || story.standupNotes}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onAddQuickNote(story)}
                              className="text-[11px] text-neutral-400 hover:text-white shrink-0 hover:underline"
                            >
                              Edit Note
                            </button>
                          </div>
                        </div>
                      )}

                      {/* If no note, button to quickly add standup note */}
                      {!story.standupNotes && !story.blockedReason && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => onAddQuickNote(story)}
                            className="text-[11px] text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
                          >
                            <MessageSquarePlus className="w-3 h-3" />
                            <span>Add standup note / blocker</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
