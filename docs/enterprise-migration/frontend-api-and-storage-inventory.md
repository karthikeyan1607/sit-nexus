# SIT Nexus — Frontend API and Browser Storage Inventory

Reviewed: 2026-11-08
Branch: migration/corporate-onprem-day1

## 1. Data ownership

| Data | Owner / source | Persistence |
|---|---|---|
| PAT | Individual manager | Browser localStorage |
| Organization/project/connection metadata | Individual manager | Browser localStorage |
| Resource Master | Individual manager | Browser localStorage |
| Project/tag visibility | Individual manager | Browser localStorage |
| Filters and UI preferences | Individual manager | Existing browser state/local storage where applicable |
| Standup review progress | Individual manager | Browser localStorage, day-scoped |
| Standup notes / blocked reasons | Individual manager | Browser localStorage |
| Work items, assignments, state, story points | Azure DevOps | Azure DevOps is authoritative |
| Iterations and Area Paths | Azure DevOps | Retrieved live |
| Sprint Closure audit history | Current browser profile | Persistent backend audit file, partitioned by signed HttpOnly cookie |

## 2. Browser storage keys

| Key | Content |
|---|---|
| sit_nexus_ado_pat | Individual Azure DevOps PAT |
| sit_nexus_ado_conn | Organization, project, area path and connection metadata |
| sit_nexus_resource_master | Manager's Resource Master |
| sit_nexus_project_tags_v1 | Manager's project/tag visibility |
| sit_nexus_story_annotations_v1 | Standup notes and blocked reasons |
| sit_nexus_standup_review_v1 | Daily standup review state |
| sit_nexus_client_id | Opaque local UI/browser identifier; not server authentication |

The server separately issues a signed HttpOnly cookie named sit_nexus_audit_owner. It is not accessible to page JavaScript and scopes persistent audit history to that browser profile. The cookie is not a verified CAT employee identity.

## 3. Backend endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| /api/audit/session | GET | Bootstrap the signed HttpOnly browser audit cookie |
| /api/connection/validate | POST | Validate a supplied PAT; server stores no credential |
| /api/query | POST | Query live Azure DevOps using request PAT/config and browser Resource Master |
| /api/sprints | GET | Retrieve live iterations from Azure DevOps |
| /api/area-paths | GET | Retrieve live Area Paths from Azure DevOps |
| /api/query/stories/:id | PATCH | Update supported work-item fields in Azure DevOps |
| /api/query/sprint-close/preview | POST | Preview eligible stories from live Azure DevOps |
| /api/query/sprint-close/execute | POST | Revalidate and execute eligible story closure; persist audit records |
| /api/query/sprint-close/history | GET | Return audit history for the signed browser profile |
| /api/audit | GET | Legacy alias for the same browser-scoped audit history |
| /api/health | GET | Service health |

Legacy /api/auth, /api/resources and /api/projects server routes are no longer part of the active application contract. The frontend helpers for those modules now read/write browser-local state.

## 4. PAT lifecycle

1. Manager enters PAT in Settings or the connection modal.
2. Backend validates PAT against the configured Azure DevOps organization/project.
3. On successful validation, browser stores PAT and non-secret connection metadata in localStorage.
4. Each subsequent Azure DevOps request sends the PAT in an HTTPS header.
5. Backend uses it only for that request; it does not save the PAT to audit storage or application persistence.
6. Manager can replace the PAT when it expires or disconnect and clear it.
7. Azure DevOps authentication errors are surfaced; no fake data is returned.

Security limitation: localStorage is readable by same-origin JavaScript. CAT security approval and strong XSS protections are required before production.

## 5. Audit persistence and hosting assumptions

- Audit records are stored in SIT_NEXUS_AUDIT_FILE, which must be on a CAT-managed persistent volume.
- SIT_NEXUS_AUDIT_SESSION_SECRET must be a stable secret of at least 32 bytes.
- The cookie is HttpOnly, SameSite=Strict and Secure in production.
- A different browser profile or computer gets a different audit namespace.
- Clearing the browser cookie loses access to the prior namespace; the records remain stored.
- Current JSON persistence assumes one application instance. Multi-instance deployment requires shared transactional persistence.
- CAT network/VDI controls must restrict access to the application. The audit cookie is not SSO or employee authentication.

## 6. Verification still required

- End-to-end two-browser test with different PATs and independent Resource Masters.
- PAT expiry/replacement and permissions.
- Full story annotations and standup persistence behavior after browser restart.
- Audit persistence after server restart/redeployment.
- Cookie isolation and behavior after clearing browser data.
- 50-user concurrency and CAT hosting topology.
- Security approval for browser-local PAT storage.
