# ADR 0019 — Web Human Session V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

Human Supervision Read V1 and Human Session Bootstrap V1 are live. Wandora Web can reach only the reviewed Core human routes, but the customer shell still has no browser login and `Trabalho` still renders preview data.

## Decision

Implement the first real browser session with these boundaries:

1. Supabase Auth remains the identity/session provider.
2. The browser signs in with e-mail/password against the stable `https://supabase.wandora.com.br` Auth endpoint.
3. Only the public Supabase publishable key may be compiled into Web. `service_role`, JWT signing material and admin credentials remain server/operator-only.
4. Public signup remains disabled. V1 supports only previously provisioned accounts.
5. Browser session material is kept in `sessionStorage` for V1, so closing the tab/browser removes the local persisted session.
6. Wandora Web sends the Bearer access token to same-origin `/api/v1/me`; Core resolves canonical Wandora identity and active memberships.
7. When exactly one active organization exists, Web selects it automatically. Zero organizations produces an explicit empty state. More than one organization does not silently choose a tenant; a future organization-switcher slice owns that UX.
8. `Trabalho` reads only the reviewed `/api/v1/organizations/{id}/work/attention-required` Core projection and removes its preview work array.
9. The shell derives the visible company and human display name from `/api/v1/me`, not hard-coded preview labels.
10. Login and read-only work do not introduce send, edit-send, dismiss or any other outbound effect.

## Authentication transport

Direct browser access to the stable Supabase Auth hostname is intentional. CORS is restricted by the deployed Auth edge configuration and the application uses the public publishable key only. Wandora Web does not add a generic Auth or Core reverse proxy merely for convenience.

Access-token expiry is handled by the browser session client using the Supabase refresh-token grant. A 401 from the reviewed Core human API triggers one refresh/retry before the local session is cleared.

## Example beta company

The first production-beta proof may use a clearly named **Empresa Exemplo** with a provisioned human owner and canonical sample work for Ana. The example data must live in canonical Wandora tables and be read through the same Core authorization path as any later customer.

It must not use a live messaging provider binding and must not create outbound attempts or messages. The example company is test/product data, not a front-end mock.

## Verification requirements

Before production activation prove:

- Web typecheck and production build are green;
- `/login` is public while the customer shell redirects anonymous sessions to login;
- wrong credentials fail without creating a Wandora session;
- a valid but unlinked Auth identity receives the existing fail-closed Core behavior;
- a linked one-organization identity receives `/api/v1/me = 200` and that organization is auto-selected;
- `Trabalho` renders the tenant-authorized Core response and contains no static preview work array;
- refresh works without exposing provider/admin credentials;
- logout removes the browser session;
- unreviewed `/api/` and `/internal/` routes remain closed;
- no outbound side effect is introduced.

## Non-goals

- public signup;
- password reset or production SMTP;
- Google/OIDC login;
- multi-organization selector;
- onboarding/provisioning UI;
- send/edit-send/dismiss;
- Platform Admin;
- model-provider activation.

## Next step

After this slice is live and the example company proves the full browser → Web → Core → PostgreSQL path, connect `Conversas` to a separately reviewed canonical Core read contract, then define explicit human review actions before any outbound message can occur.
