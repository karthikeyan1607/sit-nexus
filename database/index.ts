/**
 * SIT Nexus Database Module (Specification Section 9 & 45)
 */

export interface DatabaseTables {
  managers: string;
  resources: string;
  project_configurations: string;
  sprint_closure_audits: string;
  sprint_closure_audit_details: string;
}

export const DB_TABLES: DatabaseTables = {
  managers: 'managers',
  resources: 'resources',
  project_configurations: 'project_configurations',
  sprint_closure_audits: 'sprint_closure_audits',
  sprint_closure_audit_details: 'sprint_closure_audit_details',
};
