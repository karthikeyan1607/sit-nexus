# SIT Nexus Corporate Migration — Five-Day Backlog

Working branch: `migration/corporate-onprem-day1`
Execution target: five engineering days; external CAT approvals and infrastructure provisioning are dependencies, not assumed completed.

## Day 1 — Baseline, branch and architecture
- [x] Create isolated migration branch from `main`.
- [x] Inspect runtime, database, authentication, PAT, mock data, Azure DevOps integration and tests.
- [x] Record migration blockers and guardrails.
- [ ] Map every frontend API call to a target versioned API.
- [ ] Inventory all imports of mock data and all localStorage/sessionStorage keys.
- [ ] Agree SQL engine and CAT identity integration contract when IT information becomes available.

Exit: complete dependency map and approved technical contracts; no unsafe production behavior changed prematurely.

## Day 2 — Identity, authorization and persistence foundation
- [x] Add request-scoped authenticated principal abstraction (CAT SSO adapter contract; no client-supplied identity).
- [x] Add fail-closed identity middleware on `/api/v1`; legacy routes remain staged and are not production-safe yet.
- [x] Add role/region/project/action authorization policy helper and deny-by-default permission middleware.
- [x] Introduce database-engine-independent repository interfaces and transaction boundary contract.
- [ ] Implement the selected SQL adapter and versioned migrations once CAT's supported database is known (blocked: engine unknown).
- [ ] Implement SQL-backed user-scoped settings, project configuration, resource master and audit repositories (interfaces defined; adapter pending).
- [x] Add authorization policy and HTTP identity tests (9/9 passed in GitHub Actions run [42479184107](https://github.com/karthikeyan1607/sit-nexus/actions/runs/42479184107)).
- [x] Add GitHub Actions workflow for corporate tests, TypeScript typecheck and Vite build (all steps passed).

Exit: no global active manager and no JSON-file runtime persistence. **Not yet met:** legacy runtime still uses the JSON store/global manager; replacement is blocked on DB selection and staged route migration.

## Day 3 — Individual PAT and Azure DevOps-only data
- [ ] Replace browser localStorage PAT storage and x-ado-pat forwarding (still pending).
- [ ] Implement per-user PAT validation, lifecycle, disconnect and expiry handling (still pending; requires CAT-approved vault/session design).
- [ ] Bind each ADO request to the authenticated user's credential (still pending; current legacy flow still forwards PAT from browser).
- [ ] Remove all mock mode routes and data-source switching (still pending).
- [ ] Remove all mock imports, seeded stories/resources/tags and factory reset endpoints (still pending).
- [x] Remove simulated success from Azure DevOps PAT validation on network/proxy/timeout errors.
- [x] Remove standardized/fabricated iteration fallback from the Azure iteration service; empty ADO response stays empty and failures propagate.
- [x] Route `/api/sprints` through live Azure DevOps; missing PAT/config and upstream errors are explicit.
- [x] Make sprint query live-only with PAT and explicit Area Path + Iteration Path; no mock branch or database story fallback.
- [x] Make sprint closure preview/execution require PAT; remove mock preview data and local mock update fallback; deny update when permission is missing.
- [x] Remove the legacy stored-story list endpoint as a data source (returns an explicit migration response instead of JSON/mock stories).
- [x] Route status/story-point edits through Azure DevOps JSON Patch; unsupported SIT Nexus-only annotations return an explicit not-yet-migrated error rather than claiming a save.
- [x] Sanitize Azure DevOps upstream error details before returning errors to clients.
- [x] Add regression tests covering empty iteration response, upstream network failure, and live iteration mapping.
- [ ] Run tests for invalid/revoked PAT, timeout, API permissions and per-user credential isolation (not yet covered end-to-end).

Exit: **not met**. Several high-risk paths remain: browser PAT localStorage and `x-ado-pat` forwarding, global active manager/JSON store, mock data initialization and mock routes, database-backed sprint-closure audit persistence, and server-side per-user PAT/session binding.

## Day 4 — Frontend/API migration while preserving UX
- [ ] Add typed `/api/v1/me` and connection APIs.
- [ ] Migrate resources, projects, iterations, area paths, queries, audit and sprint closure API clients.
- [ ] Remove manager switching UI and mock-mode UI without changing visual design.
- [ ] Replace default UI data with explicit loading, empty, not-connected and error states.
- [ ] Preserve dashboard, regional filters, project tags, resource master import, standup runner, sprint closure, audit and exports.
- [ ] Remove production reliance on localStorage for shared master data and work-item records.
- [ ] Add contract tests for all migrated screens.

Exit: existing workflows use authenticated, authorized, live backend APIs.

## Day 5 — Verification and deployment candidate
- [ ] Run typecheck, build, unit tests and integration tests.
- [ ] Run cross-user and cross-region authorization tests.
- [ ] Run PAT secret-leak scans and verify logs/audit never contain credentials.
- [ ] Run Azure DevOps outage/timeout and invalid-permission tests.
- [ ] Add on-prem reverse-proxy, container/VM and service configuration templates.
- [ ] Add health/readiness checks, structured logs and deployment/rollback runbook.
- [ ] Run concurrency test against CAT's agreed target (initial planning target: 50 concurrent users).
- [ ] Produce release candidate and open a review PR; do not deploy to CAT production without approvals.

Exit: reproducible release candidate with test evidence and documented external blockers.

## Cross-cutting acceptance criteria
1. UI and existing business workflows are preserved.
2. No mock mode, mock seed records, fake identities or fallback-to-demo paths exist in production.
3. Each request has one verified corporate principal.
4. Every protected operation enforces project/region/action permissions server-side.
5. Each user's PAT is isolated from other users and never stored in plaintext persistent browser storage or logs.
6. Azure DevOps errors remain errors; they never become successful fake responses.
7. Database transactions and constraints protect shared data under concurrent use.
8. Production startup fails closed if required identity, database or security configuration is missing.
9. No production credentials or CAT-specific secrets are committed to Git.
10. All three regions complete UAT before the coordinated global cutover.

## Known external blockers
- CAT corporate identity metadata/client registration and test tenant are not currently available to the developer.
- CAT on-prem compute, reverse proxy, DNS, TLS, network/proxy and secret-store access are not currently available.
- CAT-supported SQL engine/version and connection details are not confirmed.
- Azure DevOps organization/project/service network allow-list details need CAT confirmation.
