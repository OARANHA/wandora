# MEDICSPRO Ana Second Legitimate Customer Work Production Preflight V1

Status: **CLOSED / NO EFFECT / BLOCKED BY ORGANIZATION ADAPTER COMPATIBILITY GAP**

Authority: ADR 0156.

## Finding

Paperclip v2026.916.0 considers Ana's historical `error` state invokable, but live Organization Adapter 0.3.0 requires the managed agent to be literally `idle` before creating/waking a customer-work issue.

Therefore the second customer work must not be submitted yet.

## Current live invariant

```text
Wandora Ana             = active + supervised
Paperclip Ana           = error / historical diagnostic
Paperclip invokable     = yes
Organization Adapter    = 0.3.0 / idle-only work gate
MED-1                   = done
live runs               = 0
historical runs         = 2
work operations         = 1
outbound attempts       = 0
Human Send              = OFF
Gateway outbound        = OFF
```

## Required correction before second work

Repository implementation only:

```text
customer-work pre-admission:
  idle  -> allowed
  error -> allowed
  all other states -> unchanged rejection

final execution admission:
  Paperclip issues.requestWakeup / heartbeat.wakeup
```

Do not clear or resume Ana to satisfy the current plugin.

## Evidence required from candidate

- plugin source has no literal idle-only false negative;
- unit test: `error` creates exactly one issue and one wake request;
- unit test: `running` remains rejected before issue creation;
- replay of dispatched receipt still creates zero new issue/wakeup;
- dispatching receipt still fails closed;
- pinned Paperclip compatibility validation passes;
- reproducible package hashes pass;
- candidate is not installed live during implementation.

## Promotion remains separate

After implementation is merged and candidate qualified:

1. re-read production;
2. prove no work/run/outbound drift;
3. promote only the Organization Adapter artifact through an explicit production execution slice;
4. validate plugin ready/version/capabilities and Ana unchanged;
5. only then return to the second legitimate work execution preflight.

This runbook authorizes **no production effect**.
