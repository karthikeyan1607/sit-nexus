# SIT Nexus Corporate Migration — Database Abstraction and Schema Contract

## Platform decision

The database engine is intentionally not selected yet. Do not assume PostgreSQL or SQL Server is approved. Implement a repository/service boundary and select the concrete driver after CAT IT confirms the supported on-prem database and version.

The logical model below is portable. Physical DDL, identity columns, JSON storage, filtered indexes and migration syntax must be generated for the selected engine.

## Logical entities

| Entity | Key fields | Rules |
|---|---|---|
| users | id, corporate_subject, email, display_name, status | corporate_subject unique and sourced only from verified identity |
| roles | id, code | ADMIN, REGIONAL_MANAGER, READ_ONLY_MANAGER as approved |
| user_roles | user_id, role_id | composite unique; no client role self-assignment |
| projects | id, ado_project_id, name, active | ado_project_id unique |
| user_permissions | user_id, project_id, region_code, permission_code | explicit grants; server-side authorization |
| resources | id, external_identity, display_name, email, region_code, active | no demo seed; master data imported by authorized manager |
| project_tags | id, project_id, tag_name, visible, source | uniqueness within project; ADO-discovered tags reconciled from live source |
| sprint_configurations | id, project_id, region_code, iteration_path, area_path, updated_by | configuration scoped to project and region |
| user_settings | user_id, settings_document, updated_at | personal preferences only; never PAT |
| user_sessions | id, user_id, expires_at, revoked_at | opaque session IDs; secure server-side session store |
| audit_events | id, actor_user_id, action, entity_type, entity_id, correlation_id, details, occurred_at | append-only; never record PAT or authorization headers |
| sprint_closure_audits | id, actor_user_id, project_id, region_code, iteration_path, status, started_at, completed_at | auditable operation history |
| sprint_closure_audit_details | id, audit_id, work_item_id, previous_state, requested_state, actual_state, status, error_code | no secrets; retain enough evidence for partial failure review |

## Credential storage

PAT is not a normal application entity and must not be added as a plaintext column to these tables.

Preferred order:
1. CAT-approved secret vault with per-user secret references and least-privilege access.
2. If vault integration is unavailable, approved server-side encrypted ephemeral/session storage with explicit expiry and key management.
3. If CAT security approves neither, require the user to re-enter the PAT per session and keep it only in process memory for that session.

Do not use browser localStorage, do not send PAT on every query request from the browser, and do not use a shared team PAT.

## Repository interfaces

Define interfaces around use cases rather than exposing a generic mutable database object:

- UserRepository: findByCorporateSubject, getUserRoles, getUserPermissions
- ResourceRepository: listAuthorized, replaceMaster, create, update, deactivate
- ProjectRepository: listAuthorized, reconcileTags, updateVisibility
- SprintConfigurationRepository: listAuthorized, upsert
- UserSettingsRepository: get, update
- AuditRepository: append, listAuthorized
- SessionRepository: create, find, revoke, revokeUserSessions

Every method that returns business data must accept an authenticated principal or an already-validated authorization scope. Avoid methods such as getActiveManager() and setActiveManager().

## Migration safety

- Do not copy seeded/mock stories or fake resources into production.
- Treat Azure DevOps as the source of truth for work items.
- Import resource master only from a manager-approved, validated source file.
- Preserve genuine sprint closure audit records only after validating their provenance.
- Use a dry-run report showing counts, duplicates, rejected rows and source provenance before applying any migration.
- Back up the source and target databases before cutover.
- Use transaction boundaries and rollback/reconciliation scripts.
