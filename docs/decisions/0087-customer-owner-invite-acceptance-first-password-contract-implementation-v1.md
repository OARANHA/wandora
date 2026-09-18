# ADR 0087 — Customer Owner Invite Acceptance + First Password Contract Implementation V1

- Status: **Accepted implementation — code/CI only, not deployed and no real invite sent**
- Date: 2026-09-18
- Scope: implement the browser-side first-access contract selected by ADR 0086 while preserving closed public signup, Supabase Auth credential authority and zero customer/provider/eligibility production effects

## REAL NOW

Canonical base entering implementation:

```text
main = 06c0bf1422eff145835ee207b038204c6c8c5fd4
PR #134 = merged
open PRs = 0
```

Live runtime remained unchanged during implementation:

```text
Core      = wandora/core:organization-adapter-candidate-af542864d267
Web       = wandora/web:candidate-af542864d267
Paperclip = wandora/paperclip:v2026.831.1
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de
Auth      = supabase/gotrue:v2.196.0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
Wandora users = 1
active organizations = 3
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

No real customer owner identity exists yet.

## PROVEN EVIDENCE — EXACT GOTRUE V2.196.0 CONTRACT

The implementation did not infer invitation semantics from generic Supabase examples. The exact source tag matching production, `supabase/auth@v2.196.0`, was inspected.

### Administrative invite is implicit-flow today

Exact source:

```text
internal/api/mail.go
  sendInvite(...)
```

The invite confirmation token is generated directly with `crypto.GenerateTokenHash(...)` and is not wrapped with the PKCE prefix used by flows that explicitly select PKCE.

Exact source:

```text
internal/api/verify.go
  verifyGet(...)
```

GET `/verify` starts as `ImplicitFlow` and switches to PKCE only when the token carries the PKCE prefix.

The current administrative invite therefore enters the implicit verification path.

### Successful invite verification returns a browser session in the fragment

Exact source:

```text
internal/api/verify.go
  verifyGet(...)
internal/tokens/service.go
  AccessTokenResponse.AsRedirectURL(...)
```

For implicit invite verification the provider redirects with URL-fragment fields including:

```text
access_token
token_type=bearer
expires_in
expires_at
refresh_token
type=invite
sb
```

The `sb` marker is explicitly added by Supabase Auth.

### Invited user is confirmed and receives a provider-owned temporary password

Exact source:

```text
internal/api/verify.go
  signupVerify(...)
```

When an invited user has no password, GoTrue generates and stores a random temporary password before confirming the user. The source comment explicitly requires the application to present a password-set form.

Wandora therefore must never know, retrieve or distribute that temporary password.

### Password update uses the authenticated user boundary

Exact source:

```text
internal/api/api.go
  /user -> requireAuthentication -> PUT UserUpdate
internal/api/user.go
  UserUpdate(...)
```

The authenticated user may submit:

```json
{"password":"..."}
```

through `PUT /user`.

Live production does not set either:

```text
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD
```

and those v2.196.0 configuration fields have no default=true declaration, so their effective default remains false.

The browser therefore does not need access to the provider-generated temporary password.

## CAPABILITY AUTHORITY / REUSE GATE

Supabase Auth remains authoritative for:

- invited Auth-user state;
- invitation/verification tokens;
- password hashing/storage;
- access/refresh sessions;
- password-strength enforcement;
- future recovery tokens.

Wandora Web owns only the customer-facing first-access experience and browser-safe session handling.

Rejected as unnecessary capability duplication:

- a Wandora invitation-token table;
- a Wandora password endpoint;
- copying password state into Wandora PostgreSQL;
- adding `@supabase/supabase-js` solely for this narrow flow;
- proxying generic Auth administration through Core.

The existing small raw Auth client remains sufficient for the exact provider contract.

## DECISION

Implement one public customer route:

```text
/accept-invite
```

The route is outside `SessionGate`.

The browser flow is:

```text
GoTrue /verify
  -> app origin with implicit fragment
  -> stage provider-issued invite session
  -> erase fragment before React render
  -> show first-password form
  -> refresh provider session first if near expiry
  -> PUT /auth/v1/user with publishable key + invite Bearer
  -> only after password success:
       clear invite staging
       promote session into normal Wandora browser session
       bootstrap /api/v1/me
  -> linked owner enters normal app
  -> valid but unlinked owner remains existing fail-closed "unlinked" state
```

No Auth administration occurs in Web.

## INVITE FRAGMENT BOUNDARY

A fragment is accepted as an invite session only when all are true:

```text
sb marker present
type = invite
token_type = bearer
access_token non-empty
refresh_token non-empty
expires_at numeric and in the future
```

The fragment is parsed synchronously before React renders.

The session is staged under a separate browser-session key and is **not** written to the normal Wandora session key before password success.

If `sessionStorage` is blocked, a same-page in-memory fallback allows the current render to finish without retaining the fragment.

### SITE_URL fallback hardening

A second adversarial review found that a future operator could omit the invite `redirect_to`, causing GoTrue to use the configured `SITE_URL` root.

Therefore a valid provider invite fragment is accepted anywhere on the Wandora app origin and immediately canonicalized to:

```text
/accept-invite
```

before React initializes.

This removes a brittle dependency on perfect operator redirect configuration.

A Supabase Auth fragment with an unsupported flow type is cleared but is not promoted or staged.

A non-Supabase hash on an unrelated route is left untouched.

## SESSION STORAGE BOUNDARY

Invite credentials use a separate key:

```text
wandora.auth.invite.v1
```

Normal browser session remains:

```text
wandora.auth.session.v1
```

The invite session is retained in `sessionStorage` to survive page reload after the one-time verification token has already been consumed.

It is removed after successful password update, before normal session promotion.

This preserves ADR 0019's browser-session policy: closing the browser/tab removes locally persisted session material.

## PASSWORD UPDATE BOUNDARY

Web calls only:

```text
PUT https://supabase.wandora.com.br/auth/v1/user
apikey: <public publishable key>
Authorization: Bearer <invited user's access token>
Content-Type: application/json

{"password":"<user-entered password>"}
```

No `service_role`, JWT signing material, admin Auth token or privileged Core credential enters the browser.

Provider rejection remains authoritative for password strength. Wandora does not invent a competing password policy.

## SECOND ADVERSARIAL REVIEW

Rejected or hardened alternatives:

1. **Persist invite credentials directly as the normal Wandora session before password success** — rejected; the invite session remains isolated until the credential setup completes.
2. **Keep credentials in the URL fragment while the form is visible** — rejected; they are removed before React render.
3. **Keep invite credentials only in React memory** — rejected; a page reload after the one-time link is consumed would strand the flow.
4. **Use localStorage for longer persistence** — rejected; it would violate the current browser-session policy and enlarge persistence.
5. **Require the future operator to always specify the exact redirect route** — hardened; valid invite fragments falling back to SITE_URL are canonicalized automatically.
6. **Accept any access/refresh fragment** — rejected; `sb`, `type=invite`, bearer type and expiry are required.
7. **Treat the fragment itself as Wandora authorization** — rejected; provider authentication is exercised by `PUT /user` and tenant authorization remains `/api/v1/me`.
8. **Expose an Auth admin credential to Web** — rejected.
9. **Enable public signup to avoid invitations** — rejected.
10. **Add a new Core proxy just for password update** — rejected; it would duplicate/obscure the provider boundary.
11. **Send a real invite during implementation** — rejected; production customer identity is a later reviewed effect.
12. **Provision a customer tenant while implementing the page** — rejected.
13. **Enable tenant eligibility, employee activation or outbound** — rejected.
14. **Ignore interrupted invite recovery** — rejected as a production-readiness claim; see the explicit residual gap below.

## EXPLICIT RESIDUAL GAP — INTERRUPTED INVITE

There is one intentional limitation remaining.

After GoTrue successfully verifies an invite:

- the one-time invite token is consumed;
- the user is confirmed;
- the provider has assigned a random temporary password;
- Wandora keeps the issued session only in browser `sessionStorage`.

If the user closes the browser/tab **before defining the password**, that staged session is intentionally lost under the existing browser-session policy.

The user cannot know the provider-generated temporary password.

Therefore no real customer invitation may be treated as operationally recoverable until a separately reviewed recovery path exists.

This does not invalidate the first-password implementation; it prevents premature production activation.

The recovery capability must reuse Supabase Auth recovery semantics rather than inventing Wandora credential state.

## EXECUTABLE VERIFIER

`apps/web/scripts/verify-invite-acceptance.mjs` proves:

1. exact valid fragment parsing;
2. missing `sb` is rejected;
3. non-invite flow is rejected;
4. expired session is rejected;
5. non-bearer token type is rejected;
6. credentials survive same-tab reload through staging;
7. credentials are removed from URL immediately;
8. storage-blocked same-page fallback works;
9. invalid provider fragment clears stale staged state;
10. SITE_URL-root valid invite is canonicalized to `/accept-invite`;
11. unsupported Supabase flow at root is cleared;
12. password transport source is `PUT /auth/v1/user`;
13. browser Auth source/page contain no `service_role`;
14. invite staging runs before `createRoot(...)`;
15. staging is cleared only after password-update success;
16. normal session promotion happens only after staging clear/password success.

The verifier runs in every Web production build before the existing bridge verifier.

## VALIDATION

Code head before canonical-document updates:

```text
PR #135
head = caa8468b2337e5eadb030f189b333a04a3cb2202

Web CI #291 / run 35392357787 = SUCCESS
Messaging Gateway CI #323 / run 35392357822 = SUCCESS
```

Web CI emitted:

```text
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
WANDORA_WEB_HUMAN_API_BRIDGE_V1_OK
```

Two unrelated workflow jobs (Core CI and Platform Admin CI) encountered GitHub Actions infrastructure failures before receiving a runner:

```text
runner_id = 0
runner_name = empty
steps = []
```

They failed again with the same runnerless shape when selectively retried. No code in those components changed, and no step-level regression evidence exists.

The final PR head must still receive fresh CI after canonical documentation is added.

## EFFECT BOUNDARY

This implementation does **not**:

- deploy the new Web image;
- send/generate a real customer invite;
- create an Auth user;
- enable public signup;
- create a Wandora customer user/membership/organization;
- call Private Tenant Provisioning V2;
- create a Paperclip company;
- create HMAC custody/config/binding;
- create/modify eligibility;
- create or activate a digital employee;
- enable Human Send;
- enable Gateway outbound.

Production runtime and durable customer state remain unchanged.

## DECISION RESULT

**Customer Owner Invite Acceptance + First Password Contract Implementation V1 is accepted as code/CI, not as a live customer invitation capability.**

The normal first-access path is implemented and provider-aligned. The interrupted-invite recovery boundary must be resolved before the first real customer invitation.

## NEXT EXECUTABLE SLICE

**Customer Owner Interrupted Invite Recovery Contract Preflight V1.**

Preflight only.

It must inspect the exact GoTrue v2.196.0 recovery/generate-link behavior and select the minimum operator/customer recovery path for the case where invite verification completed but the browser session was lost before password definition.

Do not send a real recovery email/link, create a real customer user, deploy Web, provision a tenant, create provider wiring or enable eligibility during that preflight.
