# ADR 0024 — Multi-Organization Selector V1

Date: 2026-09-15
Status: **Accepted for implementation.**

## Context

Wandora Human Session already returns every active organization available to the authenticated canonical user. The current Web deliberately auto-selects only when exactly one organization is active; with multiple organizations it selects none, preventing accidental tenant choice.

Human Send Proposal V1 requires a controlled internal proof tenant while preserving Empresa Exemplo as a non-sending demo tenant. The operator account therefore needs an explicit way to choose between active organizations without changing Core authorization semantics.

## Decision

Add a Web-only explicit organization selector.

- Core `/api/v1/me` remains the source of truth for available organizations and roles.
- The browser never invents organization membership.
- Exactly one organization continues to auto-select.
- With more than one active organization, the first load selects **none** unless the user previously selected an organization in the same browser session.
- A human selection is stored only in `sessionStorage`; it is not a server-side default and does not survive a new browser session.
- A stored selector is accepted only if its organization ID still exists in the current canonical `/api/v1/me` response.
- Sign-out clears the selector.
- All tenant routes continue using `activeOrganization.id` only after explicit selection.

## Security boundary

The selector changes presentation only. It does not change membership, role, RLS, Core authorization, Supabase identity mapping or route permissions. Organization IDs remain selectors; Core revalidates tenant membership on every protected request.

## UX

The top bar exposes the active organization and, when multiple organizations exist, a native organization picker. Pages that require tenant context keep their existing explicit empty state until a selection exists.

## Verification

The implementation must prove:

- one organization still auto-selects;
- multiple organizations with no stored choice produce `activeOrganization = null`;
- explicit choice selects only an organization present in the canonical session;
- invalid/stale stored IDs are ignored and removed;
- the explicit choice is restored only within the same browser session;
- sign-out clears the organization choice;
- no Core, DB, Nginx or route authorization change is introduced;
- Web typecheck and production build remain green.

## Non-goals

- changing memberships or roles;
- organization provisioning;
- server-side default organization;
- cross-tenant aggregated dashboards;
- Platform Admin tenant impersonation.
