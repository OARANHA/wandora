# ADR 0091 — Customer Owner Recovery Edge Anti-Abuse Control Preflight V1

Status: **Accepted / preflight complete; edge control selected, execution blocked on dedicated Rulesets credential**

Date: 2026-09-18

## Context

ADR 0090 proved the current-main owner invite + recovery Web candidate, redirect/origin compatibility, image-only rollback and post-deploy checks, but correctly refused production activation because no compatible anti-abuse control for public `POST /auth/v1/recover` was proven.

This slice is no-effect. It must select the narrowest compatible edge control for the actual Cloudflare plan and topology, prove the required authority/custody boundary, freeze validation/rollback, and avoid all invite/recovery/Web/tenant effects.

Explicitly forbidden during this preflight:

- create/modify a Cloudflare WAF/rate-limit rule;
- enable GoTrue CAPTCHA;
- deploy/recreate Web/Auth/Core;
- call real `POST /auth/v1/recover`;
- generate/send invite or recovery mail/token;
- mutate Auth users;
- provision tenant/provider state;
- create/enable eligibility;
- enable Human Send or Gateway outbound.

## REAL NOW

Canonical entry state:

```text
main = b4504a094a50039204be1f20e441707de9588dfd
ADR 0090 = accepted
owner-access Web candidate = staged locally / not running
live Web = wandora/web:candidate-af542864d267
live Auth = supabase/gotrue:v2.196.0
```

Production revalidation:

```text
Web  = healthy / restarts 0
Core = healthy / restarts 0
Auth = healthy / restarts 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

owner-access candidate running = false
```

## PROVEN CLOUDFLARE STATE

The already-installed DNS token was used only for read-only zone inspection; its value was not emitted.

The live zone is:

```text
zone = wandora.com.br
status = active
plan = Free Website
legacy plan id = free
```

The current token can identify/read the zone but receives HTTP 403 when reading the zone `http_ratelimit` entry-point ruleset. It therefore cannot prove or manage the WAF/rate-limit state.

Only one Cloudflare credential is currently evident on the Wandora VPS:

```text
/opt/wandora/data/traefik/secrets/cloudflare_dns_api_token
```

No broader WAF/Rulesets credential was found. The DNS token must not be widened merely for convenience.

## FREE-PLAN CAPABILITY BOUNDARY

Cloudflare's current zone-level Rate Limiting Rules capability supports the Free plan with these relevant restrictions:

- maximum rate-limiting rules: 1;
- rule-expression fields include Path;
- counting characteristic: IP;
- counting period: 10 seconds;
- mitigation timeout: 10 seconds;
- zone-level rules use the `http_ratelimit` phase.

Free plan does not offer Method as a rule-expression field. Therefore a rule scoped to:

```text
http.request.uri.path eq "/auth/v1/recover"
```

will count both the browser CORS OPTIONS preflight and the recovery POST.

That behavior is intentional in the selected V1 threshold.

## CORRECTION TO ADR 0090 ORIGIN PREMISE

ADR 0090 correctly warned that local routing to the origin must not be confused with Cloudflare edge protection, but one premise was too strong: the `127.0.0.1` direct-origin proof only demonstrated local Traefik routing.

A new read-only test from the independent authorized `28server` attempted a direct public-origin TLS connection to the Wandora Supabase hostname while bypassing public DNS/Cloudflare.

Result:

```text
direct external origin connection = timeout
HTTP = 000
TCP/TLS connection not established
```

Public traffic through Cloudflare remains reachable.

This disproves the idea that the earlier loopback test itself proves an externally reachable origin bypass.

However, the exact UFW rule set could not be read non-interactively because `wandora-admin` requires sudo authentication for `ufw status`. Therefore this ADR does **not** claim a fully enumerated Cloudflare-only firewall allow-list. The future execution must reprove the external direct-origin negative before and after the rate-limit change. It must stop if arbitrary direct-origin access becomes reachable.

## GAPS

The remaining gap is operational authority, not product code:

1. no dedicated Zone WAF/Rulesets credential exists on the VPS;
2. the existing DNS token is intentionally insufficient and must remain DNS-scoped;
3. the current ruleset cannot be read, so the Free-plan single-rule slot is not yet proven empty;
4. no rate-limit mutation may occur until a dedicated least-privilege credential can first read/snapshot the current entry-point state.

No Web, Core, Auth schema or recovery-token service is missing.

## CAPABILITY AUTHORITY / REUSE GATE

Recovery abuse protection belongs at the existing public edge and/or the Auth provider.

Selected reuse:

```text
Cloudflare zone-level Rate Limiting Rules
  -> exact recovery path
  -> per-IP burst control
  -> provider-native GoTrue limits remain defense-in-depth
```

Rejected:

- Wandora-native recovery proxy solely for rate limiting;
- widening the DNS token with WAF write capability;
- enabling GoTrue CAPTCHA without adding its browser token contract;
- Traefik-only forwarded-IP rate limiting without a fully proven origin trust boundary;
- broad rate limiting across all `/auth/v1`;
- changing public signup or Auth recovery semantics.

## DECISION

Select one Cloudflare **zone-level Free-plan rate limiting rule** for V1.

Exact intended rule:

```text
name/ref: wandora_owner_recovery_burst_guard_v1
phase: http_ratelimit
expression:
  http.request.uri.path eq "/auth/v1/recover"

action: block
characteristics:
  cf.colo.id
  ip.src

period: 10 seconds
requests_per_period: 6
mitigation_timeout: 10 seconds
```

No custom response is required; Cloudflare's normal rate-limit block response is sufficient. The Web already converts non-success provider responses into neutral recovery failure UX.

### Why 6 requests / 10 seconds

One normal browser recovery attempt may produce:

```text
OPTIONS /auth/v1/recover
POST    /auth/v1/recover
```

because the app and Supabase are different origins and the request carries non-simple headers/content type.

A six-request threshold therefore leaves room for roughly three rapid browser attempts in the same 10-second window before mitigation, while still cutting machine-speed bursts at the edge.

Recovery is a low-frequency human action. This edge control is combined with the provider's existing recovery/OTP and SMTP frequency controls; it is not treated as the only abuse defense.

The V1 threshold is deliberately conservative and may be revised later from observed traffic/false-positive evidence.

## DEDICATED CREDENTIAL CONTRACT

Do not modify the existing DNS token.

Create a separate Cloudflare API token scoped only to the Wandora zone with the minimum permissions required to read and manage zone WAF/rulesets.

Required intent:

```text
resource scope:
  one zone only -> wandora.com.br

permissions:
  Zone Read
  Zone WAF Read
  Zone WAF Write/Edit
```

The exact Cloudflare UI label may be `Edit` or `Write` depending on the current token UI/API terminology; no Account-level WAF/Rulesets authority is required for this Free-plan zone rule.

Future operator custody path:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
```

Custody requirements:

- never commit;
- mode 0600;
- operator-only use;
- never mount into Web/Core/Auth/Gateway/Paperclip;
- never print the token;
- never reuse it as the Traefik DNS challenge credential.

## SECOND ADVERSARIAL REVIEW

### Alternative: 10 requests / 10 seconds

Rejected as unnecessarily permissive for a human password-recovery action. Because OPTIONS + POST can count separately, 6/10s already permits several immediate retries.

### Alternative: 2 requests / 10 seconds

Rejected as too brittle. One browser attempt can consume two counted requests, and browser/network retry behavior could create false positives immediately.

### Alternative: Managed Challenge

Rejected for V1. The protected endpoint is called through browser fetch/XHR, and an interactive/challenge response is a weaker UX fit than a short deterministic block. A 10-second block remains simple and self-clearing.

### Alternative: provider-native CAPTCHA now

Rejected again. The current reviewed Web contract does not send the provider CAPTCHA token. Turning CAPTCHA on before implementing that contract would break normal recovery.

### Alternative: reuse/widen DNS token

Rejected. DNS challenge custody and WAF mutation are separate authorities. Least privilege requires a separate token.

### Alternative: rate-limit all Auth routes

Rejected. It unnecessarily widens blast radius into login/session/invite verification paths.

### Alternative: rate-limit only POST by method

Unavailable on the actual Free plan because Method is not an available Free-plan expression field.

### Alternative: treat the external origin as proven Cloudflare-only

Rejected. An independent external bypass attempt timed out, which is strong negative evidence, but the precise host firewall allow-list is not readable in this session. The execution contract therefore preserves a mandatory external direct-origin negative check.

## FROZEN FUTURE EXECUTION TRANSACTION — NOT AUTHORIZED BY THIS ADR

A later execution slice may proceed only with the dedicated credential and must:

1. verify current `main`, ADR 0091 and runtime invariants;
2. verify the dedicated token can read the exact zone and `http_ratelimit` entry point;
3. snapshot the full pre-change entry-point JSON with secrets absent;
4. prove the Free-plan rate-limit slot is empty or stop for conflict review;
5. reprove arbitrary direct-origin access from the independent external host is not reachable;
6. create exactly one rule with ref `wandora_owner_recovery_burst_guard_v1`;
7. read the ruleset back and prove exact expression/action/rate parameters;
8. validate using **OPTIONS only**, never `POST /recover`:
   - normal OPTIONS = 200 before burst;
   - controlled burst from one external IP eventually reaches Cloudflare rate-limit response;
   - no Auth recovery token/sent counters change;
   - after >10 seconds, normal OPTIONS returns 200 again;
9. reverify live Web still old/not deployed and owner-access candidate still not running;
10. reverify Hire ON, eligibility 0, unfinished hires 0, Human Send OFF, Gateway outbound OFF;
11. reprove direct-origin negative after the rule change.

Because Cloudflare documents a short enforcement delay and per-data-center counters, validation must not require the seventh request to be the exact blocked request. It must only prove that a bounded burst triggers the rule and the control self-recovers after the mitigation window.

## ROLLBACK CONTRACT

Record the created rule ID and pre-change ruleset snapshot.

Rollback:

1. delete only the rule whose stable ref is `wandora_owner_recovery_burst_guard_v1`;
2. read the entry point back and prove that ref is absent;
3. verify normal public OPTIONS to `/auth/v1/recover` returns 200;
4. prove Auth recovery-token/sent counters remain unchanged;
5. if Cloudflare auto-created an otherwise empty entry-point ruleset, leaving the empty phase entry point is acceptable because it has no traffic effect; do not delete unrelated provider state merely for cosmetic rollback.

Never replace the whole ruleset when deleting one reviewed rule.

## VALIDATION / NO-EFFECT RESULT

This preflight made no Cloudflare rule mutation and no Auth/Web runtime change.

Final live safety state remains:

```text
live Web = wandora/web:candidate-af542864d267 / healthy
owner-access candidate = staged / not running
Auth = healthy

Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
```

No recovery/invite was requested or generated.

## GITHUB ACTIONS INFRASTRUCTURE EXCEPTION

PR #139 triggered the five normal repository workflows. Each job ended before runner execution with `steps=null` and `logs_url=null`:

```text
Core CI #381 / run 35401348817
Web CI #318 / run 35401348710
Platform Admin CI #243 / run 35401348722
Messaging Gateway CI #350 / run 35401348712
Organization Adapter Plugin CI #66 / run 35401348715
```

These checks are not classified green and are not treated as code/test failures because no workflow step executed. This reproduces the runnerless GitHub Actions condition already recorded by ADRs 0087–0090.

The documentation-only merge exception requires the final branch to remain based on unchanged reviewed `main`, contain only canonical documentation, have no unresolved review threads, and preserve all no-effect production invariants.

## DECISION RESULT

**Customer Owner Recovery Edge Anti-Abuse Control Preflight V1 is accepted.**

The anti-abuse design is now exact and compatible with the real Free plan. The only remaining activation prerequisite is a dedicated zone-scoped WAF credential that can first read/snapshot the current single-rule slot and then create the reviewed rule.

## NEXT EXECUTABLE SLICE

**Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1**

Execution remains bounded to Cloudflare edge only. Do not deploy the owner-access Web and do not issue a real invite/recovery in the same slice.

If the dedicated credential cannot read the existing entry point, if the Free-plan slot is already occupied, or if direct-origin external access becomes reachable, stop without mutation.
