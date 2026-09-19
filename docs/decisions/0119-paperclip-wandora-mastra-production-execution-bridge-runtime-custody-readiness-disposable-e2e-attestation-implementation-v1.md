# ADR 0119 — Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1

- Status: **Accepted implementation — repository/CI readiness gaps closed; production bridge remains dormant**
- Date: 2026-09-19
- Scope: implement the three production-readiness contracts identified by ADR 0118 without applying migration 014, creating live bridge secrets, installing the live adapter, recreating live Core/Paperclip, granting `agents.resume`, activating/resuming Ana, enabling Human Send or enabling Gateway outbound.

## REAL NOW

Canonical Git entering this slice:

```text
main = a396e44265e86e53ada43b9c00786e1046c65f0e
PR #169 = feat/paperclip-execution-bridge-runtime-attestation-v1
```

This main is later than the ADR 0118 entry checkpoint `2d4adc5c81ce6ce36554fd9e3fa399656dd7d612`; the later change is the accepted ADR 0118 closure. The implementation therefore starts from the real current main rather than replaying an older chat checkpoint.

Fresh read-only production reconciliation before and during implementation continued to prove:

```text
wandora-core              = healthy / restarts 0
wandora-paperclip         = healthy / restarts 0
wandora-messaging-gateway = healthy / restarts 0

migration 014 resolver      = ABSENT
Core execution bridge       = OFF
Human Send                  = OFF
Gateway outbound            = OFF
live bridge secret           = ABSENT
live Paperclip bridge overlay= ABSENT
```

No live Core/Paperclip container was recreated and no production execution path was activated.

## PROVEN EVIDENCE

### 1. Runtime custody overlay exists without live installation

Repository now contains:

```text
infra/stacks/paperclip/compose.paperclip-execution-bridge.yaml
```

It freezes the production-shaped Paperclip custody contract:

- Core bridge URL = `http://wandora-core:8788/internal/v1/paperclip/execution`;
- dedicated HMAC is file-backed;
- host secret path is supplied explicitly through `WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE_HOST`;
- runtime secret target is `/run/secrets/wandora/paperclip-execution-bridge.hmac`;
- no secret value is stored in Git.

The overlay is validated through `docker compose config` in CI. It has **not** been copied into the live Paperclip stack and no live HMAC file has been created.

### 2. Core readiness now fails closed on the migration-014 resolver boundary

When `WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED=true`, `/readyz` now performs a read-only call to:

```sql
wandora_private.resolve_paperclip_execution_organization(text)
```

If the resolver is unavailable, readiness returns:

```text
paperclip-execution-bridge-database-boundary-unavailable
```

When the bridge flag is disabled, no resolver probe is performed. Dedicated tests cover disabled, callable and fail-closed states.

This does **not** apply migration 014. Production still lacks the resolver by design.

### 3. Disposable integrated Paperclip -> Core -> Agent Runtime/Mastra proof is green

The canonical proof runs in the self-hosted isolated runner and creates only disposable Docker/network/database state.

Pinned provider evidence:

```text
Paperclip commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
Node             = 24.21.0
pnpm             = 9.15.4
```

The proof:

1. starts disposable PostgreSQL, Paperclip and Core;
2. installs the repository `wandora_mastra` adapter only into disposable Paperclip;
3. creates a disposable company;
4. uses Paperclip's own `pluginManagedAgentService(...).reconcile()` capability to create a native plugin-managed synthetic Ana with:
   - `pluginKey=wandora.organization-adapter-v1`;
   - `agentKey=ana-commercial-v1`;
   - `role=commercial-assistant`;
   - `adapterType=wandora_mastra`;
5. proves Core readiness fails closed while the migration-014 resolver is absent;
6. installs only a disposable resolver shim with the same callable boundary — **migration 014 itself is not applied**;
7. creates a synthetic Paperclip issue assigned to the synthetic Ana;
8. receives a real Paperclip run-scoped token through the pinned Paperclip heartbeat machinery;
9. the adapter signs the private request to Core;
10. Core independently validates `/api/agents/me` through the run token and exact managed identity;
11. Core resolves only synthetic Wandora organization/employee/provider bindings;
12. Core calls the existing deterministic Agent Runtime/Mastra boundary;
13. Paperclip persists a succeeded heartbeat result carrying the canonical Wandora execution-id shape.

Green evidence from workflow run `35436281906`, job `105879370690`:

```text
PAPERCLIP_NATIVE_MANAGED_AGENT_FIXTURE_OK
BRIDGE_READINESS_WITHOUT_014_FAILS_CLOSED_OK
BRIDGE_READINESS_WITH_DISPOSABLE_RESOLVER_SHIM_OK
PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK
migration_014_applied=false
paperclip_commit=65ec059bde30d98c92165b24a30a540800dd1f6f
run_status=succeeded
execution_id_shape=exec_sha256
issue_id_present=true
```

The same workflow then builds and uploads the deterministic private adapter artifact successfully.

## GAPS

The ADR 0118 repository-readiness gaps are closed:

```text
Paperclip bridge runtime custody overlay = CLOSED
Core resolver-aware readiness             = CLOSED
single disposable integrated E2E proof    = CLOSED
```

Production activation remains deliberately unexecuted. Live gaps are effects, not missing implementation:

- migration 014 is still unapplied;
- live bridge HMAC does not exist;
- live `wandora_mastra` adapter is not installed;
- live Core/Paperclip have not been promoted/recreated for the bridge;
- Ana remains paused/supervised;
- `agents.resume` remains ungranted;
- Human Send and Gateway outbound remain OFF.

## CAPABILITY AUTHORITY / REUSE GATE

The reuse gate passes.

Paperclip remains authority for:

- company/task/run lifecycle;
- run-scoped local-agent JWT;
- plugin-managed agent representation;
- external adapter loading/execution.

Wandora remains authority for:

- tenant policy;
- organization/employee mapping;
- activation status and autonomy;
- private HMAC boundary;
- execution eligibility and runtime dispatch.

Mastra/Agent Runtime remains the execution boundary.

The disposable fixture deliberately reuses Paperclip's native `pluginManagedAgentService(...).reconcile()` rather than inventing a parallel managed-agent format or weakening Core identity validation.

## DECISION

Accept the implementation.

The production activation order frozen by ADR 0118 remains the authority for any future live effect. This ADR does not authorize any of those effects.

The disposable resolver shim is proof-only. It must never be promoted as a substitute for migration 014.

The loopback proxy used by the attestation is proof-only and intentionally exposes only:

```http
GET /api/agents/me
Authorization: Bearer <run token>
X-Paperclip-Run-Id: <run id>
```

It is not a production network design.

## SECOND ADVERSARIAL REVIEW

The implementation was challenged for the following failure modes:

1. **Chat interruption causing duplicate effects**  
   Each interruption was reconciled against the actual PR head and workflow state before any retry.

2. **Stale branch reuse**  
   The old rejected attestation branch was not reused; this slice starts from current `main`.

3. **Accidental migration-014 execution**  
   CI has an explicit guard that fails if the disposable harness references the migration-014 SQL filename. The proof uses only a synthetic resolver shim.

4. **Synthetic identity weakening Core**  
   Rejected. Core continues to require exact Paperclip agent/company and managed `Ana / commercial-assistant / wandora.organization-adapter-v1 / ana-commercial-v1` identity.

5. **Inventing a non-provider managed-agent representation**  
   Rejected. The final fixture uses Paperclip's native `pluginManagedAgentService`.

6. **Broad proxy exposure**  
   Rejected. The disposable proxy allows only run-token identity lookup on `GET /api/agents/me`.

7. **Treating a green proof as production activation**  
   Rejected. All live flags/secrets/runtime effects remain absent/OFF.

## EXECUTION

Repository changes are limited to runtime/CI/readiness/proof contracts:

- Paperclip bridge Compose overlay;
- Core bridge-aware readiness probe and tests;
- disposable integrated E2E verifier;
- Paperclip-native managed-agent disposable fixture;
- CI wiring/guardrails.

No production mutation was performed.

## VALIDATION

Required implementation gate:

```text
Paperclip Mastra Adapter CI / verify-package = GREEN
Disposable Paperclip -> Core -> Mastra E2E   = GREEN
deterministic private adapter artifact        = GREEN
migration_014_applied                         = false
```

Before merge, all remaining PR workflows must also be green and production must be re-read to prove the dormant baseline is unchanged.

## NEXT

After this implementation is merged and the dormant live baseline is revalidated, the next slice must be a fresh no-effect **Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2**.

That preflight must freeze provenance from the newly merged implementation artifacts before any migration, secret creation, live adapter install, Core/Paperclip recreation or execution activation.
