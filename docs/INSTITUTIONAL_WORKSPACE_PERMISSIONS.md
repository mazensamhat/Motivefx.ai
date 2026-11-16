# Institutional workspace permissions

## Repair

The workspace previously checked the account's paid feature entitlement without enforcing its team role. The helper named `ensureTeamForOwner` returned any active member's team; mutation routes then accepted invitations, notes and preferences without a role check. TypeScript-only request shapes did not validate invitation roles or extra identifiers at runtime.

The server now resolves the selected workspace from the authenticated user's active membership or actual `Team.ownerId`. An `owner` label on a non-owner membership cannot grant ownership. Unknown roles fail closed. Reads report the server's effective role and capabilities, and failures return unavailable rather than an empty workspace.

| Capability | Owner | Admin | Analyst | Viewer |
|---|---|---|---|---|
| Read workspace and research | Yes | Yes | Yes | Yes |
| Add notes and scenario templates | Yes | Yes | Yes | No |
| Save workspace preferences | Yes | Yes | No | No |
| Invite analysts/viewers | Yes | Yes | No | No |
| Invite admins | Yes | No | No | No |

All mutation payloads have strict, bounded runtime schemas. They cannot select a team, owner, author or membership identity. A transaction locks the current team and membership, then rechecks the role before using the authorized team. Workspace creation is explicit and serialized per user; a missing/failed read never creates a workspace as a side effect. Invitation email is attempted only after the authorized transaction commits. Cross-origin and support-impersonation mutations are rejected.

The Terminal uses the server capabilities to disable unavailable actions. Loading/error states do not offer workspace creation, and the UI keeps existing shared research visible for viewers.

## Verification and limits

`node --test tests/institutional-workspace.test.mjs` exercises the real policy, service, route and rendered component with isolated account/database/provider doubles. It checks role and tenant boundaries, invalid inputs, a role change between candidate lookup and locked recheck, unavailable storage, commit-before-send ordering and no workspace write/send after denial. Site and web TypeScript checks also pass. Actual PostgreSQL acceptance additionally proves idempotent workspace creation, no persisted research after role denial, and a real concurrent downgrade blocking the pending write; see `TRANSACTIONAL_POSTGRES_ACCEPTANCE.md`.

These tests do not send real invitations, mutate production teams or impersonate a customer session. Existing invite-claim identity behavior and per-user API-key ownership are retained. Full customer invitation delivery, multi-user browser acceptance, API-key lifecycle and named-book switching remain separate acceptance tasks. Physical/native and provider activation prerequisites are unchanged.
