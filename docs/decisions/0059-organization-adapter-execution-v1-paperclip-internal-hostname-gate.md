# ADR 0059 — Organization Adapter Execution V1: Paperclip Internal Hostname Gate

- Status: **Accepted partial execution checkpoint**
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

## NEXT GATE

After this change is merged and green:

1. promote the exact merged Paperclip Compose;
2. recreate only Paperclip;
3. prove the internal service hostname is accepted;
4. revalidate plugin/config and zero provider-agent state;
5. require the existing Wandora operation to remain `uncertain`;
6. retry the **same** idempotency key;
7. validate exactly one managed Ana and completed Wandora binding;
8. stop before customer hiring, a second provider company, Human Send or Gateway outbound.
