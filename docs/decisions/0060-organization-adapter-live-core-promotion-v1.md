# ADR 0060 — Organization Adapter Live Core Promotion V1

- Status: **Accepted — live Core promoted and validated**
- Date: 2026-09-17
- Scope: promote the already-proven Organization Adapter candidate image into the live Core while preserving existing database, Gateway ingress, deterministic Agent Runtime and Human API capabilities; keep Human Send, Gateway outbound and customer hiring absent

## REAL NOW

Canonical base before promotion:

```text
main = 8ceb1c43f5fb9967966f0c1564c51ecea382b13c
PR #104 = merged
```

The internal canary was already complete and documented before this slice:

```text
Wandora hire operation = completed
Wandora Ana = 1 active / supervised
Wandora provider binding = 1
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-key replay = stable
```

The temporary candidate smoke container had already been removed. The provenance-matched image remained loaded.

## PROVENANCE / DRIFT CHECK

Candidate:

```text
tag = wandora/core:organization-adapter-candidate-068d30a49d9b
image id = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
source revision = 068d30a49d9b96a943c7c3d23d86116e94cce788
candidate label = organization-adapter-core-v1
```

Git comparison from the candidate source revision to current `main` showed no changes under:

```text
apps/core/
infra/stacks/core/
```

The five overlays forming the previous live Core matched current Git blobs byte-for-byte:

```text
compose.yaml
compose.database.yaml
compose.gateway-ingress.yaml
compose.agent-runtime-deterministic.yaml
compose.human-api.yaml
```

The Organization Adapter overlay also matched its canonical Git blob before promotion.

## DECISION

Promote the existing candidate image using the existing live overlays plus only:

```text
compose.organization-adapter.yaml
```

Keep:

```text
database mode = ON
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF
published Core ports = none
root filesystem = read-only
```

The accepted promotion delta was exactly:

1. Core image changes from `wandora/core:team-read-b31db507` to the provenance-matched candidate;
2. `WANDORA_ORGANIZATION_ADAPTER_ENABLED=true`;
3. private Paperclip webhook URL;
4. read-only Organization Adapter custody directory mount.

After removing those intentional differences from the rendered Compose objects, no residual service or top-level delta remained.

## SECOND ADVERSARIAL REVIEW

Rejected:

- rebuilding the Core on the VPS;
- promoting a newer unproven image merely because `main` advanced;
- dropping Gateway ingress, Human API or deterministic Agent Runtime overlays;
- enabling Human Send or Gateway outbound with this promotion;
- publishing a Core host port;
- rerunning the already-completed candidate smoke/canary merely because of chat timeouts;
- promoting without a ready rollback.

The previous live image remained locally available and an exact rollback composition was rendered before replacement.

## EXECUTION

The live `wandora-core` container was recreated through Docker Compose with the candidate image and six reviewed overlays.

Compose completed:

```text
Recreated
Started
Healthy
```

Rollback was not invoked.

## VALIDATION

Post-promotion Core:

```text
image = wandora/core:organization-adapter-candidate-068d30a49d9b
image id = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
health = healthy
healthz = 200
readyz = 200
root filesystem = read-only
restart = unless-stopped
published ports = none
networks = wandora-core, wandora-data
```

Runtime startup proof:

```text
gatewayIngress = true
humanApi = true
humanSendProposal = false
organizationAdapter = true
agentRuntime = mastra-deterministic
```

Existing fail-closed boundaries remained unchanged:

```text
GET /api/v1/me without token = 401
POST /internal/v1/gateway/inbound without signature = 401
```

The live Core can reach private Paperclip at `wandora-paperclip:3100` and receives `200` from `/api/health`.

Paperclip remains:

```text
authenticated/private
wandora.organization-adapter-v1@0.1.0 = ready
companies = 1
paused Ana = 1
managed resources = 1
```

Wandora remains:

```text
hire operations for ana-commercial-v1 = 1
completed canary operation = 1
provider bindings = 1
active supervised Ana = 1
```

A same-key replay executed through the **live Core image** returned the same Wandora employee id:

```text
664dfd0f-b693-4581-a59e-465bbf3b61b9
```

No duplicate Paperclip agent or managed resource was created.

## EFFECT BOUNDARY

Still absent/off after promotion:

```text
customer Contratar/Ativar route = absent
Empresa Exemplo Paperclip company = absent
Human Send = OFF
Gateway outbound = OFF
arbitrary/custom employee creation = absent
direct agent-hires fallback = absent
```

## NEXT BOUNDARY

Do not provision the second/customer Paperclip company merely because live Core now supports the Organization Adapter.

Next separately reviewed slice:

**Organization Adapter Live Cross-Company Isolation Preflight V1**

It is observation/plan-first and must decide the minimum safe way to satisfy the remaining live A/B isolation gate before any customer-facing hiring capability.
