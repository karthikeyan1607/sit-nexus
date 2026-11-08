# SIT Nexus persistence and identity decision

## Agreed product model

SIT Nexus is one centrally hosted application, but each manager's working data remains independent in that manager's browser.

Browser-local data:
- Azure DevOps PAT and connection metadata.
- Resource Master.
- Project/tag visibility preferences.
- Query selections and personal UI settings.
- Daily standup review state.
- SIT Nexus-only story annotations such as standup notes and blocked reasons.

Azure DevOps remains authoritative for work items, assignments, states, story points, iterations, Area Paths and tags.

## Server persistence

Sprint Closure audit history is the only application data that requires durable server persistence under the current requirements.

- Audit records are stored in a JSON audit file, not SQL.
- Each record is associated with a signed, HttpOnly browser-profile owner ID.
- The browser profile can read only records associated with its signed owner cookie.
- The cookie survives browser restarts, but another computer/browser profile receives a different owner ID.
- Clearing the browser's cookies creates a new audit owner; the old audit records remain on the server but are no longer addressable from that cleared profile.
- Production must configure `SIT_NEXUS_AUDIT_FILE` to a CAT-managed persistent volume.
- The file is written atomically.
- The current implementation assumes one application instance. Multiple instances require a shared transactional store or equivalent durable service.

## Identity and security boundary

CAT SSO/OIDC is deferred for this deployment model. The application is intended to be reachable only through CAT-approved network paths and approved VDI. CAT infrastructure must enforce that boundary.

The signed browser-profile cookie is an audit partition key, not a verified CAT employee identity. It is not SSO and does not prove the legal identity of the employee. It prevents casual cross-browser history mixing, but it is not a substitute for employee-level authorization if CAT later requires that guarantee.

Production requires `SIT_NEXUS_AUDIT_SESSION_SECRET` (at least 32 bytes) and it must remain stable across restarts and redeployments. The cookie is HttpOnly, SameSite=Strict, and Secure in production.

## PAT handling

PATs remain in each manager's browser `localStorage` per the agreed product behaviour. Each request sends the PAT to the backend in an HTTPS header. The backend validates and uses the PAT only for that request and does not persist it in the audit file or any database. PATs must never appear in URLs, source code, GitHub commits, logs or audit events.

`localStorage` is accessible to same-origin JavaScript. This is a known security trade-off accepted by the current product design, subject to CAT security approval and strong XSS protections. Managers replace PATs when Azure DevOps expires them (typically around the 90-day period described by the product owner).

## Explicitly deferred

- CAT SSO/OIDC integration, pending CAT's final network access and identity requirements.
- SQL database adapter; no shared master/settings database is required by the agreed workflow.
- Cross-device audit access.
- Shared Resource Master or project preferences.
- Centralized manager profiles and global active-manager state.
