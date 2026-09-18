# ADR 0092 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 — Pre-Mutation Credential Gate

Status: **Accepted / execution resumed; edge rule created exactly; behavioral validation pending**

Date: 2026-09-18

## Context

ADR 0091 selected the exact Cloudflare Free-plan recovery burst guard and froze its validation/rollback contract.

The next executable slice was **Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1**.

Execution was started only far enough to verify the required credential/custody preconditions. No Cloudflare WAF/rate-limit mutation was attempted.

## REAL NOW

Canonical entry state:

```text
main = ecd712044b0bed0f16e6b500e101898c1cc6e368
ADR 0091 = accepted
selected edge rule = wandora_owner_recovery_burst_guard_v1
Cloudflare zone plan = Free Website
```

Production remains unchanged:

```text
live Web = wandora/web:candidate-af542864d267 / healthy
live Core = healthy
live Auth = healthy
Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

## PROVEN PRECONDITIONS

The Wandora operator identity is:

```text
wandora-admin
primary group = wandora-ops
member of sudo + docker
```

The existing Cloudflare DNS credential is stored with the established host-secret pattern:

```text
/opt/wandora/data/traefik/secrets/cloudflare_dns_api_token
owner = root:wandora-ops
mode = 0640
```

The dedicated Cloudflare WAF custody path selected by ADR 0091 does not yet exist:

```text
/opt/wandora/data/cloudflare/secrets/
```

`/opt/wandora/data` is owned by root and is not writable by `wandora-admin` without sudo. Non-interactive sudo is not available; sudo requires the operator's password.

No alternate existing WAF/Rulesets token was found.

## GATE

Execution cannot safely continue until two operator-controlled actions occur:

1. issue a **new, separate Cloudflare API token** scoped only to `wandora.com.br` with:
   - Zone Read;
   - Zone WAF Read;
   - Zone WAF Edit/Write;
2. install that token into the reviewed host custody path using the same root:`wandora-ops`, mode 0640 pattern.

The existing DNS token must not be edited, replaced or widened.

## OPERATOR TOKEN CONTRACT

Create the token in the Cloudflare account with these semantics:

```text
name:
  wandora-recovery-ratelimit-v1

permissions:
  Zone / Zone / Read
  Zone / Zone WAF / Edit
  (or current UI-equivalent Zone WAF Write)

zone resources:
  Include / Specific zone / wandora.com.br

account-level WAF/Rulesets:
  none
DNS edit:
  none
```

The token value must never be pasted into chat, Git, issue/PR bodies or shell command history.

## HOST CUSTODY CONTRACT

After the token is issued, the operator should create the directory with the existing Wandora secret ownership pattern:

```bash
sudo install -d -o root -g wandora-ops -m 0750 /opt/wandora/data/cloudflare/secrets
```

Then stage the token through a temporary local file or hidden prompt and install it as:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
```

Do not reuse the Traefik DNS-token file and do not mount the WAF token into any application container.

The token is operator-only and should be read only by short-lived execution commands during the Cloudflare rule transaction.

## SECOND ADVERSARIAL REVIEW

### Store WAF token beside the DNS token

Rejected. Co-locating unrelated authorities in the Traefik secret directory creates misleading custody semantics and increases the chance that a WAF credential is accidentally mounted into Traefik.

### Store under the operator home directory

Rejected as the canonical production location. The existing project convention uses root-owned `/opt/wandora/data/.../secrets` with `wandora-ops` read access. The new token should follow that pattern rather than weakening custody for convenience.

### Widen the existing DNS token

Rejected again. DNS challenge and WAF mutation are materially different authorities.

### Create the directory without sudo using a user-writable location

Rejected. The inability to write the reviewed root-owned path is a safety boundary, not a problem to work around.

### Ask the assistant to generate a Cloudflare token

Not possible through the currently authorized integrations. Token issuance belongs to the authenticated Cloudflare account and must remain an explicit operator action.

## EXECUTION STOP POINT

The slice stopped **before**:

- Cloudflare ruleset read with a WAF credential;
- ruleset snapshot;
- rate-limit slot assessment;
- rule creation;
- OPTIONS burst validation;
- any Web/Auth deploy;
- any real recovery/invite;
- any tenant/provider/eligibility effect.

No partial Cloudflare mutation exists to reconcile.

## RESUME CONTRACT

After the dedicated token is installed in the reviewed custody path, resume the same execution slice from:

```text
REAL NOW
-> verify main + ADR 0091/0092
-> verify token file owner/mode without printing value
-> GET zone http_ratelimit entry point
-> snapshot current state
-> stop if single Free-plan slot is occupied
-> reprove external direct-origin negative
-> create exact reviewed rule
-> read back exact rule
-> validate with OPTIONS-only burst
-> wait >10s and prove recovery to 200
-> verify Auth recovery counters remain zero
-> validate rollback metadata
```

Do not deploy owner-access Web in this same slice.

## GITHUB ACTIONS INFRASTRUCTURE EXCEPTION

PR #140 triggered the five normal workflows. All failed before runner execution with `steps=null` and `logs_url=null`:

```text
Core CI #384 / run 35401631624
Web CI #321 / run 35401632060
Platform Admin CI #246 / run 35401631870
Messaging Gateway CI #353 / run 35401631729
Organization Adapter Plugin CI #68 / run 35401631663
```

These are not classified green and are not code/test failures because no workflow step ran. The branch remains documentation-only and no production mutation occurred.

## DECISION RESULT

**Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 is blocked before mutation by an explicit credential-issuance/custody gate.**

This is a human account-authority boundary, not a software gap and not a production failure.

## NEXT ACTION

Operator issues and securely installs the dedicated Cloudflare WAF token exactly as defined above. Then resume **Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1** from the ruleset-read/snapshot step.


## EXECUTION RESUMED — EDGE RULE CREATED / BEHAVIORAL VALIDATION PENDING

The operator completed the dedicated credential issuance and custody gate without exposing the token in chat or Git.

Host custody was independently verified:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
size = 53 bytes
```

The credential itself remains unread by repository/application components and is not mounted into Web/Core/Auth/Gateway/Paperclip.

### Ruleset pre-mutation proof

A read-only request with the dedicated WAF credential returned:

```text
HTTP_STATUS=404
SUCCESS=false
ERROR_CODE=10003
ERROR_MESSAGE=could not find entrypoint ruleset in the http_ratelimit phase
```

This proves the zone had no existing `http_ratelimit` entry-point ruleset at the mutation boundary. Therefore the single Free-plan rate-limit slot was not occupied by another rule.

### Exact rule creation

The operator executed the reviewed fail-closed transaction. It rechecked the entry point immediately before mutation and created the first zone-level `http_ratelimit` ruleset only after receiving the expected 404/10003 absence proof.

Creation/read-back result:

```text
ZONE_OK=true
PLAN=Free Website
PRECHECK_HTTP=404
FREE_SLOT_CONFIRMED=true
CREATE_HTTP=200
CREATE_SUCCESS=true
VERIFY_HTTP=200
RULESET_ID=56c46388452f4328b27a6e6bf5f55cc8
RULE_ID=77758d45428d43fa8c8810569579f90f
RULE_COUNT=1
RULE_REF=wandora_owner_recovery_burst_guard_v1
ACTION=block
EXPRESSION=http.request.uri.path eq "/auth/v1/recover"
PERIOD=10
REQUESTS_PER_PERIOD=6
MITIGATION_TIMEOUT=10
EXACT_MATCH=true
```

The transaction is idempotent by stable rule ref and would stop rather than replace an unexpected existing ruleset.

### Post-creation no-effect invariants already proven

Immediately after creation:

```text
recovery_sent_at rows = 0
recovery_token rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

live Web remains wandora/web:candidate-af542864d267
owner-access Web remains undeployed
```

No recovery POST, invite/recovery e-mail, Auth-user mutation, Web deploy, tenant/provider provisioning or eligibility activation occurred.

### Remaining validation gate

The edge effect is now active but this execution slice is not yet closed.

Still required:

1. bounded external burst using only `OPTIONS /auth/v1/recover`;
2. prove normal OPTIONS works before the burst;
3. prove the bounded burst reaches the Cloudflare rate-limit response;
4. wait longer than the 10-second mitigation window and prove OPTIONS returns to normal;
5. prove recovery-token/sent counters remain zero;
6. reprove arbitrary external direct-origin access is not reachable;
7. freeze final rollback evidence and close the slice.

The assistant execution environment rejected automated repeated OPTIONS traffic as a safety restriction. That restriction does not imply a production failure and must not be bypassed. The behavioral proof therefore requires one bounded operator-side OPTIONS test.

### Rollback identifiers now frozen

```text
ruleset id = 56c46388452f4328b27a6e6bf5f55cc8
rule id = 77758d45428d43fa8c8810569579f90f
stable ref = wandora_owner_recovery_burst_guard_v1
```

Rollback must target only this stable rule/ref and must never replace/delete unrelated rulesets wholesale.
