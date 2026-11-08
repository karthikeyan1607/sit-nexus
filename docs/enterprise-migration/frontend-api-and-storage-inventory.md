# SIT Nexus — Frontend API and Browser Storage Inventory

Reviewed on: 2026-11-08
Branch: `migration/corporate-onprem-day1`
Source of truth for this inventory: current `src/utils/api.ts`, `src/services/credentialService.ts`, `src/utils/storage.ts`, `src/utils/resourceMaster.ts`, and current Express route mounts.

## 1. Current API contract

The browser API wrapper uses `API_BASE = '/api'`. The existing UI relies on the following routes; migrate the frontend and server together so that existing screens do not break during the transition.

| Current endpoint | Method | Purpose | Target migration notes |
|---|---|---|---|
| `/api/connection/validate` | POST | Validate Azure DevOps organization, project and PAT | Accept PAT transiently; do not persist or echo it; bind validated credential to authenticated user session |
| `/api/auth/status` | GET | Current manager/ADO status | Replace with `/api/v1/me` plus per-user ADO connection status |
| `/api/auth/managers` | GET | Manager list / global active manager | Remove manager switching; use verified corporate identity and server-authorized user directory |
| `/api/auth/managers` | POST | Create manager profile | Replace with admin-provisioned user/role grant workflow |
| `/api/auth/managers/switch` | POST | Change global manager | Delete; user identity must come from verified SSO, never client selection |
| `/api/auth/connect` | POST | Connect Azure DevOps and validate PAT | Move to authenticated per-user credential API; do not accept a target manager ID |
| `/api/auth/mode` | POST | Switch mock/Azure source | Delete; production must have no mock mode |
| `/api/resources` | GET/POST | Read or add resource master record | Authenticate and enforce region/project/admin permissions |
| `/api/resources/replace` | POST | Replace resource master | Preserve explicit import/replace behavior; validate file rows and scope to authorized regions |
| `/api/resources/:id` | PUT/DELETE | Update/delete a resource | Enforce authorized region and audit actor |
| `/api/resources/reset` | POST | Restore fabricated factory baseline | Delete permanently; no seeded/factory mock resource data |
| `/api/projects` | GET/POST | List/create project tags | Scope project visibility/configuration to authorized user/project |
| `/api/projects/toggle-hide` | POST | Hide/show project tag | Preserve as user/project configuration |
| `/api/projects/:name` | DELETE | Remove project tag from visibility | Preserve only as authorized configuration action |
| `/api/projects/restore-all` | POST | Restore project visibility | Scope to user/project; no global mutable state |
| `/api/query` | POST | Execute sprint/work-item query | Use verified principal's server-side PAT; authorize project/region/iteration/area scope |
| `/api/query/stories` | GET | Filter stories | Source work items from live ADO; no database/mock story fallback |
| `/api/query/stories/:id` | PATCH | Update story metadata/status | Use live ADO update operation; require explicit work-item update permission |
| `/api/query/sprint-close/preview` | POST | Preview sprint closure | Preserve query semantics; authorize target scope and return typed live ADO errors |
| `/api/query/sprint-close/execute` | POST | Execute sprint closure | Require write permission; transactionally persist audit metadata around ADO execution |
| `/api/sprints` | GET | Iteration dropdown | Replace standardized fallback with live ADO iteration query; explicit error when unavailable |
| `/api/area-paths` | GET | Area path dropdown | Retrieve from ADO under authenticated connection; do not use fabricated defaults |
| `/api/query/sprint-close/history` | GET | Closure audit history | Read only records authorized for the verified principal |
| `/api/audit` | GET | Legacy audit output | Consolidate into authorized audit-history API |

Note: the Express server also mounts `/api/query` and `/api/sprint-close` using the same query router, and separately mounts simple database-backed `/api/sprints`, `/api/area-paths`, and `/api/audit` handlers. Confirm route precedence and retire duplicate aliases during the v1 migration.

## 2. Current browser storage keys

| Key | Current content | Risk / target |
|---|---|---|
| `sit_nexus_ado_pat` | Azure DevOps PAT | Critical: plaintext persistent browser storage. Remove; server-side per-user secret reference or session-only memory design approved by CAT |
| `sit_nexus_ado_conn` | ADO connection metadata | May be retained only as non-authoritative UI cache; server is source of truth |
| `sit_nexus_stories_v1` | Work-item/story snapshot | Must not be a source of truth; work items come from live Azure DevOps |
| `sit_nexus_ado_config_v1` | Organization/project/PAT-like config and connection state | Remove PAT and fabricated connection defaults; organization/project should come from approved config |
| `sit_nexus_resource_master` | Resource master data | Replace with authenticated server-side shared master data; do not seed from constants |
| `sit_nexus_project_tags_v1` | Project tag visibility/config | Move to user/project-scoped persistence |

Additional legacy behavior: resource and story utilities import `INITIAL_RESOURCES` and `INITIAL_STORIES` when local storage is empty. These defaults must become honest empty/not-configured states. Do not migrate browser local storage automatically into production.

## 3. Current PAT flow and replacement

Current flow:
1. User enters PAT in the browser.
2. Browser sends the PAT to `/api/connection/validate` or `/api/auth/connect`.
3. Browser saves PAT in `localStorage` under `sit_nexus_ado_pat`.
4. `src/utils/api.ts` reads that token for query operations and forwards it in `x-ado-pat`.
5. Server query route uses the header for Azure DevOps operations.

Target flow:
1. User completes CAT-approved corporate authentication.
2. Server resolves a verified user principal and authorization grants.
3. User submits an individual ADO PAT over TLS to a protected credential endpoint.
4. Server validates the PAT against the configured ADO organization/project.
5. Server stores only an approved secret-vault reference or approved encrypted session credential; if neither is authorized, require per-session re-entry and memory-only retention.
6. Browser calls query endpoints with its corporate session only; server retrieves that user's PAT internally.
7. Disconnect/revocation clears the server-side reference/session credential and associated connection status.
8. Logs, traces, browser storage and audit events never include PAT values or authorization headers.

## 4. Frontend migration sequence

1. Introduce a typed `/api/v1` client and typed error envelope while keeping existing view components unchanged.
2. Add bootstrap loading from `GET /api/v1/me`; represent loading, unauthenticated, empty, not-connected and error states separately.
3. Replace manager selection with the verified signed-in user and server-provided permissions.
4. Migrate resource master and project-tag settings to authenticated server persistence.
5. Migrate iterations, area paths and sprint queries to authenticated Azure DevOps server routes.
6. Migrate sprint closure preview, execute and audit history without changing business rules.
7. Remove browser stories/resource master as authoritative datasets and remove localStorage PAT.
8. Delete mock mode controls, fake seeded stories and fallback data paths without redesigning the dashboard.

## 5. Critical release blockers

- Legacy routes currently remain mounted without verified identity and route-level authorization.
- JSON file persistence and global active-manager state remain in `server/db.ts`.
- The current runtime database is not the SQL schema in `database/migrations/001_initial_schema.sql`.
- Browser PAT is persisted and forwarded on each request.
- Mock data is still loaded by backend and frontend initialization paths.
- Some Azure failures fall back to standardized database sprint values or simulated success in validation paths.
- CAT SSO/identity integration, SQL engine/version, credential vault and on-prem network are not yet confirmed.

The production startup guard on this branch intentionally blocks `NODE_ENV=production` until the entire corporate migration is implemented. A successful frontend build does not make the current branch production-ready.
