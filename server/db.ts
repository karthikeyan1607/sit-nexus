import fs from 'fs';
import path from 'path';
import { normalize } from './services/normalize';

/**
 * ------------------------------------------
 * 4.1 / 9. MANAGER ENTITY (Section 9)
 * ------------------------------------------
 */
export interface ManagerProfile {
  id: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'ADMIN';
  region?: string;
  organization?: string;
  project?: string;
  areaPath?: string;
  isConnected?: boolean;
  permissions?: {
    orgAccess: boolean;
    projectAccess: boolean;
    workItemRead: boolean;
    workItemUpdate: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * ------------------------------------------
 * 5. / 9. RESOURCE MASTER ENTITY (Section 5 & 9)
 * Authoritative resource identity without project assignments.
 * ------------------------------------------
 */
export interface StoredResource {
  id: string;
  name: string;
  normalized_name: string;
  region: string;
  email: string;
  normalized_email: string;
  is_active: boolean;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

/**
 * ------------------------------------------
 * 9. PROJECT_CONFIGURATION ENTITY (Section 9)
 * Discovered from Azure DevOps story tags; customized locally.
 * ------------------------------------------
 */
export interface StoredProjectTag {
  id: string;
  manager_id: string;
  tag_value: string;
  display_name: string;
  name: string; // for backward compatibility
  is_visible: boolean;
  isHidden: boolean; // for backward compatibility
  source: 'AZURE_DEVOPS' | 'CUSTOM';
  discoveredFromAdo: boolean; // for backward compatibility
  created_at: string;
  updated_at: string;
}

/**
 * ------------------------------------------
 * AZURE DEVOPS USER STORY ENTITY
 * ------------------------------------------
 */
export interface StoredStory {
  id: number;
  title: string;
  assignedTo: string;
  resourceEmail: string;
  region: string;
  project: string;
  sprint: string;
  status: 'New' | 'Active' | 'Internal Review' | 'Resolved' | 'Closed' | 'Blocked';
  storyPoints: number;
  tag: string;
  tags?: string[];
  iterationPath?: string;
  areaPath?: string;
  lastUpdatedDate: string;
  description?: string;
  acceptanceCriteria?: string;
  standupNotes?: string;
  isReviewedToday?: boolean;
  blockedReason?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

/**
 * ------------------------------------------
 * 9. AUDIT_DETAIL ENTITY (Section 9 & 30)
 * ------------------------------------------
 */
export interface StoredClosureAuditDetail {
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

/**
 * ------------------------------------------
 * 9. AUDIT ENTITY (Section 9 & 30)
 * Zero PAT stored in audit records.
 * ------------------------------------------
 */
export interface StoredClosureAudit {
  id: string;
  manager_id: string;
  manager_name?: string;
  managerName?: string;
  date?: string;
  time?: string;
  sprint: string;
  region: string;
  area_path: string;
  action: string; // 'Internal Review → Closed'
  actionType?: string;
  requested_count: number;
  successful_count: number;
  failed_count: number;
  totalStories?: number;
  totalPoints?: number;
  successfulUpdates?: number;
  failedUpdates?: number;
  skippedUpdates?: number;
  failedItems?: { id: number; title: string; reason: string }[];
  updatedItemIds?: number[];
  started_at: string;
  completed_at: string;
  executedAt?: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  details?: StoredClosureAuditDetail[];
}

interface DatabaseSchema {
  activeManagerId: string;
  dataSource: 'azure';
  managers: ManagerProfile[];
  resources: StoredResource[];
  projectTags: StoredProjectTag[];
  stories: StoredStory[];
  closureAuditLog: StoredClosureAudit[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.sit_nexus_db.json');

// Default initial manager (Section 9 - Single MANAGER entity, Region is a filter, NO PAT in database)
const DEFAULT_MANAGERS: ManagerProfile[] = [];

const EMPTY_MANAGER: ManagerProfile = {
  id: '',
  name: '',
  email: '',
  role: 'MANAGER',
  region: '',
  organization: '',
  project: '',
  areaPath: '',
  isConnected: false,
  permissions: {
    orgAccess: false,
    projectAccess: false,
    workItemRead: false,
    workItemUpdate: false,
  },
  is_active: false,
  created_at: '',
  updated_at: '',
};

const DEFAULT_AUDIT_LOG: StoredClosureAudit[] = [];

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.managers) && Array.isArray(parsed.resources)) {
          // Remove the historical demo identity and fixture rows. Never repopulate
          // an empty resource/project/story store with sample data.
          parsed.managers = parsed.managers.filter((manager: ManagerProfile) =>
            manager.id !== 'mgr-1' &&
            manager.email?.toLowerCase() !== 'karthikeyan@cat.com'
          );
          parsed.activeManagerId = '';

          const demoNames = new Set([
            'murali', 'priya sharma', 'rajesh kumar', 'sneha patel', 'anand varma',
            'arun prakash', 'deepa krishnan', 'ganesh iyer', 'harish nair', 'ishita roy',
            'kavitha sundaram', 'manoj pillai', 'naveen reddy', 'pooja hegde', 'rahul deshmukh',
            'sanjay gupta', 'tanvi sen', 'uday kiran', 'varun joshi', 'vidya venkatesh',
            'vikram seth', 'vivek nambiar', 'praveenraj', 'pragadeesh', 'muralidharan j',
            'yevhen', 'elena rostova', 'sven lindqvist', 'marcus weber', 'astrid olsen',
            'bastian koch', 'camille dubois', 'daria nowak', 'filip hansen', 'lars berg',
            'matteo rossi', 'nathalie meyer', 'piotr kowalski', 'john', 'david miller',
            'emily chen', 'john bradley', 'aaron brooks', 'blake morrison', 'chloe taylor',
            'derek vance', 'grace harrison', 'jessica vance', 'logan hayes', 'mason cooper',
            'rachel adams', 'tyler jenkins', 'wyatt russell', 'karthikeyan r'
          ]);
          const seenResources = new Set<string>();
          parsed.resources = parsed.resources.filter((resource: StoredResource) => {
            if (!resource?.name || demoNames.has(normalize(resource.name))) return false;
            const key = `${normalize(resource.name)}_${normalize(resource.email)}`;
            if (seenResources.has(key)) return false;
            seenResources.add(key);
            return true;
          });

          const seededProjectIds = new Set(['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5', 'proj-6']);
          parsed.projectTags = (Array.isArray(parsed.projectTags) ? parsed.projectTags : [])
            .filter((tag: StoredProjectTag) => !seededProjectIds.has(tag.id));
          // Work items are always live Azure DevOps data, never persisted story snapshots.
          parsed.stories = [];

          if (!Array.isArray(parsed.closureAuditLog)) {
            parsed.closureAuditLog = [];
          } else {
            parsed.closureAuditLog = parsed.closureAuditLog.filter(
              (record: StoredClosureAudit) => record.id !== 'audit-sprint-18-in'
            );
          }

          parsed.dataSource = 'azure';
          parsed.managers = parsed.managers.map((manager: Record<string, unknown>) => {
            delete manager.encryptedPat;
            delete manager.maskedPat;
            return manager;
          });
          this.saveToDisk(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error('Warning: could not read DB file, initializing with defaults');
    }

    const initialData: DatabaseSchema = {
      activeManagerId: '',
      dataSource: 'azure',
      managers: DEFAULT_MANAGERS,
      resources: [],
      projectTags: [],
      stories: [],
      closureAuditLog: DEFAULT_AUDIT_LOG,
    };

    this.saveToDisk(initialData);
    return initialData;
  }

  private saveToDisk(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  // Manager Profiles (Zero PAT stored)
  public getManagers(): ManagerProfile[] {
    return this.data.managers;
  }

  public getActiveManager(): ManagerProfile {
    const found = this.data.managers.find((m) => m.id === this.data.activeManagerId);
    return found || this.data.managers[0] || EMPTY_MANAGER;
  }

  public setActiveManager(id: string): ManagerProfile | null {
    const found = this.data.managers.find((m) => m.id === id);
    if (found) {
      this.data.activeManagerId = id;
      this.saveToDisk(this.data);
      return found;
    }
    return null;
  }

  public upsertManager(manager: ManagerProfile): void {
    const index = this.data.managers.findIndex((m) => m.id === manager.id);
    if (index >= 0) {
      this.data.managers[index] = {
        ...this.data.managers[index],
        ...manager,
        updated_at: new Date().toISOString(),
      };
    } else {
      this.data.managers.push({
        ...manager,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    this.saveToDisk(this.data);
  }

  // Resources (Resource Master: Name, Region, Mail)
  public getResources(): StoredResource[] {
    return this.data.resources;
  }

  public setResources(resources: StoredResource[]): void {
    const now = new Date().toISOString();
    this.data.resources = resources.map((r) => ({
      id: r.id,
      name: r.name,
      normalized_name: r.normalized_name || normalize(r.name).replace(/\s+/g, ' '),
      region: r.region,
      email: r.email,
      normalized_email: r.normalized_email || normalize(r.email),
      is_active: r.status === 'Active',
      status: r.status || 'Active',
      created_at: r.created_at || now,
      updated_at: now,
    }));
    this.saveToDisk(this.data);
  }

  public updateResource(updated: StoredResource): void {
    const idx = this.data.resources.findIndex((r) => r.id === updated.id);
    if (idx !== -1) {
      this.data.resources[idx] = {
        ...this.data.resources[idx],
        ...updated,
        normalized_name: normalize(updated.name).replace(/\s+/g, ' '),
        normalized_email: normalize(updated.email),
        updated_at: new Date().toISOString(),
      };
      this.saveToDisk(this.data);
    }
  }

  public deleteResource(id: string): void {
    this.data.resources = this.data.resources.filter((r) => r.id !== id);
    this.saveToDisk(this.data);
  }

  // Project Configurations (Section 9)
  public getProjectTags(): StoredProjectTag[] {
    return this.data.projectTags;
  }

  public setProjectTags(tags: StoredProjectTag[]): void {
    this.data.projectTags = tags;
    this.saveToDisk(this.data);
  }

  public upsertProjectTag(tagName: string): void {
    if (!tagName || !tagName.trim()) return;
    const cleanTag = tagName.trim();
    const existing = this.data.projectTags.find(
      (p) => normalize(p.name) === normalize(cleanTag) || normalize(p.tag_value) === normalize(cleanTag)
    );
    if (!existing) {
      const now = new Date().toISOString();
      this.data.projectTags.push({
        id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        manager_id: this.data.activeManagerId,
        tag_value: cleanTag,
        display_name: cleanTag,
        name: cleanTag,
        is_visible: true,
        isHidden: false,
        source: 'AZURE_DEVOPS',
        discoveredFromAdo: true,
        created_at: now,
        updated_at: now,
      });
      this.saveToDisk(this.data);
    }
  }

  // Stories
  public getStories(): StoredStory[] {
    return this.data.stories;
  }

  public setStories(stories: StoredStory[]): void {
    this.data.stories = stories;
    this.saveToDisk(this.data);
  }

  public updateStory(id: number, updates: Partial<StoredStory>): StoredStory | null {
    const idx = this.data.stories.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.stories[idx] = {
        ...this.data.stories[idx],
        ...updates,
        lastUpdatedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      this.saveToDisk(this.data);
      return this.data.stories[idx];
    }
    return null;
  }

  // The backend is Azure DevOps-only; no selectable mock data source exists.
  public getDataSource(): 'azure' {
    return 'azure';
  }

  // Live iterations and Area Paths are supplied by Azure DevOps route handlers.
  public getAvailableSprints(): { id: string; name: string; path: string; startDate?: string; endDate?: string }[] {
    return [];
  }

  public getAvailableAreaPaths(): string[] {
    return [];
  }

  // Closure Audit Log (Section 30)
  public getClosureAuditLog(): StoredClosureAudit[] {
    return this.data.closureAuditLog || [];
  }

  public addClosureAuditRecord(record: StoredClosureAudit): void {
    if (!this.data.closureAuditLog) {
      this.data.closureAuditLog = [];
    }
    this.data.closureAuditLog.unshift(record);
    this.saveToDisk(this.data);
  }
}

export const db = new DatabaseService();
