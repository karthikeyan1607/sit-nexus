import { WorkItemStory, ResourceRecord, ProjectTagConfig, ResourceGroup, StoryStatus } from '../types';
import { CredentialService } from '../services/credentialService';
import { getStoredResourceMaster, saveStoredResourceMaster, getDynamicRegions, loadProjectTagConfigs, saveProjectTagConfigs } from './resourceMaster';

export interface ManagerProfileDTO {
  id: string; name: string; region: string; organization: string; project: string;
  areaPath?: string; maskedPat?: string; isConnected: boolean; isActive?: boolean;
  lastValidatedAt: string | null;
  permissions?: { orgAccess: boolean; projectAccess: boolean; workItemRead: boolean; workItemUpdate: boolean };
}
export interface QueryApiResponse {
  success: boolean; wiql: string; stories: WorkItemStory[]; resources: ResourceGroup[];
  summary: { totalResources: number; totalStories: number; totalStoryPoints: number; activePoints: number; completedPoints: number; blockedCount: number };
  durationMs: number; manager: { name: string; organization: string; project: string; isConnected: boolean };
  diagnostics?: {
    organization: string; project: string; workItemType: string; areaPath: string; iterationPath: string;
    region: string; projectTag: string; resourceMasterCount: number; regionResourceCount: number;
    generatedWiql: string; returnedWorkItemIdsCount: number; workItemIds: number[];
    retrievedWorkItemsCount: number; matchedResourceCount: number; finalStoryCount: number;
    filterIsolation?: { testA: number; testB: number; testC: number; testD: number; testE: number; testCUnder?: number; testDUnder?: number };
    notes?: string;
  };
}
const API_BASE = '/api';
const getWorkspaceContext = () => {
  const connection = CredentialService.getConnection();
  return {
    organization: connection?.organization || '',
    project: connection?.project || '',
    areaPath: connection?.areaPath || '',
    managerName: 'Manager',
    resourceMaster: getStoredResourceMaster() || [],
  };
};
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const pat = CredentialService.getPat();
  if (pat) headers['x-ado-pat'] = pat;
  return headers;
}
async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || json.error || json.message || `API error (${res.status})`);
  return json as T;
}

export async function validateConnectionApi(data: { organization: string; project: string; pat: string }) {
  const res = await fetch(`${API_BASE}/connection/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await handleResponse<{ success: boolean; data: { connected: boolean; organization: string; project: string; canRead: boolean; canWrite: boolean } }>(res);
  if (json.success && json.data.connected) {
    const previous = CredentialService.getConnection();
    CredentialService.setPat(data.pat);
    CredentialService.setConnection({
      connected: true, organization: json.data.organization, project: json.data.project,
      areaPath: previous?.areaPath || '', canRead: json.data.canRead, canWrite: json.data.canWrite,
      lastValidatedAt: new Date().toISOString(),
    });
  }
  return json;
}
export async function getAuthStatus(): Promise<{ activeManager: ManagerProfileDTO }> {
  // Bootstrap the signed HttpOnly browser audit identity before parallel API calls begin.
  const sessionResponse = await fetch(`${API_BASE}/audit/session`, { headers: getAuthHeaders() });
  await handleResponse<{ success: boolean }>(sessionResponse);
  const connection = CredentialService.getConnection();
  const connected = Boolean(connection?.connected && CredentialService.hasPat());
  return { activeManager: {
    id: CredentialService.getClientId(), name: 'Manager', region: 'All',
    organization: connection?.organization || '', project: connection?.project || '',
    areaPath: connection?.areaPath || '', maskedPat: CredentialService.getMaskedPat() || undefined,
    isConnected: connected, lastValidatedAt: connection?.lastValidatedAt || null,
    permissions: { orgAccess: connected, projectAccess: connected, workItemRead: connected && Boolean(connection?.canRead), workItemUpdate: connected && Boolean(connection?.canWrite) },
  } };
}
export async function disconnectAzureDevOps() {
  CredentialService.disconnect();
  return { success: true, message: 'Azure DevOps connection removed from this browser.' };
}

// Resource Master is browser-local and independent for each manager.
export async function getResourcesApi() {
  const resources = getStoredResourceMaster() || [];
  return { resources, totalCount: resources.length, dynamicRegions: getDynamicRegions(resources) };
}
export async function replaceResourcesApi(resources: ResourceRecord[]) {
  saveStoredResourceMaster(resources);
  return { success: true, totalCount: resources.length };
}
export async function addResourceApi(resource: Omit<ResourceRecord, 'id'>) {
  const created = { ...resource, id: `res-${crypto.randomUUID()}` };
  saveStoredResourceMaster([created, ...(getStoredResourceMaster() || [])]);
  return { success: true, resource: created };
}
export async function updateResourceApi(id: string, updates: Partial<ResourceRecord>) {
  const next = (getStoredResourceMaster() || []).map((item) => item.id === id ? { ...item, ...updates, id } : item);
  saveStoredResourceMaster(next);
  const resource = next.find((item) => item.id === id);
  if (!resource) throw new Error('Resource not found in this browser Resource Master.');
  return { success: true, resource };
}
export async function deleteResourceApi(id: string) {
  saveStoredResourceMaster((getStoredResourceMaster() || []).filter((item) => item.id !== id));
  return { success: true, message: 'Resource removed from this browser.' };
}
export async function resetResourcesApi() {
  saveStoredResourceMaster([]);
  return { success: true, totalCount: 0 };
}

// Project visibility preferences are also browser-local.
const getProjectConfigs = () => loadProjectTagConfigs([]);
export async function getProjectsApi() {
  const projects = getProjectConfigs();
  return { projects, visibleProjects: projects.filter((item) => !item.isHidden).map((item) => item.name), totalCount: projects.length };
}
export async function addProjectApi(name: string) {
  const projects = getProjectConfigs();
  if (projects.some((item) => item.name.toLowerCase() === name.trim().toLowerCase())) throw new Error(`Project tag "${name}" already exists.`);
  const project = { name: name.trim(), discoveredFromAdo: false, isHidden: false };
  saveProjectTagConfigs([...projects, project]);
  return { success: true, project };
}
export async function toggleHideProjectApi(name: string) {
  const projects = getProjectConfigs();
  const project = projects.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!project) throw new Error('Project tag not found.');
  const updated = { ...project, isHidden: !project.isHidden };
  saveProjectTagConfigs(projects.map((item) => item.name === name ? updated : item));
  return { success: true, project: updated };
}
export async function deleteProjectApi(name: string) {
  saveProjectTagConfigs(getProjectConfigs().filter((item) => item.name.toLowerCase() !== name.toLowerCase()));
  return { success: true, message: 'Project tag removed from this browser.' };
}
export async function restoreAllProjectsApi() {
  saveProjectTagConfigs(getProjectConfigs().map((item) => ({ ...item, isHidden: false })));
  return { success: true, message: 'All project tags restored to visible.' };
}

export async function executeSprintQueryApi(params: { region: string; projectTag: string; sprint?: string; iterationPath?: string; areaPath?: string }): Promise<QueryApiResponse> {
  const res = await fetch(`${API_BASE}/query`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...getWorkspaceContext(), ...params }) });
  return handleResponse<QueryApiResponse>(res);
}
export async function updateStoryApi(id: number, updates: { status?: StoryStatus; storyPoints?: number; standupNotes?: string; blockedReason?: string; isReviewedToday?: boolean }) {
  if (updates.status === undefined && updates.storyPoints === undefined) return { success: true, story: { id } as WorkItemStory };
  const context = getWorkspaceContext();
  const res = await fetch(`${API_BASE}/query/stories/${id}`, {
    method: 'PATCH', headers: getAuthHeaders(),
    body: JSON.stringify({ status: updates.status, storyPoints: updates.storyPoints, organization: context.organization, project: context.project }),
  });
  return handleResponse<{ success: boolean; story: WorkItemStory }>(res);
}

export interface SprintClosureDiagnosticsDTO {
  organization: string; project: string; workItemType: string; areaPath: string; iterationPath: string;
  region: string; projectFilter: string; wiqlResults: number; internalReviewCount: number;
  resourceMasterMatchedCount: number; regionFilteredCount: number; eligibleCount: number;
  filterIsolation?: { stageA_ProjectUserStory: number; stageB_IterationPath: number; stageC_AreaPath: number; stageD_BothPaths: number; stageE_InternalReview: number; stageF_ResourceMasterMatched: number };
}
export interface SprintClosurePreviewDTO {
  success: boolean; sprint: string; iterationPath: string; areaPath: string; region: string; actionType: string;
  targetNewState: string; affectedResourcesCount: number; affectedStoriesCount: number; totalStoryPoints: number;
  stories: (WorkItemStory & { targetStatus: StoryStatus })[]; allRetrievedStories?: WorkItemStory[];
  ineligibleStories?: (WorkItemStory & { reason: string })[]; diagnostics?: SprintClosureDiagnosticsDTO;
  wiql?: string; managerCanUpdate: boolean; dataSource: 'azure' | 'mock';
}
export async function getClosurePreviewApi(params: { sprint?: string; iterationPath?: string; areaPath?: string; region: string; actionType?: string }): Promise<SprintClosurePreviewDTO> {
  const res = await fetch(`${API_BASE}/query/sprint-close/preview`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...getWorkspaceContext(), ...params }) });
  return handleResponse<SprintClosurePreviewDTO>(res);
}
export async function executeClosureApi(params: { sprint?: string; iterationPath?: string; areaPath?: string; region: string; actionType?: string; storyIds?: number[] }) {
  const res = await fetch(`${API_BASE}/query/sprint-close/execute`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...getWorkspaceContext(), ...params }) });
  return handleResponse<{ success: boolean; message: string; summary: { sprint: string; region: string; successfulUpdates: number; skippedUpdates: number; failedUpdates: number; totalPoints: number; failedItems: { id: number; title: string; reason: string }[]; auditRecordId: string } }>(res);
}
export async function getSprintsApi() {
  const context = getWorkspaceContext();
  const query = new URLSearchParams({ organization: context.organization, project: context.project });
  const res = await fetch(`${API_BASE}/sprints?${query}`, { headers: getAuthHeaders() });
  return handleResponse<{ success: boolean; source?: string; sprints: { id: string; name: string; path: string; startDate?: string; endDate?: string; isCurrent?: boolean }[] }>(res);
}
export async function getAreaPathsApi() {
  const context = getWorkspaceContext();
  const query = new URLSearchParams({ organization: context.organization, project: context.project });
  const res = await fetch(`${API_BASE}/area-paths?${query}`, { headers: getAuthHeaders() });
  return handleResponse<{ success: boolean; source?: string; areaPaths: string[] }>(res);
}
export async function getStoriesFilteredApi(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/query/stories?${query}`, { headers: getAuthHeaders() });
  return handleResponse<{ success: boolean; totalCount: number; stories: WorkItemStory[] }>(res);
}
export async function getClosureHistoryApi() {
  const res = await fetch(`${API_BASE}/query/sprint-close/history`, { headers: getAuthHeaders() });
  return handleResponse<{ history: import('../types').SprintClosureAuditRecord[]; totalCount: number }>(res);
}
