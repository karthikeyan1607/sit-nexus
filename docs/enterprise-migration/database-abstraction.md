# SIT Nexus persistence decision

## Agreed product model

SIT Nexus is one centrally hosted application, but manager-owned working data remains independent in each manager's browser.

Browser-local data:
- Azure DevOps PAT and connection metadata.
- Resource Master.
- Project/tag visibility preferences.
- Query selections and personal UI settings.
- Daily standup review state.
- SIT Nexus-only story annotations such as standup notes and blocked reasons.

Azure DevOps remains authoritative for work items, assignments, states, story points, iterations, Area Paths and tags.

## Server persistence

The only application data that requires durable server persistence under the current product requirements is Sprint Closure audit history. Each audit record is partitioned by a browser-installation owner ID. A browser can read only records written under its own owner ID.

The implementation uses a small JSON audit store, not SQL. Production must configure `SIT_NEXUS_AUDIT_FILE` to a CAT-managed persistent volume. The file is written atomically. A single application instance is assumed; multi-instance deployments require a shared transactional store or an equivalent durable service.

## Identity and security boundary

CAT SSO is not implemented in this phase. The application is intended to be reachable only through CAT-approved network paths/VDI. CAT infrastructure must enforce that network boundary.

The browser-installation ID is an opaque per-browser audit namespace, not a verified CAT employee identity. It is not suitable as a replacement for SSO or as proof of employee identity. Clearing browser site data can remove the namespace key; audit records remain on the server but the original browser can no longer address them unless the key is restored.

PATs remain in each manager's browser localStorage per the agreed product behaviour. They are sent only in HTTPS request headers, never persisted by the server, never logged, and never written to audit records. localStorage remains exposed to same-origin JavaScript; CAT security approval and XSS protections are required before production.

## Explicitly deferred

- CAT SSO/OIDC integration, pending a CAT-hosted access model decision.
- SQL database adapter, because manager working data is browser-local and audit-only persistence can use a CAT-managed durable volume for a single instance.
- Cross-device audit access.
- Shared Resource Master or project preferences.
- Centralized manager profiles and global active-manager state.
