import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface StoredResource {
  id: string; name: string; normalized_name?: string; region: string; email: string;
  normalized_email?: string; is_active?: boolean; status?: 'Active' | 'Inactive';
  created_at?: string; updated_at?: string;
}
export interface StoredStory {
  id: number; title: string; assignedTo: string; resourceEmail: string; region: string;
  project: string; sprint: string;
  status: 'New' | 'Active' | 'Internal Review' | 'Resolved' | 'Closed' | 'Blocked';
  storyPoints: number; tag: string; tags?: string[]; iterationPath?: string; areaPath?: string;
  lastUpdatedDate: string; description?: string; acceptanceCriteria?: string;
  standupNotes?: string; isReviewedToday?: boolean; blockedReason?: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}
export interface StoredClosureAuditDetail {
  id: string; audit_id: string; story_id: number; story_title?: string; resource_name: string;
  region?: string; project?: string; tag?: string; iteration_path?: string; area_path?: string;
  previous_state: string; requested_state?: string; actual_state?: string; new_state: string;
  story_points?: number; executing_user?: string; status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error_message?: string; processed_at: string;
}
export interface StoredClosureAudit {
  id: string; manager_id: string; manager_name?: string; managerName?: string;
  date?: string; time?: string; sprint: string; region: string; area_path: string; action: string;
  actionType?: string; requested_count: number; successful_count: number; failed_count: number;
  totalStories?: number; totalPoints?: number; successfulUpdates?: number; failedUpdates?: number;
  skippedUpdates?: number; failedItems?: { id: number; title: string; reason: string }[];
  updatedItemIds?: number[]; started_at: string; completed_at: string; executedAt?: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'; details?: StoredClosureAuditDetail[];
}
interface AuditFile { version: 1; records: StoredClosureAudit[]; }

/**
 * Durable audit-only persistence. manager_id is an opaque browser-installation
 * owner key, not a verified CAT employee identity. Production must use a CAT-
 * managed persistent volume and a single application instance.
 */
export class AuditStore {
  private readonly filePath: string;
  private records: StoredClosureAudit[];

  constructor(filePath = process.env.SIT_NEXUS_AUDIT_FILE || path.resolve(process.cwd(), '.sit_nexus_audit.json')) {
    this.filePath = path.resolve(filePath);
    this.records = this.load();
  }

  private load(): StoredClosureAudit[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as AuditFile | StoredClosureAudit[];
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      return Array.isArray(records)
        ? records.filter((record) => record && typeof record.manager_id === 'string' && record.manager_id.length > 0)
        : [];
    } catch (error) {
      throw new Error(`Unable to read SIT Nexus audit store: ${error instanceof Error ? error.message : 'unknown storage error'}`);
    }
  }

  assertWritable(): void {
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true });
    const probePath = `${this.filePath}.${process.pid}.${randomUUID()}.probe`;
    const descriptor = fs.openSync(probePath, 'wx', 0o600);
    fs.closeSync(descriptor);
    fs.unlinkSync(probePath);
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify({ version: 1, records: this.records }, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryPath, this.filePath);
  }

  getClosureAuditLog(ownerId: string): StoredClosureAudit[] {
    if (!ownerId) return [];
    return this.records.filter((record) => record.manager_id === ownerId)
      .map((record) => ({ ...record, details: record.details ? [...record.details] : [] }));
  }

  addClosureAuditRecord(record: StoredClosureAudit): void {
    if (!record.manager_id) throw new Error('Audit owner is required.');
    this.records.unshift(record);
    try {
      this.persist();
    } catch (error) {
      this.records.shift();
      throw error;
    }
  }
}
export const db = new AuditStore();
