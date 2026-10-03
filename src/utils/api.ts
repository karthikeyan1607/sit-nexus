import { 
  WorkItemStory, 
  ResourceRecord, 
  ProjectTagConfig, 
  ResourceGroup,
  StoryStatus 
} from '../types';
import { CredentialService } from '../services/credentialService';

export interface ManagerProfileDTO {
  id: string;
  name: string;
  region: string;
  organization: string;
  project: string;
  areaPath?: string;
  maskedPat?: string;
  isConnected: boolean;
  isActive?: boolean;
  lastValidatedAt: string | null;
  permissions?: {
    orgAccess: boolean;
    projectAccess: boolean;
    workItemRead: boolean;
    workItemUpdate: boolean;
  };
}

export interface QueryApiResponse {
  success: boolean;
  wiql: string;
  stories: WorkItemStory[];
  resources: ResourceGroup[];
  summary: {
    totalResources: number;
    totalStories: number;
    totalStoryPoints: number;
    activePoints: number;
    completedPoints: number;
    blockedCount: number;
  };
  durationMs: number;
  manager: {
    name: string;
    organization: string;
    project: string;
    isConnected: boolean;
  };
  diagnostics?: {
    organization: string;
    project: string;
    workItemType: string;
    areaPath: string;
    iterationPath: string;
    region: string;
    projectTag: string;
    resourceMasterCount: number;
    regionResourceCount: number;
    generatedWiql: string;
    returnedWorkItemIdsCount: number;
    workItemIds: number[];
    retrievedWorkItemsCount: number;
    matchedResourceCount: number;
    finalStoryCount: number;
    filterIsolation?: {
      testA: number;
      testB: number;
      testC: number;
      testD: number;
      testE: number;
      testCUnder?: number;
      testDUnder?: number;
    };
    notes?: string;
  };
}

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const pat = CredentialService.getPat();
  if (pat) {
    headers['x-ado-pat'] = pat;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error?.message || json.error || json.message || `API error (${res.status})`;
    throw new Error(errorMsg);
  }
  return json;
}

// ---------------------------------------------
// SprintSync Connection APIs (Section 17 & 18)
// ---------------------------------------------

export async function validateConnectionApi(data: {
  organization: string;
  project: string;
  pat: string;
}): Promise<{
  success: boolean;
  data: {
    connected: boolean;
    organization: string;
    project: string;
    canRead: boolean;
    canWrite: boolean;
  };
}> {
  const res = await fetch(`${API_BASE}/connection/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await handleResponse<{
    success: boolean;
    data: {
      connected: boolean;
      organization: string;
      project: string;
      canRead: boolean;
      canWrite: boolean;
    };
  }>(res);

  if (json.success && json.data.connected) {
    // Save PAT in browser sessionStorage for active session only (Section 3 & 4)
    CredentialService.setPat(data.pat);
    CredentialService.setConnection({
      connected: true,
      organization: json.data.organization,
      project: json.data.project,
      canRead: json.data.canRead,
      canWrite: json.data.canWrite,
      lastValidatedAt: new Date().toISOString(),
    });
  }

  return json;
}

// ---------------------------------------------
// Auth & Connection APIs
// ---------------------------------------------

export async function getAuthStatus(): Promise<{ activeManager: ManagerProfileDTO }> {
  const res = await fetch(`${API_BASE}/auth/status`);
  return handleResponse(res);
}

export async function getManagers(): Promise<{ managers: ManagerProfileDTO[]; activeManagerId: string }> {
  const res = await fetch(`${API_BASE}/auth/managers`);
  return handleResponse(res);
}

export async function switchManager(managerId: string): Promise<{ activeManager: ManagerProfileDTO; message: string }> {
  const res = await fetch(`${API_BASE}/auth/managers/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ managerId }),
  });
  return handleResponse(res);
}

export async function createManager(data: { name: string; region: string; organization?: string; project?: string }) {
  const res = await fetch(`${API_BASE}/auth/managers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function connectAzureDevOps(data: {
  organization: string;
  project: string;
  areaPath?: string;
  pat: string;
  managerId?: string;
  managerName?: string;
  region?: string;
}): Promise<{ success: boolean; message: string; manager: ManagerProfileDTO }> {
  const res = await fetch(`${API_BASE}/auth/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function disconnectAzureDevOps(): Promise<{ success: boolean; message: string }> {
  CredentialService.disconnect();
  return { success: true, message: 'Azure DevOps connection removed from session.' };
}

// ---------------------------------------------
// Resource Master APIs
// ---------------------------------------------

export async function getResourcesApi(): Promise<{
  resources: ResourceRecord[];
  totalCount: number;
  dynamicRegions: { region: string; count: number }[];
}> {
  const res = await fetch(`${API_BASE}/resources`);
  return handleResponse(res);
}

export async function replaceResourcesApi(resources: ResourceRecord[]): Promise<{ success: boolean; totalCount: number }> {
  const res = await fetch(`${API_BASE}/resources/replace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resources }),
  });
  return handleResponse(res);
}

export async function addResourceApi(resource: Omit<ResourceRecord, 'id'>): Promise<{ success: boolean; resource: ResourceRecord }> {
  const res = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resource),
  });
  return handleResponse(res);
}

export async function updateResourceApi(id: string, updates: Partial<ResourceRecord>): Promise<{ success: boolean; resource: ResourceRecord }> {
  const res = await fetch(`${API_BASE}/resources/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteResourceApi(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/resources/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function resetResourcesApi(): Promise<{ success: boolean; totalCount: number }> {
  const res = await fetch(`${API_BASE}/resources/reset`, { method: 'POST' });
  return handleResponse(res);
}

// ---------------------------------------------
// Project / Tag APIs
// ---------------------------------------------

export async function getProjectsApi(): Promise<{
  projects: ProjectTagConfig[];
  visibleProjects: string[];
  totalCount: number;
}> {
  const res = await fetch(`${API_BASE}/projects`);
  return handleResponse(res);
}

export async function addProjectApi(name: string): Promise<{ success: boolean; project: ProjectTagConfig }> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function toggleHideProjectApi(name: string): Promise<{ success: boolean; project: ProjectTagConfig }> {
  const res = await fetch(`${API_BASE}/projects/toggle-hide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function deleteProjectApi(name: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function restoreAllProjectsApi(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/restore-all`, { method: 'POST' });
  return handleResponse(res);
}

// ---------------------------------------------
// Query & Story Execution APIs
// ---------------------------------------------

export async function executeSprintQueryApi(params: {
  region: string;
  projectTag: string;
  sprint?: string;
  iterationPath?: string;
  areaPath?: string;
}): Promise<QueryApiResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function updateStoryApi(id: number, updates: {
  status?: StoryStatus;
  storyPoints?: number;
  standupNotes?: string;
  blockedReason?: string;
  isReviewedToday?: boolean;
}): Promise<{ success: boolean; story: WorkItemStory }> {
  const res = await fetch(`${API_BASE}/query/stories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export interface SprintClosureDiagnosticsDTO {
  organization: string;
  project: string;
  workItemType: string;
  areaPath: string;
  iterationPath: string;
  region: string;
  projectFilter: string;
  wiqlResults: number;
  internalReviewCount: number;
  resourceMasterMatchedCount: number;
  regionFilteredCount: number;
  eligibleCount: number;
  filterIsolation?: {
    stageA_ProjectUserStory: number;
    stageB_IterationPath: number;
    stageC_AreaPath: number;
    stageD_BothPaths: number;
    stageE_InternalReview: number;
    stageF_ResourceMasterMatched: number;
  };
}

export interface SprintClosurePreviewDTO {
  success: boolean;
  sprint: string;
  iterationPath: string;
  areaPath: string;
  region: string;
  actionType: string;
  targetNewState: string;
  affectedResourcesCount: number;
  affectedStoriesCount: number;
  totalStoryPoints: number;
  stories: (WorkItemStory & { targetStatus: StoryStatus })[];
  allRetrievedStories?: WorkItemStory[];
  ineligibleStories?: (WorkItemStory & { reason: string })[];
  diagnostics?: SprintClosureDiagnosticsDTO;
  wiql?: string;
  managerCanUpdate: boolean;
  dataSource: 'azure' | 'mock';
}

export async function getClosurePreviewApi(params: {
  sprint?: string;
  iterationPath?: string;
  areaPath?: string;
  region: string;
  actionType?: string;
}): Promise<SprintClosurePreviewDTO> {
  const res = await fetch(`${API_BASE}/query/sprint-close/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function executeClosureApi(params: {
  sprint?: string;
  iterationPath?: string;
  areaPath?: string;
  region: string;
  actionType?: string;
  storyIds?: number[];
}): Promise<{
  success: boolean;
  message: string;
  summary: {
    sprint: string;
    region: string;
    successfulUpdates: number;
    skippedUpdates: number;
    failedUpdates: number;
    totalPoints: number;
    failedItems: { id: number; title: string; reason: string }[];
    auditRecordId: string;
  };
}> {
  const res = await fetch(`${API_BASE}/query/sprint-close/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function switchDataSourceModeApi(mode: 'mock' | 'azure'): Promise<{ success: boolean; message: string; dataSource: 'mock' | 'azure' }> {
  const res = await fetch(`${API_BASE}/auth/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return handleResponse(res);
}

export async function getSprintsApi(): Promise<{ success: boolean; sprints: { id: string; name: string; path: string }[] }> {
  const res = await fetch(`${API_BASE}/sprints`);
  return handleResponse(res);
}

export async function getAreaPathsApi(): Promise<{ success: boolean; areaPaths: string[] }> {
  const res = await fetch(`${API_BASE}/area-paths`);
  return handleResponse(res);
}

export async function getStoriesFilteredApi(params: Record<string, string>): Promise<{
  success: boolean;
  totalCount: number;
  stories: WorkItemStory[];
}> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/query/stories?${query}`);
  return handleResponse(res);
}

export async function getClosureHistoryApi(): Promise<{
  history: import('../types').SprintClosureAuditRecord[];
  totalCount: number;
}> {
  const res = await fetch(`${API_BASE}/query/sprint-close/history`);
  return handleResponse(res);
}

