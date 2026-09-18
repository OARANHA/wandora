# ADR 0059 — Organization Adapter Execution V1: Paperclip Internal Hostname Gate

- Status: **Accepted — internal canary completed; hostname gate fixed**
- Date: 2026-09-17

## REAL NOW

Base before this slice:

```text
main = aa6d4ee2f092bca58704d022c9dc3913460e1413
PR #102 = merged
```

Execution V1 has advanced beyond PR #102.

## PROVEN STATE

```text
migration 010 = LIVE
verifier 010 = ORGANIZATION_ADAPTER_STATE_V1_OK
migration 011 = LIVE
verifier 011 = ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_OK

internal Wandora -> Paperclip control-plane binding = exactly 1
Empresa Exemplo Paperclip company = absent

wandora.organization-adapter-v1 = installed
plugin version = 0.1.0
plugin status = ready
plugin worker = initialized

company-scoped plugin config = present
company-scoped secret reference = present
Paperclip secret version = 2

candidate container = wandora-core-oa-candidate-smoke
candidate healthz = 200
candidate readyz = 200
candidate Organization Adapter = ON
candidate Human Send = OFF
candidate published ports = none

live Core Organization Adapter = OFF
Gateway outbound = OFF
```

Before the first internal canary, both Wandora and Paperclip proved zero existing catalog-hire/provider-agent state for `ana-commercial-v1`.

## FIRST CANARY ATTEMPT

The canary used the frozen internal company and:

```text
catalogKey = ana-commercial-v1
idempotencyKey = oa-production-canary-v1-20260918
```

The provider call returned HTTP 403 and the local operation correctly moved to `uncertain`.

Paperclip reported:

```text
This hostname is not allowed for this Paperclip instance.
```

The request used the private Docker service hostname `wandora-paperclip:3100`. The denial occurs in Paperclip's `privateHostnameGuard` before the plugin webhook route, so no managed reconcile was executed.

## GAP

The canonical Organization Adapter webhook uses the private service hostname, but the Paperclip private hostname allow set does not yet include that service name.

## DECISION

Preserve the private hostname guard and add only:

```text
PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip
```

to the versioned Paperclip stack.

Rejected:

- disabling the hostname guard;
- sending the private Core call through the public operator hostname;
- broad wildcard/private-subnet allowlists;
- using a new canary idempotency key;
- creating a second provider company.

## EXECUTION COMPLETION

PR #103 merged the minimal private-hostname correction:

```text
main = 58b792529e8fa7fa9e4b556459f45952b607ee43
PAPERCLIP_ALLOWED_HOSTNAMES = wandora-paperclip
```

The exact merged Compose blob was promoted. Paperclip was recreated once and revalidated:

```text
state = running
health = healthy
restarts = 0
deploymentMode = authenticated
deploymentExposure = private
bootstrapStatus = ready
public URL = https://control.wandora.com.br
internal candidate -> Paperclip /api/health = 200
```

Plugin/config/custody survived the recreate:

```text
plugin = wandora.organization-adapter-v1@0.1.0
plugin status = ready
company config rows = 1
secret_ref = valid company-owned reference
secret version = 2
provider agents before retry = 0
managed resources before retry = 0
```

The existing `uncertain` operation was retried with the **same** idempotency key:

```text
oa-production-canary-v1-20260918
```

Result:

```text
CANARY_OK
employee id = 664dfd0f-b693-4581-a59e-465bbf3b61b9
name = Ana
role = commercial-assistant
status = active
autonomy = supervised
```

Post-canary proof:

```text
Wandora hire operations for ana-commercial-v1 = 1
Wandora provider bindings = 1
Wandora active supervised Ana = 1
operation status = completed

Paperclip companies = 1
Paperclip Ana agents = 1
Paperclip Ana status = paused
Paperclip adapterType = wandora_mastra
Paperclip managed resources = 1
```

A replay through the same Wandora contract and same idempotency key returned the same employee ID. Provider counts remained 1/1.

The temporary side-by-side candidate smoke container was then stopped and removed. The candidate image remains loaded and provenance-matched. The live Core was not replaced by this canary slice.

## EFFECT BOUNDARY AFTER CANARY

```text
live Core image = wandora/core:team-read-b31db507
live Core health = healthy
live Core Organization Adapter = OFF
Human Send = OFF
Gateway outbound = OFF

candidate smoke container = absent
candidate image = loaded

customer Contratar/Ativar = absent
Empresa Exemplo Paperclip company = absent
```

## NEXT SLICE

The internal canary is complete and documented.

The next separately reviewed slice is **Organization Adapter Live Core Promotion V1**:

1. fresh REAL NOW against current `main`, live Core and Paperclip;
2. re-render the exact candidate composition preserving current Gateway ingress, Human API and deterministic Agent Runtime overlays;
3. keep Human Send and Gateway outbound absent;
4. second adversarial review of replacement/rollback and current traffic impact;
5. promote the provenance-matched candidate image to the live Core only if the rendered contract still matches;
6. validate live Core `healthz/readyz`, existing customer read paths and private Organization Adapter readiness;
7. keep customer hiring/activation absent;
8. stop before second/customer Paperclip company provisioning and the cross-company live gate.

