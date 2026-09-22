# ADR 0157 — Organization Adapter Historical-Error Customer-Work Admission Compatibility Implementation V1

Status: **ACCEPTED / IMPLEMENTED IN REPOSITORY / NO PRODUCTION EFFECT**
Date: 2026-09-21

## Context

ADR 0156 proved a Wandora-owned compatibility gap before the second legitimate MEDICSPRO customer work:

- Paperclip v2026.916.0 considers agent `error` invokable;
- live Organization Adapter 0.3.0 requires literal `idle`;
- therefore current customer-work admission fails before Paperclip's authoritative `issues.requestWakeup`.

ADR 0156 selected the least-authority correction: accept exactly `idle | error` at the existing conservative Wandora pre-admission boundary, keep `running` and other statuses rejected, and continue to rely on Paperclip for final invokability.

This ADR records that repository implementation. It does not install or replace the live plugin and does not authorize second customer work.

## Implementation

Organization Adapter package version is bumped:

```text
0.3.0 -> 0.3.1
```

The customer-work gate changes from:

```ts
if (managed.agent.status !== 'idle') {
  throw new Error(`managed_employee_not_idle:${managed.agent.status}`);
}
```

to:

```ts
if (!['idle', 'error'].includes(managed.agent.status)) {
  throw new Error(`managed_employee_not_ready:${managed.agent.status}`);
}
```

No capability, webhook, catalog key, HMAC contract, issue origin contract or dispatch-receipt schema changes.

The existing Core production-activation rehearsal carried an exact static candidate-version assertion. CI correctly exposed that stale `0.3.0` pin; the implementation updates only that verifier expectation to `0.3.1` while preserving all activation/work separation assertions.
## Regression contract

The work test suite now proves:

- `idle` still creates exactly one provider issue and one wake request;
- historical `error` also creates exactly one provider issue and one wake request;
- `running` still fails before issue creation/wakeup;
- replay of a dispatched receipt creates no second issue or wakeup;
- ambiguous `dispatching` remains fail-closed.

Activation behavior is unchanged. It still converges an explicit customer activation from `paused` to `idle`; this implementation does not use activation/resume as error remediation.

## Capability authority

The correction deliberately does not remove Paperclip's final checks.

After the local pre-admission gate, `ctx.issues.requestWakeup` still enforces:

- same-company issue identity;
- assigned agent;
- wakeable issue state;
- blockers;
- budget;
- actual Paperclip agent invokability;
- wake-on-demand policy;
- run idempotency.

Thus 0.3.1 fixes only a Wandora false negative and does not claim Paperclip lifecycle authority.

## Disposable qualification

A clean candidate copy was built and tested inside exact image:

```text
wandora/paperclip:v2026.916.0
```

with no network and no production data.

Qualification results:

```text
TypeScript strict check                   = PASS
manifest bundle                           = PASS
worker bundle                             = PASS
contract/activation/work test bundles     = PASS
node tests                                = 16/16 PASS
artifact verifier                         = PASS
Paperclip pinned manifest validator       = PASS
node --check manifest/worker              = PASS
npm pack #1 / #2 reproducibility          = PASS
```

Reproducible candidate package:

```text
paperclip-plugin-wandora-organization-adapter-0.3.1.tgz
sha256 = 49bc32b4d22b3000310e01db13c51a3348dc66774a4bf880571154136b3d0240
```
## SECOND ADVERSARIAL REVIEW

### Could accepting error create a concurrent second run?

The current Ana has no live run, and `error` is a terminal diagnostic projection. More importantly, Paperclip still performs its own invokability/concurrency policy when `requestWakeup` executes.

The implementation does not newly admit `running` at the Wandora pre-gate.

### Could this hide the historical error?

No. No lifecycle mutation is performed. The agent remains `error` until Paperclip changes it naturally through a later run or a separately authorized operator clear.

### Could the plugin wake twice?

No new retry behavior is introduced. The existing stable work origin + plugin dispatch receipt + Paperclip wakeup idempotency key remain unchanged.

### Should the plugin instead call clear-error or resume?

No. That would mutate Paperclip state to satisfy a Wandora bug and was rejected by ADR 0156.

### Should all Paperclip-invokable states be accepted?

Not in this slice. `running` remains rejected to preserve the current conservative serialization contract. Concurrency can be designed separately.

## Production boundary

Live production remains Organization Adapter 0.3.0.

This implementation does **not**:

- install 0.3.1;
- restart Paperclip;
- mutate plugin config or secret refs;
- clear/resume/pause Ana;
- create work, issue, wakeup, heartbeat or run;
- call Core, Mastra or Mistral;
- enable Human Send or Gateway outbound.

## Next slice

A separate **Organization Adapter 0.3.1 Production Promotion Preflight V1 — NO EFFECT** must:

1. reconcile exact live 0.3.0 package/provenance/config;
2. freeze the 0.3.1 candidate artifact and rollback asset;
3. prove Paperclip's official plugin upgrade/install semantics for config preservation and restart behavior;
4. prove no work/run/outbound activity during promotion;
5. define exact rollback;
6. stop before installation.

Only a later execution slice may promote 0.3.1.

The second legitimate customer work remains prohibited until that promotion is complete and freshly validated.
