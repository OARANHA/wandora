# ADR 0307 — Immediate Pre-Mutation Attestation + Effect Authorization V1

Status: **BLOCKED / NO MUTATION / NO PRODUCTION EFFECT**

Date: 2026-09-27

## Context

ADR 0306 qualified only the code/CI contract for a bounded Semantic Fast Read attestation. It did not authorize production. This slice therefore began with a fresh reconciliation of repository, exact PR head, CI, canonical documentation and production runtime before considering any effect.

The only admissible future effect remains exactly one authenticated owner/admin Human Fast Read request for a product selector + price read, with Human Send, Messaging Gateway outbound and WhatsApp Fast Read remaining OFF, followed by mandatory immediate closure of the attestation window.

## REAL NOW

Repository/GitHub:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 is open / draft / mergeable;
- exact source head before this checkpoint: `fc41d10888d67771d9b2b2c6dd465f2c17f725a2`;
- exact source head completed **17/17 workflows GREEN**.

Production runtime:

- Core = `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, healthy, restart 0;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- active Core Compose includes the gates-OFF `compose.semantic-fast-read.yaml` and excludes custody/attestation overlays;
- Paperclip = `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy, restart 0;
- exactly one `wandora.organization-adapter-v1@0.5.0` is installed, `ready`, `lastError=null`;
- Task Drain = `false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Messaging Gateway is healthy with `outboundEnabled=false`;
- 28PRO has no temporary Tool Policies: `[]`.

No deploy, Compose mutation, Task Drain mutation, provider/model/VendaERP call, customer work, Human Send, WhatsApp or outbound effect occurred.

## PROVEN EVIDENCE

The Human Fast Read route is not an operator shortcut. It obtains the authenticated human through `getSessionContext(authorization)`, forwards the real `session.user.id`, and the Organization Adapter requires an active `owner` or `admin` membership before capability projection or dispatch.

The Organization Adapter Fast Read implementation remains provider-neutral on the Core side and dispatches through the existing Paperclip plugin/webhook boundary. Paperclip remains operational authority for the managed employee, run lifecycle, Tool Gateway, Connections/grants/secrets and audit.

Fresh runtime also exposed a material difference from the ADR 0306 baseline: 28PRO's Paperclip-managed Ana currently reports:

- agent id `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- `status=error`;
- `errorReason=wandora_execution_failed_422`;
- organization chain health remains `healthy`.

The Organization Adapter code does not itself pre-check the Paperclip agent status before `ctx.agents.invoke(...)`, but read-only evidence in this slice did not prove that a new issue-less Fast Read is operationally admissible from this live error state. No remediation was attempted.

A prior protected rollback receipt ending in `ROLLBACK_FREEZE_V1_OK` remains available, but it freezes the pre-ADR0303/0304/0305 runtime. It is not freshness-sensitive rollback evidence for the immediately current Core/Paperclip/OA state.

TypeSafe/System One, `wfri1` and Mistral secret custody was previously qualified as regular files with `0640 wandora-admin:wandora-ops`, but the currently exposed operator capabilities cannot perform the ADR 0306-required fresh metadata-only stat without crossing a denied secret path or widening authority. No bypass was used.

## GAPS

The pre-mutation attestation is incomplete because all of the following must be closed before a production effect can be authorized:

1. fresh metadata/existence readback for the TypeSafe, `wfri1` and Mistral custody files through an already-authorized metadata-only boundary;
2. fresh exact proof of the 28PRO VendaERP Connection/grant authorization for the single `vendaerp_search_products` read;
3. read-only resolution of whether Ana's current Paperclip `error` state is compatible with the issue-less Fast Read path, or proof of the separate canonical recovery required before attestation;
4. a legitimate authenticated 28PRO owner/admin trigger path for the Human Fast Read request; the operator plane must not impersonate the human actor;
5. rollback readiness tied to the immediately current live Core composition/image and the exact bounded attestation effect, not only to an older production freeze.

## Capability Authority / Reuse Gate

No new Wandora subsystem is justified.

- Wandora remains semantic/effect authority.
- Paperclip remains operational authority for workforce/run/tool/Connection/grant/secret/audit state.
- TypeSafe/JEV remains the semantic-route provider behind the existing Wandora contract.
- Mastra/Mistral remains the selector/runtime provider behind the existing contract.
- VendaERP remains the concrete business-system provider.
- Remote-Ops authority must not be widened to make the attestation convenient.

No lifecycle, run mirror, registry, secret manager, retry engine, product cache/catalog or orchestration subsystem is to be created.

## Decision

**BLOCK BEFORE FIRST PRODUCTION MUTATION.**

No effect authorization is issued by this ADR. In particular, it does not authorize mounting custody, applying the attestation overlay, turning any Semantic/Fast Read gate ON, calling TypeSafe/Mistral/VendaERP, or submitting a Human Fast Read.

The next work is evidence-gap closure only. After all gaps are independently proven, a new fresh Immediate Pre-Mutation Attestation must be run; this blocked checkpoint cannot later be reused as a production authorization.

## Second adversarial review

A fresh independent JEV routing review was run after the decision, using the canonical stop conditions and the current repo/runtime evidence. Result:

- `block = 1.00`;
- `proceed_fast = 0.00`;
- `deep_review = 0.00`;
- `split_task = 0.00`.

The review therefore confirms the deterministic stop before any production mutation.

## Validation / production state

- source head before documentation: **17/17 GREEN**;
- Core, Paperclip and Messaging Gateway remain healthy;
- Organization Adapter remains exactly one 0.5.0 ready plugin;
- Task Drain remains OFF/quiescent;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway outbound OFF;
- no production/customer/provider effect occurred.

## Next slice

**Immediate Pre-Mutation Evidence Gap Closure V1 — READ-ONLY / NO ACTIVATION / NO CUSTOMER EFFECT**.

Close only the five proven evidence gaps above. Do not mutate production or widen provider/operator authority. Once all five are proven, start a completely fresh Immediate Pre-Mutation Attestation + Effect Authorization for exactly one owner/admin Human Fast Read.
