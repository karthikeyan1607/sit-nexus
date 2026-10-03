import fs from 'fs';
import path from 'path';
import { INITIAL_RESOURCES, INITIAL_STORIES } from '../src/data/mockAdoData';
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
  previous_state: string;
  new_state: string;
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
  dataSource: 'mock' | 'azure';
  managers: ManagerProfile[];
  resources: StoredResource[];
  projectTags: StoredProjectTag[];
  stories: StoredStory[];
  closureAuditLog: StoredClosureAudit[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.sit_nexus_db.json');

// Default initial manager (Section 9 - Single MANAGER entity, Region is a filter, NO PAT in database)
const DEFAULT_MANAGERS: ManagerProfile[] = [
  {
    id: 'mgr-1',
    name: 'Karthikeyan',
    email: 'karthikeyan@cat.com',
    role: 'MANAGER',
    region: 'All',
    organization: 'cat-digital',
    project: 'Cat Digital',
    areaPath: 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
    is_active: true,
    isConnected: true,
    permissions: {
      orgAccess: true,
      projectAccess: true,
      workItemRead: true,
      workItemUpdate: true,
    },
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
];

const DEFAULT_AUDIT_LOG: StoredClosureAudit[] = [
  {
    id: 'audit-sprint-18-in',
    manager_id: 'mgr-1',
    managerName: 'Karthikeyan',
    date: '15-Sep-2026',
    time: '17:30 EST',
    sprint: 'Sprint 18',
    region: 'India',
    area_path: 'CAT Digital',
    action: 'Internal Review → Closed',
    actionType: 'Internal Review → Closed',
    requested_count: 42,
    successful_count: 42,
    failed_count: 0,
    totalStories: 42,
    totalPoints: 128,
    successfulUpdates: 42,
    failedUpdates: 0,
    skippedUpdates: 0,
    started_at: '2026-09-15T17:28:00Z',
    completed_at: '2026-09-15T17:30:00Z',
    executedAt: '2026-09-15T17:30:00Z',
    status: 'SUCCESS',
    updatedItemIds: [10320, 10325],
    details: [
      {
        id: 'det-1',
        audit_id: 'audit-sprint-18-in',
        story_id: 10320,
        story_title: 'CAT Mobile Validation',
        resource_name: 'Karthikeyan',
        previous_state: 'Internal Review',
        new_state: 'Closed',
        status: 'SUCCESS',
        processed_at: '2026-09-15T17:29:10Z',
      },
    ],
  },
];

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
        if (parsed.managers && parsed.resources) {
          if (parsed.resources.length < INITIAL_RESOURCES.length) {
            parsed.resources = INITIAL_RESOURCES.map((r) => ({
              id: r.id,
              name: r.name,
              normalized_name: normalize(r.name).replace(/\s+/g, ' '),
              region: r.region,
              email: r.email,
              normalized_email: normalize(r.email),
              is_active: r.status === 'Active',
              status: r.status,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            this.saveToDisk(parsed);
          }
          if (!parsed.closureAuditLog) {
            parsed.closureAuditLog = DEFAULT_AUDIT_LOG;
          }
          if (!parsed.dataSource) {
            parsed.dataSource = (process.env.DATA_SOURCE as 'mock' | 'azure') || 'mock';
          }
          // Ensure managers don't have legacy encryptedPat
          parsed.managers = parsed.managers.map((m: Record<string, unknown>) => {
            delete m.encryptedPat;
            delete m.maskedPat;
            return m;
          });
          return parsed;
        }
      }
    } catch (err) {
      console.error('Warning: could not read DB file, initializing with defaults');
    }

    const now = new Date().toISOString();
    const initialData: DatabaseSchema = {
      activeManagerId: 'mgr-1',
      dataSource: (process.env.DATA_SOURCE as 'mock' | 'azure') || 'mock',
      managers: DEFAULT_MANAGERS,
      resources: INITIAL_RESOURCES.map((r) => ({
        id: r.id,
        name: r.name,
        normalized_name: normalize(r.name).replace(/\s+/g, ' '),
        region: r.region,
        email: r.email,
        normalized_email: normalize(r.email),
        is_active: r.status === 'Active',
        status: r.status,
        created_at: now,
        updated_at: now,
      })),
      projectTags: [
        { id: 'proj-1', manager_id: 'mgr-1', tag_value: 'Admin Tool', display_name: 'Admin Tool', name: 'Admin Tool', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
        { id: 'proj-2', manager_id: 'mgr-1', tag_value: 'DLMA', display_name: 'DLMA', name: 'DLMA', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
        { id: 'proj-3', manager_id: 'mgr-1', tag_value: 'One Site', display_name: 'One Site', name: 'One Site', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
        { id: 'proj-4', manager_id: 'mgr-1', tag_value: 'Warranty', display_name: 'Warranty', name: 'Warranty', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
        { id: 'proj-5', manager_id: 'mgr-1', tag_value: 'Customer', display_name: 'Customer', name: 'Customer', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
        { id: 'proj-6', manager_id: 'mgr-1', tag_value: 'Access Management', display_name: 'Access Management', name: 'Access Management', is_visible: true, isHidden: false, source: 'AZURE_DEVOPS', discoveredFromAdo: true, created_at: now, updated_at: now },
      ],
      stories: INITIAL_STORIES,
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
    return found || this.data.managers[0] || DEFAULT_MANAGERS[0];
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

  // Data Source Mode (Section 20 & 21: MOCK MODE vs REAL AZURE DEVOPS MODE)
  public getDataSource(): 'mock' | 'azure' {
    return this.data.dataSource || 'mock';
  }

  public setDataSource(mode: 'mock' | 'azure'): void {
    this.data.dataSource = mode;
    this.saveToDisk(this.data);
  }

  // Sprints (Section 23: GET /api/sprints)
  public getAvailableSprints(): { id: string; name: string; path: string }[] {
    const area = this.getActiveManager().areaPath || 'CAT Digital';
    return [
      { id: 'sprint-18', name: 'Sprint 18', path: `${area}\\Sprint 18` },
      { id: 'sprint-19', name: 'Sprint 19', path: `${area}\\Sprint 19` },
      { id: 'sprint-20', name: 'Sprint 20', path: `${area}\\Sprint 20` },
      { id: 'sprint-21', name: 'Sprint 21', path: `${area}\\Sprint 21` },
      { id: 'sprint-22', name: 'Sprint 22', path: `${area}\\Sprint 22` },
    ];
  }

  // Area Paths (Section 24: GET /api/area-paths)
  public getAvailableAreaPaths(): string[] {
    return [
      'CAT Digital',
      'SIT',
      'SIT\\India',
      'SIT\\Europe',
      'SIT\\USA',
    ];
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
