# ADR 0088 — Customer Owner Interrupted Invite Recovery Contract Preflight V1

- Status: **Accepted preflight — contract selected, no production effect**
- Date: 2026-09-18
- Scope: select the minimum fail-closed recovery contract for an invited customer owner whose invite was already verified but whose browser session was lost before a first password was defined

## REAL NOW

Canonical base entering the preflight:

```text
main = 7d41c62a50ce3060bd828dd53a9cecf58cd3dc50
PR #135 = merged
live Auth = supabase/gotrue:v2.196.0
live Web = wandora/web:candidate-af542864d267
Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

The invite-acceptance implementation from ADR 0087 is merged but not deployed.

Read-only production evidence at the start of this preflight:

```text
Auth users = 1
users with recovery_token = 0
users with recovery_sent_at = 0
recovery one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

No real customer owner exists yet.

## PROVEN EVIDENCE — EXACT GOTRUE V2.196.0

This preflight inspected the source tag that matches the live Auth image, not generic SDK behavior.

Release commit:

```text
supabase/auth v2.196.0
0204331ca41a5b49f076b6fa3dc6c0d20b996590
```

Reviewed source blobs:

```text
internal/api/recover.go                  7c967aaf009624b5479080292904650c3789806c
internal/api/mail.go                     9a42651c425fe20474e7e3cd618af8e1af63d5f5
internal/api/verify.go                   c0b58e4a68efa4a82790f88a00dd92102add47ac
internal/models/user.go                  c469bf56692c51ad2aad580cb55351e5f1f630ba
internal/api/pkce.go                     7319e285d0d02b28e9ef67bcd9ba230868890fae
internal/conf/configuration.go           00e0367029628ae03ae07fc78319b73c2dd1e632
internal/api/apilimiter/apilimiter.go    464530c903d0d31e79194187535352b21ffbc24d
```

### Public recovery endpoint

GoTrue registers:

```text
POST /recover
```

behind its recovery rate limiter, CAPTCHA middleware and email-provider requirement.

The request accepts an e-mail plus optional PKCE challenge data. With no code challenge, v2.196.0 deliberately selects implicit flow.

For an unknown e-mail, `Recover` returns `200 {}` without sending mail. This is the provider's anti-enumeration behavior for a nonexistent address.

For an existing user, the provider audits the request and calls `sendPasswordRecovery`.

### Recovery-token issuance

`sendPasswordRecovery`:

1. enforces per-user mail-frequency protection through `recovery_sent_at`;
2. generates the recovery OTP/token;
3. sends the recovery e-mail;
4. only after successful mail send persists `recovery_token` and `recovery_sent_at`;
5. creates the provider-owned recovery one-time-token record.

The token remains Supabase Auth state. Wandora does not need a recovery-token table.

### Successful recovery verification

For implicit recovery, GET `/verify`:

1. verifies the recovery token;
2. runs `recoverVerify`;
3. issues a provider session;
4. redirects to the configured/referrer URL with the Supabase Auth session fragment and `type=recovery`.

`recoverVerify` does not assign the user's new password. It clears/consumes recovery token state through `User.Recover`, audits the login/recovery semantics, and returns the authenticated user.

`User.Recover` clears the recovery token and all one-time tokens for that user.

Therefore the recovery callback creates an authenticated session with which the user may define a new password through the same authenticated `PUT /auth/v1/user` boundary already proven by ADR 0087.

### Recovery may be requested again after a second interruption

Consuming one recovery link does not create a permanent recovery lock.

If the user verifies recovery and then closes the browser again before changing the password, a later `POST /recover` can issue a new recovery token for the same confirmed user, subject to provider rate/frequency limits.

This is materially different from trying to replay the already-consumed invite link.

### Administrative generate-link capability

GoTrue also exposes protected:

```text
POST /admin/generate_link
type = recovery
```

For recovery it requires an existing user, writes provider recovery-token state and returns the raw action link/OTP/token material.

That is a privileged operator capability. It is not required for the normal customer recovery path and must not enter browser or normal Core contracts.

## LIVE AUTH CONFIGURATION EVIDENCE

Safe runtime inspection proved:

```text
GOTRUE_DISABLE_SIGNUP=true
GOTRUE_SITE_URL=https://app.wandora.com.br
GOTRUE_URI_ALLOW_LIST includes https://app.wandora.com.br/**
SMTP host/user/password = configured
GOTRUE_SECURITY_CAPTCHA_ENABLED = unset
GOTRUE_RATE_LIMIT_OTP = unset
GOTRUE_RATE_LIMIT_EMAIL_SENT = unset
GOTRUE_SMTP_MAX_FREQUENCY = unset
GOTRUE_MAILER_OTP_EXP = unset
```

At v2.196.0 the relevant source defaults are:

```text
CAPTCHA enabled = false
recovery/OTP expiration = 86400 seconds when unset/zero
SMTP max frequency = 1 minute when unset/zero
OTP endpoint rate-limit configuration = 30 when unset
Recover uses the OTP limiter family
```

The absence of live CAPTCHA does not block this code/design preflight, but it is an explicit activation gate before exposing real customer recovery.

## TARGET CLASSIFICATION

```text
Supabase Auth recovery capability       = REAL
provider recovery token/session state   = REAL / provider-owned
ADR 0087 invite/first-password Web code = REAL / merged / NOT LIVE
Wandora customer recovery UX            = ABSENT
Wandora recovery durable state          = NOT REQUIRED
real customer owner                     = ABSENT
```

## GAPS

The minimum remaining product gaps are:

1. a public Wandora recovery request page;
2. strict handling of the provider `type=recovery` callback;
3. isolated browser-session staging for the recovery session;
4. reuse of the existing hardened password-update + password-grant reconciliation;
5. neutral success/error copy that does not turn provider behavior into account enumeration;
6. an explicit anti-abuse activation decision before the first real recovery request.

No Core recovery endpoint, recovery database table or Auth-admin credential is missing.

## CAPABILITY AUTHORITY / REUSE GATE

Supabase Auth remains authoritative for:

- existence of Auth identities;
- recovery request/token lifecycle;
- recovery e-mail;
- token verification;
- access/refresh session issuance;
- password hashing/storage and validation;
- recovery rate/frequency enforcement.

Wandora Web owns only:

- the customer-facing request/reset experience;
- strict browser handling of provider-issued recovery sessions;
- transition back into the normal Wandora session/bootstrap contract.

Wandora Core continues to own canonical Wandora identity/membership authorization after provider authentication.

## DECISION

Implement the future recovery path as **customer-initiated provider-native recovery**, not an operator-generated link.

The selected customer contract is:

```text
/recover-access
  request phase
    -> customer enters e-mail
    -> Web POSTs directly to Supabase Auth /auth/v1/recover
       using only the publishable browser key
    -> redirect_to = https://app.wandora.com.br/recover-access
    -> UI always gives neutral completion guidance

recovery e-mail
  -> GoTrue /verify
  -> /recover-access#<provider session; type=recovery; sb>

pre-render recovery callback
  -> require sb marker
  -> require type=recovery
  -> require token_type=bearer
  -> require non-empty access + refresh tokens
  -> require future expires_at
  -> stage under a recovery-specific sessionStorage key
  -> erase URL fragment before React renders

password definition
  -> reuse/refactor ADR 0087 authenticated-user + password finalization
  -> GET /auth/v1/user
  -> PUT /auth/v1/user with chosen password
  -> password grant with the same e-mail + chosen password
       = normal session + ambiguous-write reconciliation proof
  -> clear recovery staging only after reconciliation succeeds
  -> promote the password-grant session to wandora.auth.session.v1
  -> bootstrap /api/v1/me
```

A suggested isolated staging key for implementation is:

```text
wandora.auth.recovery.v1
```

The exact identifier may be code-reviewed, but it must remain separate from both invite staging and the normal browser session.

### Why implicit recovery is selected for V1

GoTrue v2.196.0 already supports PKCE recovery, but PKCE introduces a browser-held verifier that must survive the e-mail round trip.

For the interrupted-invite recovery problem, persisting that verifier across tab/browser boundaries would either recreate an additional continuity problem or pressure the product toward longer-lived local persistence that conflicts with the current sessionStorage policy.

The narrow V1 therefore uses the provider's exact implicit recovery behavior, immediately removes credentials from the URL and keeps them browser-session scoped, matching the security posture already accepted for the current administrative invite.

This is not a permanent ban on PKCE. A later ADR may adopt PKCE together with a deliberately reviewed verifier-continuity model.

## ADMIN GENERATE-LINK BOUNDARY

`/admin/generate_link` with `type=recovery` remains an operator-only emergency/diagnostic capability.

It is not the customer path because it:

- requires a privileged Auth credential;
- produces raw one-time recovery material;
- mutates provider recovery state;
- would require new custody/logging rules;
- adds no capability needed for normal self-service recovery.

No raw action link, OTP or recovery token belongs in Wandora logs, business tables or browser-visible operator payloads.

## ENUMERATION AND ABUSE BOUNDARY

Customer-facing request completion must remain neutral whether or not an account exists.

Raw provider error detail must not be used to tell an unauthenticated requester that a specific e-mail is a Wandora customer.

The live provider already has internal recovery/rate/frequency controls, but CAPTCHA is currently not enabled. Before the first real recovery request is authorized, a separate activation review must establish appropriate abuse controls — preferably provider-native Turnstile/hCaptcha and/or an edge control compatible with the public Auth endpoint.

The implementation slice may be code/CI-only while this activation gate remains closed.

## SECOND ADVERSARIAL REVIEW

The following alternatives were actively challenged:

1. **Create a Wandora recovery-token table** — rejected; it duplicates provider-owned token lifecycle and increases credential risk.
2. **Add a generic Core Auth-recovery proxy** — rejected; normal recovery needs no privileged Core capability and direct browser-to-Supabase Auth is already the accepted human-auth boundary.
3. **Use `admin/generate_link` as the default customer flow** — rejected; it requires privileged Auth custody and returns raw one-time material.
4. **Resend/replay the consumed invite** — rejected; after invite verification the user is already confirmed and recovery is the correct provider capability.
5. **Persist the original invite session in localStorage so interruption cannot happen** — rejected; this enlarges credential persistence and contradicts the browser-session policy.
6. **Accept recovery fragments in the invite page as the same flow** — rejected; separate public routes/staging keep flow type explicit and fail closed.
7. **Accept any Supabase session fragment** — rejected; the recovery handler must require the exact recovery markers and valid unexpired bearer session.
8. **Adopt PKCE immediately without a verifier-continuity contract** — rejected for V1; it would move rather than solve the interruption boundary.
9. **Return “account found/not found” UX based on provider behavior** — rejected; normal request completion remains neutral.
10. **Assume a consumed recovery link can never be recovered again** — disproven by exact provider source; a new recovery request can issue a new token subject to limits.
11. **Treat provider rate limits alone as sufficient production abuse protection** — rejected; live CAPTCHA is off, so abuse controls are an explicit activation gate.
12. **Deploy ADR 0087 merely because the recovery contract is now understood** — rejected; recovery implementation, validation and activation remain separate slices.

## EXECUTION

This preflight performed only:

- canonical Git/state reconciliation;
- exact upstream GoTrue v2.196.0 source inspection;
- read-only live container/config inspection with secrets redacted/not emitted;
- read-only database counts for Auth recovery state, eligibility and unfinished hires;
- documentation/ADR work on an isolated Git branch.

It did **not**:

- call `POST /recover`;
- call `/admin/generate_link`;
- send or generate an invite/recovery link;
- create an Auth user;
- change Auth configuration;
- deploy Web/Core/Auth;
- provision a tenant;
- create Paperclip/provider wiring;
- create or modify eligibility;
- create/activate a digital employee;
- enable Human Send or Gateway outbound.

## VALIDATION

The no-effect baseline entering documentation is:

```text
Auth users = 1
recovery_token users = 0
recovery_sent_at users = 0
recovery one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Core / Web / Auth / Paperclip / Gateway = healthy
```

The branch diff against the reviewed base proves:

1. only ADR/canonical documentation changed;
2. no application code, migration, runtime manifest or secret changed;
3. production still has zero recovery state and zero eligibility;
4. no real recovery/invite was emitted;
5. the next slice remains code/CI-only.

PR #136 initially triggered the normal repository workflows. All five jobs failed before runner assignment with no executable steps/logs:

```text
Core CI #365 / run 35396657879                      steps=null
Web CI #302 / run 35396657936                       steps=null
Platform Admin CI #227 / run 35396657938            steps=null
Messaging Gateway CI #334 / run 35396657902         steps=null
Organization Adapter Plugin CI #57 / run 35396658016 steps=null
```

Selective fresh retries of Web CI and Messaging Gateway CI reproduced the same runnerless shape: `steps=null`, `logs_url=null`, no code step executed.

This is the same GitHub Actions infrastructure condition already distinguished from test failure in ADR 0087. Because this PR changes documentation only and the application tree is byte-identical to the already reviewed `main`, these runnerless jobs are not evidence of an application regression. Merge is allowed only after a final comparison still proves documentation-only scope, the branch is not behind `main`, there are no unresolved review threads and production remains untouched.

## DECISION RESULT

**Customer Owner Interrupted Invite Recovery Contract Preflight V1 is accepted with no production effect.**

The minimum path is Supabase Auth self-service recovery behind a dedicated Wandora recovery UX, using strict recovery-session staging and the existing hardened password-finalization contract. No new Wandora recovery service or durable recovery state is justified.

Real customer recovery remains blocked until both the Web implementation is reviewed and an anti-abuse activation review clears the live CAPTCHA/edge gate.

## NEXT EXECUTABLE SLICE

**Customer Owner Interrupted Invite Recovery Contract Implementation V1.**

Code/CI only.

Implement the dedicated request/callback/reset Web flow, strict `type=recovery` staging and shared password-finalization verifier. Do not deploy, send a real recovery/invite, create a real customer Auth user, provision a tenant, create provider wiring or enable eligibility during that implementation slice.
