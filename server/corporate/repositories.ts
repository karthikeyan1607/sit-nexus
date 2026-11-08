import type { CorporatePrincipal, Region } from './identity';

/**
 * Database-engine-independent contracts.
 * These interfaces intentionally have no in-memory or JSON fallback.
 * Concrete SQL implementation must enforce transactional writes and scope.
 */
export interface UserRecord {
  id: string;
  corporateSubject: string;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
}
export interface ResourceRecord {
  id: string;
  name: string;
  email: string;
  region: Region;
  active: boolean;
}
export interface ProjectRecord {
  id: string;
  azureDevOpsProjectId: string;
  name: string;
  active: boolean;
}
export interface SprintConfiguration {
  id: string;
  projectId: string;
  region: Region;
  iterationPath: string;
  areaPath: string;
}
export interface AuditEvent {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  occurredAt: string;
  correlationId?: string;
  details: Record<string, unknown>;
}
export interface Transaction {
  users: UserRepository;
  resources: ResourceRepository;
  projects: ProjectRepository;
  sprints: SprintRepository;
  settings: SettingsRepository;
  audit: AuditRepository;
}
export interface Database {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  readonly repositories: Transaction;
  close(): Promise<void>;
}
export interface UserRepository {
  findByCorporateSubject(subject: string): Promise<UserRecord | null>;
}
export interface ResourceRepository {
  list(principal: CorporatePrincipal, filter?: { region?: Region; projectId?: string }): Promise<ResourceRecord[]>;
  replaceMaster(principal: CorporatePrincipal, records: readonly ResourceRecord[]): Promise<void>;
  update(principal: CorporatePrincipal, record: ResourceRecord): Promise<void>;
}
export interface ProjectRepository {
  list(principal: CorporatePrincipal): Promise<ProjectRecord[]>;
}
export interface SprintRepository {
  list(principal: CorporatePrincipal, projectId: string, region?: Region): Promise<SprintConfiguration[]>;
  upsert(principal: CorporatePrincipal, config: SprintConfiguration): Promise<void>;
}
export interface SettingsRepository {
  get(userId: string): Promise<Record<string, unknown>>;
  update(userId: string, settings: Record<string, unknown>): Promise<void>;
}
export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  list(principal: CorporatePrincipal, filter?: { region?: Region; projectId?: string }): Promise<AuditEvent[]>;
}
