# ADR 0332 — Paperclip VendaERP Tool Authorization Drift Reconciliation V1

Date: 2026-09-29

Status: **QUALIFIED / AUTHORIZATION DRIFT EXPLAINED / FRESH CONNECTION-SCOPED QUALIFICATION GREEN / OPERATIONAL INSTALL+GRANT SNAPSHOT NOT RE-ATTESTED / READ-ONLY / NO PROVIDER CALL / NO POLICY MUTATION**

## Objective

Explain the ADR 0331 change from the earlier `allow / allow_profile` qualification of `vendaerp_search_products` to a fresh `deny / deny_default` using only existing Paperclip authority and state.

This slice is read-only. It does not call VendaERP, TypeSafe/System One or Mistral, does not create a temporary Tool Policy, does not mutate a Connection, install, grant, Tool Profile or catalog entry, does not open a Semantic Fast Read attestation window, and does not prepare a production approval.

## REAL NOW

Fresh reconciliation before this documentation change proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head = `853505a48e059ba658e891762ba00185cac053a2`;
- all **17/17** workflows on that exact source head completed successfully;
- Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`, healthy;
- Paperclip = `wandora/paperclip:v2026.916.1`, healthy;
- exactly one `wandora.organization-adapter-v1@0.5.0` is installed, `ready`, `lastError=null`;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Ana remains `error / wandora_execution_failed_422`, while `orgChainHealth=healthy`;
- company Tool Policies are currently `[]`.

No production/provider mutation occurred during reconciliation.

## PROVEN EVIDENCE

### Historical qualified context

ADR 0308 recorded the GREEN qualification using the provider-owned identity of the intended business-system path:

- company 28PRO = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- Ana = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Connection = `8e2c23f4-73f5-444a-8647-71428819ea91`;
- Catalog Entry = `165fcdca-8021-41dd-90e5-f0f143adeac3`;
- tool = `vendaerp_search_products`;
- arguments = `{pageSize:5, skip:0}`;
- `sideEffecting=false`;
- decision = `allow`;
- reason = `allow_profile`;
- effective profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- matched policy ids = `[]`;
- audit event = `null`.

ADR 0331 then re-qualified the tool without recording a Connection, Catalog Entry or run context and obtained `deny / deny_default`, while the same effective profile remained present.

### Fresh differential qualification

The official governed Paperclip policy-test boundary was re-run four ways with the same 28PRO Ana, tool, arguments and `sideEffecting=false`. The capability forces `consumeRateLimit=false` and `writeAuditEvent=false`.

| Request identity context | Decision | Reason | Effective profile |
| --- | --- | --- | --- |
| no Connection / no Catalog Entry | deny | deny_default | `259a5449-58ba-4d59-9774-92612e3caa91` |
| Connection only | allow | allow_profile | `259a5449-58ba-4d59-9774-92612e3caa91` |
| Catalog Entry only | allow | allow_profile | `259a5449-58ba-4d59-9774-92612e3caa91` |
| Connection + Catalog Entry | allow | allow_profile | `259a5449-58ba-4d59-9774-92612e3caa91` |

All four returned `matchedPolicyIds=[]` and `auditEvent=null`.

Therefore the intended Paperclip Tool Policy qualification is **fresh GREEN** when the existing provider-owned Connection or Catalog Entry identity is supplied.

### Why the omitted context changes the result

The live Paperclip authorization source proves:

1. `loadContext` starts from optional `applicationId`, `connectionId` and `catalogEntryId`.
2. A Catalog Entry resolves its Connection, Application, risk level and upstream tool.
3. A Connection resolves the matching catalog entry for the requested tool and its Application.
4. A missing/out-of-company/disabled Connection or Application fails before profile matching with a specific denial reason.
5. Profile entries are selector-specific: an entry with `selectorType=catalog_entry` only matches the resolved `ctx.catalogEntryId`; connection entries likewise require `ctx.connectionId`.
6. The app-gallery profile is additive/effective even when the caller omitted `connectionId`, but its `defaultAction` is `deny` and the catalog-entry includes are the action authority.

This exactly explains the ADR 0331 shape:

- the app profile still appears in `effectiveProfileIds`;
- no entry can match when the provider identity is omitted;
- no explicit grant or allow policy applies;
- evaluation falls through to `deny_default`.

The fresh Connection-only and Catalog-only GREEN tests also prove that the referenced provider objects currently resolve inside 28PRO and are not disabled/archived; otherwise Paperclip would have stopped before `allow_profile`.

An explicit `applicationId` is not required for this qualification when either the Connection or Catalog Entry is supplied, because Paperclip derives the Application from that provider-owned state. A run context is also not required for this policy qualification: the fresh GREEN tests succeeded without one.

### Grants, installs and operational reach

Ana's current Paperclip access readback reports no principal permission grants, and the company Tool Policies list is empty. The observed allow mechanism is therefore the effective Tool Profile, not a temporary policy or an explicit principal `tools:use` grant.

Paperclip source also proves an important separate boundary: a Tool Connection install row is the **reach gate**. A stale profile binding by itself does not prove that a Connection is currently installed/reachable for an agent.

The already-qualified Paperclip host boundary `tools.operational.read` is the canonical bounded authority for this operational question. Its sanitized snapshot includes:

- Connection active/enabled/health;
- active organization-scoped Connection grant;
- `installedForAgent`;
- catalog tool operational state;
- `allowedByEffectiveProfile`.

Organization Adapter 0.5.0 uses exactly that projection and only enables a BusinessCapability when those operational conditions are satisfied.

This operator session does not expose a direct Board GET for the install snapshot and cannot legitimately invoke the signed `employee-capabilities` webhook without crossing the existing HMAC boundary. No token/secret extraction, database read, shell bypass, new Remote-Ops capability or Wandora mirror was introduced merely to obtain that projection.

Consequently, this ADR does **not** claim a new independent fresh attestation of the install row or organization grant. That operational-readiness proof remains a separate freshness-sensitive condition for the next attestation preflight.

## GAPS

The ADR 0331 **authorization blocker is closed**: the observed deny was caused by an under-specified qualification request, not by demonstrated loss of the existing Tool Profile authorization.

A separate freshness-sensitive operational question remains intentionally distinct:

- at the next attestation preflight, re-read the provider-native operational projection and require the intended VendaERP Connection to be healthy/ready, organization grant active, installed for Ana, and `vendaerp_search_products` allowed by the effective profile.

This is not justification for a provider mutation or a new Wandora subsystem.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

Authority remains:

- Wandora: semantic/product/effect authority and provider-neutral BusinessCapabilities;
- Paperclip: Connection/install/grant/profile/catalog, Tool Gateway authorization, operational readiness and audit;
- Organization Adapter: provider-neutral projection over Paperclip operational authority;
- VendaERP: replaceable Business System provider.

No registry, mirror, table, migration, state machine, lifecycle, secret manager, retry engine, execution subsystem or temporary policy is justified.

## DECISION

No Paperclip authorization change is required.

ADR 0331's `deny_default` must be treated as a **qualification-context false negative**, not evidence that the VendaERP authorization disappeared.

For `vendaerp_search_products`, a legitimate qualification must include enough provider-owned identity for Paperclip to resolve the authorized catalog action:

- `connectionId`, or
- `catalogEntryId`.

Supplying both is valid but not required. Supplying `applicationId` separately is not required when Connection/Catalog identity is present. A run context is not required for this policy qualification.

The fresh intended qualification is GREEN:

`allow / allow_profile`.

## SECOND ADVERSARIAL REVIEW

The first independent JEV review rejected an early close and selected `deep_review` with probability `0.94`, correctly challenging the difference between profile authorization and install/grant operational reach.

After explicitly separating those authorities and refusing to claim unobserved install/grant state, a focused second review selected:

- `proceed_fast = 0.85`;
- `deep_review = 0.13`;
- `block = 0.01`;
- `split_task = 0.01`.

The decision therefore survives adversarial review only in the bounded form recorded above.

## EXECUTION

Read-only execution only:

- repository/GitHub/runtime reconciliation;
- official Paperclip Tool Policies read;
- Ana readback;
- Paperclip source/contract read;
- four non-consuming/non-auditing policy qualifications;
- Organization Adapter/plugin readback;
- Paperclip/OA operational-authority source review.

Not executed:

- VendaERP;
- TypeSafe/System One;
- Mistral;
- any Tool Policy creation/deletion;
- Connection/install/grant/profile/catalog mutation;
- Task Drain mutation;
- Semantic Fast Read attestation opening;
- production approval;
- customer work;
- Human Send;
- WhatsApp/outbound.

## VALIDATION

Before documentation, PR #369 exact head `853505a48e059ba658e891762ba00185cac053a2` is **17/17 workflows GREEN**.

Runtime remained healthy and inert throughout the slice.

The differential policy matrix is deterministic and reproduces both the ADR 0331 deny and the intended GREEN qualification without any state mutation.

## NEXT BOUNDARY

This slice stops here.

A future **Semantic Fast Read fresh attestation preflight** may begin only from a new REAL NOW and must re-prove, immediately before any effect:

1. the intended `vendaerp_search_products` qualification with Connection or Catalog identity remains `allow / allow_profile`;
2. the provider-native operational projection reports the intended VendaERP path ready, including organization grant + install + effective-profile availability;
3. all other rollback/custody/gate/human boundaries required by the then-current canonical ADRs remain GREEN.

Do not reuse this ADR as an activation authorization.
