# SIT Nexus Corporate Migration — Day 1 Repository Assessment

Date: 2026-11-08
Working branch: migration/corporate-onprem-day1
Target: CAT-managed on-premises deployment; internal and approved remote access; individual Azure DevOps PATs; all-region coordinated rollout.
Constraints: preserve current UI and workflows; production must never use mock or fabricated data.

## Executive assessment

The repository is a React 19 + Vite + TypeScript frontend with an Express/TypeScript server and Azure DevOps integration. It is not yet safe to convert directly into a multi-manager corporate deployment. The highest-risk areas are global manager state, JSON-file persistence, browser-side PAT storage, mock data seeding, and silent fallback behavior.

This branch is an assessment/migration branch. No production branch changes have been made.

## Confirmed findings

### 1. Runtime and project layout
- `package.json` identifies React 19, Vite, Express 4 and TypeScript.
- `server.ts` mounts Express routes for auth, connection, resources, projects and query, and serves the Vite build in production.
- The current test command is `tsx tests/sitNexus.test.ts`.
- The current tests import `MockAzureService` and assert mock-derived stories, resource baselines and iterations. The test suite must be replaced with live-contract/unit tests and isolated fixtures that cannot be served in production.

### 2. Persistence and identity
- `server/db.ts` uses `.sit_nexus_db.json` and Node filesystem read/write operations.
- The database model contains one global `activeManagerId`, shared manager/resource/project/story/audit collections and a `dataSource` mode.
- Initial database creation seeds a default manager, resource master, project tags and stories from `src/data/mockAdoData`.
- Existing manager endpoints create profiles and switch the global active manager. They do not verify the caller's corporate identity.
- This global mutable identity is unsafe for concurrent managers and must be removed before multi-user rollout.

### 3. PAT handling
- `src/services/credentialService.ts` persists PATs in browser `localStorage` and migrates from `sessionStorage`.
- `server/routes/connection.ts` accepts PATs in request bodies for validation.
- `server/routes/query.ts` accepts PATs from `x-ado-pat` or bearer authorization headers.
- PAT values must not be written to logs, application database plaintext, browser persistent storage or audit events. The target should bind a per-user credential to a verified server-side identity/session, using CAT-approved secret storage or session-only storage if persistence is not approved.

### 4. Mock and fabricated data paths
- `server/db.ts` imports `INITIAL_RESOURCES` and `INITIAL_STORIES`, seeds them on initialization, and has repair logic that can repopulate resource data from mock constants.
- `server/routes/auth.ts` and `server/routes/connection.ts` expose mode-switch endpoints for mock/Azure modes.
- `server/routes/resources.ts` imports mock resource constants and exposes a factory-baseline reset endpoint.
- `src/utils/storage.ts` imports `INITIAL_STORIES`, returns seeded stories when browser storage is empty/invalid, and supplies a fabricated default ADO connection configuration.
- `src/App.tsx` imports `INITIAL_RESOURCES`, seeds initial UI state with a default manager, sample project tags, sample sprint/area values and a default connected state.
- `server/routes/query.ts` falls back to standardized database sprints when live Azure iteration retrieval fails.
- `server/adoService.ts` includes a network-error path that can return simulated successful Azure validation.
- These paths must be removed or replaced with explicit empty/not-connected/error states. Empty production data is valid; fabricated data is not.

### 5. API and authorization
- Current APIs are mounted under legacy paths such as `/api/auth`, `/api/connection`, `/api/resources`, `/api/query`, `/api/sprints`, `/api/area-paths` and `/api/audit`.
- The inspected route handlers call global database methods directly and do not show verified user identity or route-level permission enforcement.
- A versioned API should derive the user from a verified corporate session and enforce role, region, project and action permissions on every protected operation.

### 6. Existing SQL migration
- `database/migrations/001_initial_schema.sql` defines managers, resources, project configurations and sprint closure audit tables.
- It is not evidence that the application currently uses SQL; runtime persistence remains the JSON file.
- The existing schema is a starting point only. It needs verified corporate users, role grants, region/project permission scope, per-user settings, session metadata, audit actor identity, and appropriate uniqueness/foreign-key constraints.

## Day 1 decisions and guardrails

1. Preserve existing UI components and business workflows; replace data/authentication plumbing underneath them.
2. Do not replace Azure DevOps live integration logic without first mapping its WIQL and work-item update behavior.
3. No default users, stories, resources, project tags, sprints or successful connection state in production.
4. On Azure DevOps timeout, network failure, invalid PAT or permission denial, return an explicit typed error. Never return mock or cached data as live.
5. Do not migrate old browser storage into corporate production automatically. Any data import must be an explicit, reviewed migration from a trusted source.
6. Database engine remains undecided. Implement repository interfaces and portable migration design; choose PostgreSQL or SQL Server after CAT IT confirms its supported platform.
7. CAT SSO and on-prem infrastructure are unavailable to the developer at this stage. Use a documented identity adapter boundary and local test identity provider only in non-production tests; production must fail closed if corporate identity is not configured.

## Priority implementation sequence

### P0 — Required before any multi-user pilot
- Add verified request-scoped identity and authorization middleware.
- Eliminate global active-manager reads/writes and manager-switch endpoints.
- Replace JSON persistence with a transactional SQL repository.
- Remove mock mode, mock seed data, factory resets and all silent fallback paths.
- Replace browser localStorage PAT storage with the approved individual credential/session design.
- Scope every resource, project, sprint configuration, query and audit operation by authorization.
- Add tests proving cross-user and cross-region isolation.

### P1 — Required before production
- Corporate SSO integration and session lifecycle.
- CAT-approved secret management, TLS, reverse proxy and outbound Azure DevOps connectivity.
- Database backup/restore, operational logging, metrics, alerts and deployment rollback.
- Multi-region UAT, concurrency testing, vulnerability scanning and security approval.

## Day 1 completion criteria
- Migration branch created from `main`.
- Key high-risk source paths inspected and recorded.
- No production code changed without a verified replacement design.
- Database engine and corporate identity integration remain explicit external decisions, not guessed.
