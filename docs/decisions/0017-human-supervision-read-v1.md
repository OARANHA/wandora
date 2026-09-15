# ADR 0017 — Human Supervision Read V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

ADR 0016 made safe supervised employee proposals canonical in `wandora.work_proposals`. Wandora Web is still mock/product-contract data, so the next product boundary is a real human read of `attention-required` work.

The live Supabase Auth deployment publishes an EC/ES256 public JWKS. Core must not receive `service_role`, a shared JWT signing secret or broad direct reads of identity tables merely to validate sessions.

Core also remains private. Creating a generic public Core hostname or proxying all Core paths through the Web would unnecessarily expose internal routes such as the Gateway ingress.

## Decision

Introduce a read-only Human Supervision API in Wandora Core.

Human authentication is:

1. accept a Bearer access token only on the reviewed human API path;
2. require JWT `alg=ES256` and a known `kid`;
3. verify the signature against the configured HTTPS JWKS;
4. require the configured issuer and audience;
5. validate token time claims;
6. use only the verified `sub` as external identity input;
7. resolve `sub` to canonical Wandora `user.id` through a narrow Core-only database function;
8. authorize the selected organization from canonical active organization + active membership state.

JWT roles or tenant claims do not replace Wandora membership authorization.

## Database boundary

Migration `20260915_005_human_supervision_read_v1.sql` adds only:

`wandora.resolve_core_user_id(provider text, provider_subject text) -> uuid`

The function is `SECURITY DEFINER`, executable only by `wandora_core_runtime`.

The Core runtime still receives no direct `SELECT` on `wandora.users` or `wandora.user_identities`.

After identity resolution, organization-scoped reads continue under the existing transaction-local `wandora.organization_id` + RLS boundary.

A browser-supplied organization UUID is a selector, never authorization evidence.

## Customer-facing read contract

V1 exposes only `attention-required` work context needed by `Trabalho`:

- work ID, kind, status and updated time;
- employee ID and display name;
- contact ID and business-facing label;
- conversation ID;
- latest inbound customer text and time, when present;
- canonical proposal ID, kind, text, rationale and created time, when present.

The proposal is optional because historical `attention-required` work may predate canonical proposal persistence.

V1 does not expose:

- private receipt IDs or receipt JSON;
- source/provider event IDs;
- Evolution instance/API key/server URL/JIDs;
- Mastra run/workflow IDs;
- PostgreSQL/private-schema implementation details;
- outbound actions.

## HTTP boundary

The reviewed route is:

`GET /api/v1/organizations/:organizationId/work/attention-required`

Human API is opt-in through explicit Core runtime configuration and is invalid in standby mode.

The future Web exposure is same-origin:

```text
browser
 -> app.wandora.com.br/api/v1/...
 -> Wandora Web Nginx
 -> private wandora-core network
 -> Core
```

Only explicitly reviewed human API paths may be proxied. `/internal/v1/gateway/inbound` remains private and must never be included in a generic reverse proxy.

## Failure semantics

- missing/invalid token: `401`;
- Auth/JWKS temporarily unavailable: `503`;
- valid external identity not linked to Wandora: `403`;
- cross-tenant access: `403`;
- suspended membership: `403`;
- suspended organization: `403`;
- unexpected server/database error: `500`.

Authorization failures intentionally avoid revealing whether a foreign organization exists.

## Verification requirements

The slice must prove:

- ES256 signature verification with issuer/audience/time checks;
- missing token and malformed/forged token rejection;
- unknown `kid` rejection with controlled JWKS refresh;
- JWKS failure fails closed;
- resolver is Core-only `SECURITY DEFINER`;
- Core still cannot directly read `users` or `user_identities`;
- active member reads only the selected tenant;
- cross-tenant access denied;
- suspended membership denied;
- suspended organization denied;
- unknown Wandora identity denied;
- transaction-local tenant scope is reset after success and denial;
- provider/private identifiers are absent from the returned read model;
- no outbound side effect is introduced.

## Non-goals

- login/signup UI;
- organization switcher/onboarding;
- direct browser access to PostgreSQL workflow state;
- send/edit-send/dismiss;
- approval decisions;
- Platform Admin;
- model-provider activation;
- generic public Core API hostname.

## Next step

After the read contract and all denial cases are green, expose only this reviewed path through the Web Nginx/private Core network and replace the `Trabalho` mock with canonical data. Connect `Conversas` after the first real-work screen is proven.
