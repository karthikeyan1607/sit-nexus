import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  WorkItemStory, 
  FilterState, 
  ResourceGroup, 
  StoryStatus, 
  ResourceRecord, 
  ProjectTagConfig 
} from './types';
import { 
  getAuthStatus, 
  getResourcesApi, 
  replaceResourcesApi, 
  addResourceApi, 
  updateResourceApi, 
  deleteResourceApi, 
  resetResourcesApi,
  getProjectsApi,
  addProjectApi,
  toggleHideProjectApi,
  deleteProjectApi,
  restoreAllProjectsApi,
  executeSprintQueryApi,
  updateStoryApi,
  getAreaPathsApi,
  ManagerProfileDTO
} from './utils/api';
import { exportStoriesToCsv } from './utils/storage';
import { INITIAL_RESOURCES } from './data/mockAdoData';
import { 
  getStoredResourceMaster, 
  saveStoredResourceMaster, 
  clearStoredResourceMaster, 
  getDynamicRegions 
} from './utils/resourceMaster';
import { MainNavTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { ResourceMasterView } from './components/ResourceMasterView';
import { ProjectsView } from './components/ProjectsView';
import { SprintClosureView } from './components/SprintClosureView';
import { SettingsView } from './components/SettingsView';
import { StoryDetailModal } from './components/StoryDetailModal';
import { StandupRunnerModal } from './components/StandupRunnerModal';
import { AdoConfigModal } from './components/AdoConfigModal';
import { Footer } from './components/Footer';
import { EasterEggModal } from './components/EasterEggModal';
import { CheckCircle2 } from 'lucide-react';
import { normalize } from './utils/normalize';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<MainNavTab>('sprint');

  // Subtle Easter Egg Modal state
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);

  // Active Manager & ADO Connection state
  const [activeManager, setActiveManager] = useState<ManagerProfileDTO>({
    id: 'mgr-1',
    name: 'Karthikeyan',
    region: 'All',
    organization: 'cat-digital',
    project: 'Cat Digital',
    areaPath: 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
    maskedPat: '••••••••••••••••••••••••9918',
    isConnected: true,
    lastValidatedAt: new Date().toISOString(),
  });

  // Resource Master State (Restored from browser localStorage key 'sit_nexus_resource_master')
  const [resourceMaster, setResourceMaster] = useState<ResourceRecord[]>(() => {
    const stored = typeof window !== 'undefined' ? getStoredResourceMaster() : null;
    return stored && stored.length > 0 ? stored : INITIAL_RESOURCES;
  });
  const [dynamicRegions, setDynamicRegions] = useState<{ region: string; count: number }[]>(() => {
    const stored = typeof window !== 'undefined' ? getStoredResourceMaster() : null;
    const base = stored && stored.length > 0 ? stored : INITIAL_RESOURCES;
    return getDynamicRegions(base);
  });

  // Project Tags state
  const [projectConfigs, setProjectConfigs] = useState<ProjectTagConfig[]>([
    { name: 'Admin Tool', discoveredFromAdo: true, isHidden: false },
    { name: 'DLMA', discoveredFromAdo: true, isHidden: false },
    { name: 'One Site', discoveredFromAdo: true, isHidden: false },
    { name: 'Warranty', discoveredFromAdo: true, isHidden: false },
    { name: 'Customer', discoveredFromAdo: true, isHidden: false },
    { name: 'Access Management', discoveredFromAdo: true, isHidden: false },
  ]);

  // Filter state
  const [filter, setFilter] = useState<FilterState>({
    region: 'All',
    project: 'All Projects',
    sprint: 'Sprint 20 (Sep 30 - Oct 13)',
    iterationPath: 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)',
    areaPath: 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
    searchQuery: '',
    statusFilter: 'All',
  });

  // Data Source mode (Section 46: MOCK MODE vs REAL AZURE DEVOPS MODE)
  const [dataSource, setDataSource] = useState<'mock' | 'azure'>('azure');
  const [availableAreaPaths, setAvailableAreaPaths] = useState<string[]>([
    'CAT Digital',
    'SIT',
    'SIT\\India',
    'SIT\\Europe',
    'SIT\\USA',
  ]);
  const [queryWarnings, setQueryWarnings] = useState<string[]>([]);

  // Stories backlog & grouped resources state (populated via Azure DevOps query)
  const [stories, setStories] = useState<WorkItemStory[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalResources: 0,
    totalStories: 0,
    totalStoryPoints: 0,
    activePoints: 0,
    completedPoints: 0,
    blockedCount: 0,
    reviewedCount: 0,
  });

  // UI state
  const [viewMode, setViewMode] = useState<'resource' | 'table'>('resource');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryStats, setQueryStats] = useState<{
    lastExecutedTime: string | null;
    durationMs: number;
    count: number;
  }>({
    lastExecutedTime: '10:00 AM EST',
    durationMs: 142,
    count: 14,
  });

  // Modals state
  const [selectedStory, setSelectedStory] = useState<WorkItemStory | null>(null);
  const [isStandupRunnerOpen, setIsStandupRunnerOpen] = useState<boolean>(false);
  const [isAdoConfigOpen, setIsAdoConfigOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [queryDiagnostics, setQueryDiagnostics] = useState<any>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // 1. Initial Load: Fetch manager connection, resources, projects, and initial query from Backend
  useEffect(() => {
    async function initPlatform() {
      try {
        // Fetch Auth Status
        const authData = await getAuthStatus().catch(() => null);
        if (authData?.activeManager) {
          setActiveManager(authData.activeManager);
        }
        if (authData && 'dataSource' in authData) {
          setDataSource((authData as { dataSource: 'mock' | 'azure' }).dataSource);
        }

        // Fetch Area Paths (Section 17)
        const areaData = await getAreaPathsApi().catch(() => null);
        if (areaData?.areaPaths && areaData.areaPaths.length > 0) {
          setAvailableAreaPaths(areaData.areaPaths);
        }

        // Check localStorage for sit_nexus_resource_master first (Requirement 5)
        const storedRes = getStoredResourceMaster();
        if (storedRes && storedRes.length > 0) {
          setResourceMaster(storedRes);
          setDynamicRegions(getDynamicRegions(storedRes));
          // Synchronize stored Resource Master with backend query engine
          replaceResourcesApi(storedRes).catch(() => {});
        } else {
          // If no stored Resource Master exists in localStorage, fetch initial backend resources
          const resData = await getResourcesApi().catch(() => null);
          if (resData?.resources) {
            setResourceMaster(resData.resources);
            if (resData.dynamicRegions) {
              setDynamicRegions(resData.dynamicRegions);
            }
          }
        }

        // Fetch Projects
        const projData = await getProjectsApi().catch(() => null);
        if (projData?.projects) {
          setProjectConfigs(projData.projects);
        }

        // Run Initial Query
        await runBackendQuery({
          region: 'All',
          project: 'All Projects',
          sprint: 'Sprint 20 (Sep 30 - Oct 13)',
          iterationPath: 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)',
          areaPath: 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
        });
      } catch (err) {
        console.error('Initial load error:', err);
      }
    }

    initPlatform();
  }, []);

  // Visible projects in filter (excluding hidden)
  const visibleProjects = useMemo(() => {
    return projectConfigs.filter((p) => !p.isHidden).map((p) => p.name);
  }, [projectConfigs]);

  // Execute Query via Backend Query Engine
  const runBackendQuery = async (currentFilter: { region: string; project: string; sprint?: string; iterationPath?: string; areaPath?: string }) => {
    setIsQuerying(true);
    const start = performance.now();

    try {
      const response = await executeSprintQueryApi({
        region: currentFilter.region,
        projectTag: currentFilter.project,
        sprint: currentFilter.sprint || filter.sprint,
        iterationPath: currentFilter.iterationPath || filter.iterationPath,
        areaPath: currentFilter.areaPath || filter.areaPath,
      });

      setStories(response.stories);
      setResourceGroups(response.resources);

      if (response.diagnostics) {
        setQueryDiagnostics(response.diagnostics);
      }

      const reviewedCount = response.resources.filter((r) => r.isReviewed).length;

      setSummaryMetrics({
        ...response.summary,
        reviewedCount,
      });

      // Capture unmatched identity warnings if present (Section 13)
      if ((response as unknown as { warnings?: string[] }).warnings) {
        setQueryWarnings((response as unknown as { warnings: string[] }).warnings);
      }

      const duration = Math.round(performance.now() - start);
      setQueryStats({
        lastExecutedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationMs: duration,
        count: response.stories.length,
      });

      showToast(
        `Azure DevOps WIQL query executed: ${response.stories.length} stories retrieved across ${response.resources.length} resources.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Query error: ${msg}`);
    } finally {
      setIsQuerying(false);
    }
  };

  // Handle filter changes with instant state synchronization (Sections 1, 2, 12, 13)
  const handleFilterChange = (updates: Partial<FilterState>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);

    // If project or region changed, immediately synchronize query & diagnostics and run query!
    if (updates.project !== undefined || updates.region !== undefined) {
      setQueryDiagnostics((prev: any) => ({
        ...prev,
        projectTag: updates.project !== undefined ? updates.project : prev?.projectTag,
        region: updates.region !== undefined ? updates.region : prev?.region,
      }));
      runBackendQuery(newFilter);
    }
  };

  const handleRunQuery = () => {
    runBackendQuery(filter);
  };

  // Filter client-side search & status on top of current query (Sections 3, 7, 8)
  const displayStories = useMemo(() => {
    return (stories || []).filter((story) => {
      if (!story) return false;
      if (filter.statusFilter !== 'All' && normalize(story.status) !== normalize(filter.statusFilter)) {
        return false;
      }
      if (filter.searchQuery.trim()) {
        const q = normalize(filter.searchQuery);
        const matchesId = normalize(story.id).includes(q);
        const matchesTitle = normalize(story.title).includes(q);
        const matchesAssignee = normalize(story.assignedTo).includes(q);
        const matchesTag = normalize(story.tag).includes(q);
        const matchesNotes = normalize(story.standupNotes).includes(q);
        const matchesProject = normalize(story.project).includes(q);
        if (!matchesId && !matchesTitle && !matchesAssignee && !matchesTag && !matchesNotes && !matchesProject) {
          return false;
        }
      }
      return true;
    });
  }, [stories, filter.statusFilter, filter.searchQuery]);

  // Update story status via Backend API
  const handleUpdateStatus = async (storyId: number, newStatus: StoryStatus) => {
    try {
      await updateStoryApi(storyId, { status: newStatus });
      
      // Update in memory
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, status: newStatus } : s))
      );

      setResourceGroups((prev) =>
        prev.map((g) => ({
          ...g,
          stories: g.stories.map((s) => (s.id === storyId ? { ...s, status: newStatus } : s)),
        }))
      );

      showToast(`Story #${storyId} status updated to ${newStatus}`);
    } catch (err) {
      showToast('Failed to update status on server.');
    }
  };

  // Toggle reviewed status for resource in standup
  const handleToggleReviewed = async (resourceName: string) => {
    const targetGroup = resourceGroups.find((r) => r.name === resourceName);
    const newReviewed = targetGroup ? !targetGroup.isReviewed : true;

    setResourceGroups((prev) =>
      prev.map((g) => (g.name === resourceName ? { ...g, isReviewed: newReviewed } : g))
    );

    setSummaryMetrics((prev) => ({
      ...prev,
      reviewedCount: newReviewed ? prev.reviewedCount + 1 : Math.max(0, prev.reviewedCount - 1),
    }));

    showToast(`${resourceName} marked as ${newReviewed ? 'cleared in standup' : 'pending'}`);
  };

  // Save story from detail modal
  const handleSaveStory = async (updatedStory: WorkItemStory) => {
    try {
      await updateStoryApi(updatedStory.id, {
        status: updatedStory.status,
        storyPoints: updatedStory.storyPoints,
        standupNotes: updatedStory.standupNotes,
        blockedReason: updatedStory.blockedReason,
      });

      setStories((prev) => prev.map((s) => (s.id === updatedStory.id ? updatedStory : s)));
      showToast(`Saved updates for story #${updatedStory.id}`);
      handleRunQuery();
    } catch (err) {
      showToast('Failed to save story updates.');
    }
  };

  // Reset standup checks
  const handleResetDailyReview = () => {
    setResourceGroups((prev) => prev.map((g) => ({ ...g, isReviewed: false })));
    setSummaryMetrics((prev) => ({ ...prev, reviewedCount: 0 }));
    showToast('Daily standup review checkmarks reset.');
  };

  // ==========================================
  // Resource Master Management via Backend API & LocalStorage Persistence
  // ==========================================
  const handleReplaceResourceMaster = async (newResources: ResourceRecord[]) => {
    try {
      // 1. Immediately store in browser localStorage under key 'sit_nexus_resource_master' (Requirement 1 & 2)
      saveStoredResourceMaster(newResources);

      // 2. Synchronize with backend API
      await replaceResourcesApi(newResources);
      const data = await getResourcesApi();
      setResourceMaster(data.resources);
      setDynamicRegions(data.dynamicRegions);
      showToast(`Resource Master replaced successfully with ${data.resources.length} resources!`);
      handleRunQuery();
    } catch (err: unknown) {
      setResourceMaster(newResources);
      setDynamicRegions(getDynamicRegions(newResources));
      showToast(`Resource Master saved locally (${newResources.length} resources).`);
    }
  };

  const handleUpdateResource = async (updated: ResourceRecord) => {
    try {
      await updateResourceApi(updated.id, updated);
      setResourceMaster((prev) => {
        const next = prev.map((r) => (r.id === updated.id ? updated : r));
        saveStoredResourceMaster(next);
        return next;
      });
      showToast(`Updated resource "${updated.name}"`);
    } catch (err) {
      showToast('Failed to update resource on server.');
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteResourceApi(id);
      setResourceMaster((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (next.length === 0) {
          clearStoredResourceMaster();
        } else {
          saveStoredResourceMaster(next);
        }
        return next;
      });
      showToast('Resource deleted from Resource Master.');
      handleRunQuery();
    } catch (err) {
      showToast('Failed to delete resource.');
    }
  };

  const handleAddResource = async (newRes: Omit<ResourceRecord, 'id'>) => {
    try {
      const res = await addResourceApi(newRes);
      setResourceMaster((prev) => {
        const next = [res.resource, ...prev];
        saveStoredResourceMaster(next);
        return next;
      });
      showToast(`Resource "${res.resource.name}" added to ${res.resource.region} team.`);
    } catch (err) {
      showToast('Failed to add resource.');
    }
  };

  const handleResetResourceMaster = async () => {
    if (!confirm('Clear uploaded Resource Master and reset to default?')) return;
    try {
      // Clear from browser localStorage (Requirement 16)
      clearStoredResourceMaster();

      await resetResourcesApi();
      const data = await getResourcesApi();
      setResourceMaster(data.resources);
      setDynamicRegions(data.dynamicRegions);
      showToast('Cleared uploaded Resource Master from local storage.');
      handleRunQuery();
    } catch (err) {
      clearStoredResourceMaster();
      setResourceMaster(INITIAL_RESOURCES);
      setDynamicRegions(getDynamicRegions(INITIAL_RESOURCES));
      showToast('Cleared Resource Master.');
    }
  };

  // ==========================================
  // Project Tag Visibility Handlers
  // ==========================================
  const handleToggleHideProject = async (projectName: string) => {
    try {
      await toggleHideProjectApi(projectName);
      setProjectConfigs((prev) =>
        prev.map((p) => (p.name === projectName ? { ...p, isHidden: !p.isHidden } : p))
      );
      showToast(`Toggled visibility for project tag "${projectName}"`);
    } catch (err) {
      showToast('Failed to toggle project visibility.');
    }
  };

  const handleAddProjectTag = async (projectName: string) => {
    try {
      const res = await addProjectApi(projectName);
      setProjectConfigs((prev) => [...prev, res.project]);
      showToast(`Added custom project tag "${projectName}"`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to add project tag.');
    }
  };

  const handleRemoveProjectTag = async (projectName: string) => {
    try {
      await deleteProjectApi(projectName);
      setProjectConfigs((prev) => prev.filter((p) => p.name !== projectName));
      showToast(`Removed project tag "${projectName}" from SIT Nexus`);
    } catch (err) {
      showToast('Failed to remove project tag.');
    }
  };

  const handleRestoreAllProjects = async () => {
    try {
      await restoreAllProjectsApi();
      setProjectConfigs((prev) => prev.map((p) => ({ ...p, isHidden: false })));
      showToast('Restored all project tags to visible.');
    } catch (err) {
      showToast('Failed to restore project tags.');
    }
  };

  // Export current filtered backlog
  const handleExportCsv = () => {
    const filename = `SIT-Nexus-${filter.region}-${filter.project.replace(/\s+/g, '_')}-${filter.sprint}.csv`;
    exportStoriesToCsv(displayStories, filename);
    showToast(`Exported ${displayStories.length} items to CSV`);
  };

  // Connection success callback from modal
  const handleConnectionSuccess = (mgr: ManagerProfileDTO) => {
    setActiveManager(mgr);
    showToast(`Azure DevOps connection verified for ${mgr.name}.`);
    handleRunQuery();
  };

  // Standup Facilitator Completion handler
  const handleFinishStandup = () => {
    setIsStandupRunnerOpen(false);
    setActiveTab('sprint'); // Navigate back to the main SIT Nexus Dashboard/Home page
    showToast('Daily standup session completed.');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRunQuery();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsStandupRunnerOpen(true);
      } else if (e.key === '1') {
        setActiveTab('sprint');
      } else if (e.key === '2') {
        setActiveTab('resources');
      } else if (e.key === '3') {
        setActiveTab('projects');
      } else if (e.key === '4') {
        setActiveTab('closure');
      } else if (e.key === '5') {
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunQuery]);

  return (
    <div className="min-h-screen flex bg-[#F5F6F7] text-[#1F2937] font-sans selection:bg-[#FFCC00] selection:text-[#1C1C1C]">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeManager={activeManager}
        resourceCount={resourceMaster.length}
        onTriggerEasterEgg={() => setIsEasterEggOpen(true)}
      />

      {/* 2. Main Content Application Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar / Minimal Header */}
        <TopHeader
          activeTab={activeTab}
          currentSprint={filter.sprint}
          activeManager={activeManager}
          dataSource={dataSource}
          onOpenSettings={() => setActiveTab('settings')}
          onTriggerEasterEgg={() => setIsEasterEggOpen(true)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-5 md:p-6 flex-1">
            {/* VIEW 1: SPRINT STANDUP DASHBOARD */}
            {activeTab === 'sprint' && (
              <DashboardView
                filter={filter}
                onChangeFilter={handleFilterChange}
                onRunQuery={handleRunQuery}
                isQuerying={isQuerying}
                dynamicRegions={dynamicRegions}
                totalMasterCount={resourceMaster.length}
                availableProjects={visibleProjects}
                availableAreaPaths={availableAreaPaths}
                warnings={queryWarnings}
                resources={resourceGroups}
                stories={displayStories}
                summary={{
                  totalResources: summaryMetrics.totalResources,
                  totalStories: summaryMetrics.totalStories,
                  totalStoryPoints: summaryMetrics.totalStoryPoints,
                }}
                reviewedCount={summaryMetrics.reviewedCount}
                onResetDailyReview={handleResetDailyReview}
                onSelectStory={(story) => setSelectedStory(story)}
                onUpdateStatus={handleUpdateStatus}
                onToggleReviewed={handleToggleReviewed}
                onOpenStandupRunner={() => setIsStandupRunnerOpen(true)}
                onExportCsv={handleExportCsv}
                diagnostics={queryDiagnostics}
              />
            )}

            {/* VIEW 2: RESOURCE MASTER MANAGEMENT */}
            {activeTab === 'resources' && (
              <ResourceMasterView
                resources={resourceMaster}
                stories={stories}
                onReplaceResources={handleReplaceResourceMaster}
                onUpdateResource={handleUpdateResource}
                onDeleteResource={handleDeleteResource}
                onAddResource={handleAddResource}
                onResetToBaseline={handleResetResourceMaster}
              />
            )}

            {/* VIEW 3: PROJECT / TAG INTELLIGENCE */}
            {activeTab === 'projects' && (
              <ProjectsView
                projectConfigs={projectConfigs}
                stories={stories}
                resources={resourceMaster}
                onToggleHideProject={handleToggleHideProject}
                onAddProject={handleAddProjectTag}
                onRemoveProject={handleRemoveProjectTag}
                onRestoreAllProjects={handleRestoreAllProjects}
              />
            )}

            {/* VIEW 4: SPRINT CLOSURE MODULE */}
            {activeTab === 'closure' && (
              <SprintClosureView
                dynamicRegions={dynamicRegions}
                activeManager={activeManager}
                initialIterationPath={filter.iterationPath}
                initialAreaPath={filter.areaPath}
                initialRegion={filter.region === 'All' ? 'All Regions' : filter.region}
                onClosureCompleted={handleRunQuery}
              />
            )}

            {/* VIEW 5: SETTINGS */}
            {activeTab === 'settings' && (
              <SettingsView
                activeManager={activeManager}
                onManagerUpdated={(mgr) => {
                  setActiveManager(mgr);
                  showToast(`Active manager switched to ${mgr.name}`);
                  handleRunQuery();
                }}
              />
            )}
          </div>

          {/* Consistent Global Footer */}
          <Footer />
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border-2 border-[#FFCD11] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#FFCD11] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Story Detail & Edit Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onSaveStory={handleSaveStory}
        />
      )}

      {/* Focused Standup Facilitator Runner Modal */}
      {isStandupRunnerOpen && (
        <StandupRunnerModal
          resources={resourceGroups}
          onClose={() => setIsStandupRunnerOpen(false)}
          onFinish={handleFinishStandup}
          onUpdateStatus={handleUpdateStatus}
          onToggleReviewed={handleToggleReviewed}
          onSelectStory={(story) => setSelectedStory(story)}
        />
      )}

      {/* Azure DevOps Connection & WIQL Settings Modal */}
      {isAdoConfigOpen && (
        <AdoConfigModal
          currentFilter={filter}
          onClose={() => setIsAdoConfigOpen(false)}
          onConnectionSuccess={handleConnectionSuccess}
        />
      )}

      {/* Subtle Easter Egg Modal */}
      <EasterEggModal
        isOpen={isEasterEggOpen}
        onClose={() => setIsEasterEggOpen(false)}
      />

    </div>
  );
}
