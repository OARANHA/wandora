# ADR 0336 — Organization Adapter Operational Read Bridge Compatibility Fix V1

Status: **QUALIFIED / 0.6.1 IMMUTABLE PACKAGE / 17/17 EXACT CODE-HEAD CI GREEN / PRODUCTION PROMOTION NOT STARTED / LIVE OA 0.5.0 UNCHANGED / NO PRODUCTION EFFECT**

Date: 2026-09-29

## Context

ADR 0335 qualified the Organization Adapter 0.6.0 package identity and Paperclip-native promotion lifecycle, then deliberately failed closed when the first real Board-scoped `operational-read` call returned `operator_operational_read_invalid_company_scope`. The live system was rolled back to the known-good immutable Organization Adapter 0.5.0.

The failure was not a tenant-boundary failure. Pinned Paperclip source `d554c4789ed3930f8a53ac9fdf6503b3187097da` proves the URL-keyed plugin data route:

1. requires Board organization access;
2. authorizes the requested company through `assertPluginBridgeScope`;
3. forwards caller `params` separately;
4. injects the authorized `companyId`;
5. supplies `renderEnvironment: null` when no render metadata is provided.

The pinned worker `handleGetData` then constructs the plugin handler envelope by spreading caller params first and host-owned fields afterwards. Therefore host-authorized `companyId` and host `renderEnvironment` override any same-named caller fields.

The 0.6.0 handler accepted only an object whose sole key was `companyId`. The legitimate provider-native envelope `{ companyId, renderEnvironment: null }` was therefore rejected before `ctx.toolAccess.readOperationalSnapshot` could run.

ADR 0335 permanently marks 0.6.0 as an immutable, promotion-blocked package. Corrected bytes must not be republished or reused under 0.6.0.

## REAL NOW

Before code mutation:

- `main` remained `8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open, draft and mergeable;
- pre-fix head was `d983659c645e3168951552bb56b08cab339b6947`;
- production Paperclip was `wandora/paperclip:v2026.916.1`, healthy;
- live Organization Adapter was exactly one `wandora.organization-adapter-v1@0.5.0`, `ready`, `lastError=null`;
- Core was healthy with `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway was healthy with `outboundEnabled=false`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No production mutation was required to recover context.

## PROVEN EVIDENCE

Pinned Paperclip source proves the exact route-to-worker envelope.

The URL-keyed data route sends:

```ts
{
  key,
  ...(companyId ? { companyId } : {}),
  params: body?.params ?? {},
  renderEnvironment: body?.renderEnvironment ?? null,
}
```

The worker executes the registered data handler with:

```ts
{
  ...params.params,
  ...(params.companyId === undefined ? {} : { companyId: params.companyId }),
  ...(params.renderEnvironment === undefined ? {} : { renderEnvironment: params.renderEnvironment }),
}
```

The ordering is security-relevant: caller params are merged first; host-owned scope and render metadata are merged afterwards.

ADR 0335 also provides the immutable 0.6.0 provenance:

- Organization Adapter Plugin CI run `36558236355`;
- artifact `11028756089`;
- package `paperclip-plugin-wandora-organization-adapter-0.6.0.tgz`;
- package SHA-256 `5e044bed6886651bd7ebff6c5c2d30f27efb3e86d59d3b63a41541437d42482f`.

That package remains historical evidence and was not modified or reused.

## GAPS

The only implementation gap was handler compatibility with the real Paperclip `getData` envelope.

There was no evidence for:

- a new Wandora operational-state registry;
- a Connection/tool mirror;
- a new Paperclip API;
- a new auth or tenant-scope mechanism;
- a new lifecycle/orchestration subsystem;
- a projection redesign.

## CAPABILITY AUTHORITY / REUSE GATE

Authority remains unchanged:

- Wandora owns semantic BusinessCapability meaning and the bounded provider-neutral projection contract;
- Paperclip owns operational Connection/Catalog/grant/profile/tool availability and tenant authorization;
- the Organization Adapter is the provider adapter/replacement boundary;
- `ctx.toolAccess.readOperationalSnapshot` remains the provider-owned operational read;
- Paperclip's Board/plugin-data bridge remains the operator transport.

ADR 0168 therefore requires a compatibility repair at the existing adapter boundary, not duplicated operational state or a replacement bridge.

## DECISION

Implement the minimum compatibility change only:

1. keep `companyId` required, non-empty and bounded;
2. permit only `companyId` and optional `renderEnvironment` keys;
3. if `renderEnvironment` is present, require it to be exactly `null`;
4. reject every additional selector/key;
5. reject non-null render metadata;
6. keep the operational projection and managed-Ana lookup unchanged;
7. strengthen pinned-Paperclip verification for the route envelope and host-overwrite ordering;
8. assign all corrected bytes a new immutable package identity `0.6.1`;
9. preserve the 0.6.0 candidate record unchanged and create a separate 0.6.1 candidate record;
10. stop before any production promotion or live operator-read retry.

## SECOND ADVERSARIAL REVIEW

Before the first code mutation, JEV 1.13.0 reviewed the bounded decision against the pinned provider evidence and ADR 0168 constraints.

Result:

- `proceed_fast = 0.70`;
- `deep_review = 0.27`;
- `split_task = 0.02`;
- `block = 0.01`;
- reported confidence `0.60`.

The implementation stayed inside the reviewed boundary.

After validation, completion review returned:

- `complete = 0.90`;
- `verify_more = 0.06`;
- `incomplete = 0.04`;
- confidence `0.85`.

## EXECUTION

The source change is intentionally narrow.

### Handler compatibility

`integrations/paperclip/plugins/organization-adapter-v1/src/integration-capability.ts` now accepts the real host envelope `{ companyId, renderEnvironment: null }`, while rejecting unsupported keys and non-null render metadata.

The projection code, capability mappings, health/readiness rules, managed employee resolution and `readOperationalSnapshot` call are unchanged.

### Tests and pinned provider proof

`test/integration-capability.test.mjs` now proves:

- the real `companyId + renderEnvironment:null` envelope succeeds;
- an extra `agentId` selector is rejected;
- an extra selector remains rejected even when `renderEnvironment:null` is present;
- non-null `renderEnvironment` is rejected.

`scripts/verify-operator-read-surface.mjs` now additionally proves against pinned Paperclip:

- URL-keyed route caller params default to `{}`;
- route render metadata defaults to `null`;
- worker host `companyId` occurs after caller params;
- worker host `renderEnvironment` occurs after host company scope.

### Immutable 0.6.1 identity

The current source identity was advanced to `0.6.1` in package, manifest and artifact/candidate gates.

The historical file:

`integrations/paperclip/openapi-compatibility-v1/candidates/organization-adapter-v0.6.0-paperclip-v2026.916.1.json`

was not modified.

A separate sibling candidate was added:

`integrations/paperclip/openapi-compatibility-v1/candidates/organization-adapter-v0.6.1-paperclip-v2026.916.1.json`.

## VALIDATION

Exact pre-documentation code head:

`d7a3794ec675af3bc73244e2659db31b850048ba`

completed **17/17 workflows GREEN**, with zero failures or pending runs.

Relevant runs include:

- Organization Adapter Plugin CI: `36563941785` — GREEN;
- Paperclip OpenAPI Compatibility: `36563941979` — GREEN;
- Paperclip 916.1 OpenAPI Candidate CI: `36563941935` — GREEN;
- Paperclip Host Operational Read Extension CI: `36563941689` — GREEN;
- Paperclip Fast Read Patch Composition CI: `36563941938` — GREEN;
- Core CI: `36563941875` — GREEN;
- Semantic Fast Read CI: `36563941977` — GREEN;
- Paperclip Fast Read Production Candidate CI: `36563941806` — GREEN.

The Core Candidate Artifact was deliberately rerun only after Core CI and Semantic Fast Read CI were GREEN. Run `36563942164`, attempt 2, is GREEN.

### 0.6.1 package provenance

Organization Adapter Plugin CI run `36563941785` produced:

- artifact id `11031365784`;
- GitHub artifact digest `sha256:b7d4fd6b4334f317e7470ce08dab7010f21f0d35138fd65427cc54f242eeb744`;
- package `paperclip-plugin-wandora-organization-adapter-0.6.1.tgz`;
- package SHA-256 `80373a61f08d87772c3aab738ffa6905bddcb49c783e9574c1540247cb3b258f`;
- pinned Paperclip source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Paperclip image contract `wandora/paperclip:v2026.916.1`.

The workflow provenance records PR merge ref:

`7973de2fdb75dcb3b115552e2e97ca23f02b5f98`.

GitHub compare from source head `d7a3794e...` to that merge ref returned `files=[]`, proving source-tree equivalence for the package build.

The package contains exactly the expected five files. Independent unpacking reproduced the recorded package SHA.

### Post-validation production readback

Production remained unchanged:

- Paperclip `wandora/paperclip:v2026.916.1` healthy;
- Core `wandora/core:organization-adapter-candidate-b2cffbb54089` healthy;
- exactly one live Organization Adapter `0.5.0` ready;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Fast Read execution OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway outbound OFF.

No `0.6.1` package was staged or installed in production. No plugin lifecycle mutation, VendaERP call, TypeSafe/Mistral call, customer request, WhatsApp or outbound effect occurred.

## HARD STOP / NEXT BOUNDARY

This slice ends with **0.6.1 qualified in code and immutable artifact provenance established**.

Do not promote 0.6.1 from this ADR.

Any future production promotion must be a new slice with fresh:

`REAL NOW → PROVEN EVIDENCE → GAPS → CAPABILITY AUTHORITY / REUSE GATE → DECISION → SECOND ADVERSARIAL REVIEW → EFFECT AUTHORIZATION → EXECUTION → VALIDATION → DOCUMENTATION`.

Only after a separately authorized 0.6.1 promotion and a successful bounded live `operational-read` may Semantic Fast Read freshness attestation be reconsidered.
