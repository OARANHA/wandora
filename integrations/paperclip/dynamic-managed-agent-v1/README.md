# Paperclip Dynamic Managed Agent candidate V1

This directory composes the already-qualified Paperclip Fast Read provider deltas
with the separately-qualified **dynamic managed Agent ensure** delta.

It does not create a Wandora task engine, employee registry, approval system, or
production deployment path. Paperclip remains the operational authority for Agent
lifecycle and native hire approvals.

## Exact base

The composer accepts only:

```text
Paperclip v2026.916.1
d554c4789ed3930f8a53ac9fdf6503b3187097da
```

It first reuses `fast-read-convergence-v1/compose-qualified-patches.sh`, which
applies the four previously qualified provider deltas, and then applies:

```text
v2026.916.1-dynamic-managed-agent-ensure-v1.patch
```

The fifth patch is intentionally authored against that composed four-patch tree.
It must apply with exact context. Fuzz/union conflict resolution is not allowed.

## V1 authority boundary

The provider patch adds the dedicated plugin capability:

```text
agents.managed.dynamic
```

and the host primitive:

```text
ctx.agents.managed.ensureDynamic(...)
```

The existing `agents.managed` capability remains unchanged and cannot call the
dynamic primitive.

Paperclip owns:

- provider Agent creation/lifecycle;
- native hire approval lifecycle;
- provider marker and creation fingerprint;
- advisory-lock serialization;
- managed-resource binding;
- provider audit;
- the structural unique marker index, including terminated Agents.

Wandora continues to own DigitalEmployee identity and product semantics. No
Wandora workforce mirror or provider Agent lifecycle table is introduced here.

## Candidate-only boundary

The workflows for this slice may:

- compose the five provider deltas;
- install/build dependencies on GitHub-hosted `ubuntu-24.04`;
- run synthetic/embedded-Postgres tests;
- start a disposable authenticated/private Paperclip container on a fresh volume;
- freeze exact Docker image bytes and provenance as a short-lived Actions artifact.

They must not:

- push an image;
- deploy to production;
- apply a production migration;
- use production credentials;
- create a real customer/provider Agent;
- contact a model/business provider.

Production activation remains a separate effect-authorizing slice.
