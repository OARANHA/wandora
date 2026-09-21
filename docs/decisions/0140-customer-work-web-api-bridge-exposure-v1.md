# ADR 0140 — Customer Work Web API Bridge Exposure V1

Status: **Accepted / implementation qualification / NO PRODUCTION EFFECT**  
Date: 2026-09-20  
Base: `main@332e8e06a368d70f8d908682707a78053ea58f28`  
Predecessor: ADR 0139

## Context

ADR 0139 stopped the first legitimate work production execution before Gate 6 because the qualified Web image did not expose the reviewed customer-work route through its Nginx allow-list.

Core, migration 016, Organization Adapter v0.3.0 and `wandora_mastra@0.2.0` are already live and validated. They must not be repeated merely because this implementation slice exists.

The missing customer path is:

```text
/api/v1/organizations/{organizationId}/digital-employees/{employeeId}/work
```

## Capability authority / reuse gate

This slice does not create a new work authority and does not execute work.

It only exposes the already-reviewed Wandora Core customer API route through the Web reverse proxy.

The authority chain remains:

```text
authenticated owner browser
  -> Wandora Web exact allow-list
  -> private Wandora Core
  -> Organization Adapter
  -> Paperclip issue/run authority
  -> wandora_mastra
  -> Mastra
```

No generic API proxy is introduced.

## Decision

Add one exact UUID-scoped Nginx location for the customer-work route.

The location must:

- proxy only to `http://wandora-core:8788`;
- forward `Authorization`;
- forward `Idempotency-Key`;
- strip browser `Cookie`;
- clear `Connection`;
- preserve the existing 2s connect and 10s send/read timeouts.

Generic `/api/` remains fail-closed and `/internal/` remains fail-closed.

## CI contract

Web CI must prove both GET and POST through the exact customer-work path against an isolated mock Core.

GET proves:

- exact path reaches private Core;
- `Authorization` crosses;
- browser Cookie does not cross;
- no idempotency key/body is invented.

POST proves:

- exact path reaches private Core;
- `Authorization` crosses;
- browser Cookie does not cross;
- the original `Idempotency-Key` crosses unchanged;
- the request body crosses unchanged.

CI must also prove a deeper unreviewed child path remains HTTP 404.

These tests use only an isolated mock Core in CI and do not create a Paperclip issue, wakeup, heartbeat, run, task session, runtime run or production work journal entry.

## Second adversarial review

### Use a generic organization API proxy

Rejected. It would widen the customer-facing attack/effect surface beyond the reviewed route.

### Proxy the route but omit Idempotency-Key

Rejected. First-work retry safety depends on preserving the browser operation identity through Web to Core.

### Rebuild or patch the live Web container directly

Rejected. Production promotion must use a CI-qualified immutable artifact.

### Enable Gate 6 before the replacement Web artifact is live

Rejected. Core work admission remains OFF until the exact Web artifact is promoted and the route is proven to reach Core while the gate is still OFF.

## Production resume gate

After this implementation is merged and Web CI is GREEN:

1. obtain the exact Web artifact produced by the merged/qualified commit;
2. verify artifact provenance and hashes;
3. promote **only Web**;
4. verify health, login/auth public config and existing customer surfaces;
5. prove the exact customer-work URL now reaches Core while the Core work gate remains OFF;
6. revalidate zero work: journal 0, issues/wakeups/heartbeat/runs/sessions/routines/runtime usage/outbound all zero;
7. only then resume ADR 0139 at Gate 6.

Gate 6 remains:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED=true
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL=http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work
```

After Gate 6 readiness validation, stop. Do not create a work title/description and do not execute real work.

The first real work remains a separate later slice initiated by a genuine authenticated MEDICSPRO owner instruction.
