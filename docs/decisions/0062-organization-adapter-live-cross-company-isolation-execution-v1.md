# ADR 0062 — Organization Adapter Live Cross-Company Isolation Execution V1

- Status: **Accepted — live cross-company isolation gate closed and ephemeral fixture removed**
- Date: 2026-09-18
- Scope: execute the ADR 0061 live A/B negative isolation proof against the production Paperclip/plugin/custody composition without provisioning `Empresa Exemplo`, creating a B employee, or enabling customer/messaging effects

## REAL NOW

Execution began only after ADR 0061 was merged:

```text
main = 2fad06cd4d782489a2c33c2dd83a8397e0ad13d1
Core = healthy
Paperclip = healthy
Organization Adapter = ON
Human Send = OFF
Gateway outbound = OFF

Wandora organizations = 2
control-plane Paperclip bindings = 1
digital-employee provider bindings = 1
completed Organization Adapter hire operations = 1
Empresa Exemplo Paperclip binding = 0
```

The A custody mount contained exactly the expected company-derived HMAC filename. Its value was never printed.

A read-only operator-auth preflight also proved that the already-custodied Paperclip Board token could read the live company API and that API/DB state agreed on:

```text
Paperclip companies = 1
A config = 1
A adapter secret = 1
A Ana = 1
A managed resource = 1
A config secret_ref = valid
```

## EXECUTION HISTORY

### Attempt 1 — harness membership-table mismatch, recovered

The first bounded setup created the ephemeral B company, then the verifier referenced a non-existent `user_company_memberships` table.

The harness failed closed and executed its official provider cleanup path:

```text
SETUP_RECOVERY_CLEANUP_OK
```

A fresh read-only proof immediately afterward established:

```text
fixture checkpoint = absent
Paperclip companies = 1
fixture B = 0
plugin = ready
A config / secret / Ana / managed = 1 / 1 / 1 / 1
Wandora cpb / depb / completed hires = 1 / 1 / 1
Empresa Exemplo binding = 0
Human Send = OFF
Gateway outbound = OFF
```

Paperclip source then established the canonical table name as `company_memberships`. No blind retry occurred before that recovery proof.

### Attempt 2 — preflight HTTP-code assumption corrected, recovered

With the table name corrected, setup advanced through B secret/config creation and the cross-company secret-ref negative case.

Paperclip rejected A's secret_ref for B with HTTP 400 rather than the preflight's predicted 422. The harness treated the mismatch as failure and again ran official cleanup successfully:

```text
SETUP_RECOVERY_CLEANUP_OK
```

A second baseline proof again showed B absent and A unchanged.

Source review explained the difference precisely:

1. `validatePluginSecretRefsForCompany()` throws `unprocessable("Plugin config references a secret outside the selected company")`;
2. the surrounding `POST /plugins/:pluginId/config` handler catches errors from that block and emits HTTP 400 with the original error message.

Therefore ADR 0061's numeric 422 expectation is superseded by the stronger live assertion:

```text
HTTP 400
error = "Plugin config references a secret outside the selected company"
B config remains bound to B's own secret_ref
```

The status difference was provider-route normalization, not an isolation failure.

### Final setup — green

The final setup created exactly one ephemeral provider-only company:

```text
name = Wandora Cross-Company Isolation Proof B
provider company id = 59d83cb2-4803-45cb-bfdd-9ca9f0aa2daa
owner membership = 1
plugin config = 1
B adapter secret_ref = valid
B agents = 0
B managed resources = 0
```

Cross-company secret-ref proof:

```text
attempt: configure B with A secret_ref
result: HTTP 400
error: Plugin config references a secret outside the selected company
B config after denial: still references B secret
B agents / managed resources: 0 / 0
```

## LIVE A-HMAC -> B-TARGET PROOF

The exact production A HMAC was read only inside the live Core container from its mounted custody file. The value was not printed, copied to Git, written to Wandora business state, or exposed to the browser.

The private webhook request used:

```text
target companyId = B
catalogKey = ana-commercial-v1
signature key = A HMAC
signature = HMAC-SHA256(timestamp + "." + exact raw body)
```

Observed result:

```text
HTTP = 502
error = invalid_wandora_signature
```

Immediate provider readback proved:

```text
B agents = 0
B managed resources = 0
```

No positive B-secret -> B-target reconcile was executed.

## CLEANUP + RUNTIME-SCOPE RESTORATION

Cleanup used Paperclip's authenticated company API, never direct SQL.

After deleting B, the verifier re-saved A's **exact existing config JSON unchanged** so the plugin worker recomputed its proactive company scope from the current DB set (A only).

Observed cleanup result:

```text
B company = 0
B plugin config = 0
B plugin company settings = 0
B managed resources = 0
B agents = 0
B secret versions = 0
B secret = 0

A secret_ref = unchanged
A Ana = 1
A managed resource = 1
fixture checkpoint = absent
```

The semantic no-op A config refresh creates ordinary provider audit/activity metadata. Those audit entries are expected evidence of the recovery/cleanup process and are not business/control-plane drift.

## FINAL INDEPENDENT VALIDATION

Post-cleanup independent verification, outside the setup/check/cleanup assertions:

```text
Core = healthy
Paperclip = healthy
Organization Adapter = ON
Human Send = OFF
Gateway outbound = OFF

Wandora organizations = 2
control-plane Paperclip bindings = 1
digital-employee provider bindings = 1
completed Organization Adapter hire operations = 1
internal Wandora employees = 2
Empresa Exemplo Paperclip binding = 0

Paperclip companies = 1
ephemeral fixture B = 0
plugin = ready, no error
A config = 1
A adapter secret = 1
A config secret_ref matches A secret = true
A Ana = 1
A managed resource = 1
fixture checkpoint = absent
```

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating HTTP 400 alone as sufficient proof; the canonical error message and B-config immutability were also required;
- retrying either failed setup before proving recovery;
- silently correcting the membership table and hiding the first failed attempt;
- silently changing 422 to 400 without source proof;
- using `Empresa Exemplo` as B;
- creating a positive B managed agent merely to demonstrate B can work;
- direct SQL cleanup;
- leaving B or its secret/config behind;
- assuming DB cascade alone restored the plugin worker's in-memory proactive company scope.

## DECISION

**The live Organization Adapter cross-company isolation gate is closed.**

Production now has direct live evidence that:

1. a Paperclip config for company B cannot reference company A's secret;
2. a valid company A HMAC cannot authorize an employee reconcile targeting configured company B;
3. the denied request creates zero B agents/managed resources;
4. the ephemeral B provider state can be removed through official provider APIs with zero B residue;
5. A remains bound to its original secret/resource state after runtime-scope refresh.

This does **not** activate customer hiring, `Empresa Exemplo` provider provisioning, Human Send or Gateway outbound.

## NEXT BOUNDARY

Next: **Customer Digital-Employee Lifecycle Contract Preflight V1** — observation/plan-first, no customer effect.

It must decide, before code or provider provisioning:

- the customer meaning and separation of `Contratar` versus `Ativar`;
- whether the first customer provider company is bootstrapped at organization onboarding, first hire, or another explicit boundary;
- how existing Organization Adapter idempotency/reconciliation state is reused rather than duplicated;
- required owner/admin authorization and tenant isolation;
- whether a newly hired employee remains paused/supervised until the Paperclip -> Wandora/Mastra execution adapter is production-ready;
- the minimum UI/Core contract for the currently placeholder `/start` flow;
- the exact gate before `Empresa Exemplo` becomes the first customer-like provider canary.

No customer-facing button or provider company should be activated merely by starting that preflight.
