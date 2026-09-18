# ADR 0058 — Organization Adapter Execution V1 Partial Checkpoint

- Status: **Accepted checkpoint — migration 010 live; execution paused before verifier 010**
- Date: 2026-09-17
- Base: `main@c552b3a055be5c13a7732165d828aea3e08a2ca3`
- Scope: persist the exact production state reached while beginning the separately reviewed Organization Adapter Production Activation Execution V1.

## REAL NOW before execution

Pre-execution evidence remained aligned with ADR 0057:

- accepted PostgreSQL backup present with mode `0600` and SHA-256 `baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77`;
- Organization Adapter candidate image loaded with running count `0`;
- live Core `wandora/core:team-read-b31db507` healthy;
- Organization Adapter, Human Send and Gateway outbound enable flags absent;
- migrations 010/011 tables absent;
- production Organization Adapter HMAC absent;
- Paperclip canary company `Wandora Internal Supervised Proof` selected;
- operator screenshot proved zero agents and **Installed Plugins: No plugins installed**;
- canonical plugin CI artifact remained unexpired.

## DECISION / SECOND ADVERSARIAL REVIEW

Execution was allowed to begin only with migration 010. Migration 011, provider binding, plugin installation, HMAC custody, Core candidate activation and the internal canary remained gated behind the exact migration-010 verifier.

A first attempt executed the canonical migration 010 file as PostgreSQL role `postgres`. It failed on the first `CREATE TABLE` because schema `wandora_private` is owned by `supabase_admin`.

Immediately after that failure, live state was checked before any retry:

```text
current_user = postgres
wandora_private owner = supabase_admin
control_plane_provider_bindings = ABSENT
digital_employee_provider_bindings = ABSENT
digital_employee_hire_operations = ABSENT
```

Therefore the failed transaction had no partial schema effect.

The same staged migration file was proven byte-identical to the canonical Git file by Git-blob SHA:

```text
ee366a5ba8ea8ea6c893d5ab9bc52531d3953f52
```

The migration was then executed as the schema owner `supabase_admin` and committed successfully.

## LIVE RESULT

Migration 010 is now **LIVE**.

The execution output reached `COMMIT` after creating the three private tables, index, update triggers, RLS enablement, application-role revokes and comments.

Post-010 effect boundary was rechecked:

```text
candidate_running = 0
live Core = wandora/core:team-read-b31db507 healthy
Organization Adapter enable flag = absent
Human Send enable flag = absent
Gateway outbound enable flag = absent
```

No provider binding, plugin installation/configuration, HMAC custody, candidate Core start, customer hire route, Human Send or Gateway outbound effect was performed.

## GATE / PAUSE CONDITION

The exact `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql` must pass before migration 011.

During this execution session, the remote-command safety layer allowed the canonical migration file to be staged/executed but blocked materializing or directly running the full verifier payload. Historical files under `~/wandora-preflight-main` were inspected and are older foundation artifacts, not the Organization Adapter 010 verifier.

This tooling restriction is **not evidence that the verifier passed**.

Therefore execution stops fail-closed at this boundary:

```text
migration 010 = LIVE
verifier 010  = NOT YET COMPLETED
migration 011 = NOT APPLIED
provider binding = ABSENT / NOT CREATED BY THIS SLICE
plugin = NOT INSTALLED
production HMAC = NOT CREATED
candidate Core = NOT RUNNING
internal canary reconcile = NOT RUN
```

## NEXT EXECUTABLE STEP

Do not reapply migration 010.

Resume with:

1. reverify current `main` and live effect boundary;
2. execute the exact canonical `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop on any verifier failure;
4. only on green, continue with migration 011 + its canonical verifier;
5. then resume ADR 0057 from the explicit operator-owned Paperclip binding step.

Do not skip the verifier and do not infer success from migration 010 reaching `COMMIT`.
