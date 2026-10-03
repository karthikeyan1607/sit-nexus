import React, { useState, useMemo } from 'react';
import { 
  FolderKanban, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Info, 
  Users, 
  FileText, 
  BarChart3,
  Layers,
  Search
} from 'lucide-react';
import { ProjectTagConfig, WorkItemStory, ResourceRecord } from '../types';
import { normalize } from '../utils/normalize';

interface ProjectsViewProps {
  projectConfigs: ProjectTagConfig[];
  stories: WorkItemStory[];
  resources: ResourceRecord[];
  onToggleHideProject: (projectName: string) => void;
  onAddProject: (projectName: string) => void;
  onRemoveProject: (projectName: string) => void;
  onRestoreAllProjects: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projectConfigs,
  stories,
  resources,
  onToggleHideProject,
  onAddProject,
  onRemoveProject,
  onRestoreAllProjects,
}) => {
  const [newProjectInput, setNewProjectInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Calculate project metrics from Azure DevOps stories
  const projectMetrics = useMemo(() => {
    const map = new Map<string, {
      storyCount: number;
      pointTotal: number;
      assignees: Set<string>;
      regions: Set<string>;
    }>();

    projectConfigs.forEach((p) => {
      map.set(p.name, {
        storyCount: 0,
        pointTotal: 0,
        assignees: new Set(),
        regions: new Set(),
      });
    });

    stories.forEach((s) => {
      const name = s.project || s.tag;
      if (!map.has(name)) {
        map.set(name, {
          storyCount: 0,
          pointTotal: 0,
          assignees: new Set(),
          regions: new Set(),
        });
      }
      const entry = map.get(name)!;
      entry.storyCount += 1;
      entry.pointTotal += s.storyPoints || 0;
      entry.assignees.add(s.assignedTo);
      entry.regions.add(s.region);
    });

    return map;
  }, [projectConfigs, stories]);

  const handleAdd = () => {
    if (!newProjectInput.trim()) return;
    onAddProject(newProjectInput.trim());
    setNewProjectInput('');
  };

  const filteredProjects = useMemo(() => {
    if (!searchFilter.trim()) return projectConfigs;
    const q = normalize(searchFilter);
    return projectConfigs.filter((p) => normalize(p?.name).includes(q));
  }, [projectConfigs, searchFilter]);

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
      
      {/* Top Header Card */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#1C1C1C]" />
            <span>Projects / Azure DevOps Tags</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Projects represent Azure DevOps tags discovered automatically from user stories. Manage which tags are visible in SIT Nexus.
          </p>
        </div>

        {/* Action: Add Project Tag */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add custom project tag..."
            value={newProjectInput}
            onChange={(e) => setNewProjectInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-9 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#1F2937] focus:bg-white focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none font-mono transition-all"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="h-9 px-3.5 bg-[#FFCD11] hover:bg-[#F2C200] active:scale-[0.98] text-[#1C1C1C] font-mono font-bold text-xs uppercase rounded transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={onRestoreAllProjects}
            className="h-9 px-3 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#1F2937] text-xs font-semibold rounded transition-all cursor-pointer"
            title="Restore all hidden projects"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Safety Notice: Never deletes Azure DevOps tags */}
      <div className="bg-[#FFFBEB] border border-[#FEF3C7] p-3 rounded text-xs text-[#92400E] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <span>
          <strong>Important:</strong> Project management in SIT Nexus only modifies visibility within this application. It will <strong>never delete or modify</strong> the underlying tags inside Azure DevOps.
        </span>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
        <input
          type="text"
          placeholder="Filter project tags..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full h-8 pl-8 pr-3 bg-white border border-[#E5E7EB] text-xs text-[#1F2937] rounded focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded p-12 text-center shadow-sm flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F6F7] flex items-center justify-center text-[#6B7280] mb-3">
            <FolderKanban className="w-5 h-5 text-[#9CA3AF]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">No projects discovered yet.</h3>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
            Projects are automatically discovered from Azure DevOps User Story tags during queries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const stats = projectMetrics.get(project.name);
          const isHidden = project.isHidden;

          return (
            <div
              key={project.name}
              className={`bg-white border rounded p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all ${
                isHidden ? 'opacity-60 border-dashed border-[#D1D5DB]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
              }`}
            >
              <div>
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#F1F3F5]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#1C1C1C] text-[#FFCC00] flex items-center justify-center font-bold text-xs font-mono">
                      {project.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1F2937] tracking-tight">
                        {project.name}
                      </h3>
                      <span className="text-[10px] text-[#6B7280] font-mono">
                        Source: {project.discoveredFromAdo ? 'Azure DevOps' : 'Custom'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                    isHidden 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span>{isHidden ? '○' : '●'}</span>
                    <span>{isHidden ? 'Hidden' : 'Visible'}</span>
                  </span>
                </div>

                {/* Metrics: Resource count · Story count · Story points */}
                <div className="grid grid-cols-3 gap-2 py-3.5 text-center">
                  <div className="bg-[#F9FAFB] p-2 rounded border border-[#F1F3F5]">
                    <span className="text-[10px] font-mono text-[#6B7280] block">Resources</span>
                    <span className="text-base font-bold text-[#1C1C1C] font-mono">
                      {stats?.assignees.size || 0}
                    </span>
                  </div>

                  <div className="bg-[#F9FAFB] p-2 rounded border border-[#F1F3F5]">
                    <span className="text-[10px] font-mono text-[#6B7280] block">Stories</span>
                    <span className="text-base font-bold text-[#1C1C1C] font-mono">
                      {stats?.storyCount || 0}
                    </span>
                  </div>

                  <div className="bg-[#F9FAFB] p-2 rounded border border-[#F1F3F5]">
                    <span className="text-[10px] font-mono text-[#6B7280] block">Points</span>
                    <span className="text-base font-bold text-[#1C1C1C] font-mono">
                      {stats?.pointTotal || 0}
                    </span>
                  </div>
                </div>

                {/* Team contributors list preview */}
                {stats && stats.assignees.size > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-[#6B7280] uppercase block mb-1">
                      Active Contributors:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(stats.assignees).slice(0, 4).map((name) => (
                        <span key={name} className="text-[11px] bg-[#F5F6F7] text-[#374151] px-1.5 py-0.5 rounded border border-[#E5E7EB] font-sans">
                          {name}
                        </span>
                      ))}
                      {stats.assignees.size > 4 && (
                        <span className="text-[10px] text-[#6B7280] font-mono self-center">
                          +{stats.assignees.size - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions: Hide / Restore / Remove */}
              <div className="pt-3 border-t border-[#F1F3F5] mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onToggleHideProject(project.name)}
                  className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors cursor-pointer"
                >
                  {isHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      <span>Show in SIT Nexus</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide from SIT Nexus</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveProject(project.name)}
                  className="p-1 text-[#9CA3AF] hover:text-red-600 rounded transition-colors cursor-pointer"
                  title="Remove from SIT Nexus visibility"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
      )}

    </div>
  );
};
