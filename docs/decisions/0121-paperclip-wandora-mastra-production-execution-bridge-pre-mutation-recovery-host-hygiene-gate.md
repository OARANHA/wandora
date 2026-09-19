# ADR 0121 — Paperclip -> Wandora/Mastra Production Execution Bridge Pre-Mutation Recovery + Host Hygiene Gate

- Status: **Accepted amendment — ADR 0120 GO remains valid only after these pre-mutation gates pass**
- Date: 2026-09-19
- Scope: record new post-ADR-0120 evidence discovered during continuity reconciliation and harden the beginning of Production Execution Bridge Activation Execution V1 without activating the bridge or any employee/outbound effect.

## REAL NOW

Canonical Git entering this amendment:

```text
main = de3ba1514633d883027c2821db609ae8137bca3c
PR #170 = merged / ADR 0120 closure
open PRs entering evidence review = 0
```

ADR 0120 correctly established that repository/CI/disposable-attestation blockers are closed. Additional read-only evidence was collected after that merge and before any activation effect.

Production remains dormant:

```text
migration 014              = ABSENT
bridge HMAC                 = ABSENT
Core bridge                 = OFF
Paperclip bridge overlay    = ABSENT live
wandora_mastra              = ABSENT / authenticated CLI 404
agents.resume               = absent
Ana / Wandora               = exactly 1 / paused + supervised
Ana / Paperclip             = exactly 1 / paused / no heartbeat
Human Send                  = OFF
Gateway outbound            = OFF
MEDICSPRO outbound attempts = 0
Core/Paperclip/Gateway/Web/Auth/DB = healthy / restart 0
```

## NEW PROVEN EVIDENCE

### 1. Existing Paperclip recovery snapshots predate the current MEDICSPRO Ana

Newest protected Paperclip DB + master.key snapshot found:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T041456Z/
paperclip-db.sql.gz mtime = 2026-09-19 04:14:57Z
```

Current live MEDICSPRO Ana was created in Paperclip at:

```text
2026-09-19T07:02:07.223Z
```

Therefore the newest existing snapshot cannot reconstruct the current managed-Ana state. No newer Paperclip DB backup was found under the protected host backup tree or inside the live /paperclip volume.

### 2. Old disposable/proof containers consume material host headroom

Fresh host evidence:

```text
RAM total      ~= 11 GiB
RAM available  ~= 3.2 GiB
swap           = 0
disk available ~= 119 GiB

wandora-paperclip-local-proof
  memory ~= 1.02 GiB
  network = host
  persistent proof volume = wandora-paperclip-local-proof-data
  host listener = 127.0.0.1:3100

wandora-paperclip-adapter-proof
  memory ~= 576.8 MiB
  network = default bridge
  persistent proof volume = wandora-paperclip-adapter-proof-data
  host listener = 127.0.0.1:3132

eight wandora-core-role-probe*-db containers
  memory ~= 60-78 MiB each
  no mounts
```

These are not production state or bridge dependencies, but leaving them running reduces no-swap headroom and the host-network proof can confuse operator diagnostics.

## GAP

ADR 0120's bridge implementation/provenance decision remains sound, but Activation Execution V1 must not begin its first production mutation with a stale recovery point or avoidable disposable runtime pressure/localhost ambiguity.

These are pre-mutation operational gates, not reasons to redesign the bridge.

## CAPABILITY AUTHORITY / REUSE GATE

PASS. Paperclip backup/restore capability and Docker operator hygiene are reused. No new Wandora table, scheduler, lifecycle or registry is justified.

## DECISION

ADR 0120's GO is preserved, but no migration 014, live HMAC, Core/Paperclip recreation or adapter install may occur until Gates A-C pass.

### Gate A — host hygiene

Execution V1 must:

1. re-inventory containers, networks, mounts and listeners;
2. prove each selected cleanup target is disposable/non-live and absent from current production Compose;
3. stop/remove the known high-cost disposable containers needed to remove avoidable pressure and localhost ambiguity;
4. preserve the two Paperclip proof volumes unless a later explicit retention decision removes them;
5. remove mountless role-probe PostgreSQL containers/networks only after reconciliation;
6. prove 127.0.0.1:3100 is no longer owned by the old host-network Paperclip proof;
7. re-check memory/disk and stop/review if the host remains under material pressure; target at least ~4 GiB MemAvailable before production bridge mutation.

Cleanup must not touch live Paperclip/Core/DB volumes, live secrets or customer state.

### Gate B — fresh current Paperclip recovery snapshot

Before recreating Paperclip or installing wandora_mastra, create one fresh protected snapshot of the current Paperclip database plus exact current master.key outside the Docker volume.

Required proof:

1. directory 0700 and artifacts 0600;
2. gzip/hash integrity;
3. disposable PostgreSQL 18 restore;
4. current MEDICSPRO company present;
5. current Organization Adapter plugin/config/secret references present;
6. current local-encrypted secret decrypts with copied master key, hash-only proof;
7. wrong-key decrypt rejected;
8. exactly one current MEDICSPRO managed Ana exists;
9. Ana remains commercial-assistant / paused / wandora_mastra;
10. managed identity remains wandora.organization-adapter-v1 / ana-commercial-v1;
11. no wandora_mastra adapter registration is expected in this pre-install snapshot.

Any ambiguous restore/decrypt/state result aborts before migration 014.

### Gate C — retain ADR 0120 artifact provenance

```text
adapter tgz sha256 = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
Core archive sha256 = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
Core source tree = abacb9da0949a63210080a01bdd95b087e98d02e
```

If exact short-lived Actions artifacts are unavailable/expired, stop and re-establish provenance before any production mutation.

## REVISED ACTIVATION EXECUTION V1 ORDER

```text
0. fresh Git/runtime reconciliation
1. Gate A host hygiene + listener/headroom proof
2. Gate B fresh current Paperclip snapshot + disposable restore/decrypt/state proof
3. Gate C exact artifact availability/provenance
4. fresh scoped Wandora DB backup + disposable restore/rehearsal
5. migration 014 apply + canonical verifier + independent postverify
6. create dedicated execution-bridge HMAC
7. load exact bridge-aware Core candidate + bridge overlay
8. Core health + resolver-aware readiness + private boundary proof
9. recreate Paperclip with bridge overlay, adapter still absent
10. Paperclip health + exact Ana/control-plane state proof
11. extract exact tgz into persistent hash-addressed /paperclip/operator-packages path
12. install wandora_mastra exactly once through official local-directory route
13. exact adapter readback/test-environment/reconciliation
14. prove Ana remains paused, zero heartbeat/wakeup drift, agents.resume absent, Human Send OFF, Gateway outbound OFF
15. STOP
```

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating the older decryptable Paperclip snapshot as sufficient even though it predates the current Ana;
- deleting proof volumes merely to reclaim RAM;
- ignoring the old host-network listener on 127.0.0.1:3100;
- broad cleanup by name pattern without dependency reconciliation;
- proceeding after a failed fresh restore because adapter uninstall exists;
- applying migration 014 before Gates A/B;
- using cleanup/backup as permission to grant agents.resume or start Ana.

## EXECUTION PERFORMED BY THIS AMENDMENT

Only read-only runtime inspection, backup inventory/timestamp comparison and canonical documentation.

No container/volume was removed, no backup created, migration 014 remains absent, no secret/overlay/adapter/runtime effect occurred, Ana remains paused, agents.resume absent, Human Send OFF and Gateway outbound OFF.

## NEXT

**Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1**, amended by ADR 0121.

The execution may begin with host hygiene and recovery snapshot proof, but must perform no bridge mutation until those gates pass and must stop with Ana still paused, agents.resume absent, Human Send OFF and Gateway outbound OFF.
