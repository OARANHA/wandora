# ADR 0304 — Organization Adapter 0.5.0 Production Promotion Execution V1

Status: **EXECUTED / GREEN / ORGANIZATION ADAPTER 0.5.0 LIVE / PAPERCLIP 916.1 PRESERVED / SEMANTIC+OUTBOUND EFFECTS OFF**

## Objective

Execute only the second compatibility-convergence mutation after ADR 0303:

> promote the exact qualified Wandora Organization Adapter 0.5.0 package while Paperclip remains on the already-promoted v2026.916.1 runtime and all Semantic Fast Read, Semantic Selector, Human Send, Messaging Gateway outbound, WhatsApp Fast Read, VendaERP/provider/model/customer-work effects remain OFF.

No Paperclip re-promotion, Core promotion, semantic activation, customer/provider smoke or outbound effect belongs to this ADR.

## REAL NOW before mutation

Exact PR #369 source head:

`84bb0dbf78bfb136fbb83c119b764846211cc3b9`

GitHub checks:

`17/17 SUCCESS`

Production preconditions immediately before the plugin lifecycle mutation:

- Paperclip `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy, restart count 0;
- exactly one `wandora.organization-adapter-v1@0.3.1`, plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, `ready`, `lastError=null`;
- Task Drain `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`;
- four company-scoped Organization Adapter configs present, each with `hmacSecret` secret-ref and `lastError=null`;
- Core healthy and `humanSendProposal=false`;
- Messaging Gateway healthy and `outboundEnabled=false`;
- current Core composition excludes Semantic Fast Read and Semantic Selector overlays.

## Exact candidate identity

Organization Adapter CI artifact:

- workflow run: `36321460442`;
- artifact id: `10932212876`;
- artifact name: `organization-adapter-plugin-d83b7b44152f1f94858a3ca05240793c17b775e0`;
- ZIP SHA-256: `308e6697bde41a42c53ab04258194d5b97095ce4bc982a720c4e97e2270d1e1a`;
- package: `paperclip-plugin-wandora-organization-adapter-0.5.0.tgz`;
- package SHA-256: `f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2`;
- Paperclip compatibility pin: `wandora/paperclip:v2026.916.1`;
- Paperclip source pin: `d554c4789ed3930f8a53ac9fdf6503b3187097da`.

The workflow artifact was produced from merge ref `d83b7b44152f1f94858a3ca05240793c17b775e0`. Compare against source head `84bb0dbf...` showed zero file differences, so the candidate tree is source-equivalent to the exact PR head used for execution.

Verified package file hashes:

- `README.md`: `82fd22ad0abf7c8c9d6634d76067b87dbfaedb2b5bda5058c3a0bc23f792f7e9`;
- `compatibility.json`: `e2c6620fa669b38100e6ab3ee90a3e657b6ecd7db28cca4c133f3c4b2224ea12`;
- `dist/manifest.js`: `c27ac42a3b02b6c1aff460d32e89a88cdf88d7b87ef9cfb85352bb659c2d3694`;
- `dist/worker.js`: `deee65be1866c9597bdefe087f3e5c7a9512a045bb8eb33d56186157ffafdf8a`;
- `package.json`: `9377e07a57ec42c0b5927343f9dd605a4fc79348a96377fe53aa9c50186cc84f`.

## Capability authority / reuse gate

ADR 0168 remains binding.

Paperclip owns plugin lifecycle and durable plugin registry/config state. The promotion reused Paperclip's native soft-uninstall/install lifecycle. No Wandora-owned duplicate plugin registry, lifecycle engine, runtime memory, orchestration subsystem or provider implementation was introduced.

The 0.5.0 manifest adds compatibility capabilities and endpoints required by later Fast Read slices, including:

- `agents.invoke`;
- `agent.runs.read`;
- `tools.operational.read`;
- `employee-capabilities`;
- `employee-fast-read`.

Their presence in the loaded plugin does **not** authorize or imply semantic/customer/provider execution.

## Decision + second adversarial review

The pre-mutation JEV guard reviewed exact candidate identity, quiescence, rollback path, same plugin id/config invariants and prohibited effects.

Result:

- decision: `allow`;
- `allow=0.64`;
- `confirm=0.33`;
- `review=0.02`;
- `deny=0.01`.

After execution and independent runtime validation, JEV completion review returned:

- `complete=0.94`;
- `verify_more=0.04`;
- `incomplete=0.02`.

These reviews were advisory. Deterministic repository/runtime evidence remained authoritative.

## Execution

The promotion used the canonical prior Organization Adapter pattern:

1. verify exact package bytes;
2. preserve the existing 0.3.1 package path as rollback;
3. soft-uninstall `wandora.organization-adapter-v1` without purge;
4. prove the same plugin row/id survived and all four company configs remained present;
5. stage the exact 0.5.0 candidate;
6. install once from a local immutable path through Paperclip's native plugin install contract;
7. perform no Paperclip/Core/Gateway restart.

A production filesystem mismatch was detected during staging: the copied candidate directories were `0750 uid=999 gid=1003`, while the known-good plugin package tree was `0755 uid=1000 gid=1000`. Paperclip's server-side local-path validation uses `realpath()`; the process therefore reported the path as nonexistent even though root-level `docker exec` could read it.

The candidate tree was normalized to the existing production package convention only:

- directories: `0755`;
- files: `0644`;
- owner/group: `1000:1000`.

The five qualified hashes were revalidated after normalization. The next install completed successfully.

No failed install attempt changed the plugin row; each ambiguous/failing step was reconciled before continuation. No blind retry or hard purge occurred.

## Validation

Production Organization Adapter is now:

- plugin key: `wandora.organization-adapter-v1`;
- plugin id: `86e77fe7-c7e4-4bee-afa3-46cdad575d0c` — unchanged;
- version: `0.5.0`;
- status: `ready`;
- health: `healthy=true`;
- `lastError=null`;
- package path:
  `/paperclip/operator-packages/wandora-organization-adapter-v1/f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2/package`.

All four pre-existing company configs remain attached to the same plugin id with `hmacSecret` secret refs and `lastError=null`.

Post-promotion runtime reconciliation proved:

- Task Drain remains `false/0/0/quiescent`;
- Paperclip remains `v2026.916.1`, source `d554c478...`, healthy, restart count 0, same container start time;
- Core remains healthy on the existing candidate image, with `humanSendProposal=false`, and was not recreated;
- current Core composition still excludes Semantic Fast Read/Selector overlays;
- Messaging Gateway remains healthy, was not recreated, and still reports `outboundEnabled=false`;
- no new production model usage was caused by this slice;
- no Fast Read webhook smoke, VendaERP call, provider/model invocation, customer work, Human Send or outbound effect was executed.

## Rollback boundary

The pre-existing 0.3.1 package path remained present during execution:

`/paperclip/operator-packages/wandora-organization-adapter-v1/06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d/package`

If a later rollback is required, first reconcile current plugin/config/durable state. Do not assume a blind uninstall/reinstall is safe after future durable changes.

Never use hard purge for rollback because that would delete plugin-owned config state.

## Result

**GREEN / SECOND PHASE-2 COMPATIBILITY MUTATION COMPLETE.**

Paperclip 916.1 remains production-live and Organization Adapter 0.5.0 is now production-live.

Semantic Fast Read, Semantic Selector, Human Send, Messaging Gateway outbound and WhatsApp Fast Read remain OFF. No provider/model/VendaERP/customer-work effect is authorized by this checkpoint.

This ADR authorizes no next mutation by implication.

The next separately reviewed slice must begin from fresh repository/CI/runtime reconciliation and should address the remaining Core compatibility convergence before any semantic activation.
