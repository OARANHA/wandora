# ADR 0049 — Organization Adapter Production Activation Preflight V1

- Status: Accepted
- Date: 2026-09-17
- Scope: close the production activation preflight for the Organization Adapter without activating production, and stop activation if the exact production Paperclip plugin artifact is not yet promotable

## Context

ADR 0048 proved the corrected Core candidate can be built from canonical `main`, transferred to the Wandora VPS, independently verified and loaded into the Docker image store without running it or mutating the live Organization Adapter state.

The next required step was therefore a production activation preflight, not activation itself. The preflight must reconcile real state after any interruption, reuse already-proven recovery evidence instead of repeating it, enumerate the exact activation order, and actively look for missing production artifacts before migrations, provider configuration, secrets or Core recreation are allowed.

Canonical Git state at preflight:

```text
main = 2e88ed7f8b004bfe5b4d4f8c216e082cc0934ad2
```

The application source embedded in the already-proven candidate remains:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

## REAL NOW

Live state was recovered before considering any repeated operation.

Observed live boundaries remained:

```text
Core image                = wandora/core:team-read-b31db507
Core status               = healthy
Organization Adapter      = OFF
Paperclip image            = wandora/paperclip:v2026.831.1
Paperclip status           = healthy
Paperclip host binding     = 127.0.0.1:3100 -> 3100/tcp
Human Send                 = OFF
Gateway outbound           = OFF
```

The corrected Core candidate remains loaded but not running:

```text
candidate tag = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate Id  = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
running candidate containers = 0
```

Production PostgreSQL still reports the Organization Adapter private-state tables as absent:

```text
wandora_private.control_plane_provider_bindings       = ABSENT
wandora_private.digital_employee_provider_bindings    = ABSENT
wandora_private.digital_employee_hire_operations      = ABSENT
```

The production Paperclip managed plugin key is not installed/configured.

No customer `Contratar` / `Ativar funcionário` route is introduced by this preflight.

## Proven recovery evidence — do not repeat merely because a chat froze

A PostgreSQL backup was already created before adapter activation work:

```text
/home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
mode   = 0600
```

A disposable restore proof using the pinned Supabase PostgreSQL image already returned:

```text
RESTORE_TABLES=17
RESTORE_COUNTS_MATCH=YES
POSTGRES_WANDORA_RESTORE_PROOF_OK
```

The already-corrected live preactivation verifier also returned:

```text
ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK
core_image=wandora/core:team-read-b31db507
paperclip_image=wandora/paperclip:v2026.831.1
paperclip_host_binding=3100/tcp -> 127.0.0.1:3100
migration_010_tables=ABSENT
organization_adapter=OFF
human_send=OFF
gateway_outbound=OFF
custody=ABSENT
```

These operations are accepted preflight evidence. A timeout, frozen chat or missing assistant response is not permission to repeat backup, restore proof, verifier execution or `docker load` without first proving the prior operation did not complete.

## Exact migration boundary

If and only if a later activation execution passes all remaining gates, database activation order is fixed as:

1. apply `infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql`;
2. run `infra/stacks/supabase/verifiers/VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop immediately if that verifier is not green;
4. apply `infra/stacks/supabase/migrations/20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `infra/stacks/supabase/verifiers/VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop immediately if that verifier is not green;
7. only after those boundaries may the separately reviewed provider plugin/HMAC/Core activation continue.

Migration 010 being inert is not permission to apply it early. Migration 011 widens the runtime capability of `wandora_core_runtime`, so the two migrations remain part of one explicitly reviewed activation sequence.

## Paperclip production plugin boundary

The accepted managed-plugin proof is preserved under:

```text
spikes/paperclip-organization-adapter-managed-plugin-v1/
```

Its README explicitly states that it is disposable proof source, **not a production plugin package**, and must not be installed into live Paperclip as-is.

The repository currently has no canonical production package for this Organization Adapter plugin outside `spikes/`.

This is a production activation blocker.

The production plugin artifact must first be promoted through a separate slice that provides a reproducible, versioned, installable package compatible with the accepted Paperclip image/source contract and preserves the proven company-scoped managed-agent semantics. Laboratory source must not cross into live provider state by direct copy merely because its behavior was proven in a disposable environment.

## HMAC custody plan

ADR 0041 remains authoritative for per-company secret custody.

For a frozen `providerCompanyRef`, Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

The future activation must:

- generate strong per-company HMAC material outside Git and outside PostgreSQL business rows;
- keep the raw provider company reference out of filesystem paths;
- store each HMAC in the operator-owned custody directory with restrictive ownership/mode;
- mount the custody directory read-only into the candidate Core;
- preserve the existing `O_NOFOLLOW`, missing/empty/oversized/weak-material rejection boundary;
- never print or persist secret values in activation evidence.

No production Organization Adapter HMAC was generated during this preflight.

## Candidate Core composition and rollback order

The already-proven candidate image is supply-chain ready but remains inert until a later reviewed activation.

A later execution must render and inspect the exact candidate Compose composition before recreation and prove at minimum:

- the exact candidate image/tag/revision is selected;
- Organization Adapter enablement exists only in the reviewed candidate overlay;
- the exact private Paperclip webhook is used;
- HMAC custody is mounted read-only;
- Human Send and Gateway outbound remain outside this activation;
- no new customer/browser/Platform Admin hiring route is introduced by runtime activation;
- readiness fails closed if migration-011 access/provider prerequisites are incomplete.

Rollback order must prefer returning the live Core to the previously healthy Organization Adapter-OFF composition before removing any evidence needed to diagnose a failed activation. Provider configuration, HMAC custody and database state must not be destructively cleaned up as an automatic substitute for diagnosis.

Database rollback is not assumed to be a blind down-migration. The already-proven preactivation backup/restore path is the recovery boundary if a database restore is actually required.

## Residual future Paperclip database secret

A residual file exists for a previously explored future dedicated Paperclip database:

```text
/opt/wandora/stacks/paperclip-db/secrets/postgres_password
```

It is not referenced by the live Paperclip runtime and is not an Organization Adapter HMAC.

It is recorded as an explicit cleanup gap so a future operator does not mistake it for adapter custody material. It must not be reused as an HMAC, silently wired into Paperclip, or deleted merely to make this preflight look clean. Cleanup is a separate reviewed operational concern.

## Historical aborted public-exposure probe

A prior Paperclip public-exposure probe was attempted and reverted after the authenticated public deployment path required `DATABASE_URL`. The live service was returned to the accepted private topology and later reverified healthy/private.

That experiment is historical evidence only. It is not part of the Organization Adapter activation plan and must not be repeated as a shortcut to install/configure the plugin.

## Second adversarial review

### Install the proven spike directly into live Paperclip

Rejected. The repository itself labels those sources disposable and not a production package. Doing so would bypass the same promotion/provenance discipline already required for the Core candidate.

### Apply migration 010 now because it is inert

Rejected. The purpose of this preflight is to preserve an attributable activation sequence. Leaving half-activated schema ahead of the production provider artifact adds drift without removing the blocker.

### Apply 010/011 now and configure provider state later

Rejected. Migration 011 creates live runtime capability before the exact installable provider artifact exists. This inverts the reviewed fail-closed ordering.

### Configure production HMAC custody before the plugin artifact exists

Rejected. Generating secrets that have no approved installable consumer creates orphaned production material and weakens auditability.

### Treat the residual `paperclip-db` PostgreSQL password as reusable adapter secret material

Rejected. It belongs to an unrelated abandoned/future database experiment and is not HMAC custody.

### Repeat backup, restore proof, live preactivation verifier or `docker load` after the frozen chat

Rejected. Real-state reconciliation proved those operations already completed. Repeating them solely because the assistant response was interrupted would violate ADR 0034/state-first continuity.

### Mix old candidate/laboratory cleanup into activation preparation

Rejected. Cleanup is orthogonal and would widen the mutation surface while obscuring evidence attribution.

## Decision

**Production activation is NOT authorized.**

The preflight is green for the already-proven recovery, migration-order, Core-candidate and live-OFF prerequisites, but activation is **blocked by a production artifact gap**: the accepted Paperclip managed-plugin implementation currently exists only as disposable `spikes/` proof source and is explicitly not installable into live Paperclip as-is.

This is the intended outcome of the preflight: prevent a laboratory proof from being promoted through an unreviewed shortcut.

No production migration, plugin install/configuration, HMAC generation, Core recreation, customer hiring route, Human Send activation or Gateway outbound activation was performed by this ADR.

## Next action

Next executable slice: **Organization Adapter Managed Plugin Production Artifact V1**.

That slice must remain non-production and must at minimum:

1. select a canonical production package location outside `spikes/`;
2. preserve the accepted manifest-declared catalog-only managed-agent semantics from ADR 0039;
3. package the exact required Paperclip plugin manifest/worker contract as an installable, versioned artifact;
4. pin compatibility to the accepted Paperclip source/image contract;
5. add build/typecheck/test/package verification appropriate to that plugin shape;
6. produce reproducible provenance/hashes for the artifact;
7. prove no real secret, provider company identifier, API key, run JWT or production credential is embedded;
8. keep production Paperclip installation/configuration OFF;
9. perform a second adversarial review before merge;
10. after the artifact is canonical and merged, return to a fresh production activation preflight before any live effect.
