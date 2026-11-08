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
- [x] Add authorization policy tests for cross-region, cross-project and read/write isolation (execution still required in CI).

Exit: no global active manager and no JSON-file runtime persistence. **Not yet met:** legacy runtime still uses the JSON store/global manager; replacement is blocked on DB selection and staged route migration.

## Day 3 — Individual PAT and Azure DevOps-only data
- [ ] Replace browser localStorage PAT storage and x-ado-pat forwarding.
- [ ] Implement per-user PAT validation, lifecycle, disconnect and expiry handling.
- [ ] Bind each ADO request to the authenticated user's credential.
- [ ] Remove mock mode routes and data-source switching.
- [ ] Remove mock imports, seeded stories/resources/tags and factory reset endpoints.
- [ ] Remove fabricated connection defaults and standardized sprint fallback.
- [ ] Ensure network, timeout, 401, 403 and 5xx failures are explicit and never return simulated success.
- [ ] Add tests for invalid PAT, revoked PAT, missing PAT, timeout and cross-user credential isolation.

Exit: production data comes only from live Azure DevOps and explicitly managed master/configuration data.

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
