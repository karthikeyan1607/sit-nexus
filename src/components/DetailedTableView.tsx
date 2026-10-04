import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Hash,
  FileSpreadsheet
} from 'lucide-react';
import { WorkItemStory, StoryStatus } from '../types';
import { normalize } from '../utils/normalize';

interface DetailedTableViewProps {
  stories: WorkItemStory[];
  onSelectStory: (story: WorkItemStory) => void;
  onUpdateStatus: (storyId: number, newStatus: StoryStatus) => void;
  onExportCsv: () => void;
}

type SortField = 'id' | 'title' | 'assignedTo' | 'region' | 'project' | 'status' | 'storyPoints' | 'tag' | 'lastUpdatedDate';

export const DetailedTableView: React.FC<DetailedTableViewProps> = ({
  stories,
  onSelectStory,
  onUpdateStatus,
  onExportCsv,
}) => {
  const [sortField, setSortField] = useState<SortField>('assignedTo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedStories = useMemo(() => {
    return [...stories].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' || typeof valB === 'string') {
        const strA = normalize(valA);
        const strB = normalize(valB);
        if (strA < strB) return sortAsc ? -1 : 1;
        if (strA > strB) return sortAsc ? 1 : -1;
        return 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [stories, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#9CA3AF] inline ml-1" />;
    }
    return sortAsc 
      ? <ArrowUp className="w-3 h-3 text-[#1C1C1C] inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-[#1C1C1C] inline ml-1" />;
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
      {/* Table Header Bar */}
      <div className="p-3.5 border-b border-[#F1F3F5] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-[#1F2937] font-bold">
            Detailed Sprint Backlog
          </h3>
          <span className="text-[#D1D5DB]">/</span>
          <span className="text-xs text-[#854D0E] font-mono font-bold bg-[#FEF9C3] px-2.5 py-0.5 rounded-full border border-[#FEF08A]">
            {stories.length} Work Items
          </span>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-white hover:bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#1C1C1C]" />
          <span>Export Table to CSV</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono uppercase text-[11px] tracking-wider select-none">
              
              {/* Work Item ID */}
              <th 
                onClick={() => handleSort('id')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] w-28 whitespace-nowrap"
              >
                Work Item ID {renderSortIcon('id')}
              </th>

              {/* Story Title */}
              <th 
                onClick={() => handleSort('title')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] min-w-[240px]"
              >
                Story Title {renderSortIcon('title')}
              </th>

              {/* Assigned To */}
              <th 
                onClick={() => handleSort('assignedTo')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] whitespace-nowrap"
              >
                Assigned To {renderSortIcon('assignedTo')}
              </th>

              {/* Region */}
              <th 
                onClick={() => handleSort('region')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] w-24 whitespace-nowrap"
              >
                Region {renderSortIcon('region')}
              </th>

              {/* Project */}
              <th 
                onClick={() => handleSort('project')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] w-32 whitespace-nowrap"
              >
                Project {renderSortIcon('project')}
              </th>

              {/* Status */}
              <th 
                onClick={() => handleSort('status')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] w-28 whitespace-nowrap"
              >
                Status {renderSortIcon('status')}
              </th>

              {/* Story Points */}
              <th 
                onClick={() => handleSort('storyPoints')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] text-right w-24 whitespace-nowrap"
              >
                Story Points {renderSortIcon('storyPoints')}
              </th>

              {/* Tag */}
              <th 
                onClick={() => handleSort('tag')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] whitespace-nowrap"
              >
                Tag {renderSortIcon('tag')}
              </th>

              {/* Last Updated Date */}
              <th 
                onClick={() => handleSort('lastUpdatedDate')}
                className="py-2.5 px-3.5 font-bold cursor-pointer hover:text-[#111827] whitespace-nowrap w-36"
              >
                Last Updated Date {renderSortIcon('lastUpdatedDate')}
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-[#F1F3F5] font-sans">
            {sortedStories.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#6B7280] font-mono">
                  No work items match current filter criteria.
                </td>
              </tr>
            ) : (
              sortedStories.map((story) => {
                const isBlocked = story.status === 'Blocked';

                return (
                  <tr 
                    key={story.id}
                    className={`hover:bg-[#F9FAFB] transition-colors ${
                      isBlocked ? 'bg-red-50/40' : ''
                    }`}
                  >
                    {/* Work Item ID */}
                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#1C1C1C]">
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Hash className="w-3 h-3 text-[#9CA3AF]" />
                        <span>{story.id}</span>
                      </button>
                    </td>

                    {/* Story Title */}
                    <td className="py-2.5 px-3.5 text-[#1F2937] font-medium">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => onSelectStory(story)}
                          title={story.title}
                          className="text-left hover:text-[#CA8A04] hover:underline cursor-pointer font-medium leading-snug line-clamp-1"
                        >
                          {story.title}
                        </button>
                        {story.standupNotes && (
                          <span className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1 italic">
                            &quot;{story.standupNotes}&quot;
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="py-2.5 px-3.5 text-[#374151] font-semibold whitespace-nowrap">
                      {story.assignedTo}
                    </td>

                    {/* Region */}
                    <td className="py-2.5 px-3.5 text-[#6B7280] font-mono whitespace-nowrap">
                      {story.region}
                    </td>

                    {/* Project */}
                    <td className="py-2.5 px-3.5 text-[#4B5563] font-mono whitespace-nowrap">
                      {story.project}
                    </td>

                    {/* Status with quick inline switcher */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <select
                        value={story.status}
                        onChange={(e) => onUpdateStatus(story.id, e.target.value as StoryStatus)}
                        className={`text-[11px] font-mono font-semibold py-0.5 px-2 rounded-lg border appearance-none cursor-pointer outline-none transition-colors ${
                          story.status === 'Active'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : story.status === 'New'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : story.status === 'Internal Review'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : story.status === 'Resolved'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : story.status === 'Closed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-100 text-red-800 border-red-300 font-bold'
                        }`}
                      >
                        <option value="Active" className="bg-white text-[#1F2937]">Active</option>
                        <option value="New" className="bg-white text-[#1F2937]">New</option>
                        <option value="Internal Review" className="bg-white text-[#1F2937]">Internal Review</option>
                        <option value="Resolved" className="bg-white text-[#1F2937]">Resolved</option>
                        <option value="Closed" className="bg-white text-[#1F2937]">Closed</option>
                        <option value="Blocked" className="bg-white text-red-700 font-bold">Blocked</option>
                      </select>
                    </td>

                    {/* Story Points */}
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#1F2937] whitespace-nowrap">
                      {story.storyPoints}
                    </td>

                    {/* Tag */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {story.tag ? (
                        <span className="text-[10px] text-[#4B5563] font-mono bg-[#F5F6F7] px-1.5 py-0.5 rounded-md border border-[#E5E7EB]">
                          {story.tag}
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>

                    {/* Last Updated Date */}
                    <td className="py-2.5 px-3.5 text-[#6B7280] font-mono text-[11px] whitespace-nowrap">
                      {story.lastUpdatedDate}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
