# ADR 0133 — Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT

Status: Accepted / Complete  
Date: 2026-09-20  
Base: `main@deda564914518b3ca41aaa464e5f2d9aa32d7d34`

## Decision

The first real MEDICSPRO digital-employee production activation preflight is **GREEN**.

This ADR authorizes no production activation effect. It freezes the exact migration, candidate artifacts, future overlay composition, rollback anchors, execution order, stop conditions and the post-resume non-reversibility boundary for a separate **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**.

Mastra / Agent Runtime remains an already-proven reusable dependency and is not part of activation.

## REAL NOW

At preflight start and again after all disposable proofs:

- Paperclip: `wandora/paperclip:v2026.916.0`, commit `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`, healthy, restart 0.
- Core: `wandora/core:organization-adapter-candidate-0a40dac127ae`, healthy, restart 0.
- Web: `wandora/web:owner-access-candidate-5f135e90`, healthy, restart 0.
- Gateway: `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy, restart 0.
- migration 015 helpers live: **0**.
- activation runtime flag: absent / OFF.
- Human Send: absent / OFF.
- Gateway outbound: absent / OFF.
- MEDICSPRO has exactly one Wandora Ana: `paused + supervised`.
- exactly one control-plane binding, one employee binding and one completed `ana-commercial-v1` hire; unfinished hires = 0.
- MEDICSPRO outbound attempts = 0.
- Paperclip has exactly one Ana, `paused`, adapter `wandora_mastra`, budget 0, last heartbeat null.
- Ana wakeup requests = 0; heartbeat runs = 0; open routine runs = 0; assigned routines = 0.
- live Organization Adapter = v0.1.0, ready, capabilities exactly `agents.managed`, `webhooks.receive`, `secrets.read-ref`; `agents.resume` and `agents.invoke` absent.
- live `@mastra/core` = 1.66.0 and was not changed.

## Migration 015 qualification and rollback rehearsal

Exact source:

- migration blob: `13449e26ccb93e4124390c83f738b6d0f0cfe2dd`
- verifier blob: `b898ef30bd887b153acfb14b9522360fd9e1230a`

A read-only `pg_dump -Fc` of the live `wandora` + `wandora_private` schemas was captured only as preflight evidence:

- path: `/home/wandora-admin/preflights/customer-owner-activation-production-preflight-v1-20260920T111451Z/wandora-pre-migration-015.dump`
- SHA-256: `a4922fb7f12dd867a6e502eeeb2d240b38aaa19e519d9e056f01be53df1ec050`
- custody: directory 0700, files 0600.

The dump was restored into two isolated PostgreSQL 17.6 disposable databases. On the rehearsal database:

1. live-derived MEDICSPRO Ana began `paused + supervised`;
2. migration 015 applied successfully twice, proving idempotent replay;
3. the canonical verifier returned `DIGITAL_EMPLOYEE_ACTIVATION_PROJECTION_V1_OK`;
4. verifier fixture effects rolled back;
5. the live-derived Ana remained `paused + supervised`;
6. exactly the two activation helpers existed.

The untouched rollback restore retained the same MEDICSPRO Ana, control binding, employee binding and completed hire, with **0 migration-015 helpers**.

The disposable DB container/network were removed after proof.

This preflight dump is evidence, not the future execution rollback asset. Production Execution V1 MUST take a fresh protected pre-migration backup immediately before any live application.

## Exact candidate provenance

All implementation candidates come from PR #182 head `c6d9e2d00431f475e6226b430c73af07bbd8d960`; GitHub tested the synthetic merge `8d2a53e3c264bd624ea77151666ec7f395011a98`. PR #182 completed all seven required workflows successfully.

### Core

- artifact id: `10602709750`
- artifact ZIP SHA-256: `85317d6c6dafb0fe464524910c48df38fbe76bcca9ce3716f930f936207ab67c`
- image: `wandora/core:organization-adapter-candidate-8d2a53e3c264`
- portable archive SHA-256: `77ca558638a3213112a0cfa3df3bc7693592f0439de5cda768c624bf09f13f07`
- OCI config: `sha256:697058f7f74e5040b8ccbdc30bc146c7b301437a3f8c4557687fd3364022dd08`
- OCI manifest: `sha256:126fac5055560f385c93e0d3ded65fd9cc6021b52071eb33f74d469353979648`.

### Web

- artifact id: `10603820887`
- artifact ZIP SHA-256: `332c6c1204a118b2954f8c8c85cf45776fdaa2cae9ec1ae17ca31b51c88c6ea4`
- image: `wandora/web:candidate-8d2a53e3c264`
- build manifest list: `sha256:702438caf90e2e5259182be511eed2cc413503b874fc26df28de3cf89ad2ee33`
- config digest: `sha256:3868ba12d080e887f3bdaba3fd7c8e1c7e685e154482a28d653508661c7353c0`.

### Organization Adapter v0.2.0

- artifact id: `10603558097`
- artifact ZIP SHA-256: `574e475ed7bdf7f5626fe62e6bf5259a647a770e57a87b5e3819433f9ca86066`
- installable tgz SHA-256: `0841c161258eaccdf5290eb962b86fc9ace91a7bb923b7eebfe202565025a91e`
- compatibility pins Paperclip `v2026.916.0` / `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
- capabilities exactly: `agents.managed`, `agents.resume`, `webhooks.receive`, `secrets.read-ref`.

The live v0.1.0 package remains separately hash-addressed at:
`/paperclip/operator-packages/wandora-organization-adapter-v1/a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36/package`

Its deterministic tree hash at preflight was:
`48775a1d32804a463bf957bf80a04b7a39372cb9b082b4a7aa67ccebdc0eb2ec`.

## Capability authority / reuse gate

Activation needs only one new Paperclip authority: **`agents.resume`**.

The candidate activation code is fixed to:

`managed.get(ana-commercial-v1) -> resume only if paused -> managed.get -> require same agent id + idle`.

It accepts no raw agent identifier. The signed webhook body is fixed to company + catalog key. Candidate CI fails if `agents.invoke` appears in the plugin source.

The v2026.916.0 native `resume` implementation only writes agent lifecycle state to `idle`; it does not enqueue a wakeup or heartbeat run.

No activation code calls:

- `agents.invoke`;
- task creation;
- wakeup creation;
- heartbeat creation;
- heartbeat run creation;
- execution run creation;
- routine execution;
- `wandora_mastra`;
- Agent Runtime;
- Mastra.

Therefore Paperclip remains lifecycle authority, Wandora remains customer/tenant/effect authority, and Mastra remains execution-only.

## Fail-closed partial state

A provider-first activation can become partially converged if Paperclip reaches `idle` but the caller loses the response or local finalization fails.

This partial state is intentionally safe:

`Paperclip idle + Wandora paused -> execution bridge rejects employee-unavailable -> AgentTaskRuntime calls = 0`.

The canonical integration test covers this guard and PR #182 Core CI is green.

A retry through the same activation contract is convergent: an already-idle Paperclip agent is read back as idle without a second `agents.resume`, then Wandora may finalize `paused -> active`.

No separate activation journal is introduced.

## Future activation overlay

Exact overlay blob: `0954e422be7ef259e811940b019034f3059c2141`.

Composed over the currently live Core stack plus the exact Core candidate, dry-render proves:

- Core mode = database;
- Human API = true;
- customer hire = true;
- Organization Adapter = true;
- Paperclip execution bridge = true;
- activation = true;
- activation webhook = exact private Paperclip `employee-activate` endpoint;
- Human Send = absent;
- Core published ports = none.

Gateway outbound is a separate runtime and remains independently OFF.

Web candidate composition keeps its current private Core + edge networks and adds no published port.

## Frozen rollback anchors

Before any future mutation, revalidate and preserve:

- current Core image ID: `sha256:1fd3f3d7e63d77a9dc80bb903e85ceba77d14aaa8739464133523d54872f5b14`;
- current Web image ID: `sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5`;
- current Paperclip image ID: `sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced`;
- live Organization Adapter v0.1.0 hash-addressed package above;
- current Core compose file set and hashes captured by this preflight;
- a fresh execution-time Wandora DB backup before migration 015.

## Frozen Production Activation Execution V1 order

1. Reconcile `main`, PRs/CI, runtime, live images, exact candidate digests and all effect gates.
2. Require Ana Wandora `paused + supervised`, Paperclip `paused`, exactly one binding/hire, zero wakeups, zero heartbeat runs, zero open routine runs and zero outbound attempts.
3. Capture a **fresh** protected Wandora pre-migration backup; hash and restore-check it before proceeding.
4. Apply migration 015 exactly once live and run its verifier. On failure: STOP, restore the fresh pre-migration backup, validate baseline.
5. Promote the exact Organization Adapter v0.2.0 tgz while preserving existing company config/secret_ref. Validate ready, exact capabilities, Ana still paused and no new wakeup/run. On failure before resume: reinstall the frozen v0.1.0 package and STOP.
6. Load/promote the exact Core candidate **without activation overlay first**, retaining all existing live overlays. Validate health/readiness and all no-effect invariants. On failure: restore the current Core image/config and STOP.
7. Promote the exact Web candidate while activation remains OFF. Validate health and exact activation bridge route. On failure: restore current Web image and STOP.
8. Re-run the full no-effect gate immediately before resume.
9. Add the activation overlay and recreate only Core with the already-qualified candidate. Validate readiness and that Human Send/Gateway outbound remain OFF.
10. Execute exactly one customer-owner activation through the normal activation contract. Do not manually blind-retry an ambiguous client result; reconcile Paperclip/Wandora state first. The Core's bounded internal retry is acceptable because the provider action is convergent and an already-idle agent is not resumed again.
11. Validate: Paperclip Ana `idle`; Wandora Ana `active + supervised`; same IDs/bindings/hire; wakeups=0; heartbeat runs=0; open routine runs=0; outbound attempts=0; Human Send OFF; Gateway outbound OFF; no execution/Mastra run caused by activation.
12. STOP. Normal Paperclip -> `wandora_mastra` -> Core -> Mastra work begins only in a later operational slice when legitimate work exists.

## Stop / rollback boundaries

Before step 10, any drift, unexpected wakeup/run, artifact mismatch, verifier failure, service health failure or effect-gate change is a hard STOP and uses the frozen conventional rollback asset for that layer.

**Step 10 is the lifecycle point of no automatic rollback in V1.** We intentionally do not grant `agents.pause` merely to create an undo path.

After a real resume:

- `Paperclip idle + Wandora paused` is safe and must remain fail-closed at the execution bridge; reconcile in a separately reviewed continuation, not by ad-hoc SQL or new authority.
- unexpected wakeup/run/heartbeat is a STOP condition; keep all outbound gates OFF and enter an explicit remediation slice.
- do not restore a whole database merely to "undo" one lifecycle transition.
- do not add `agents.pause` or direct employee UPDATE as an emergency shortcut.

## Validation / no-effect closure

After all preflight work:

- production migration 015 helpers = 0;
- live Organization Adapter remains v0.1.0;
- `agents.resume` live = absent;
- activation overlay live = absent;
- Ana Wandora remains `paused + supervised`;
- Ana Paperclip remains `paused`;
- wakeups = 0;
- heartbeat runs = 0;
- open routine runs = 0;
- Human Send = OFF;
- Gateway outbound = OFF;
- MEDICSPRO outbound attempts = 0;
- Mastra remains unchanged;
- disposable DB/network = removed.

## Next slice

**Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**

It is a separate effectful slice and must begin with a fresh REAL NOW plus a new second adversarial review.
