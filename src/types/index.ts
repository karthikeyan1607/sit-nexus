export type StoryStatus = 'New' | 'Active' | 'Internal Review' | 'Resolved' | 'Closed' | 'Blocked';

export interface ResourceRecord {
  id: string;
  name: string;
  region: string;
  email: string;
  status: 'Active' | 'Inactive';
  addedAt?: string;
}

export interface ResourceValidationError {
  row: number;
  field: 'name' | 'region' | 'email' | 'general';
  message: string;
  value?: string;
}

export interface ResourceUploadPreview {
  validRecords: ResourceRecord[];
  errors: ResourceValidationError[];
  duplicateNames: string[];
  currentCount: number;
  newCount: number;
}

export interface ProjectTagConfig {
  name: string;
  discoveredFromAdo: boolean;
  isHidden: boolean;
  color?: string;
}

export interface WorkItemStory {
  id: number;
  title: string;
  assignedTo: string;
  resourceEmail: string;
  region: string;
  project: string; // Corresponding to Azure DevOps Tag / Project
  sprint: string;
  status: StoryStatus;
  storyPoints: number;
  tag: string;
  lastUpdatedDate: string;
  description?: string;
  acceptanceCriteria?: string;
  standupNotes?: string;
  isReviewedToday?: boolean;
  blockedReason?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

export interface ResourceGroup {
  name: string;
  email: string;
  region: string;
  stories: WorkItemStory[];
  totalPoints: number;
  activePoints: number;
  completedPoints: number;
  blockedPoints: number;
  hasBlockers: boolean;
  isReviewed: boolean;
}

export interface FilterState {
  region: string; // Dynamically generated regions or 'All'
  project: string; // Azure DevOps tag or 'All Projects'
  sprint: string; // Contextual sprint name
  iterationPath: string; // Manual Azure DevOps Iteration Path (Sections 4 & 5)
  areaPath: string; // Manual Azure DevOps Area Path (Section 3)
  searchQuery: string;
  statusFilter: string;
}

export interface AdoConnectionConfig {
  orgUrl: string;
  projectName: string;
  areaPath?: string;
  pat: string;
  isConnected: boolean;
  dataSource?: 'mock' | 'azure';
  lastSyncTimestamp: string | null;
}

export interface SprintClosureAuditDetailRecord {
  id: string;
  audit_id: string;
  story_id: number;
  story_title?: string;
  resource_name: string;
  region?: string;
  project?: string;
  tag?: string;
  iteration_path?: string;
  area_path?: string;
  previous_state: string;
  requested_state?: string;
  actual_state?: string;
  new_state: string;
  story_points?: number;
  executing_user?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error_message?: string;
  processed_at: string;
}

export interface SprintClosureAuditRecord {
  id: string;
  manager_id?: string;
  managerName: string;
  manager_name?: string;
  date: string;
  time: string;
  sprint: string;
  region: string;
  area_path?: string;
  action?: string;
  actionType: string;
  totalStories: number;
  totalPoints: number;
  successfulUpdates: number;
  failedUpdates: number;
  skippedUpdates: number;
  failedItems?: { id: number; title: string; reason: string }[];
  updatedItemIds?: number[];
  executedAt: string;
  status?: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  details?: SprintClosureAuditDetailRecord[];
}

export interface SprintClosurePreview {
  sprint: string;
  region: string;
  actionType: string;
  affectedResourcesCount: number;
  affectedStoriesCount: number;
  totalStoryPoints: number;
  stories: (WorkItemStory & { targetStatus: StoryStatus })[];
}
