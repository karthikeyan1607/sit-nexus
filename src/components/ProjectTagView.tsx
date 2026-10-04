import React, { useState, useMemo } from 'react';
import { 
  Tags, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Layers, 
  FolderGit2, 
  Users, 
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { ProjectTagConfig, WorkItemStory, ResourceRecord } from '../types';
import { normalize } from '../utils/normalize';

interface ProjectTagViewProps {
  projectConfigs: ProjectTagConfig[];
  stories: WorkItemStory[];
  resources: ResourceRecord[];
  onToggleHideProject: (projectName: string) => void;
  onAddProject: (projectName: string) => void;
  onRemoveProject: (projectName: string) => void;
  onRestoreAllProjects: () => void;
}

export const ProjectTagView: React.FC<ProjectTagViewProps> = ({
  projectConfigs,
  stories,
  resources,
  onToggleHideProject,
  onAddProject,
  onRemoveProject,
  onRestoreAllProjects,
}) => {
  const [newProjectInput, setNewProjectInput] = useState('');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<string | null>(null);

  // Compute team associations for each project from Azure DevOps stories
  // Story -> Assigned To -> Tag/Project -> Resource Project Association
  const projectStats = useMemo(() => {
    // Map project name -> { totalStories, totalPoints, resourcesByRegion: Map<region, Set<resourceName>> }
    const map = new Map<
      string,
      {
        totalStories: number;
        totalPoints: number;
        resourcesByRegion: Map<string, Set<string>>;
        distinctAssignees: Set<string>;
      }
    >();

    projectConfigs.forEach((p) => {
      map.set(p.name, {
        totalStories: 0,
        totalPoints: 0,
        resourcesByRegion: new Map(),
        distinctAssignees: new Set(),
      });
    });

    stories.forEach((story) => {
      // Find matching project config by tag or project name
      const projName = story.project || story.tag;
      if (!map.has(projName)) {
        map.set(projName, {
          totalStories: 0,
          totalPoints: 0,
          resourcesByRegion: new Map(),
          distinctAssignees: new Set(),
        });
      }

      const entry = map.get(projName)!;
      entry.totalStories += 1;
      entry.totalPoints += story.storyPoints || 0;
      entry.distinctAssignees.add(story.assignedTo);

      // Find region from story or resource master (null-safe)
      const matchedRes = resources.find((r) => normalize(r?.name) === normalize(story?.assignedTo));
      const region = matchedRes ? matchedRes.region : (story.region || 'Unassigned');

      if (!entry.resourcesByRegion.has(region)) {
        entry.resourcesByRegion.set(region, new Set());
      }
      entry.resourcesByRegion.get(region)!.add(story.assignedTo);
    });

    return map;
  }, [projectConfigs, stories, resources]);

  // Handle adding project tag
  const handleAdd = () => {
    const trimmed = newProjectInput.trim();
    if (!trimmed) return;
    onAddProject(trimmed);
    setNewProjectInput('');
  };

  const activeProjectDetail = selectedProjectForDetail 
    ? projectConfigs.find((p) => p.name === selectedProjectForDetail) 
    : projectConfigs[0];

  const activeStats = activeProjectDetail ? projectStats.get(activeProjectDetail.name) : null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-[14px] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-[#FFCD11]" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white font-sans">
              Project / Tag Intelligence & Visibility
            </h2>
            <span className="text-xs font-mono text-[#FFCD11] bg-[#FFCD11]/10 px-2.5 py-0.5 rounded-full border border-[#FFCD11]/30">
              ADO Tags Source of Truth
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Projects in SIT Nexus are automatically discovered from Azure DevOps user story tags. Resource ownership is derived dynamically—a single engineer can work across multiple project tags simultaneously.
          </p>
        </div>

        {/* Add Project Tag Field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add new project tag..."
            value={newProjectInput}
            onChange={(e) => setNewProjectInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="bg-neutral-950 border border-neutral-800 focus:border-[#FFCD11] px-3 py-1.5 rounded-lg text-xs text-neutral-100 outline-none w-48 font-mono"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFCD11] hover:bg-[#ffe169] text-neutral-950 font-bold uppercase text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={onRestoreAllProjects}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-850 hover:bg-neutral-800 rounded-lg border border-neutral-700 cursor-pointer"
            title="Restore all hidden project tags to visible"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Projects List & Associated Team Intelligence Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Discovered Projects & Visibility Controls */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pb-1 border-b border-neutral-800">
            <span className="uppercase font-bold">Discovered Azure DevOps Tags</span>
            <span>{projectConfigs.length} Total</span>
          </div>

          <div className="flex flex-col gap-2">
            {projectConfigs.map((project) => {
              const stats = projectStats.get(project.name);
              const isSelected = (activeProjectDetail?.name === project.name);

              return (
                <div
                  key={project.name}
                  onClick={() => setSelectedProjectForDetail(project.name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-900 border-[#FFCD11] shadow'
                      : project.isHidden
                      ? 'bg-neutral-950/60 border-neutral-850 opacity-60'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className={`w-4 h-4 ${isSelected ? 'text-[#FFCD11]' : 'text-neutral-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white tracking-tight">
                          {project.name}
                        </span>
                        {project.discoveredFromAdo && (
                          <span className="text-[10px] font-mono text-neutral-500">
                            (Auto-Discovered)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono mt-0.5">
                        <span>{stats?.totalStories || 0} stories</span>
                        <span>·</span>
                        <span>{stats?.totalPoints || 0} pts</span>
                        <span>·</span>
                        <span>{stats?.distinctAssignees.size || 0} resources</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Hide / Restore / Remove */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleHideProject(project.name)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        project.isHidden 
                          ? 'text-neutral-500 hover:text-[#FFCD11] bg-neutral-900' 
                          : 'text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800'
                      }`}
                      title={project.isHidden ? 'Restore project to visible in SIT Nexus' : 'Hide project from SIT Nexus filters'}
                    >
                      {project.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveProject(project.name)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Remove project from SIT Nexus (does not delete Azure DevOps tags)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Project Team Association & Breakdown (Multi-resource / multi-project intelligence) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {activeProjectDetail && (
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-sm flex flex-col gap-5">
              
              <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-[#FFCD11] font-semibold">
                      Selected Project Tag:
                    </span>
                    <h3 className="text-xl font-black text-white font-sans">
                      {activeProjectDetail.name}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Dynamically mapped from Azure DevOps Work Item tags.
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                    activeProjectDetail.isHidden
                      ? 'bg-neutral-950 text-neutral-500 border-neutral-800'
                      : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  }`}>
                    {activeProjectDetail.isHidden ? 'Hidden from Filters' : 'Visible in Dashboard'}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">Total Stories</span>
                  <span className="text-2xl font-mono font-bold text-white">
                    {activeStats?.totalStories || 0}
                  </span>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">Story Points</span>
                  <span className="text-2xl font-mono font-bold text-[#FFCD11]">
                    {activeStats?.totalPoints || 0}
                  </span>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">Active Engineers</span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    {activeStats?.distinctAssignees.size || 0}
                  </span>
                </div>
              </div>

              {/* Exact Prompt Example Representation:
                  Admin Tool Team:
                  India: Karthikeyan, Murali
                  Europe: Yevhen
              */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-300 font-bold uppercase">
                  <span>Regional Team Breakdown for {activeProjectDetail.name}</span>
                  <span className="text-neutral-500 font-normal">Derived from Azure DevOps Story Assignees</span>
                </div>

                {activeStats && activeStats.resourcesByRegion.size > 0 ? (
                  <div className="flex flex-col gap-3">
                    {Array.from(activeStats.resourcesByRegion.entries()).map(([region, resourceSet]) => (
                      <div key={region} className="bg-neutral-950 p-3.5 rounded-[10px] border border-neutral-800 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-[#FFCD11]">{region} Team:</span>
                          <span className="text-neutral-400">{resourceSet.size} resources active</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Array.from(resourceSet).map((name) => (
                            <span 
                              key={name}
                              className="text-xs font-mono text-neutral-200 bg-neutral-900 border border-neutral-700 px-2 py-1 rounded-md"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-xl text-center text-xs text-neutral-500 font-mono">
                    No active stories currently tagged with &quot;{activeProjectDetail.name}&quot; in the current sprint iterations.
                  </div>
                )}
              </div>

              {/* Multi-Project Notice */}
              <div className="p-3 bg-neutral-950 rounded-[10px] border border-neutral-800/80 text-[11px] text-neutral-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#FFCD11] shrink-0 mt-0.5" />
                <span>
                  <strong>Multi-Project Rule:</strong> Engineers can contribute across multiple projects concurrently. Workload is dynamically indexed from the assigned story tags in Azure DevOps.
                </span>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
