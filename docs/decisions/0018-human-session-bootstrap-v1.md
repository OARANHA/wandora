# ADR 0018 — Human Session Bootstrap V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

Human Supervision Read V1 validates Supabase Auth sessions in Wandora Core and authorizes tenant reads from canonical Wandora memberships. The public Web bridge is live, but the browser still has no canonical way to discover which Wandora user and active organizations correspond to a verified session.

Hard-coding an organization UUID in Web, trusting organization claims from the external JWT, or widening Core to direct identity-table reads would weaken the accepted ownership boundary.

## Decision

Add a read-only Human Session Bootstrap endpoint:

`GET /api/v1/me`

Core validates the same ES256/JWKS Bearer session used by Human Supervision Read V1. The verified JWT `sub` remains external identity input only.

Core then calls a narrow database resolver:

`wandora.resolve_core_human_session(provider text, provider_subject text)`

The resolver is `SECURITY DEFINER`, executable only by `wandora_core_runtime`, and returns only canonical Wandora user data plus active memberships in active organizations.

## Public contract

The response is Wandora-owned product context:

```json
{
  "user": {
    "id": "<wandora-user-id>",
    "name": "Gestor"
  },
  "organizations": [
    {
      "id": "<wandora-organization-id>",
      "slug": "empresa",
      "name": "Empresa",
      "role": "owner"
    }
  ]
}
```

It does not expose:

- Supabase `sub`;
- provider email, phone or metadata;
- service-role or signing material;
- provider/runtime IDs;
- suspended memberships;
- suspended organizations.

A linked Wandora user with no active organization is still a valid session and receives `organizations: []`. An external identity that is not linked to a Wandora user receives `403`.

## Authorization boundary

The endpoint does not grant tenant data access by itself. It only gives the browser the canonical organizations that are valid selectors for later Core requests.

The existing tenant read still independently requires active organization + active membership inside transaction-local tenant scope and RLS.

JWT tenant/role claims never replace canonical Wandora membership authorization.

## Web exposure

Wandora Web Nginx may proxy exactly `/api/v1/me` in addition to the already reviewed attention-required work route.

It must:

- forward `Authorization` explicitly;
- strip browser cookies before Core;
- keep all other unreviewed `/api/` paths at `404`;
- keep `/internal/` paths at `404`;
- preserve Core with no public hostname or host port.

## Verification requirements

The slice must prove:

- valid linked identity returns canonical user context;
- only active memberships in active organizations are returned;
- multiple organizations have deterministic ordering;
- linked user with no active organizations returns an empty list;
- unknown identity is denied;
- invalid Bearer token is denied before product context;
- no external identity/provider metadata appears in the response;
- resolver execute is Core-only and does not widen direct identity-table reads;
- Web forwards only the exact reviewed route and strips cookies;
- no outbound side effect is introduced.

## Non-goals

- login/signup UI;
- public signup enablement;
- Google/OAuth provider configuration;
- organization switcher UI;
- onboarding/provisioning;
- send/edit-send/dismiss;
- Platform Admin;
- model-provider activation.

## Next step

After bootstrap is live, implement the first real browser session flow. With one active organization, Web may select it automatically and replace the `Trabalho` mock with the canonical attention-required read. Multi-organization switching remains a later UI concern.
