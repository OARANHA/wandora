# ADR 0297 — Production Credential Custody Completion V1

Date: 2026-09-26

Status: **COMPLETE / CUSTODY QUALIFIED / NO ACTIVATION / NO RUNTIME OR CUSTOMER EFFECT**

## Objective

Complete only the operator-local production credential custody prerequisites left by ADR 0296 for the future Semantic/Fast Read path.

This ADR does **not** authorize deployment, runtime activation, provider calls, ERP/customer traffic, outbound effects, Task Drain changes, candidate promotion or any other production effect beyond installing inert host-custodied secret material that is not mounted into the live Core.

Permanent guardrail:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Repository/GitHub reconciliation immediately before the custody completion preserved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 branch `feat/semantic-fast-read-runtime-wiring-v1` at `267e441f84262d227efb8e3c4617a7e24c0ea7b5`;
- all 17 workflows associated with that exact source head GREEN;
- PR #370 remains a separate documentation slice at `11fd59599b21493a0fe335f4c32354989a6083a2`.

Live runtime readback after the operator-local custody step proved:

- Core remains `wandora/core:organization-adapter-candidate-f3225586d082`, revision `f3225586d0825334d2c9c697a1720512a65d47f8`, healthy, restart 0;
- the active Core Compose set still does **not** include `compose.semantic-fast-read.yaml` or `compose.semantic-fast-read-custody.yaml`;
- the newly installed TypeSafe and `wfri1` files are therefore not mounted into the running Core;
- Messaging Gateway remains healthy on its normal `compose.yaml` only, with no outbound activation overlay;
- Paperclip remains `wandora/paperclip:v2026.916.0`, healthy, restart 0.

These observations are validation of non-activation only. They are **not** the future Immediate Pre-Mutation Attestation and must not be reused as deployment authorization.

## PROVEN EVIDENCE

### 1. Core-side TypeSafe/System One credential custody is installed

ADR 0296 already qualified the credential purpose: the source file used by the existing JEV service is the real TypeSafe/System One Bearer credential for:

`POST https://api.typesafe.ai/v1/systemone`

The operator-local completion created a separate Core-side custody file at:

`/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key`

A later read-only verifier proved, without emitting bytes:

- the Core-side file is byte-equivalent to the already-qualified source;
- owner: `wandora-admin`;
- group: `wandora-ops`;
- mode: `0640`;
- type: regular file.

The original JEV service-local credential was not chmodded, chgrp'd, rebound or otherwise widened.

### 2. Distinct Wandora-owned `wfri1` HMAC custody is installed

The operator-local completion generated a new cryptographically random Fast Read intent HMAC directly inside the canonical Core secret boundary at:

`/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac`

The generation used 256 bits of randomness and did not emit the value.

Current metadata-only readback proves:

- owner: `wandora-admin`;
- group: `wandora-ops`;
- mode: `0640`;
- type: regular file.

A read-only comparison pass proved the `wfri1` material is not byte-equal to any current regular secret in the Core secret directory or the Organization Adapter HMAC directory. This covers the current Core-resident ingress/Paperclip-bridge secret set and the Organization Adapter HMAC set without exposing values.

The Core runtime's own future validation remains authoritative for the final activation-time distinctness check against every HMAC loaded by that exact future composition.

### 3. Existing Mistral platform credential metadata is freshly re-attested

The existing platform-owned Mistral credential remains:

`/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key`

Fresh metadata-only readback proves:

- owner: `wandora-admin`;
- group: `wandora-ops`;
- mode: `0640`;
- type: regular file.

The value was not read or emitted.

No selector-specific Mistral secret was created.

### 4. Metadata-only operator receipt

The bounded operator-local verification finished with:

- `typesafe_install=preexisting_verified`;
- `wfri1_install=preexisting_verified`;
- `typesafe_source_equivalent=true`;
- `wfri1_distinct_from_current_core_and_org_adapter_secret_sets=true`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `CUSTODY_V1_OK`.

Only metadata and boolean verification outcomes were retained. No secret value, hash of secret material, API key or HMAC was written to Git, chat or logs.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora secret manager, credential registry, lifecycle, run mirror, retry engine, state machine or provider subsystem was introduced.

Authority remains:

- Wandora: semantic/product/effect authority and purpose of the `wfri1` signing material;
- operator-controlled host files: current deployment custody mechanism for Wandora platform secrets;
- TypeSafe/System One: replaceable semantic-route provider;
- Mastra/Mistral: replaceable selector/runtime implementation;
- Paperclip: workforce/run/tools/Connections/grants/secrets/audit operational authority.

The provider Exit Test remains PASS.

## Decision

The accepted completion path was the minimum operator-local custody action:

1. do not widen Remote-Ops secret-path allowlists;
2. do not use `ops-workspace` as a secret staging boundary;
3. do not change ownership/permissions of the JEV service-local credential;
4. install a separate Core-side copy under the already accepted Core host-file custody;
5. create the `wfri1` HMAC directly under that same Core custody;
6. make both target files `0640 wandora-admin:wandora-ops`;
7. perform only metadata/equality/distinctness verification;
8. leave all runtime gates OFF and do not mount the new files.

## Second adversarial review

The first adversarial pass requested deeper review of the operator-local helper path.

The refined path removed any Remote-Ops bypass and used fixed canonical paths, root-only execution, no network access, no arbitrary destination input, no secret stdout and no overwrite-on-rerun semantics.

A second independent action review returned:

- **allow: 0.64**;
- confirm: 0.20;
- deny: 0.09;
- review: 0.07.

The deterministic repository/runtime guardrails independently support the same conclusion: custody installation is allowed; activation remains separate.

## Execution and validation

The operator executed the bounded local custody helper with `sudo`.

Both target files were created under canonical Core custody.

Because the initial helper emitted the creation markers before the final metadata block, completion was not inferred from those markers alone. A separate read-only verifier was then executed. It did not create, regenerate or overwrite either secret and returned the full metadata/equality/distinctness proof ending in `CUSTODY_V1_OK`.

Post-operation safe Docker inspection independently proved that:

- running Core image/revision did not change;
- no Semantic/Fast Read custody/convergence overlay became active;
- the new TypeSafe/`wfri1` host files are not live container mounts;
- Messaging Gateway outbound remains inactive;
- Paperclip image/runtime remains unchanged.

No TypeSafe, Mistral, VendaERP or customer call occurred.

## Production/effect boundary

This slice intentionally changed only inert host custody material.

It did **not**:

- deploy or recreate Core, Paperclip, Organization Adapter or Gateway;
- add the custody overlay to the running Core;
- enable Fast Read execution;
- enable Semantic Fast Read;
- enable Semantic Selector;
- enable Human Send;
- enable Messaging Gateway outbound;
- call TypeSafe/System One;
- call Mistral;
- call VendaERP;
- create customer traffic;
- send WhatsApp;
- change Task Drain;
- promote the Paperclip candidate;
- capture freshness-sensitive rollback/quiescence/final-artifact evidence.

## Result

**COMPLETE / CUSTODY QUALIFIED / NO ACTIVATION / NO RUNTIME OR CUSTOMER EFFECT.**

The ADR 0296 custody gaps are closed:

1. Core-side TypeSafe/System One credential installed under authorized custody — **DONE**;
2. distinct cryptographically random `wfri1` HMAC installed under the same Core custody — **DONE**;
3. current TypeSafe owner/group/mode/type metadata — **DONE**;
4. current `wfri1` owner/group/mode/type metadata — **DONE**;
5. current Mistral owner/group/mode/type metadata — **DONE**;
6. Semantic/Fast Read/Human Send activation remains OFF — **PROVEN**.

## Next slice

Stop here.

The next slice is:

**Immediate Pre-Mutation Attestation + Effect Authorization**

That next slice must capture fresh, immediately adjacent evidence for rollback readiness, Task Drain/quiescence, exact live Core/Paperclip/Organization Adapter state, exact candidate artifact identity/availability and the final effect-authorizing decision + second adversarial review.

Nothing in this ADR is authorization to deploy or activate production.
