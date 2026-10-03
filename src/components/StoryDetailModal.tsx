import React, { useState, useEffect } from 'react';
import { 
  X, 
  Hash, 
  User, 
  Globe2, 
  FolderGit2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Save
} from 'lucide-react';
import { WorkItemStory, StoryStatus } from '../types';

interface StoryDetailModalProps {
  story: WorkItemStory | null;
  onClose: () => void;
  onSaveStory: (updatedStory: WorkItemStory) => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  story,
  onClose,
  onSaveStory,
}) => {
  const [status, setStatus] = useState<StoryStatus>('New');
  const [standupNotes, setStandupNotes] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [storyPoints, setStoryPoints] = useState(0);

  useEffect(() => {
    if (story) {
      setStatus(story.status);
      setStandupNotes(story.standupNotes || '');
      setBlockedReason(story.blockedReason || '');
      setStoryPoints(story.storyPoints || 0);
    }
  }, [story]);

  if (!story) return null;

  const handleSave = () => {
    onSaveStory({
      ...story,
      status,
      standupNotes: standupNotes.trim(),
      blockedReason: status === 'Blocked' ? blockedReason.trim() : (blockedReason.trim() || undefined),
      storyPoints,
      lastUpdatedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#FFCD11] flex items-center gap-1">
              <Hash className="w-4 h-4" />
              <span>{story.id}</span>
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-xs text-neutral-300 font-mono uppercase tracking-wider">
              Azure DevOps User Story
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {story.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-2 font-mono">
              <span>{story.project}</span>
              <span className="text-neutral-600">·</span>
              <span>{story.sprint}</span>
              <span className="text-neutral-600">·</span>
              <span>Tag: {story.tag}</span>
              <span className="text-neutral-600">·</span>
              <span>Updated: {story.lastUpdatedDate}</span>
            </div>
          </div>

          {/* Quick Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-3 rounded border border-neutral-800 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">Assigned To</span>
              <span className="font-semibold text-neutral-200">{story.assignedTo}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">Region</span>
              <span className="font-semibold text-neutral-200">{story.region}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">Story Points</span>
              <input
                type="number"
                min="0"
                max="40"
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="w-16 bg-neutral-900 border border-neutral-700 text-neutral-100 font-mono font-bold px-2 py-0.5 rounded outline-none focus:border-[#FFCD11]"
              />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StoryStatus)}
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 font-mono text-xs font-semibold px-2 py-1 rounded outline-none focus:border-[#FFCD11]"
              >
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Description & Acceptance Criteria */}
          {story.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FFCD11]" />
                <span>Description</span>
              </span>
              <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                {story.description}
              </div>
            </div>
          )}

          {story.acceptanceCriteria && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceptance Criteria</span>
              </span>
              <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 text-xs text-neutral-300 leading-relaxed font-mono">
                {story.acceptanceCriteria}
              </div>
            </div>
          )}

          {/* Standup Notes Field */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold">
              Daily Standup Notes / Execution Update
            </span>
            <textarea
              rows={2}
              value={standupNotes}
              onChange={(e) => setStandupNotes(e.target.value)}
              placeholder="e.g., Code reviewed; awaiting DLMA schema merge by 2 PM..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-[#FFCD11] p-3 text-xs text-neutral-100 rounded outline-none font-sans"
            />
          </div>

          {/* Blocker Reason if Blocked */}
          {(status === 'Blocked' || blockedReason) && (
            <div className="flex flex-col gap-1.5 bg-red-950/20 p-3 rounded border border-red-900/60">
              <span className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Blocker Details (Manager Action Needed)</span>
              </span>
              <textarea
                rows={2}
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="What is blocking this story? (e.g., Pending firewall rule approval, API credentials expired)..."
                className="w-full bg-neutral-950 border border-red-900/70 focus:border-red-500 p-2.5 text-xs text-red-200 rounded outline-none font-sans"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-[#FFCD11] hover:bg-[#ffe169] text-neutral-950 font-bold uppercase tracking-wider text-xs rounded transition-colors shadow"
          >
            <Save className="w-4 h-4" />
            <span>Save Updates to SIT Nexus</span>
          </button>
        </div>
      </div>
    </div>
  );
};
