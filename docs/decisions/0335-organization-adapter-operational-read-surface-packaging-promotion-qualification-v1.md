# ADR 0335 — Organization Adapter Operational Read Surface Packaging + Promotion Qualification V1

Date: 2026-09-29

Status: **PACKAGE IDENTITY QUALIFIED / PROMOTION ATTEMPT FAIL-CLOSED / ROLLBACK COMPLETE / LIVE OA 0.5.0 RESTORED / OPERATIONAL READ STILL BLOCKED / READ-ONLY / NO VENDAERP / NO ATTESTATION OPEN**

## Objective

Continue ADR 0334 by resolving immutable package identity for the qualified Organization Adapter operational-read surface, proving exact artifact provenance, and determining whether that exact package may be promoted through the Paperclip-native plugin lifecycle.

This slice is intentionally bounded:

- package identity and provenance only;
- native Paperclip plugin lifecycle only if independently qualified;
- exactly one bounded operator-read attempt after promotion;
- no VendaERP/provider call;
- no TypeSafe/System One or Mistral production path;
- no Semantic Fast Read attestation opening;
- no Fast Read/Semantic Selector/Human Send/Gateway outbound activation;
- no Connection/install/grant/catalog/profile/Tool Policy mutation;
- no secret extraction;
- no direct Paperclip database read;
- no Wandora mirror, lifecycle subsystem, registry, state machine or cache.

The success condition is either a safely live read-only operator surface with a fresh operational snapshot, or a precise blocked gap with the known-good production baseline restored.

## REAL NOW

Repository reconciliation before execution proved:

- PR #369 remains open, draft and mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head before this documentation is `d8e9f565a8b4dc9ca97c747e89945d38cb66d725`;
- that exact head completed **17/17 workflows GREEN**;
- GitHub merge ref `67fccb589f5e69b3f14e29fc36f83cc756056c74` is source-equivalent to the exact head (`files=[]` in compare);
- production Paperclip remains `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- the known-good production Organization Adapter baseline before promotion was exactly one `wandora.organization-adapter-v1@0.5.0`, plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, `ready`, `lastError=null`, package path:
  `/paperclip/operator-packages/wandora-organization-adapter-v1/f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2/package`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core startup reported `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway startup reported `outboundEnabled=false`;
- all seven production containers were healthy.

No ambiguous prior lifecycle operation existed when this slice began.

## PROVEN EVIDENCE

### Immutable release identity

ADR 0334 intentionally stopped because the then-qualified source still shared the live `0.5.0` semantic version while its bytes differed from the already-released production package. Replacing different bytes under the live `0.5.0` identity was rejected.

This slice therefore assigned the additive operational-read release a new immutable identity:

`paperclip-plugin-wandora-organization-adapter@0.6.0`

The repository version bump was performed without weakening the existing package/version gates. One Core rehearsal assertion that incorrectly conflated the live `0.5.0` baseline with the new candidate source identity was corrected narrowly; the live-baseline checks remained `0.5.0`.

The resulting exact head completed 17/17 workflows GREEN.

### Exact CI artifact provenance

Organization Adapter Plugin CI run `36558236355` produced artifact:

- artifact id: `11028756089`;
- artifact name: `organization-adapter-plugin-67fccb589f5e69b3f14e29fc36f83cc756056c74`;
- artifact ZIP digest: `sha256:1e0d171ba0996a1a5adcffac233f614a69687291cf82e038c9dc38e0cdf8239b`;
- package: `paperclip-plugin-wandora-organization-adapter-0.6.0.tgz`;
- package SHA-256: `5e044bed6886651bd7ebff6c5c2d30f27efb3e86d59d3b63a41541437d42482f`;
- provenance Wandora source: `67fccb589f5e69b3f14e29fc36f83cc756056c74`;
- provenance Paperclip source: `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- provenance Paperclip image: `wandora/paperclip:v2026.916.1`.

The package contains exactly five files. Their verified SHA-256 values are:

- `README.md`: `b575b913dcf6be80a7fea798f24a120e2f004fcbcc77999054913ea211141fdc`;
- `compatibility.json`: `e2c6620fa669b38100e6ab3ee90a3e657b6ecd7db28cca4c133f3c4b2224ea12`;
- `dist/manifest.js`: `97200d45c5f2dc613c51f5444f16cbad267a3952e68926df012963f59ae1d5fa`;
- `dist/worker.js`: `07074f0b7a52dbfcdffcafc62fa8260f11bba29f12cefc7812223ed6124cc2f5`;
- `package.json`: `5d1cc473a7b35fb7eced4cd102d226f9407ddd14afdedaf440202cf6bf57a5c8`.

The exact artifact was staged to a new hash-named directory. It was never copied over the live `0.5.0` directory. After production-volume staging and ownership normalization, all five files were re-hashed inside `wandora-paperclip` and matched the CI artifact byte-for-byte.

### Paperclip-native lifecycle semantics

Pinned Paperclip source and live CLI proved:

- `plugin upgrade` for a local-path install rereads the current package path and cannot select the newly staged immutable path;
- normal `plugin uninstall` is a soft uninstall;
- only `--force` hard-purges plugin state/config;
- reinstalling the same plugin key after a soft uninstall reuses the durable plugin row and updates package path/version.

Therefore the qualified lifecycle path was the same provider-native pattern already used by ADR 0304:

1. soft uninstall, never `--force`;
2. install the exact new immutable local path;
3. preserve the stable plugin id and old package path;
4. validate before any operator data read.

No Wandora lifecycle implementation was added.

## GAPS

The package identity and native lifecycle were successfully qualified. The blocker was discovered only when the real live Paperclip data bridge exercised the new handler.

Exactly one operator read was attempted after the `0.6.0` promotion:

`paperclipai plugin data wandora.organization-adapter-v1 operational-read ...`

It failed fail-closed with:

`operator_operational_read_invalid_company_scope`

No retry was performed.

Pinned Paperclip `v2026.916.1` source proves the exact reason.

The URL-keyed data route:

- requires Board organization access;
- validates a provided `companyId` with `assertPluginBridgeScope`;
- forwards the authorized company id separately from caller `params`;
- also forwards `renderEnvironment: body?.renderEnvironment ?? null`.

The worker RPC host then invokes the registered data handler with:

- caller params first;
- host-authorized `companyId` merged afterwards, so host scope wins;
- `renderEnvironment` merged afterwards whenever defined.

Because the server supplies `renderEnvironment: null`, the worker passes both:

- `companyId`;
- `renderEnvironment: null`.

The `0.6.0` Organization Adapter handler rejects any parameter object whose only key is not exactly `companyId`. Therefore the legitimate provider-native bridge call is deterministically rejected.

This is **not** a demonstrated tenant-boundary weakness. The Paperclip host still owns and overwrites the authorized company scope. It is an Organization Adapter compatibility bug against the real bridge parameter shape.

The gap cannot be safely closed by:

- duplicating `companyId` in caller params;
- bypassing Board/company authorization;
- direct database access;
- extracting credentials;
- introducing a new operator endpoint merely to avoid the existing bridge;
- weakening the guard without source-level tests for the real host injection semantics.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

Authority remains:

- **Paperclip**: plugin lifecycle, Connections, installs, organization grants, Tool Catalog, Tool Profiles/policies, runtime health, bridge auth/company scope and Tool Gateway authorization/audit;
- **Organization Adapter**: bounded projection over Paperclip-owned operational state;
- **Wandora**: semantic/product/effect authority.

This slice did not create or justify:

- Wandora plugin lifecycle;
- Connection/install/grant/catalog/profile mirror;
- operational cache;
- registry/table/migration;
- state machine;
- secret manager;
- policy engine;
- provider refresh path;
- execution/tool subsystem;
- direct Paperclip database coupling.

The operational-read projection remains read-only and provider-owned beneath the adapter boundary.

## DECISION

Treat `0.6.0` as a valid immutable package identity with qualified provenance, but **reject it for production promotion** because its operator-read handler is incompatible with the actual Paperclip bridge envelope.

The exact decision sequence was:

1. keep live `0.5.0` immutable;
2. stage `0.6.0` at a new hash-named path;
3. prove staged bytes equal the CI artifact;
4. use only the Paperclip-native soft-uninstall/install lifecycle;
5. preserve the same plugin id;
6. attempt exactly one bounded operational-read;
7. on deterministic fail-closed incompatibility, do not retry or invent a bypass;
8. restore the known-good `0.5.0` package through the same native lifecycle;
9. mark `0.6.0` **promotion-blocked**.

Any corrected code must receive a new immutable release identity. Do not publish different bytes as `0.6.0`.

## SECOND ADVERSARIAL REVIEW

After staging and byte verification, the production-promotion JEV guard returned:

- decision = `allow`;
- allow = `0.76`;
- confirm = `0.17`;
- deny = `0.04`;
- review = `0.03`;
- confidence = `0.69`.

That review authorized no bypass; it supported the exact native lifecycle under the proven safeguards.

After the single live operator-read exposed the bridge incompatibility, a fresh rollback review returned:

- decision = `allow`;
- allow = `0.75`;
- confirm = `0.23`;
- review = `0.01`;
- deny = `0.01`;
- confidence = `0.67`.

The rollback therefore followed the same provider-native lifecycle with the preserved old immutable path.

## EXECUTION

### Staging only

Three managed-admin operations were explicitly approved and executed:

- `adm_7a62ccbdc9af412e282ec460`: copy the new hash-named staging directory into the Paperclip package volume;
- `adm_92cc9a14d8c97352aded6426`: normalize ownership to `1000:1000`;
- `adm_9f5a2f186ffcebb7508ddd07`: read-only `sha256sum` of the five package files.

All completed with exit code 0.

### Promotion attempt

Paperclip-native lifecycle:

1. soft-uninstalled live `0.5.0` without `--force`;
2. installed the exact staged `0.6.0` path;
3. observed the same durable plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`;
4. observed exactly one OA `0.6.0`, `ready`, `lastError=null`;
5. plugin health reported `healthy=true`;
6. Task Drain remained quiescent.

Then exactly one `operational-read` was executed and failed with `operator_operational_read_invalid_company_scope`.

The failure happened in the adapter parameter guard before `readManagedEmployeePaperclipOperationalRead()` could execute. Therefore it did not reach `ctx.toolAccess.readOperationalSnapshot`, did not refresh provider state and did not call VendaERP.

### Rollback

Without retrying the operator read:

1. soft-uninstalled `0.6.0`, again without `--force`;
2. reinstalled the preserved immutable `0.5.0` package path;
3. preserved the same plugin id;
4. revalidated status and health.

No Paperclip restart was required.

## VALIDATION

Final production state after rollback is the known-good baseline:

- exactly one `wandora.organization-adapter-v1@0.5.0`;
- plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`;
- package path `/paperclip/operator-packages/wandora-organization-adapter-v1/f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2/package`;
- status `ready`;
- `lastError=null`;
- health `healthy=true`;
- Task Drain `false / 0 / 0 / quiescent=true`;
- all seven production containers healthy;
- Core `fastReadExecution=false`;
- Core `semanticFastRead=false`;
- Core `humanSendProposal=false`;
- Gateway `outboundEnabled=false`.

Fresh Paperclip Tool Policy evidence after rollback:

- company Tool Policies = `[]`;
- the intentionally under-specified policy-test without Connection/Catalog context returns the expected `deny_default`;
- the correct provider-owned context for `vendaerp_search_products` — Connection `8e2c23f4-73f5-444a-8647-71428819ea91` plus Catalog Entry `165fcdca-8021-41dd-90e5-f0f143adeac3` — returns:
  - `decision=allow`;
  - `reasonCode=allow_profile`;
  - `allowed=true`;
  - effective profile `259a5449-58ba-4d59-9774-92612e3caa91`;
  - `matchedPolicyIds=[]`;
  - `auditEvent=null`.

The governed qualification consumes no rate limit and writes no audit event.

Zero VendaERP, TypeSafe/System One, Mistral, Human Fast Read, customer work, Human Send or outbound effect occurred. No Connection/install/grant/catalog/profile/Tool Policy mutation occurred. No attestation was opened.

The inactive `0.6.0` hash-named package directory remains staged for forensic identity/provenance evidence only. It is **not** the live package and must not be promoted again unchanged.

## DOCUMENTATION / HARD STOP

This slice ends with **Success B: precise blocked gap documented and production restored to the known-good baseline**.

It does not authorize:

- retrying `0.6.0`;
- modifying live `0.5.0` bytes;
- opening Semantic Fast Read attestation;
- enabling Fast Read/Semantic Selector/Human Send/Gateway outbound;
- calling VendaERP or any other provider;
- creating a new provider-state mirror or alternate lifecycle.

The package identity problem is closed. The remaining issue is a code-level bridge compatibility gap.

## NEXT BOUNDARY

Start a new slice/chat:

**Organization Adapter Operational Read Bridge Compatibility Fix V1 — CODE ONLY / 0.6.1 IMMUTABLE PACKAGE / NO PRODUCTION EFFECT**

That slice should:

1. freshly reconcile repo/PR/runtime;
2. prove the exact pinned Paperclip route → worker `getData` envelope, including host-authorized `companyId` and host-injected `renderEnvironment`;
3. change only the Organization Adapter guard needed to tolerate the provider-owned bridge envelope while continuing to reject unsupported caller selectors;
4. add pinned-Paperclip contract coverage for company anti-spoofing and the real `renderEnvironment:null` shape;
5. assign corrected bytes a new immutable version, expected `0.6.1`;
6. complete exact-head CI and provenance qualification;
7. stop before any production promotion.

A later, separately reviewed promotion slice may reconsider the corrected immutable package. Semantic Fast Read attestation remains out of scope until a live fresh operational-read snapshot is successfully proven.
