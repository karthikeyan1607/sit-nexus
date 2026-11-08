# SIT Nexus Corporate Migration — Implementation Backlog

Working branch: migration/corporate-onprem-day1
Target: CAT-hosted, CAT-network/approved-VDI application. Preserve existing UI and seven modules.

## Agreed architecture

- Each manager's PAT, Resource Master, project visibility, standup review state, filters and SIT Nexus-only annotations are browser-local.
- PAT remains in localStorage per the product owner's requirement; it is sent only in HTTPS headers and is never persisted or logged by the backend.
- Azure DevOps is authoritative for work items, assignments, states, points, iterations, Area Paths and tags.
- Sprint Closure audit history is stored persistently on the server and scoped by a signed HttpOnly browser-profile cookie.
- CAT SSO and SQL are deferred unless CAT's security or hosting requirements make them necessary.
- No global active manager and no shared manager working data.

## Day 1 — Baseline and product architecture
- [x] Create isolated migration branch.
- [x] Inspect runtime, persistence, identity, PAT, Azure DevOps integration, routes and tests.
- [x] Read the complete SIT Nexus product/functionality guide.
- [x] Confirm manager-specific browser storage and private audit requirements with the product owner.
- [x] Record the agreed data ownership and hosting assumptions.

## Day 2 — Remove shared manager state and introduce audit ownership
- [x] Replace the general JSON database model with audit-only persistence.
- [x] Remove global active-manager and shared Resource Master/project persistence from mounted routes.
- [x] Add signed HttpOnly browser-profile audit identity middleware.
- [x] Partition audit history by signed browser owner.
- [x] Require a CAT-managed persistent audit volume in production.
- [x] Require a stable audit cookie signing secret in production.
- [x] Add audit-store persistence/isolation tests and browser-cookie identity tests.

## Day 3 — PAT and Azure DevOps request flow
- [x] Retain each manager's PAT in browser localStorage, per the agreed product requirement.
- [x] Make connection validation stateless; do not store PAT on the server.
- [x] Send per-request organization, project, Resource Master and PAT to the backend.
- [x] Route iteration and Area Path lookups through the requesting browser's PAT/configuration.
- [x] Keep Azure DevOps live-only; no mock/fabricated fallbacks.
- [ ] Complete PAT expiry/replacement and permission integration tests.
- [ ] Verify that no PAT values appear in logs, audit data, URLs or API responses.

## Day 4 — Frontend/browser-local workspace migration
- [x] Make Resource Master API helpers use browser localStorage.
- [x] Make project/tag visibility API helpers use browser localStorage.
- [x] Persist standup review progress in browser localStorage.
- [x] Persist standup notes and blocked reasons in browser localStorage.
- [x] Keep story state and story points updates routed to Azure DevOps.
- [x] Keep audit history routed to persistent backend storage.
- [ ] Verify every module end-to-end against the current product guide.
- [ ] Remove stale UI comments and messages that still describe shared server data.
- [ ] Confirm no UI redesign or feature regression.

## Day 5 — Verification and CAT release candidate
- [ ] Run GitHub Actions typecheck, build and all test suites on the latest commit.
- [ ] Add end-to-end tests for two independent browser profiles using different PATs.
- [ ] Test audit privacy between profiles and after browser restart.
- [ ] Test Azure DevOps timeout, invalid/expired PAT, insufficient permissions and partial closure failure.
- [ ] Test audit persistence after server restart and redeployment on a persistent volume.
- [ ] Verify 50-user concurrency if deployment topology supports it.
- [ ] Confirm CAT network/VDI restriction, TLS, outbound Azure DevOps connectivity, persistent volume and backup/restore.
- [ ] Obtain CAT security/hosting approval before deployment.

## Current known limitations

1. The browser-profile cookie partitions audit history but does not verify a CAT employee identity. CAT SSO is still needed if CAT requires employee-level authentication/authorization.
2. The audit JSON store is suitable only for a single application instance with a persistent volume. Multiple instances need shared transactional storage.
3. localStorage PAT handling is a known XSS exposure and requires CAT security approval.
4. Audit history is tied to the browser profile; another computer/profile receives a different audit namespace.
5. Full multi-user and production-hosting verification is not complete.

## Release rule

Do not merge to main or deploy to CAT production until the current branch passes all checks, CAT approves the security model, and the hosting dependencies above are verified.
