import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Hash, 
  User,
  Check
} from 'lucide-react';
import { ResourceGroup, WorkItemStory, StoryStatus } from '../types';
import { SitNexusBrandLockup } from './SitNexusBrandLockup';
import { Footer } from './Footer';

interface StandupRunnerModalProps {
  resources: ResourceGroup[];
  onClose: () => void;
  onFinish?: () => void;
  onUpdateStatus: (storyId: number, newStatus: StoryStatus) => void;
  onToggleReviewed: (resourceName: string) => void;
  onSelectStory: (story: WorkItemStory) => void;
}

export const StandupRunnerModal: React.FC<StandupRunnerModalProps> = ({
  resources,
  onClose,
  onFinish,
  onUpdateStatus,
  onToggleReviewed,
  onSelectStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentResource = resources[currentIndex];

  const handleSelectSpeaker = (index: number) => {
    setCurrentIndex(index);
  };

  // Complete facilitator session and navigate to Dashboard
  const handleFinish = () => {
    try {
      if (currentResource && !currentResource.isReviewed) {
        onToggleReviewed(currentResource.name);
      }
      if (onFinish) {
        onFinish();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error during finish standup:', err);
      onClose();
    }
  };

  const handleNext = () => {
    if (currentResource && !currentResource.isReviewed) {
      onToggleReviewed(currentResource.name);
    }
    if (currentIndex < resources.length - 1) {
      handleSelectSpeaker(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectSpeaker(currentIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentResource, resources]);

  if (!currentResource) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
        <div className="bg-white border border-[#E5E7EB] p-8 rounded-xl shadow-xl text-center max-w-sm w-full">
          <p className="text-[#1E293B] text-sm font-bold">No resources available</p>
          <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
            Import Resource Master data or run an Azure DevOps query to populate resources for the standup.
          </p>
          <button 
            type="button"
            onClick={onClose} 
            className="mt-5 px-5 py-2 bg-[#FFCD11] hover:bg-[#F2C200] active:scale-[0.98] text-[#1C1C1C] font-mono font-bold text-xs uppercase rounded-lg transition-all shadow-xs cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F3F4F6] text-[#1F2937] select-none">
      
      {/* Top Standup Bar */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-3.5 flex items-center justify-between shadow-xs">
        
        {/* Left: Brand + Standup Progress */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SitNexusBrandLockup size="sm" showSubtitle={false} />
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#374151]">
              Live Standup Facilitator
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#6B7280]">
            <span>Resource {currentIndex + 1} of {resources.length}</span>
            <span className="text-[#D1D5DB]">·</span>
            <span>
              ({resources.filter(r => r.isReviewed).length} reviewed)
            </span>
          </div>
        </div>

        {/* Right: Close Standup & Keyboard Shortcuts */}
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-[11px] text-[#9CA3AF] font-mono">
            Keys: ← Prev | → Next | Esc Exit
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] hover:text-[#111827] transition-colors cursor-pointer"
            title="Exit Standup Facilitator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Main Runner Body */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-between overflow-y-auto">
        
        {/* Current Speaker Banner Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#F1F3F5] gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#FEF9C3] border-2 border-[#FFCD11] rounded-xl flex items-center justify-center font-mono font-black text-xl text-[#854D0E] shrink-0">
                {currentResource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                    {currentResource.name}
                  </h2>
                  <span className="text-sm font-mono text-[#6B7280]">
                    · {currentResource.region}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                  {currentResource.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:flex-col sm:items-end">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#1C1C1C] font-mono">
                  {currentResource.totalPoints}
                </span>
                <span className="text-xs font-mono text-[#6B7280] uppercase">Story Points</span>
              </div>
              <span className="text-xs font-mono text-[#6B7280]">
                {currentResource.stories.length} Work Items Assigned
              </span>
            </div>
          </div>

          {/* Stories List for Current Resource */}
          <div className="pt-6">
            <div className="text-xs font-mono uppercase tracking-wider text-[#6B7280] font-bold mb-4 flex items-center justify-between">
              <span>Active Sprint Stories</span>
              <span className="text-[#9CA3AF] font-normal">Click status to update during discussion</span>
            </div>

            <div className="flex flex-col gap-3">
              {currentResource.stories.map((story) => (
                <div 
                  key={story.id} 
                  className="bg-[#F9FAFB] hover:bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 text-xs font-mono text-[#6B7280]">
                      <span className="font-bold text-[#1C1C1C]">#{story.id}</span>
                      <span>·</span>
                      <span className="text-[#4B5563] font-medium">{story.project}</span>
                      <span>·</span>
                      <span>{story.tag}</span>
                    </div>

                    <h4 
                      onClick={() => onSelectStory(story)}
                      className="text-base font-semibold text-[#1F2937] hover:text-[#B45309] cursor-pointer transition-colors"
                    >
                      {story.title}
                    </h4>

                    {story.standupNotes && (
                      <p className="text-xs text-[#6B7280] mt-1 italic">
                        &quot;{story.standupNotes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Status & Points Controls */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <select
                      value={story.status}
                      onChange={(e) => onUpdateStatus(story.id, e.target.value as StoryStatus)}
                      aria-label="Story Status"
                      className={`text-xs font-mono font-bold py-1.5 px-3 min-w-[110px] rounded-lg border appearance-none cursor-pointer outline-none transition-colors ${
                        story.status === 'Active'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : story.status === 'New'
                          ? 'bg-sky-50 text-sky-700 border-sky-300'
                          : story.status === 'Internal Review'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : story.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : story.status === 'Closed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-red-100 text-red-800 border-red-400 font-bold'
                      }`}
                    >
                      <option value="Active" className="bg-white text-[#1F2937]">In Progress</option>
                      <option value="New" className="bg-white text-[#1F2937]">New</option>
                      <option value="Internal Review" className="bg-white text-[#1F2937]">Internal Review</option>
                      <option value="Resolved" className="bg-white text-[#1F2937]">Resolved</option>
                      <option value="Closed" className="bg-white text-[#1F2937]">Closed</option>
                      <option value="Blocked" className="bg-white text-red-700 font-bold">Blocked</option>
                    </select>

                    <span className="text-xs font-mono font-bold text-[#374151] bg-[#F3F4F6] px-3 py-1.5 rounded-lg border border-[#E5E7EB]">
                      {story.storyPoints ?? 0} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-xs">
          
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-40 text-[#374151] text-xs font-mono font-bold uppercase rounded-lg border border-[#D1D5DB] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Resource</span>
          </button>

          {/* Quick Jump Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#6B7280] uppercase">Jump to:</span>
            <select
              value={currentIndex}
              onChange={(e) => handleSelectSpeaker(Number(e.target.value))}
              aria-label="Jump to Resource"
              className="bg-white border border-[#D1D5DB] text-xs font-semibold text-[#1F2937] py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] transition-all"
            >
              {resources.map((r, i) => (
                <option key={r.name} value={i} className="bg-white text-[#1F2937]">
                  {i + 1}. {r.name} ({r.region}) {r.isReviewed ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={currentIndex === resources.length - 1 ? handleFinish : handleNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FFCD11] hover:bg-[#F2C200] active:scale-[0.98] text-[#1C1C1C] text-xs font-mono font-black uppercase rounded-lg transition-all shadow-xs cursor-pointer"
            title={currentIndex === resources.length - 1 ? 'Complete standup session and navigate to Dashboard' : 'Move to next resource'}
          >
            <span>{currentIndex === resources.length - 1 ? 'Finish Standup' : 'Next Resource →'}</span>
          </button>

        </div>

        {/* Facilitator Footer using consistent Footer component */}
        <div className="mt-3">
          <Footer className="border-0 bg-transparent py-1 shadow-none" />
        </div>

      </div>
    </div>
  );
};
