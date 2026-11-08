# SIT Nexus Corporate Migration — Repository Assessment

Date: 2026-11-08
Working branch: migration/corporate-onprem-day1
Target: CAT-hosted application accessible only through CAT-approved network paths and VDI.
Constraint: preserve the current UI and business workflows; production must use live Azure DevOps data only.

## Product architecture decisions confirmed with the product owner

1. SIT Nexus is one centrally hosted application.
2. Each manager has an independent browser workspace.
3. Resource Master, project/tag visibility, query preferences, standup review progress and SIT Nexus-only story annotations remain in that manager's browser storage.
4. Each manager enters and maintains their own Azure DevOps PAT in browser localStorage. The backend validates and uses the PAT per request but does not persist it.
5. Azure DevOps is the source of truth for work items, assignments, workflow state, story points, iterations, Area Paths and tags.
6. Sprint Closure audit history is persistent on the server but partitioned by a signed HttpOnly browser-profile cookie. Another browser/profile or computer receives a different audit namespace.
7. No shared Resource Master, project settings or global active-manager state.
8. CAT SSO and SQL are not implementation requirements for the current model. CAT network/VDI restrictions must be provided by hosting infrastructure.
9. Audit history is not intended to be accessed from another computer/browser profile.
10. Existing UI and all seven modules must be preserved.

## Current implementation findings

### Runtime
- React 19 + Vite + TypeScript frontend.
- Express + TypeScript backend.
- Azure DevOps REST API integration.
- Migration branch includes a GitHub Actions workflow for tests, typecheck and Vite build.

### Browser-local manager workspace
- sit_nexus_ado_pat: individual PAT.
- sit_nexus_ado_conn: connection metadata.
- sit_nexus_resource_master: Resource Master.
- sit_nexus_project_tags_v1: project/tag visibility.
- sit_nexus_story_annotations_v1: standup notes and blocked reasons.
- sit_nexus_standup_review_v1: daily review progress.
- A browser-local opaque ID is used for local UI profile metadata; the server audit namespace is issued separately as a signed HttpOnly cookie.

### Server persistence
- server/db.ts now contains audit-only JSON persistence; it no longer stores a shared active manager, Resource Master, projects or stories.
- SIT_NEXUS_AUDIT_FILE must point to a CAT-managed persistent volume in production.
- Audit records are partitioned by a signed HttpOnly browser-profile cookie.
- SIT_NEXUS_AUDIT_SESSION_SECRET must be stable across restarts and contain at least 32 bytes.
- The current JSON audit store assumes a single application instance. Multiple instances require shared transactional persistence.

### Azure DevOps and PAT
- PAT is held in browser localStorage as explicitly requested.
- PAT is sent in request headers over HTTPS and is not written to backend persistence, logs or audit records.
- Connection validation is stateless.
- Query, sprint, Area Path, work-item update and Sprint Closure requests receive the current browser's PAT, organization/project settings and Resource Master.
- Azure errors must remain explicit; no fake story/iteration fallback is permitted.
- localStorage remains accessible to same-origin JavaScript. This security trade-off requires CAT security approval and XSS protections.

### Routes and identity
- Shared manager/resource/project APIs have been retired or are no longer mounted.
- Query and Sprint Closure no longer read a global active manager.
- Browser audit ownership is established by signed HttpOnly cookie middleware.
- The cookie is an audit partition key, not a verified CAT employee identity or SSO replacement.
- CAT network access controls are an infrastructure dependency.

## Current release blockers

- Verify all frontend flows against the new browser-local API contract.
- Complete end-to-end PAT expiry/replacement, Azure permission and outage testing.
- Verify audit cookie isolation, persistence across server restart and deployment, and behavior after cookie deletion.
- Validate audit volume permissions, backup and restore on CAT hosting.
- Confirm CAT approves localStorage PAT handling and the proposed network-only access model.
- Confirm deployment is single-instance or replace the JSON audit file with shared transactional storage.
- Complete full multi-user concurrency testing.
- Do not deploy to CAT production before CAT security and infrastructure approval.

## Explicitly not required under the current product model

- SQL persistence for Resource Master, project visibility, manager preferences or work items.
- CAT SSO implementation, unless CAT requires verified employee identity or employee-level authorization.
- Cross-device audit history.
- Centralized manager profiles or shared active-manager state.
