## Reconciled checkpoint — ADR 0218 read-tool idempotency candidate

The first bounded production E2E read-tool run succeeded but caused five identical `vendaerp_probe {}` provider calls because the model repeated the tool across its five allowed steps. The temporary Paperclip-only issue was deleted; Wandora work/outbound remained 0/0.

ADR 0218 reuses Paperclip's native Tool Gateway `idempotencyKey`: the Wandora ADR 0211 bridge derives only an opaque run-scoped SHA-256 operation key and persists no cache/state. The code fix is not yet promoted.

After CI/merge, a fresh Core artifact must pass the ADR 0217 image-only promotion gate; the follow-up proof must show one actual provider execution plus only Paperclip idempotent replays if the model repeats the read call.

## Reconciled checkpoint — ADR 0217 VendaERP E2E Core bridge promotion preflight GREEN

The bounded 28PRO VendaERP end-to-end proof requires one prerequisite: production Core is still `0a7f3683...`, which predates ADR 0211.

The validated Core Candidate Artifact from workflow run `35859795861`, artifact `10749840984`, image `wandora/core:organization-adapter-candidate-fa64d98c5b87`, has verified artifact/archive digests. All 101 `apps/core/` blobs and all 15 `infra/stacks/core/` blobs are identical to current `main@ff123b508080d1700610488d590e5916f6585aea`.

Full production Compose rendering with current versus candidate image produced exactly one delta: `/services/core/image`. No migration, Web, Paperclip, flag, mount, network or secret change is required.

ADR 0217 is **GREEN / NO EFFECT** and authorizes a separate Core-only promotion before the bounded Wandora → Paperclip Tool Gateway → supervised Mastra → VendaERP read proof.

## Production checkpoint — ADR 0216 28PRO VendaERP read-only activation GREEN

**28PRO VendaERP Read-Only Connection Activation Execution V1 is GREEN.**

Paperclip now owns one active 28PRO `mcp_stdio/local_stdio` VendaERP Connection, one active default organization grant with three required Paperclip secret refs, one Ana-only install, one native default-deny install profile with exactly eight read catalog entries, and three active `local_encrypted` VendaERP secrets. The active approved stdio template is `wandora.vendaerp-readonly-v1-r1`; the original empty-tool template is disabled.

Cross-company agent access was denied with HTTP 403. Ana sees exactly 8/8 allowed tools, all `risk=read`, with no write/destructive entries. One explicit `vendaerp_probe` executed through Paperclip Tool Gateway and returned HTTP 200 / `connected=true`. No retry was performed.

Ana remains Wandora `active + supervised` and Paperclip `idle / wandora_mastra`; work operations remain 0 and outbound attempts remain 0.

No credential plaintext entered Wandora, Git, Mastra or model prompts.

Next safe slice: a separately bounded end-to-end Wandora → Paperclip Tool Gateway → supervised Mastra read-tool proof, still with no customer work, outbound or ERP write.

## Production checkpoint — ADR 0215 VendaERP activation phase 1 GREEN

The first production phase of **28PRO VendaERP Read-Only Connection Activation Execution V1** is GREEN.

Paperclip was recreated on the same `wandora/paperclip:v2026.916.0` image with one new read-only bind mount exposing the exact reviewed VendaERP MCP adapter from the stack-local deployment path. Source/staged/container SHA-256 all equal `3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92`. Paperclip returned healthy with restart count 0 and live MCP initialize/tools/list returned exactly eight approved read-only tools.

No VendaERP ToolApplication, ToolConnection, stdio template, grant, install, profile, secret or provider call exists yet. Ana remains Paperclip idle and Wandora active+supervised; work/outbound remain 0/0.

Next phase requires secure custody of the owner-provided VendaERP Authorization-Token before any provider probe.

## Reconciled checkpoint — ADR 0214 VendaERP stack-local staging GREEN

ADR 0214 narrows ADR 0213's host staging path after live permission reconciliation. The adapter will be staged under the existing operator-owned Paperclip stack at `/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp` and bind-mounted read-only to the unchanged container path `/opt/wandora/integrations/vendaerp-readonly-mcp`.

This avoids privilege escalation, user-home production dependencies and ad-hoc container copying. No production mutation was performed.

Next remains **28PRO VendaERP Read-Only Connection Activation Execution V1**.

## Reconciled checkpoint — ADR 0213 VendaERP runtime mount preflight GREEN

28PRO VendaERP local_stdio Runtime Mount Preflight V1 is **GREEN / NO PRODUCTION EFFECT**.

The second adversarial review found that the live Paperclip container does not currently mount the host path used by the ADR 0212 local_stdio command. The exact merged adapter was therefore validated in an ephemeral `wandora/paperclip:v2026.916.0` container with a read-only bind mount, no credentials and `--network none`. MCP initialize + tools/list returned exactly the eight approved read-only tools.

Activation must now begin by staging the exact reviewed adapter, adding the read-only bind mount, recreating/health-checking Paperclip, and proving local MCP discovery before any VendaERP ToolConnection/grant/secret is created.

No production mutation was performed by ADR 0213.

Next slice remains **28PRO VendaERP Read-Only Connection Activation Execution V1**.

## Reconciled checkpoint — ADR 0212 28PRO VendaERP activation preflight GREEN

28PRO VendaERP Read-Only Connection Activation Preflight V1 is **GREEN / NO PRODUCTION EFFECT**.

Verified live entry:

```text
main = 798317e80ebabae407235d2ff1ffaacaa64177a2
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
28PRO ToolApplications = 0
28PRO ToolConnections = 0
28PRO custom VendaERP stdio template = absent
28PRO profiles/policies = 0/0
28PRO existing company secrets = 1 Organization Adapter HMAC only
Ana Paperclip = idle / wandora_mastra
Ana Wandora = active + supervised
28PRO work operations = 0
28PRO outbound attempts = 0
VendaERP adapter live path = absent
```

ADR 0212 freezes the future Paperclip-owned activation shape: approved local_stdio template with --tenant voepro, one mcp_stdio ToolApplication and one company ToolConnection, three local_encrypted credential secrets referenced only by the organization grant, Ana-only install, and a default-deny Ana Tool Profile containing exactly the eight ADR 0210 catalog entries. No Wandora table/service/state is added. Generic rest_api remains NO-GO under ADR 0208.

Next safe slice: **28PRO VendaERP Read-Only Connection Activation Execution V1**. It is the first slice allowed to receive/custody the Authorization-Token and create the frozen Paperclip resources. It must remain read-only and stop before employee work or outbound effects.

## Reconciled checkpoint — ADR 0211 Mastra ↔ Paperclip read Tool Gateway bridge GREEN

Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1 is **CODE ONLY / GREEN / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = a1ae7eaca7dc468ad8f45eb84b60ade95f5337aa
PR #275 = DRAFT during qualification
reviewed implementation head = 824c8af8c21097a8ecb5d4f53ca9c99aecc214bd
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

The bridge reuses the already-verified Paperclip run JWT only to establish a short-lived Tool Gateway session. Wandora Core admits only connection-backed MCP tools classified `risk=read`, exposes them to one ephemeral supervised Mastra Agent execution, and performs calls through Paperclip using only the Tool Gateway session token. Run JWTs, Tool Gateway tokens and provider secrets do not enter model messages or durable Wandora state.

Cached customer-work replay returns before opening a Tool Gateway session. After work execution is prepared, a Tool Gateway failure shares the existing uncertain-execution boundary. The deterministic Mastra runtime is unchanged and does not use this bridge.

Validation on the reviewed implementation head was 7/7 GREEN, including complete Core CI, Core Candidate Artifact, Paperclip Mastra Adapter CI with disposable Paperclip→Core→Mastra E2E, OpenAPI compatibility, Web, Platform Admin and Messaging Gateway.

ADR 0208 remains authoritative: generic `rest_api` Tool Gateway execution is still NO-GO. Write/destructive tools and external effects are outside ADR 0211.

Next safe slice: **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT**.

## Reconciled checkpoint — ADR 0210 VendaERP read-only MCP candidate GREEN

Paperclip VendaERP Read-Only MCP Adapter Candidate V1 is **CODE ONLY / GREEN / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = e133ad7c326b0c48aa3beb180d0f1e4146c12fea
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
28PRO Tool Connections = 0
28PRO Connection Grants = 0
```

Second adversarial review narrowed ADR 0209 before activation: Paperclip's direct native connector-runtime tool authority is tied to `paperclip_runner`, while Ana uses `wandora_mastra`. The selected execution implementation is therefore the already-supported Paperclip `local_stdio` MCP boundary, not a Paperclip core patch and not generic REST Tool Gateway execution.

The candidate at `integrations/paperclip/mcp-vendaerp-readonly-v1/` is stateless, exposes exactly the eight ADR 0202 reads, derives the provider origin only from a tenant subdomain fixed by the approved Paperclip command template (`https://<tenant>.vendaerp.com.br`; 28PRO candidate = `https://voepro.vendaerp.com.br`), performs GET only, accepts no caller URL/method/tenant, uses bounded pagination/no retries, and expects exactly three Paperclip grant-secret env refs.

Validation: 9/9 adapter tests GREEN, static read-only verifier GREEN, exact Paperclip v2026.916.0 local_stdio/grant/env/gateway compatibility verifier GREEN. No real VendaERP request or credential was used.

ADR 0208 remains unchanged: generic `rest_api` Tool Gateway is still NO-GO.

Next safe slice: **Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1 — CODE ONLY / NO EFFECT**. Only after that bridge is GREEN may the 28PRO VendaERP read-only activation preflight begin.

## Reconciled checkpoint — ADR 0209 Business-System read execution boundary preflight GREEN

Business-System Read Execution Boundary Capability Preflight V1 is **GREEN / PAPERCLIP NATIVE CONNECTOR SELECTED / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = 689908c7891f09dec12868665bd0682ba1ac96ae
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
28PRO Tool Connections = 0
28PRO Connection Grants = 0
```

ADR 0208 remains authoritative that generic `rest_api` Tool Gateway execution is NO-GO.

ADR 0209 proves the safe execution direction is a **Paperclip-native connector contribution** that reuses Paperclip ToolConnection + installs/grants + secret custody, executes only the fixed ADR 0202 read allowlist provider-side, and keeps VendaERP credential values out of Wandora Core/Web/tables/model prompts.

A standalone plugin tool is insufficient because it could create a competing assignment/grant authority. Paperclip v2026.916.1 does not close the generic REST gap and is not required for this capability.

No connection, grant, secret, provider call, upgrade, deployment or runtime effect occurred.

Next safe slice: **Paperclip VendaERP Native Read Connector Candidate V1 — CODE ONLY / NO EFFECT**.

## Reconciled checkpoint — ADR 0208 Business-System Tool Gateway qualification NO-GO

Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 is **NO-GO FOR REST TOOL GATEWAY / NO PRODUCTION EFFECT**.

Verified entry state:

```text
main = 83fed6beb4bdaebb63dad04e8e0fbfc54472f97a
open PRs = 0
Paperclip = wandora/paperclip:v2026.916.0
pinned source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

28PRO remains starter-workforce ready: one active organization, one active+supervised Ana, one completed starter hire, one control-plane binding, one employee/provider binding, Paperclip Ana idle, work items 0. Paperclip has 0 Tool Connections and 0 Connection Grants for 28PRO; no VendaERP credential exists.

Pinned Paperclip proves Connection/secrets/grants can represent the VendaERP three-header credential shape, but Tool Gateway execution is MCP-only for generic connected tools: `connectedMcpToolsForCompany` and test calls admit only `mcp_remote` / `local_stdio`, while remote dispatch is MCP JSON-RPC `tools/call`. The `rest_api` schema enum is not a generic REST execution boundary.

Therefore Paperclip Connections/grants/secrets remain the preferred connection/custody authority, while REST Tool Gateway remains QUARANTINED for VendaERP on v2026.916.0. No Wandora REST executor, secret manager or duplicate tool engine is authorized.

Next safe slice: **Business-System Read Execution Boundary Capability Preflight V1 — NO EFFECT**. Only after a narrow provider-owned execution boundary is proven may **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT** begin.

## Reconciled real checkpoint — 2026-09-23 after ADR 0199 preflight

Customer Company Profile + First Access Onboarding Production Promotion Preflight V1 is **READY FOR A SEPARATE PRODUCTION PROMOTION EXECUTION / NO PRODUCTION EFFECT**.

Verified implementation main:

```text
main = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
PR #259 = MERGED
post-merge workflows = 6/6 GREEN
open PRs before this documentation PR = 0
```

The preflight found and corrected two code/config gaps before promotion: the missing canonical onboarding activation overlay and missing Core Human API wiring for the already-reviewed fail-soft BrasilAPI CEP/CNPJ adapter. Core/Web qualification now uses exact-main artifacts from `0a7f3683...`.

Exact future promotion artifacts:

```text
Core artifact id = 10734743245
Core image = wandora/core:organization-adapter-candidate-0a7f36833188
Core GitHub digest = sha256:875ff17010e5974a15bc18e82cd9d949d54b77ddd67fcd2e62ba3f9efafaf8bd

Web artifact id = 10735126200
Web image = wandora/web:candidate-0a7f36833188
Web GitHub digest = sha256:4efe33331ac8343856127980322ec357c6a73ae3ed58cf1a0f53dfda91a82d4e
```

Production is still unchanged:

```text
migration 019 = ABSENT
wandora.organization_profiles = ABSENT
complete_customer_company_onboarding_v1 = ABSENT
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT
live Core = wandora/core:organization-adapter-candidate-d8349b353bb7
live Web = wandora/web:candidate-aaada76d9806
```

Next safe slice: **Customer Company Profile + First Access Onboarding Production Promotion Execution V1**. Before any effect, reconcile exact main/runtime, capture a fresh protected pre-019 backup, and follow ADR 0199's frozen flag-last promotion order. Do not apply migration 019 or enable onboarding as part of context recovery.

# Wandora — Canonical State / Handoff

## Reconciled checkpoint — main@608bedd9 — ADR 0198 still NO EFFECT in production

Real-state reconciliation after PR #257:

```text
main = 608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
PR #257 = MERGED
open PRs = 0
exact post-merge main workflow runs = none observed
PR #257 head 5ffe209bb222056a7382204076991ef674ace798 = 7/7 GREEN
```

Live production remains unchanged:

```text
Web = wandora/web:candidate-aaada76d9806
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de
critical services = healthy / restart 0

migration 019 = NOT LIVE
wandora.organization_profiles = ABSENT
complete_customer_company_onboarding_v1 = ABSENT
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT

MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
MEDICSPRO digital employees = 1
```

No production effect was introduced by the merge. Next slice: **Customer Company Profile + First Access Onboarding Production Promotion Preflight V1** only.


## ADR 0198 — Customer Company Profile + First Access Onboarding V1 — CODE ONLY / GREEN

Implemented behind an OFF-by-default runtime flag: canonical Wandora-owned organization profile; invite-only unlinked → first company setup; owner membership bootstrap without employee creation; local CPF, legacy/alphanumeric CNPJ and CEP validation; optional fail-soft BrasilAPI enrichment; owner/admin profile read/update; and masked tax ID summary in Empresa.

Migration 019 is **NOT LIVE**. Live production has no `wandora.organization_profiles`, no onboarding function and no `WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED` flag.

Disposable production-derived restore passed migration 019 + canonical verifier. Core and Web local gates are GREEN. See ADR 0198. Next slice is production-promotion preflight only.

## ADR 0197 — Organization Grounding Source File Owner-Session Smoke Test V1 — GREEN

A normal authenticated MEDICSPRO owner uploaded exactly one real PDF through the customer-facing Company surface.

Current delta:

```text
organization-grounding-sources objects = 1
new grounding entry = 1 active rule / approved_source
source label = regras_da_casa_medicspro.pdf
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
critical services = healthy / restart 0
```

No direct SQL/Storage mutation, model work, Paperclip run or outbound effect was used.

The same owner then used **Baixar arquivo** successfully. Storage independently recorded the exact authenticated private GET as HTTP 200 / application/pdf / 136312 bytes. Post-download state stayed unchanged at 1 object, 1 matching sourceRef, 2 works and 0 outbound attempts. Upload + association + private download are GREEN, with no owner credential extraction/minting.

See ADR 0197.

## ADR 0196 — Organization Grounding Source File Upload Production Promotion Execution V1 — GREEN

Migration 018 and the Web upload/download surface are now production-live.

Final live state:

```text
Web = wandora/web:candidate-aaada76d9806
revision = aaada76d9806d48ce3e3047a299974ee9d41a480
healthy / restart 0

organization-grounding-sources bucket = 1
target objects = 0
target policies = 2

MEDICSPRO fact active = 1
MEDICSPRO fact retired = 1
MEDICSPRO rule active = 1
MEDICSPRO rule retired = 1
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
```

Core, Paperclip and Messaging Gateway were not recreated. No real file was uploaded merely to prove promotion.

The upload surface now supports private company evidence through the customer-facing Company flow. Uploaded files remain evidence only; they are not automatic RAG/retrieval/memory/context.

See ADR 0196. Next safe proof: owner-session real-file smoke test through the canonical Company flow.


## ADR 0195 — Grounding Source File Upload Production Promotion Preflight V1 — GO / NO EFFECT

The production-promotion preflight is complete and GREEN.

Qualified future effect is intentionally minimal:

```text
fresh backup + isolated restore-check
→ migration 018 + verifier
→ exact private Web candidate proof
→ Web-only promotion
→ validation
→ STOP
```

Core, Paperclip, Mastra and Messaging Gateway do not require promotion.

Evidence:

- main = `aaada76d9806d48ce3e3047a299974ee9d41a480`;
- exact Web artifact = `10729343085`;
- GitHub/local ZIP digest = `f7957a554ade68b4c23c760ef238216b9c2177723f97548c9ef9c54e14e03e8d`;
- source SHA = exact main;
- production-derived `pg_dump -Fc` of `wandora`, `wandora_private` and `storage` restored successfully in an isolated clean database;
- migration 018 + canonical verifier = GREEN in that restored baseline;
- restored grounding rows = 4;
- private exact Web candidate = healthz ok / company 200;
- browser publishable-key embedding and GET/POST CORS from `app.wandora.com.br` = GREEN.

Live production remains unchanged: target bucket/policies/objects = 0 and current Web/Core/Paperclip/Gateway are unchanged.

A future execution must take a **fresh** execution-time backup/restore-check before applying migration 018. See ADR 0195.


## ADR 0194 — Organization Grounding Source File Upload Implementation V1 — CODE ONLY

Grounding source-file upload is now implemented in code without production effect.

The design preserves ADR 0168/0191 authority:

```text
Wandora = official-evidence semantics + provider-neutral sourceRef/sourceLabel + grounding version history
Supabase Storage = delegated private blob persistence
Mastra/runtime = no automatic file retrieval/RAG/memory/context use in this slice
```

Migration 018 defines a private `organization-grounding-sources` bucket, 10 MiB limit, bounded business MIME types and tenant/role RLS. Objects are immutable and content-addressed by SHA-256; owner/admin may insert, active members may read, and V1 defines no UPDATE/DELETE customer policy.

Web now supports uploading evidence in the Company flow and downloading Wandora-managed private evidence from the detail drawer. New files continue to associate to grounding only through the canonical create/correct versioned contract.

Validation is GREEN: SQL/RLS verifier, 12/12 existing grounding Core tests and full production-shaped Web build with `WANDORA_WEB_GROUNDING_SOURCE_FILE_UPLOAD_V1_OK`.

Production is unchanged: migration 018 is not applied, live bucket count remains 0 and no object exists. See ADR 0194. Next slice: production-promotion preflight only.


## ADR 0193 — Web Home Greeting + Company Detail Drawer Production Promotion V1 — GREEN

Web `wandora/web:candidate-840469b365d1` from `main@840469b365d1b0af25fcb91f365dc74e0da04ea6` is live, healthy and restart 0. Public routes /, /team, /work, /conversations, /approvals and /company are 200; /api/v1/me without session remains 401.

Core, Paperclip and Messaging Gateway were unchanged. MEDICSPRO grounding remains exactly 1 active fact, 1 retired fact, 1 active rule and 1 retired rule.

The live Web now includes real-user Bom dia/Boa tarde/Boa noite greeting, reduced headline density, quick actions, bounded grounding previews and the right-side detail drawer. Source-file upload remains preflight-only and is not live.

## ADR 0192 — Host-Authenticated GitHub Actions Artifact Transfer V1 — GREEN

The VPS now has a canonical host-side artifact transfer path:

```text
credential = /etc/wandora/github-artifacts.env (0640 root:wandora-ops)
helper = /home/wandora-admin/bin/wandora-github-artifact (0750)
```

Artifact `10727436371` proved the path end to end: authenticated GitHub metadata/download, GitHub digest match, safe extraction, internal SHA256SUMS and manifest qualification.

Temporary connector-hosted artifact URLs are no longer the normal production-promotion path. See ADR 0192 and `docs/operations/github-actions-artifact-host-transfer-v1.md`.


## ADR 0191 — Grounding Source File Upload Capability Authority Preflight V1 — NO EFFECT

Supabase Storage is the accepted blob implementation, but live Storage currently has no grounding bucket and no Storage policies. Upload is not live yet.

The approved direction is minimal and provider-neutral: Wandora owns source/evidence semantics through sourceRef/sourceLabel; Supabase Storage owns private blob persistence; uploaded files are evidence only and are not automatically chunked, embedded, retrieved, memorized or injected into runtime context.

No bucket, policy, object, migration or grounding mutation was created by ADR 0191. Next: code-only Source File Upload Implementation V1.

## ADR 0190 — Web Home Greeting + Company Detail Drawer V1 — CODE ONLY

Home now greets the authenticated human by browser-local daypart using the real /api/v1/me display name, with a max ~3rem hero and quick links to existing routes.

Company cards remain one durable grounding entry per card, show a four-line preview and open a right-side drawer for the full content, provenance/source label, timestamp and existing authorized correct/retire actions.

Production remains unchanged until a separately reviewed Web-only promotion. All existing Web gates plus WANDORA_WEB_HOME_GREETING_COMPANY_DRAWER_V1_OK are GREEN.

## Grounding real-state reconciliation — 2026-09-22

The prior grounding=0 checkpoint is superseded by live owner activity.

MEDICSPRO currently has exactly:

- 4 grounding rows total;
- 1 active fact row;
- 1 active rule row;
- 2 retired rows.

The active fact currently contains the three owner-entered company facts in one durable record. The active rule currently contains four owner-entered house-rule statements in one durable record. The UI must not silently split either durable row into fake independent records.


## ADR 0189 — Web Business Density Production Promotion V1 — GREEN

Web `wandora/web:candidate-5f362fb43b62` from exact `main@5f362fb43b62d4567e850de7c2f09f099755a925` is live, healthy and restart 0. The persisted selector is aligned.

The production Company surface now follows the second owner-approved Regras da Casa reference for scale/density: smaller display titles, rules-first composition, compact cards, Ensinar à equipe + Como funciona, and optional evidence disclosure. Início, Equipe and Conversas also use the reduced hero scale.

Core/Paperclip/Gateway were unchanged. At ADR 0189 promotion time MEDICSPRO had grounding 0 / works 2 / outbound 0; that grounding count is historical and is superseded by the real-state reconciliation above. See ADR 0189.


## ADR 0188 — Web Business Density + Company Reference Fidelity V1 — CODE ONLY

The second owner-approved Company / Regras da Casa reference is now the canonical density/scale target. Customer hero titles on Início, Equipe, Conversas and Empresa are capped around 4rem instead of the previous 6–6.7rem range.

Empresa is reorganized around business comprehension: Regras da Casa first, compact two-column cards, Ensinar à equipe + Como funciona, then confirmed company facts and real history. Provenance/source controls remain semantically intact but visually secondary.

All existing Web gates plus WANDORA_WEB_BUSINESS_DENSITY_V1_OK and a production-shaped Docker build are GREEN. No API/auth/grounding/provider contract changed and production remains unchanged. See ADR 0188.


## ADR 0187 — Web Design System + App Shell Production Promotion V1 — GREEN

Production Web is `wandora/web:candidate-67966d42d23e` from exact `main@67966d42d23e1778d89c2430de8d59e2235dedfb`, healthy / restart 0. Persisted selector and live revision are aligned.

The bundled Dela Gothic One / Space Grotesk / JetBrains Mono design system, 250px→82px collapsible desktop sidebar, complete mobile menu and power-style real logout are live. Core, Paperclip and Messaging Gateway were not recreated.

The exact GitHub Web artifact is 10722734256 with ZIP digest `sha256:0b544336336d47225a54f9b470957afc8a65ea6e53f60006715efa486a88e319`. The valid rollback selector is retained in `web.env.before` and points to `candidate-d8349b353bb7`.

MEDICSPRO remains grounding 0 / works 2 / outbound 0; Ana is active + supervised; Human Send and Gateway outbound remain OFF. See ADR 0187.


## ADR 0186 — Web Design System + App Shell V1 — CODE ONLY

The customer Web design system now uses bundled/pinned Dela Gothic One 400 for display, Space Grotesk Variable for body/interface text and JetBrains Mono Variable for operational labels.

The existing six-route customer shell remains authoritative. Desktop sidebar now supports 250px expanded / 82px collapsed modes with browser-local visual preference, and the power-style Sair control reuses the existing AuthProvider signOut/session-revocation path. Mobile exposes the same route authority through a compact menu.

All existing Web gates plus WANDORA_WEB_APP_SHELL_DESIGN_SYSTEM_V1_OK and the production-shaped Docker build are GREEN. No API/auth/grounding/provider contract changed and production is unchanged. See ADR 0186.


## ADR 0185 — Customer Company Grounding Save + Business UX Production Promotion V1

The deterministic customer grounding create failure is fixed and promoted.

Production now runs Core and Web from `main@d8349b353bb7cc46423ea8ba60e8989522ef6b17`:

- Core = `wandora/core:organization-adapter-candidate-d8349b353bb7`;
- Web = `wandora/web:candidate-d8349b353bb7`;
- both healthy / restart 0.

A valid unauthenticated grounding POST now reaches normal auth and returns `401` instead of the former parser-level `400`. The `/company` UI now uses business-friendly language while preserving internal `fact/rule/provenance/sourceRef` semantics.

MEDICSPRO remains unchanged: grounding = 0, works = 2, outbound attempts = 0, Ana = one active + supervised employee. Human Send and Gateway outbound remain OFF.

The next permitted effect is the already-authorized MEDICSPRO first real grounding execution through the normal authenticated owner/admin customer flow. See ADR 0185.


## ADR 0183 — Grounding Browser Idempotency Production Promotion — GREEN

Live Web is now `wandora/web:candidate-8fb5201b0229`, healthy/restart 0. Grounding create preserves browser UUID + exact payload fingerprint across ambiguous retries. Core/Paperclip/Gateway were not recreated.

MEDICSPRO grounding remains 0. The next and only remaining effect in this slice is normal authenticated owner/admin creation of F1/F2/F3 as facts and R1 as a rule.


## ADR 0182 — Customer Company Grounding Create Browser Idempotency V1 — CODE ONLY

The `/company` create path now reuses the proven customer-browser safety model: UUID + exact payload fingerprint persisted in sessionStorage and reused after ambiguous responses. Changed payloads fail closed while a create is unresolved.

ADR 0179's planned human-readable idempotency keys are superseded before any grounding effect by browser-generated UUID v4 keys. F1/F2/F3 remain facts, R1 remains a rule, and grounding remains 0 until a later Web promotion + normal owner-session create.


## ADR 0181 — Owner-Statement Evidence Surface Production Promotion — GREEN

Web `wandora/web:candidate-8ee226bcc0dd` is live, healthy/restart 0 from exact `main@8ee226bcc0ddec2f333348235c501320fb223152`. The customer `/company` form can now preserve optional source evidence for truthful `owner_statement` provenance.

Core/Paperclip/Gateway were unchanged. MEDICSPRO grounding remains 0, works = 2, outbound attempts = 0. The remaining effect is the normal authenticated owner/admin creation of F1/F2/F3 as facts and R1 as a rule per ADR 0179.


## ADR 0180 — Customer Company Owner-Statement Evidence Surface V1 — CODE ONLY

The customer `/company` form now preserves optional provider-neutral `sourceRef/sourceLabel` for direct `owner_statement` provenance instead of exposing evidence only for `approved_source`. Approved-source references remain mandatory.

No Core/schema/provider authority changes. F1/F2/F3 remain facts and R1 remains a formal rule. No production effect or grounding mutation occurred.


## ADR 0179 — MEDICSPRO First Real Grounding Execution — OWNER SESSION GATE

Owner confirmation is complete for F1/F2/F3 and R1. The future customer mutation set is frozen as three `fact` entries and one `rule` entry, all with truthful `owner_statement` provenance and the owner-requested provider-neutral sourceRef.

Production mutation has **not** occurred: MEDICSPRO grounding remains 0. The only remaining effect gate is a normal authenticated MEDICSPRO owner/admin session through the canonical customer-facing grounding contract. Auth-admin/service-role impersonation, token extraction, privileged JWT minting and direct SQL remain forbidden.

See ADR 0179 for exact content, idempotency keys and the R1 `rule` classification.


## ADR 0178 — MEDICSPRO First Real Organization Grounding Content Preflight V1 — NO EFFECT

The first real content review is complete without creating grounding. Live remains at migration 017 present/verified, MEDICSPRO grounding rows = 0, works = 2, outbound attempts = 0, and Ana = one active + supervised employee.

Owner-authored evidence supports exactly one low-ambiguity first fact candidate: **“O MedicsPro reúne agenda, pacientes, informações clínicas e gestão financeira em um único ambiente.”** The evidence source is the first authenticated MEDICSPRO customer work (wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab).

Market-positioning/benefit statements remain NEEDS OWNER CONFIRMATION. No durable Regras da Casa entry is accepted yet: repeated no-send/review instructions were task-scoped and cannot be promoted into a tenant-wide rule without explicit owner confirmation. Global anti-hallucination and external-effect rules remain Wandora runtime/effect policy and must not be duplicated as tenant grounding.

A future execution may insert the accepted fact only. A first fact+rule set requires explicit owner confirmation of a durable house rule before execution. See ADR 0178.


## ADR 0177 — Customer Web Grounding API Bridge Production Promotion Execution V1

Status: **EXECUTED / GREEN / WEB ONLY**.

Production Web is now `wandora/web:candidate-1800aa3d3fb4`, healthy/restart 0, from the exact immutable ADR 0176 artifact. Unauthenticated grounding through `https://app.wandora.com.br` now returns Core `401` rather than the prior Nginx `404`; unknown grounding and generic API paths remain `404`.

Migration 017 remains LIVE/verified, MEDICSPRO grounding rows remain 0, customer works remain 2 and outbound attempts remain 0. Core `d90b225e...`, Paperclip v2026.916.0 and Messaging Gateway were not recreated. Human Send and Gateway outbound remain OFF. No real fact/rule, model call, work/run/wakeup/session or external message was created by the promotion.

Last synchronized: **2026-09-22**

## 2026-09-22 Customer Web Grounding API Bridge Artifact Qualification V1 — NO PRODUCTION EFFECT

The code slice is merged in `main@1800aa3d3fb4a0928f314eed4f1722f7adb59ef0` through PR #233 / ADR 0175. Post-merge Web/Core/Platform Admin/Messaging Gateway workflows are GREEN.

The immutable Web candidate built from that exact `main` is:

```text
GitHub artifact id   = 10695249794
artifact name        = web-candidate-1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
artifact ZIP sha256  = adba9f361b1135e123c555f6ff4afb3b555c13ec3dc129b7347a9467ddc6a109
source sha           = 1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
source tree sha      = c98f0e3a13a4675a0c1b23e476bfa50e649edefe
image tag            = wandora/web:candidate-1800aa3d3fb4
image id             = sha256:270a150454befd2e260c45ebbe9b5985a973a32905ac157ce1738d6acf1a243d
OCI archive sha256   = 1d76901fa02ca4b8cfeef8bdf9daf9fbb12c610951a5e629c3cd16c6facc960a
manifest sha256      = 3846a2f11a84d19d60cfdb81251ac5735385ff8078b3209cf06ffa9781807a5e
```

The artifact ZIP and its internal `SHA256SUMS` were independently verified. Production remains unchanged: migration 017 is live/verified, grounding rows remain 0, Core remains `wandora/core:organization-adapter-candidate-d90b225e6cc2`, Web remains `wandora/web:candidate-65908b76c667`, MEDICSPRO remains at 2 works and 0 outbound attempts, and Human Send/Gateway outbound remain OFF.

Next slice: **Customer Web Grounding API Bridge Production Promotion Preflight / Execution V1 — WEB ONLY**. It may qualify/promote only this corrected Web artifact; do not reapply migration 017 or repromote Core.

## 2026-09-22 Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY

ADR 0175 corrects only the explicit Web/Nginx transport bridge for the already-live Core grounding contract. The change adds exact allowlists for grounding read/create, retire and correct; preserves Authorization and Idempotency-Key; keeps request methods/bodies intact; preserves existing /me, work and conversations bridges; and keeps the generic /api/ fallback fail-closed at 404.

Production is intentionally unchanged: migration 017 remains LIVE/verified, grounding rows remain 0, Core remains wandora/core:organization-adapter-candidate-d90b225e6cc2, Web remains wandora/web:candidate-65908b76c667, MEDICSPRO remains at 2 works and 0 outbound attempts, and Human Send/Gateway outbound remain OFF.

The corrected Web candidate passed production-shaped build/verifier proof plus a disposable private candidate check where unauthenticated grounding reached Core and returned 401 rather than Nginx 404. No real grounding or external effect was created. The next slice is Web-only production promotion qualification/execution; do not reapply migration 017 or repromote Core.


## 2026-09-22 Organization Grounding Production Promotion Execution V1 — PARTIAL SAFE STOP

ADR 0174 records a safe partial production execution.

Current live boundary:

```text
migration 017 / organization_grounding_entries = LIVE / verified
grounding rows                                  = 0
Core = wandora/core:organization-adapter-candidate-d90b225e6cc2
Core = healthy / restart 0 / readyz 200
Web  = wandora/web:candidate-65908b76c667
Web  = healthy / restart 0
Paperclip = unchanged / healthy
Messaging Gateway = unchanged / healthy
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

The exact Web grounding candidate from ADR 0173 was rejected after public validation: direct Core returned 401 for the unauthenticated grounding route, while the public Web edge returned Nginx 404. Source inspection proved `apps/web/nginx.conf` lacks the grounding API allowlist/proxy even though `CompanyPage.tsx` calls those routes.

Per ADR 0173, Web alone was rolled back. Do **not** reapply migration 017 and do not restore the database merely to undo this binary/UI gap.

Next slice: **Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY / NO PRODUCTION EFFECT**, followed by a separate Web-only promotion qualification/execution. No real MEDICSPRO grounding is authorized yet.

Preflight base checkpoint before ADR 0173 documentation:

```text
main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
```

Mutable Git/runtime state must still be reverified before execution.

## 2026-09-22 Organization Grounding Production Promotion Preflight V1 — GO FOR SEPARATE EXECUTION / NO EFFECT

Canonical Git at preflight decision:

```text
main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
ADR 0173 = Organization Grounding Production Promotion Preflight V1
```

All applicable post-merge push workflows on the exact main are GREEN: Core CI, Web CI, Platform Admin CI and Messaging Gateway CI.

Live remains unchanged: migration 017 / `wandora.organization_grounding_entries` is ABSENT; Core/Web/Paperclip/Gateway are healthy with restart 0; MEDICSPRO has exactly 2 customer work operations, exactly 1 active+supervised Ana and 0 outbound attempts; Human Send and Gateway outbound remain OFF.

Preflight qualification is GREEN:

- production-derived `pg_dump -Fc` restore proof on exact Supabase PostgreSQL 17.6.1.136;
- migration 017 applies idempotently in the disposable restore and canonical verifier returns `ORGANIZATION_GROUNDING_CONTRACT_V1_OK`;
- exact Core artifact = GitHub artifact 10686954415 from `d90b225e...`, ZIP digest `fca39cf5...`;
- exact Web artifact = GitHub artifact 10690072338 from `fba159db...`, ZIP digest `73ef5b75...`;
- `d90b225e..fba159db` has no Core diff;
- new Core readiness fails closed when the migration-017 grounding boundary is unavailable;
- future order is frozen as fresh backup/restore-check -> migration 017 + verifier -> Core -> Web -> validate -> STOP.

This preflight does **not** authorize production mutation by itself. A separate **Organization Grounding Production Promotion Execution V1** must take a fresh execution-time backup and revalidate all stop conditions. No real MEDICSPRO grounding belongs to that promotion execution.


Session bootstrap: read `docs/WANDORA_PROJECT_SOURCE.md` first for continuity only. Authority order then remains `AGENTS.md` → relevant accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

## 2026-09-22 GitHub-hosted CI migration — ADR 0158

Current repository visibility is public. Normal CI no longer targets the isolated VPS runner. All nine repository workflows now target `ubuntu-24.04` GitHub-hosted runners with unchanged check/job names.

The OpenAPI compatibility gate now provisions Node 24.21.0 explicitly and no workflow depends on `RUNNER_TOOL_CACHE`. Production deployment/credentials remain outside ordinary CI. The old `wandora-vps-01-ci` runner is fallback-only during validation and should be stopped/deregistered after hosted CI is proven GREEN.

This section supersedes the older 2026-09-19 self-hosted CI checkpoint for current CI execution only; ADR 0113 remains historical evidence.

## 2026-09-19 execution bridge activation V1 — COMPLETE / EMPLOYEE STILL PAUSED

Canonical Git at execution completion:

```text
main = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
PR #175 = merged
ADR 0125 = completion checkpoint
```

The Paperclip -> Wandora/Mastra production execution bridge foundation is now LIVE and validated. Migration 014 remains live/verified and was not repeated. The dedicated HMAC remains root-custodied on the host; Paperclip receives a node-owned `0400` tmpfs copy through the corrected ADR 0123/0124 startup wrapper.

Current production boundary:

```text
Core bridge                = LIVE / healthy / readyz 200
Paperclip bridge           = LIVE / healthy / restart 0
wandora_mastra             = exactly 1 / loaded / version 0.1.0
adapter test-environment   = PASS
Ana / Wandora              = exactly 1 / paused + supervised
Ana / Paperclip            = exactly 1 / paused
wakeups / heartbeat runs   = 0 / 0
agents.resume              = absent
Human Send                 = OFF
Gateway outbound           = OFF
MEDICSPRO outbound attempts= 0
```

This checkpoint activates only the bridge foundation. It does **not** authorize Ana activation/resume or customer messaging. Any future activation/outbound effect must be a separate reviewed slice from fresh REAL NOW evidence.

## 2026-09-19 CI execution checkpoint — HISTORICAL / SUPERSEDED FOR NORMAL CI

This section records ADR 0113 historical evidence. ADR 0158 and the 2026-09-22 GitHub-hosted CI section above supersede it for current normal CI execution.

```text
main entering CI slice                     = 90ce29465816e4b91fb7bf2d516e0119a6404731
PR                                          = #162 ci: add isolated Wandora self-hosted runner
implementation-validation head             = fad8d64070663aea823325f8970a24b90004295e
repository                                  = private
runner                                      = wandora-vps-01-ci
runner host                                 = wandora-vps-01 / 13.140.190.149
runner identity                             = wandora-ci
Docker boundary                             = dedicated rootless daemon
production Docker socket access             = none
validated PR checks                         = 7/7 success
```

At this historical ADR 0113 checkpoint, GitHub-hosted Actions quota exhaustion was an external billing/quota condition and normal repository CI temporarily targeted `[self-hosted, linux, x64, wandora-ci]`. This is no longer the current runner policy; ADR 0158 moved normal CI to GitHub-hosted `ubuntu-24.04`.

The runner is deliberately hosted on the existing Wandora VPS but is isolated from production through a dedicated unprivileged identity, no host `docker`/operator/sudo groups, a separate rootless Docker daemon/store, explicit systemd path restrictions, pre/post rootless-boundary hooks and resource ceilings of 300% CPU, 3 GiB `MemoryHigh`, 4 GiB `MemoryMax` and 4096 tasks. The runner service keeps `PrivateTmp=yes`; workflow files that must be bind-mounted into rootless Docker must be staged under `RUNNER_TEMP`, not the runner-private `/tmp`.

Final validation on the implementation head proved Core Candidate, Core, Messaging Gateway, Operator Consoles, Organization Adapter Plugin, Platform Admin and Web CI green while critical production containers remained healthy with zero restarts.

At the ADR 0113 CI checkpoint the next functional product slice was **Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1**. ADR 0114 closed that no-effect gate and ADR 0115 has now completed the first real MEDICSPRO customer hire through the normal owner browser path. The next functional slice is **Customer Owner First Real Tenant Digital-Employee Activation Preflight V1**. Ana remains paused + supervised; Human Send and Gateway outbound remain OFF.

This file is a compact current-state handoff. Historical evidence belongs in accepted ADRs and infra proof documents. Mutable runtime facts must be re-verified before a later production action.

## Mandatory execution discipline

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

After timeout, frozen chat or tool failure, inspect real Git/runtime state before repeating any operation. A missing assistant response is not evidence that the prior operation failed.

## Capability authority

Wandora owns product/operator semantics, stable IDs, tenant authorization, policy, supervision, orchestration and provider-neutral contracts.

- **Paperclip** owns digital-employee organization/control-plane capability behind the Wandora Organization Adapter.
- **Mastra** supplies agent/workflow execution behind the Agent Runtime Adapter.
- **Evolution** supplies WhatsApp transport behind the Messaging Gateway.
- **Supabase** supplies identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- **Docker / Compose / Portainer / Traefik / Cloudflare** supply deployment/runtime/edge capability.

Before material new domain state, apply ADR 0036 Capability Authority / Reuse Gate. Do not recreate Paperclip agent lifecycle, hierarchy, tasks or assignment control plane merely because a local Wandora table would be convenient.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

**REAL:** login/session, explicit multi-organization selection, Team read, Work, Conversations, Canonical Confirmation V2, the controlled supervised WhatsApp loop, and the tenant-gated customer `Contratar Ana` contract/UI.

**PARTIAL / PLACEHOLDER:** dashboard/company/approval surfaces and digital-employee **activation/resume**. The first real MEDICSPRO hire is now live under ADR 0115; activation remains deliberately unavailable.

Customer hire is exposed only through the exact reviewed route `POST /api/v1/organizations/:organizationId/digital-employees`, normal human session authorization, tenant eligibility and Organization Adapter/Paperclip reconciliation. `Contratar` creates/returns a paused + supervised employee; it is not an activation capability.

Human Send and Gateway outbound remain separate effect capabilities and remain OFF.

## Organization Adapter — accepted V1 architecture

ADRs 0037–0050 establish the accepted catalog path:

```text
Wandora Organization Adapter
  -> private provider-neutral service contract
  -> frozen provider company target
  -> file-backed per-company HMAC custody
  -> signed private Paperclip webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
```

V1 is **catalog-only**. Arbitrary/custom employees and silent fallback to direct `agent-hires` remain out of scope.

Direct repeated `agent-hires` was proven non-idempotent and is not the selected V1 catalog path.

### Minimum Wandora-private state — LIVE FOR INTERNAL CANARY

Migration 010:

```text
infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

owns only minimum integration safety state:

1. organization → provider company binding;
2. digital employee → opaque provider-managed agent binding;
3. hire operation journal for idempotency, request hash, recovery and audit.

### Service contract boundary — LIVE FOR INTERNAL CANARY

Migration 011:

```text
infra/stacks/supabase/migrations/20260916_011_organization_adapter_service_contract_v1.sql
```

adds the reviewed internal catalog-hire service/runtime boundary with owner/admin authorization, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage to customer contracts.

Both migrations are live in production. Their exact canonical verifiers returned `ORGANIZATION_ADAPTER_STATE_V1_OK` and `ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_OK`; verifier proof rows rolled back.

## Secret custody — LIVE FOR INTERNAL CANARY

ADR 0041 selects mounted-file custody, not per-company HMAC environment variables and not database-held secret material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute custody directory. Raw company refs never become filesystem paths. The reader uses `O_NOFOLLOW` and rejects missing, empty, oversized or weak material.

Per-company Organization Adapter custody is live for the internal canary. Core uses the mounted-file boundary and Paperclip stores only its company-owned encrypted secret with plugin config referencing it by `secret_ref`. Raw material remains outside Git and business payloads.

## Composed proof / activation rehearsal — PROVEN, NON-PRODUCTION

PR #85 proved the composed disposable path:

```text
OrganizationAdapterService
  -> migrations 010/011
  -> operation reservation / frozen target
  -> file-backed per-company custody
  -> signed Paperclip client
  -> exact private HTTP contract
```

ADR 0042 / PR #87 proved the production-shaped activation order and failure/rollback behavior using disposable/candidate infrastructure.

ADR 0043 / PR #88 added candidate-only Core wiring. The base live Core remains Organization Adapter OFF unless a later explicit activation changes it. The candidate overlay requires database mode, exact private Paperclip webhook, read-only HMAC custody and migration-011 readiness. It adds no customer/browser/Platform Admin hiring route.

## Core candidate provenance — PROVEN, NOT RUNNING AT LAST LIVE CHECK

ADRs 0044–0048 established the build, staging and portable OCI provenance contract.

Corrected candidate application source:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

Post-merge private artifact proof:

```text
workflow_run        = 35198147447
artifact_id         = 10487136577
artifact_zip_sha256 = 2bf661160c5344c87ed4445e709dfdcdc95e067c4c049eb596f3a1835c6d02db
archive_sha256      = 3b7c65c30525fb3f2bb0674bbe81687570aae48f26b08ee80b8c6a33193a7d76
oci_config_digest   = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
oci_manifest_digest = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
```

Private host staging was:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Last verified candidate state:

```text
candidate tag   = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate VPS Id= sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
state           = STAGED + LOADED, NOT RUNNING
running count   = 0
```

Do not repeat `docker load` merely because a chat froze. Reconcile current image/container state first.

## Production Activation Preflight V1 — ADR 0049

ADR 0049 did **not** authorize activation. It proved recovery/readiness prerequisites and stopped on a missing production Paperclip plugin artifact.

Already-proven recovery evidence — do not repeat blindly:

```text
backup = /home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
backup_sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
RESTORE_COUNTS_MATCH = YES
POSTGRES_WANDORA_RESTORE_PROOF_OK
ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK
```

Last live runtime evidence from that preflight — **historical until re-verified**:

```text
wandora-core      = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy/private
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Human Send        = OFF
Gateway outbound  = OFF
migration 010 private tables = ABSENT
production Organization Adapter HMAC custody = ABSENT
production plugin/config = ABSENT
```

## Production Paperclip managed-plugin artifact — CANONICAL + LIVE FOR INTERNAL CANARY

ADR 0050 / PR #95 cleared ADR 0049's missing-artifact blocker.

Canonical source:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

Canonical package contract:

```text
package      = paperclip-plugin-wandora-organization-adapter@0.1.0
plugin id    = wandora.organization-adapter-v1
catalog key  = ana-commercial-v1
adapterType  = wandora_mastra
status       = paused
budget       = 0
Paperclip    = wandora/paperclip:v2026.831.1
source       = 65ec059bde30d98c92165b24a30a540800dd1f6f
plugin API   = 1
SDK source   = 1.0.0
```

The package embeds no Wandora execution URL, real secret, provider company identifier, API key or run JWT. `wandora_mastra` is only the stable future adapter identifier; execution-adapter promotion remains a separate gate.

Post-merge `main` proof:

```text
main                = f60715d042da4bbe4ac9068ea29dae2c986006bd
workflow_run        = 35266676646
artifact_id         = 10516662930
artifact_name       = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
artifact_zip_sha256 = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package             = paperclip-plugin-wandora-organization-adapter-0.1.0.tgz
package_sha256      = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

The dedicated CI proved strict typecheck, 5/5 signed-ingress tests, bundled SDK artifact shape, pinned native Paperclip manifest validation, two identical `npm pack` hashes, exact five-file tarball contents, forbidden proof/credential material absence and private artifact upload.

**Historical artifact blocker cleared by ADR 0050. Current live activation state is governed by ADR 0059 and the checkpoint below.**

## Operator Consoles + Paperclip Provider Prerequisites — LIVE, BOUNDED

ADRs 0051–0057 supersede older console/admin preflight notes.

Current proven operator surfaces:

```text
control.wandora.com.br -> Cloudflare Access -> Traefik -> control bridge -> private Paperclip
runtime.wandora.com.br -> Cloudflare Access -> Traefik -> isolated Mastra Studio
```

Origin TLS is valid and direct public-origin TCP/443 bypass was denied in the external probe.

Paperclip provider administration/current canary state:

```text
bootstrapStatus = ready
instance admin = established through explicit operator claim
provider companies = 1
provider company = Wandora Internal Supervised Proof
providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
owner/active membership = 1
wandora.organization-adapter-v1 = installed, ready
plugin company config = present
Paperclip Ana agents = 1
Paperclip managed resources = 1
```

The provider company maps only to the canonical internal Wandora supervised-proof organization. `Empresa Exemplo` deliberately still has no Paperclip company.

Migrations 010/011, control-plane binding and per-company custody are now live for this internal canary. Customer hiring remains absent.

## Production Activation Preflight V2 — COMPLETE, NO ACTIVATION

ADR 0057 closes the observation/plan preflight.

Revalidated evidence includes:

```text
backup sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
candidate = loaded, running count 0
live Core = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
Human Send = OFF
Gateway outbound = OFF
plugin artifact = available, unexpired
wandora.organization-adapter-v1 installed count = 0
```

The full future migration -> operator binding -> canonical plugin artifact -> per-company HMAC/secret_ref -> company config -> candidate Core -> internal canary order is frozen in ADR 0057.

**Preflight completion is not activation authorization.**

## Exact future migration boundary

A later activation may proceed only after a fresh preflight. If that preflight explicitly authorizes execution, database order remains fixed:

1. apply `20260916_010_organization_adapter_state_v1.sql`;
2. run `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop immediately on failure;
4. apply `20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop immediately on failure;
7. only then continue to separately reviewed plugin install/config, per-company HMAC custody and candidate Core activation.

Migration 010 being inert is not permission to apply it early. Migration 011 widens `wandora_core_runtime` capability and remains part of one attributable activation sequence.

## Residual unrelated secret / cleanup gap

A residual file exists from an aborted/future dedicated Paperclip database experiment:

```text
/opt/wandora/stacks/paperclip-db/secrets/postgres_password
```

It was not referenced by live Paperclip at the ADR 0049 preflight and is **not** an Organization Adapter HMAC. Do not reuse it as HMAC material and do not delete it merely as part of context recovery/activation. Cleanup is a separate reviewed operational concern.

## What remains explicitly NOT live / NOT approved

- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Paperclip → Wandora/Mastra execution-adapter production promotion;
- Human Send or Gateway outbound activation as part of Organization Adapter work;
- second/customer Paperclip provider-company provisioning.

## Second adversarial review after artifact promotion

Rejected shortcuts:

- treat the green artifact as permission to activate production immediately;
- install/configure the plugin before re-checking current live Paperclip/runtime state;
- apply migration 010 early merely because the artifact blocker is now gone;
- generate HMACs before the fresh preflight fixes the exact target/company/install composition;
- treat `wandora_mastra` as proof that the production execution adapter is installed;
- reuse the residual future `paperclip-db` PostgreSQL password as HMAC material;
- repeat backup, restore proof or candidate load just because prior chats froze.

## Production Activation Execution V1 — INTERNAL CANARY COMPLETE

ADR 0059 is the current activation authority/checkpoint.

```text
migration 010 = LIVE + verifier green
migration 011 = LIVE + verifier green

internal control-plane binding = exactly 1
Paperclip plugin = wandora.organization-adapter-v1@0.1.0, ready
Paperclip company config = present
Paperclip company secret reference = present, version 2
Paperclip private hostname allowlist includes wandora-paperclip

internal canary operation = completed
Wandora Ana = 1 active / supervised
Wandora provider binding = 1
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-key replay = same Wandora employee id
```

The first provider call failed closed with HTTP 403 because the Paperclip private hostname guard did not allow its Docker service hostname. PR #103 added only `PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip`, preserved the guard, and promoted the exact merged Compose. The existing `uncertain` operation was then retried with the same idempotency key and completed successfully.

Post-promotion runtime:

```text
live Core = wandora/core:organization-adapter-candidate-068d30a49d9b
live Core image id = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
live Core Organization Adapter = ON
live Core healthz/readyz = 200/200
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF

Paperclip = healthy/private/authenticated
Paperclip plugin = ready
Paperclip companies = 1
Paperclip Ana / managed resources = 1 / 1
Empresa Exemplo Paperclip company = absent
customer Contratar/Ativar = absent
```

ADR 0060 proves that no Core or Core-stack source changed after the candidate source revision, the promotion render had no residual delta beyond the candidate image + Organization Adapter config/mount, rollback was prepared before replacement, and a same-key replay through the live Core returned the existing Ana without duplication.

## Organization Adapter Live Cross-Company Isolation Execution V1 — COMPLETE

ADR 0062 closes the remaining live A/B isolation gate.

The execution deliberately used an ephemeral provider-only company B and never provisioned `Empresa Exemplo`.

Two setup attempts failed closed and were fully recovered before any retry:

1. verifier used the wrong Paperclip membership table name; official cleanup restored baseline;
2. preflight expected HTTP 422 for cross-company secret_ref rejection, while the live Paperclip route intentionally normalizes that internal error to HTTP 400; source review proved the exact mapping and official cleanup again restored baseline.

The final proof established:

```text
B owner membership = 1
B config / B secret_ref = valid
B agents / managed = 0 / 0

A secret_ref -> B config
  = HTTP 400
  = "Plugin config references a secret outside the selected company"
  = B config unchanged

A HMAC -> B target
  = HTTP 502
  = invalid_wandora_signature
  = B agents / managed still 0 / 0
```

Cleanup used the official Paperclip company API, then re-saved A's exact existing config JSON unchanged to recompute the worker configured-company scope to A-only.

Final independent state:

```text
Core / Paperclip = healthy / healthy
Organization Adapter = ON
Human Send = OFF
Gateway outbound = OFF

Wandora organizations = 2
control-plane bindings = 1
digital-employee provider bindings = 1
completed hire operations = 1
Empresa Exemplo Paperclip binding = 0

Paperclip companies = 1
ephemeral B = 0
plugin = ready
A config / secret / Ana / managed = 1 / 1 / 1 / 1
A secret_ref unchanged = true
fixture checkpoint = absent
```

The cross-company isolation gate is therefore **CLOSED**. No durable B provider state remains.

## Customer Digital-Employee Lifecycle Contract Preflight V1 — COMPLETE, NO CUSTOMER EFFECT

ADR 0063 defines the customer lifecycle boundary without enabling any customer mutation.

Accepted semantics:

```text
Contratar = materialize one supported catalog employee, stable/idempotent, paused + supervised
Ativar    = separate future execution permission; unavailable until production execution bridge + least-privilege resume contract are proven
```

No new lifecycle table is approved. Existing `wandora.digital_employees.status = paused|active` plus the existing Organization Adapter binding/hire journal are sufficient for V1 hire.

The existing Organization Adapter service already owns owner/admin authorization, tenant scope, idempotency, provider reconciliation and private binding. Customer first-time hire must change its local finalization from `active` to `paused`; completed hire replay must return the actual canonical `paused|active` state.

Paperclip independently confirms managed agents are provisioned paused and “require explicit activation.” Its plugin SDK exposes company-scoped `agents.resume`, but the live Wandora plugin does not request that capability and the Paperclip -> Wandora/Mastra execution bridge remains laboratory-only. Therefore customer activation remains blocked.

Provider company creation is lazy at first hire in product semantics, but must **not** be hidden inline inside the customer POST yet. Paperclip company creation is an instance-admin effect with no Wandora idempotency contract. The first `Empresa Exemplo` canary will therefore use a separately reviewed operator bootstrap prerequisite; general self-service requires a later bootstrap-automation contract.

The current public placeholder `/start` is not production-safe. Real V1 must be authenticated/tenant-bound, use the selected canonical organization, expose only `Ana / ana-commercial-v1`, remove fake company/WhatsApp/knowledge effects, explicitly confirm `Contratar Ana`, and redirect to canonical `Equipe`. No `Ativar` control is rendered yet.

Customer hire also requires its own disabled-by-default runtime gate. Organization Adapter ON does not imply customer hire ON.

## Customer Hire Contract Implementation V1 — COMPLETE, GATE OFF

ADR 0064 closes the code/CI implementation slice.

The customer POST and authenticated Ana-only `/start` experience now exist in code behind a dedicated disabled-by-default runtime gate. First-time hire finalizes `paused + supervised`; hire replay returns the same employee with its current canonical `paused|active` state. The exact Web bridge forwards Authorization + Idempotency-Key and keeps the generic API boundary closed.

Second adversarial review found an existing legacy Ana in `Empresa Exemplo` that is active/supervised but has no Paperclip provider binding and no proven catalog identity. Therefore automatic adoption by matching name/role is rejected. The adapter now fails closed with `catalog-conflict` before journal/provider effect when such a legacy collision exists.

`Empresa Exemplo` is **not eligible for a naive first-hire canary**. ADR 0064 supersedes that future-canary assumption from ADR 0063.

No production deployment or customer effect was authorized by this implementation slice. Customer Digital-Employee Hire remains OFF; Human Send and Gateway outbound remain OFF; customer activation remains unavailable.

## Customer Hire Canary Selection + Legacy Reconciliation Preflight V1 — COMPLETE

ADR 0065 selects a **fresh employee-free internal customer-like tenant** for the first paused-first customer hire canary and defers legacy `Empresa Exemplo` adoption.

Read-only production evidence showed:

- only two current organizations;
- the internal supervised-proof organization already has the completed catalog canary and cannot prove first-time hire;
- `Empresa Exemplo` has one legacy active/supervised Ana with no Paperclip binding and no catalog hire operation;
- no durable provisioning/audit evidence proves that legacy row is `ana-commercial-v1`;
- the current ADR 0030 tenant provisioner always creates one active supervised commercial-assistant employee, so it cannot create a clean paused-first hire tenant;
- `wandora_platform_provisioner` remains inert at `CONNECTION LIMIT 0` with no password;
- live Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

The selected future canary is:

```text
Wandora Customer Hire Canary
slug = wandora-customer-hire-canary
pre-hire digital employees = 0
```

ADR 0065 also requires the actual first production hire effect to run through a **private production-connected candidate Core** with the customer-hire gate ON. The normal live Core stays customer-hire OFF during that canary because the current gate is runtime-wide, not tenant-specific.

## Private Tenant Provisioning V2 — IMPLEMENTED IN CODE / NOT LIVE

ADR 0066 implements the employee-free private provisioning contract without changing V1 behavior.

The versioned migration is:

```text
infra/stacks/supabase/migrations/20260918_012_private_tenant_provisioning_v2.sql
```

Contract:

```text
wandora_private.provision_beta_organization_v2(...)
  -> organization
  -> canonical user / Supabase identity mapping
  -> active owner membership
  -> private idempotency evidence
  -> zero digital employees
```

V1 and V2 share the private provisioning ledger with an explicit version/row-shape invariant:

```text
V1 -> provisioning_version = 1 -> employee_id required
V2 -> provisioning_version = 2 -> employee_id absent
```

The V1 function signature and first-employee behavior remain unchanged. V2 is executable only by the dedicated `wandora_platform_provisioner`; browser/authenticated/Core roles remain denied and the provisioner still has no direct table access.

A dedicated Core CI harness applies migrations 001→012 in order, reapplies 012, proves V2 behavior, V1 regression compatibility, shared-key cross-version fail-closed behavior and the least-privilege boundary.

**Migration 012 is not applied to production by this implementation slice.** The future canary tenant and Paperclip company remain absent; Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Private Tenant Provisioning V2 — PRODUCTION MIGRATION PREFLIGHT COMPLETE / NOT LIVE

ADR 0067 closes the production migration preflight without applying migration 012.

Fresh read-only live evidence before the preflight showed:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent

V1 function                       = present
V2 function                       = absent
provisioning_version column       = absent
employee_id                       = NOT NULL
```

The current rollback snapshot is:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

Restore proof on disposable `supabase/postgres:17.6.1.136` reproduced the current production business/integration counts and confirmed V1 present / V2 absent.

The exact canonical migration 012 Git blob `f9b6eedaf56b967ce9b30fd9a0558fb4c4cd34e7` was then applied twice to a disposable restore of that snapshot. It preserved all current business rows, created V2 only for `wandora_platform_provisioner`, and remained denied to Core/authenticated. A migration-only reverse path also restored the exact pre-012 schema while the provisioning ledger remained empty.

**Migration 012 is still absent from production.** Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The canary tenant and Paperclip company remain absent.

## Private Tenant Provisioning V2 — LIVE / DORMANT

ADR 0068 records the successful production application of migration 012.

Production now has:

```text
wandora_private.provision_beta_organization_v1(...) = present
wandora_private.provision_beta_organization_v2(...) = present
tenant_provisioning_requests.provisioning_version  = present
tenant_provisioning_requests.employee_id           = nullable

wandora_platform_provisioner EXECUTE V2 = true
wandora_core_runtime EXECUTE V2          = false
authenticated EXECUTE V2                 = false
platform direct ledger SELECT            = false
platform provisioner password            = absent
```

Post-migration business/integration state remained unchanged:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent
```

The canonical live-safe verifier returned `PRIVATE_TENANT_PROVISIONING_V2_LIVE_OK`. Core/Web/Paperclip/Gateway remained healthy. Customer Digital-Employee Hire, Human Send and Gateway outbound remained OFF.

V2 is therefore a **live but dormant** operator capability. No tenant has yet been created through it.

## Customer Hire Canary — Employee-Free Tenant Provisioning Preflight V1 — COMPLETE, NO CANARY CREATED

ADR 0069 freezes the exact first V2 canary request and least-privilege execution path.

Current frozen request:

```text
request_key               = customer-hire-canary:tenant-v2:v1
organization_slug         = wandora-customer-hire-canary
organization_display_name = Wandora Customer Hire Canary
owner_user_id             = e1000000-0000-4000-8000-000000000001
owner subject             = runtime-resolved only; SHA-256 frozen in ADR 0069
```

The production execution path creates no reusable platform password:

```text
private supabase_admin maintenance session
  -> resolve/hash-gate existing owner identity
  -> BEGIN
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> provision_beta_organization_v2(...)
  -> COMMIT
  -> independent post-verification
```

The role-switch proof is green: the effective platform role can execute V2 and still cannot directly read the private provisioning ledger.

No redundant V2 rehearsal was run because ADR 0066/PR #111 already proves exact replay, changed-payload conflict, same-slug conflict, owner reuse and least privilege; ADRs 0067–0068 prove the exact current migration shape through disposable production restore and live application.

Production remains unchanged after this preflight: 2 organizations, 0 provisioning requests, canary absent, Customer Digital-Employee Hire OFF, Human Send OFF and Gateway outbound OFF.

## Customer Hire Canary — Employee-Free Tenant Provisioning Execution V1 — LIVE

ADR 0070 records the bounded V2 production execution.

Current durable state:

```text
organizations                       = 3
digital_employees total             = 3
tenant_provisioning_requests        = 1

Wandora Customer Hire Canary        = active
canary active owner memberships     = 1
canary digital employees            = 0
canary control-plane bindings       = 0
canary employee-provider bindings   = 0
canary hire operations              = 0
```

The provisioning row uses the frozen request key `customer-hire-canary:tenant-v2:v1`, `provisioning_version=2`, `employee_id=NULL`, and reuses the frozen canonical owner.

The least-privilege role remains passwordless with `CONNECTION LIMIT 0`.

Independent Paperclip API proof still reports exactly one provider company — `Wandora Internal Supervised Proof` — so the new canary has no Paperclip company yet.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The existing Organization Adapter internal canary bindings/operation remain unchanged at 1/1/1.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Preflight V1 — COMPLETE, NO PROVIDER MUTATION

ADR 0071 freezes the first provider-company bootstrap for the clean customer-hire canary.

Live Paperclip proof:

```text
commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
deployment          = authenticated / private
bootstrap           = ready
database backup     = enabled / ok
operator credential = board_key / isInstanceAdmin=true
companies           = 1
exact canary-name matches = 0
```

Frozen request:

```json
{"name":"Wandora Customer Hire Canary"}
```

Body SHA-256:

```text
e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe
```

Paperclip company creation has no idempotency key, company names are not unique, and the route is not externally atomic across company creation, owner membership/grants and audit. Therefore any lost/non-201 response after dispatch is treated as potentially effectful. Blind retry is forbidden; reconciliation against the frozen pre-call company baseline is mandatory.

The live health contract reports `companyDeletionEnabled=false`, so deletion is not assumed as normal rollback. Partial/orphan state stops the slice for separately reviewed recovery rather than direct SQL repair.

Production remains unchanged after preflight: Paperclip still has one company, the canary has zero employees/provider bindings/hire operations, and Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Execution V1 — LIVE

ADR 0072 records the one-shot provider bootstrap through the official Paperclip CLI/instance-admin boundary.

Current provider state:

```text
Paperclip companies total = 2

Wandora Internal Supervised Proof
  providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
  status = active

Wandora Customer Hire Canary
  providerCompanyRef = e7422a00-1474-49d5-ac32-34594520015e
  status = active
  owner membership = active
  agents = 0
  Organization Adapter config = absent
  company secrets = 0
```

The canary Wandora organization still has zero employees, zero provider bindings and zero hire operations. Existing internal integration totals remain 1/1/1.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Organization Adapter Custody + Config + Binding Preflight V1 — COMPLETE / EXECUTION BLOCKED

ADR 0073 freezes the production wiring contract without creating any new binding, secret or config.

Frozen pair:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e
provider              = paperclip
```

Future Core custody filename:

```text
paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

The accepted execution order is operator-owned Wandora binding → one protected HMAC file → one company-owned Paperclip `local_encrypted` secret → company-scoped plugin config **last** → independent validation. Core remains unable to INSERT the control-plane binding.

Secret creation and plugin-config responses are reconciled by readback after ambiguity; blind retry is forbidden. Plugin config is not treated as safely repeatable merely because its storage operation is an upsert.

The second adversarial review found a recovery blocker: live Paperclip database backups and `/paperclip/instances/default/secrets/master.key` are currently colocated on the same Docker volume, while Paperclip requires both database metadata and that master key to restore `local_encrypted` secrets. No independent external master-key recovery copy was found.

Therefore no second production `local_encrypted` HMAC is created yet.

## Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1 — COMPLETE / NO SNAPSHOT YET

ADR 0074 freezes the recovery gate required before creating another production `local_encrypted` secret.

Current facts:

```text
Paperclip image = wandora/paperclip:v2026.831.1
Paperclip commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
embedded PostgreSQL = 18
local_encrypted = healthy
live master.key mode = 0600
```

The accepted V1 recovery pair will live outside the Docker volume under a unique operator-owned mode-0700 directory in `/home/wandora-admin/backups/`, containing a fresh official Paperclip logical backup, byte-identical `master.key`, SHA256SUMS and a non-secret recovery manifest; artifact files are mode 0600.

The disposable proof reuses the exact pinned Paperclip image/runtime and `runDatabaseRestore()`, restores into fresh PG18 state with no public port/live volume, decrypts the existing internal Organization Adapter HMAC via `localEncryptedProvider.resolveVersion()`, and records only boolean/hash-match evidence. A deliberately wrong disposable key must fail decryption.

This V1 is same-host but out-of-Docker-volume recovery; it does not claim to solve total VPS/off-site disaster recovery.

No recovery snapshot was created in this preflight and no customer-hire wiring state changed.

## Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1 — GREEN

ADR 0075 records the completed recovery execution.

Retained protected snapshot:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260918T090456Z/
  paperclip-db.sql.gz
  master.key
  SHA256SUMS
  RECOVERY_MANIFEST.txt
```

Custody is `0700` on the directory and `0600` on artifacts. The fresh manual Paperclip backup and master key are byte-hash matched to their live sources.

Disposable proof:

```text
RESTORE_OK=true
LOCAL_ENCRYPTED_DECRYPT_OK=true
HMAC_HASH_MATCH=true
WRONG_KEY_DECRYPT_REJECTED=true
```

The restore target was the exact Paperclip embedded PostgreSQL 18 runtime. A local PostgreSQL 17.6 `psql` closure was used only as the dump client because the production Paperclip image does not bundle `psql`; no network, live provider volume or public port was used. Proof-only harness/image/state were removed.

Post-proof live validation is green: Paperclip/Core remained running with zero restarts, Organization Adapter is ready/healthy and `local_encrypted` remains `ok`.

The customer-hire canary remains at zero secrets/config/agents/binding/employees/hire operations.

The recovery blocker from ADR 0073 is therefore cleared. This snapshot is same-host/out-of-Docker-volume recovery only; off-host/VPS-loss recovery remains a separate infrastructure concern.

## Customer Hire Canary — Organization Adapter Custody + Config + Binding Execution V1 — GREEN

ADR 0076 records the completed production wiring.

Current canary control-plane state:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e

Wandora control-plane binding = exactly 1
Core deterministic HMAC file  = present / 0640 / readable
Paperclip company secret       = exactly 1 active local_encrypted
Paperclip plugin config        = exact secret_ref / lastError=null
secret usage                   = one required plugin hmacSecret binding
Paperclip canary agents        = 0
```

The Core HMAC file SHA-256 and Paperclip secret-version `value_sha256` / `fingerprint_sha256` are identical:

```text
eba4bdda5baf60b57368d1d4a83628f73551b3e8ad1a226f3c983b06154ecb60
```

Execution order matched ADR 0073: operator binding → HMAC custody → encrypted Paperclip secret → plugin config last.

The canary still has zero digital employees, zero digital-employee provider bindings and zero hire operations. Organization Adapter remains ON while Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Private Candidate Core Hire Execution V1 — GREEN

ADR 0078 records the first clean customer-like production hire through the real Human API + Organization Adapter contract.

Proven result:

```text
Wandora Customer Hire Canary
  digital employees = 1
  employee-provider bindings = 1
  hire operations = 1

Ana
  id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
  role = commercial-assistant
  status = paused
  autonomy = supervised

hire operation
  key = customer-hire-canary:ana-commercial-v1:v1
  catalog = ana-commercial-v1
  status = completed

Paperclip canary agents = 1
Paperclip Ana = paused / wandora_mastra
```

A real normal Supabase browser session for the existing owner passed candidate `GET /api/v1/me`; no service-role/admin impersonation was used. The first POST returned 200. Same-key replay and different-key/same-catalog replay both returned the same employee and independent readback remained exactly 1 employee / 1 provider binding / 1 hire operation / 1 Paperclip agent.

Customer response leakage checks remained negative for provider/secret fields.

Cleanup is complete:

```text
private hire candidate container = absent
ephemeral browser-session file = absent
temporary bearer helper = absent
candidate image = staged only / not running

normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The successful hire remains deliberately paused. `Contratar` is still separate from future `Ativar`.

## Customer Digital-Employee Hire — Public Rollout Preflight V1 — COMPLETE / NOT ACTIVATED

ADR 0079 closes the rollout design after the successful canary.

Key findings:

- PR #126 is merged and behaviorally proves browser idempotency survives reload and remains bound to the original organization across tenant switches;
- the live Web is still the older pre-rollout image and public customer hire remains OFF;
- the Core hire flag is process-wide while production has multiple active organizations in different readiness states;
- Core already fails closed for member/cross-tenant access, missing provider binding, matching legacy employee, catalog replay and ambiguous provider outcomes;
- Private Tenant Provisioning V2 intentionally creates no provider/control-plane wiring;
- a control-plane binding cannot double as customer eligibility because accepted wiring creates that binding before provider configuration is complete.

Decision:

```text
global runtime hire gate
AND
explicit Wandora-owned organization + catalog eligibility
=
customer hire available
```

The eligibility fact is provider-neutral and operator-owned. It is enabled only after wiring validation and is enforced server-side before journal/provider effects. No provider identifiers/configuration become customer state.

No production activation occurred.

## Customer Digital-Employee Hire — Tenant Eligibility Contract Implementation V1 — CODE/CI GREEN / NOT LIVE

ADR 0080 records the completed implementation on PR #128.

The contract now provides:

- private provider-neutral eligibility keyed by Wandora organization + catalog;
- dedicated `wandora_customer_hire_operator` NOLOGIN capability with controlled setter-only authority;
- Core tenant-scoped read-only eligibility access;
- eligibility enforcement before new journal/provider effects;
- original-key-only resume for unfinished hires;
- completed catalog dedupe independent of later eligibility disablement;
- provider-neutral customer read states: `available | already-hired | reconciliation-required | unavailable`;
- Web gating driven by the Core projection rather than owner/admin role alone;
- refresh/tenant-switch reconciliation that never invents a replacement idempotency key.

Final technical validation before the ADR/checkpoint was fully green:

```text
Core CI                 35342325894 = success
Web CI                  35342325859 = success
Platform Admin CI       35342325774 = success
Messaging Gateway CI    35342325740 = success
Core Candidate Artifact 35342325793 = success
```

Reviewed Core/Web candidate artifacts were produced as CI evidence only and were not promoted.

Production remains unchanged:

```text
migration 013                             = ABSENT
tenant/catalog eligibility rows           = none / contract not live
normal live Customer Digital-Employee Hire = OFF
Human Send                                = OFF
Gateway outbound                          = OFF
```

No live role grant, migration, candidate deployment, customer hire activation, employee activation or outbound effect occurred.

## Customer Digital-Employee Hire — Production Activation Preflight V2 — COMPLETE / NO EFFECT

ADR 0081 closes the production activation preflight after PR #128.

Current canonical Git/provenance:

```text
main = e438518bb52be8119883c4350295dac58cd70ef2
main tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
PR #128 reviewed merge-ref = af542864d267c0d186bae7272b208a4ee676f1cc
reviewed merge-ref tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
```

The selected Core/Web artifacts from the final PR validation are therefore accepted as current-main **tree-equivalent** candidates; no arbitrary rebuild is required merely because the squash commit identity differs.

Read-only production revalidation proves:

```text
migration 013 table / role / setter = ABSENT / ABSENT / ABSENT
normal Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
Core/Web/Paperclip/Gateway = healthy / 0 restarts
```

Tenant-by-tenant review found no active tenant that should receive a new `ana-commercial-v1` eligibility row now:

- Internal Supervised Proof already has a completed catalog operation and proof/employee state;
- Empresa Exemplo has a legacy active Ana and no Paperclip control-plane binding;
- Customer Hire Canary already has the completed paused-first catalog hire.

Paperclip readback independently shows one paused `wandora_mastra` Ana in each bound company (Internal Supervised Proof and Customer Hire Canary).

Future dormant-foundation order is frozen:

```text
fresh backup/rollback evidence
-> migration 013
-> read-only zero-row + authority postverify
-> global customer-hire gate still OFF
-> Core candidate
-> Core health/readiness/no-effect verification
-> Web candidate
-> Web fail-closed verification
-> STOP
```

Core precedes Web because the old Web safely ignores the additional Core `hire` field, while the new Web depends on that projection.

The future eligibility operator path does not create a new LOGIN: the protected local DB administration session uses transactional `SET LOCAL ROLE wandora_customer_hire_operator` and the controlled setter only. No persistent grant to an application/service account is authorized.

No migration, candidate deploy, eligibility row, global hire activation, employee activation or outbound effect occurred during this preflight.

## Customer Digital-Employee Hire — Dormant Production Foundation Activation V1 — LIVE / DORMANT

ADR 0082 makes the eligibility contract and reviewed customer Core/Web live without enabling any customer-hire effect.

Current production foundation:

```text
migration 013 table / setter / operator role = LIVE
wandora_customer_hire_operator = NOLOGIN / least privilege
eligibility rows = 0

Core = wandora/core:organization-adapter-candidate-af542864d267
Core health / ready / restarts = healthy / 200 / 0

Web = wandora/web:candidate-af542864d267
Web health / restarts = healthy / 0

Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The exact migration Git blob was hash-gated before execution. A fresh pre-migration custom-format backup is retained under `/home/wandora-admin/backups/customer-hire-foundation-20260918T123446Z/` with SHA-256 `9ab8ebc19342be406d1b505073b6dbddce3fd7314014ddac743c745d565ee423`.

Recovery proof restored the Wandora-owned `wandora` + `wandora_private` schemas into disposable PostgreSQL 17.6 and reproduced the exact pre-migration counts. The first broader Supabase-image restore attempts were explicitly rejected after disposable-only failures; production was never used as a restore target.

Migration 013 live postverify is read-only and proves zero rows, RLS, tenant-scoped Core SELECT, setter-only NOLOGIN operator authority, no platform-provisioner authority, and no browser/service-role authority.

The Core and Web promotion renders each differed from the previous live render only by their image line. Previous images and rollback records remain locally available.

Public Web route checks are green for `/healthz`, `/`, `/login`, `/team`, `/work`, `/conversations`, `/company` and `/start`.

Durable business/integration counts remained unchanged:

```text
organizations = 3
digital_employees = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
tenant_provisioning_requests = 1
```

No tenant eligibility, hire, employee activation, Paperclip mutation or outbound effect occurred.

## Customer Digital-Employee Hire — Global Runtime Gate Activation Preflight V1 — COMPLETE / OFF

ADR 0083 closes the process-wide gate preflight without recreating Core.

Current production remains:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Web  = wandora/web:candidate-af542864d267
Core/Web = healthy

migration 013 = LIVE
eligibility rows = 0
enabled eligibility rows = 0

Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The canonical gate overlay is only:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true
```

Its Git blob is `cf188f4e22651f318984f10a17aba3dee05ad2ea`. The file is not yet present in the live Core stack directory; a byte-identical copy exists only under the isolated preflight directory.

Rendered OFF vs ON Core composition differs by exactly that one environment variable:

```text
OFF render SHA-256 = 8f76c8dd872974de738109b2c0555e87dbbb9433782a5bcbf4ddec2c0e5e9408
ON  render SHA-256 = c3744b7c7319d8eed3bd6254d5cb6384f6ef643c9c2f6e4ceb2185898d5ee658
```

Active-tenant state proves zero new availability with the gate ON and zero eligibility rows:

- Internal Supervised Proof already has a completed `ana-commercial-v1` operation;
- Customer Hire Canary already has a completed `ana-commercial-v1` operation;
- Empresa Exemplo has no eligibility row and no Paperclip control binding.

The live hire journal also has exactly **0 unfinished operations** (`planned|creating|uncertain`) and 2 completed operations. This is a mandatory companion invariant to zero eligibility because an existing unfinished operation is intentionally reconciled before the eligibility check.

A disposable executable proof used the **same live Core image**, the accepted production-derived backup, canonical migration 013 and a synthetic fully wired owner tenant with no eligibility. With the hire path enabled only inside the harness:

```text
GET hire state = unavailable
available = false
POST = 404 employee-not-available
provider calls = 0
new operations/employees/employee-bindings = 0
```

The selected rollout order is **global gate first, tenant eligibility later**. Enabling eligibility first was rejected because it could leave latent tenants waiting behind a broad process switch.

Baseline live POST proof with the gate OFF returns `404 not-found` for a syntactically valid hire request and produces no durable delta.

## Customer Digital-Employee Hire — Global Runtime Gate Activation Execution V1 — LIVE / ZERO TENANT ELIGIBILITY

ADR 0084 enables only the process-wide customer-hire runtime gate on the already reviewed Core image.

Current production:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Core health / ready / restarts = healthy / 200 / 0

Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2

Human Send = OFF
Gateway outbound = OFF
```

The live overlay is the exact canonical Git blob `cf188f4e22651f318984f10a17aba3dee05ad2ea`. The Core recreation used the same reviewed image and differed only by `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true`.

The unauthenticated hire route now returns `401 unauthorized` instead of the prior structural `404 not-found`, with no durable delta.

The live compiled customer projection was executed read-only for all active organizations:

```text
Internal Supervised Proof -> already-hired / available=false
Customer Hire Canary      -> already-hired / available=false
Empresa Exemplo           -> unavailable / available=false
```

No active organization projects `available=true`.

Durable totals remain:

```text
organizations = 3
digital_employees = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
eligibility rows = 0
```

Rollback is config-only: omit the hire overlay and recreate the same Core image with the previous six overlays.

## Customer Digital-Employee Hire — First Tenant Eligibility Rollout Preflight V1 — COMPLETE / NO CURRENT TARGET

ADR 0085 closes the first tenant eligibility rollout preflight without enabling any tenant.

Current live safety state remains:

```text
Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

All three active organizations were re-reviewed:

- **Wandora Internal Supervised Proof** already has a completed `ana-commercial-v1` operation and projects `already-hired`;
- **Wandora Customer Hire Canary** already has a completed `ana-commercial-v1` operation and projects `already-hired`;
- **Empresa Exemplo** has a matching legacy active/supervised Ana and no Paperclip control-plane binding, so it remains `unavailable`.

The two Paperclip-bound companies each still have one paused `wandora_mastra` Ana, company-scoped Organization Adapter config with HMAC `secret_ref`, a healthy/ready plugin and deterministic Core HMAC custody at mode 0640 readable by Core.

The dedicated `wandora_customer_hire_operator` remains NOLOGIN and setter-only. Core remains read-only for eligibility; platform provisioner, browser roles and service role cannot execute the setter.

No current tenant qualifies for a first new `ana-commercial-v1` rollout. The exact future setter and rollback transaction are frozen in ADR 0085 for a separately reviewed clean target. The first activation must start from zero enabled rows and fail before commit unless exactly the reviewed target becomes the sole enabled organization+catalog pair.

The transaction is now concurrency-safe for the first rollout: a protected local `supabase_admin` session takes an EXCLUSIVE eligibility-table lock, proves zero enabled rows, narrows to `wandora_customer_hire_operator` only for the setter, then rechecks the sole target before commit. A two-session disposable race proved the second contender blocks and is rejected before creating its row; rollback returns to zero enabled rows.

No eligibility row, tenant, Paperclip resource, hire operation, employee activation or outbound effect was created by this preflight.

## Customer Digital-Employee Hire — Clean Tenant Rollout Candidate Preparation Preflight V1 — COMPLETE / OWNER ONBOARDING BLOCKER

ADR 0086 proves that no real clean customer target currently exists.

Current identity/tenant inventory:

```text
Supabase Auth users = 1
canonical Wandora users = 1
Wandora users without memberships = 0
active organizations = 3
Paperclip companies = 2
eligibility rows = 0
```

All existing organizations remain unsuitable for a first new `ana-commercial-v1` rollout: two already have completed exact-catalog hires and `Empresa Exemplo` has matching legacy Ana state with no Paperclip control binding.

The blocker is now explicit: **the first real customer owner identity does not exist yet**.

Supabase Auth live remains correctly closed to public signup, has e-mail/SMTP configured and exposes protected admin invite/generate-link routes. Private Tenant Provisioning V2 remains live and employee-free, but correctly requires an already-existing Supabase Auth subject.

The current Web remains login-only: password grant, refresh, logout and `/api/v1/me` bootstrap are implemented; invite acceptance, first-password setup, password recovery and onboarding UI are absent.

ADR 0086 selects invite-only beta onboarding and rejects creating another synthetic tenant under the existing internal owner, widening public signup, direct `auth.users` mutation, or placing Auth admin credentials in Web/Core.

No Auth user, invite, tenant, Paperclip company, provider binding, eligibility, employee or outbound effect was created by this preflight.

## Customer Owner Invite Acceptance + First Password Contract Implementation V1 — IMPLEMENTED / CODE+CI ONLY

ADR 0087 implements the normal invite-first-password browser contract against the exact live Auth family `supabase/gotrue:v2.196.0`.

The provider contract was proven from the pinned upstream source:

```text
admin invite verification = implicit flow
successful invite redirect = URL fragment with access/refresh + type=invite + sb marker
invited user without password = provider-generated temporary password
first-password update = authenticated PUT /auth/v1/user
```

Web now has a public `/accept-invite` route. A valid provider-issued invite session is staged separately under `wandora.auth.invite.v1`, the credential fragment is removed before React renders, and a SITE_URL-root invite fallback is canonicalized to the dedicated route. Unsupported Supabase Auth fragments fail closed.

The invited user's password is sent directly to Supabase Auth with the public publishable key plus that user's Bearer session. No Auth admin/service credential enters Web or normal Core. The staged invite session is not promoted to the normal `wandora.auth.session.v1` session until password update succeeds; tenant authorization still comes from the existing `/api/v1/me` bootstrap.

Web CI #291 / run 35392357787 proved:

```text
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
WANDORA_WEB_HUMAN_API_BRIDGE_V1_OK
```

The implementation is **not deployed**. The live Web remains `wandora/web:candidate-af542864d267`. No real invite, Auth user, customer tenant, Paperclip state or eligibility was created.

### Explicit residual gap

Invite verification consumes the one-time token and GoTrue assigns a random temporary password. Invite session material intentionally remains browser-session scoped. If the user closes the browser/tab after verification but before defining the password, the staged session is lost and the user does not know the temporary password.

Therefore the normal first-access path is implemented, but a real customer invitation is not yet operationally recoverable. Recovery must reuse Supabase Auth recovery semantics rather than inventing Wandora credential state.

## Customer Owner Interrupted Invite Recovery Contract Preflight V1 — COMPLETE / NO EFFECT

ADR 0088 closes the interrupted-invite recovery preflight against exact `supabase/auth@v2.196.0`.

The provider-native public `POST /recover` path is sufficient: unknown e-mails receive neutral `200 {}`; existing users receive provider-owned recovery tokens/e-mail; successful implicit verification consumes recovery token state and issues an authenticated `type=recovery` session. The recovery verification itself does not set a new password.

The selected future Web contract is a dedicated `/recover-access` request/callback/reset flow. Recovery sessions must be staged separately from invite and normal sessions, URL credentials removed before React render, and password definition must reuse ADR 0087's authenticated `GET /user -> PUT /user -> password grant` reconciliation before normal session promotion and `/api/v1/me` bootstrap.

No Wandora recovery-token table or generic Core Auth-recovery proxy is justified. Protected `/admin/generate_link type=recovery` remains operator-only emergency/diagnostic capability and is not the customer path.

Read-only production evidence remained:

```text
Auth users = 1
users with recovery_token = 0
users with recovery_sent_at = 0
recovery one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

Live GoTrue has SMTP configured, public signup disabled and the Wandora app origin allow-listed. CAPTCHA is currently unset/disabled. Provider rate/frequency limits exist, but ADR 0088 makes anti-abuse review (provider-native CAPTCHA and/or compatible edge protection) an explicit activation gate before the first real customer recovery.

No `/recover` or admin generate-link call was made. No invite/recovery e-mail or token was generated, no Auth user or tenant was created, no Web/Core/Auth deploy occurred, no provider wiring changed and no eligibility was enabled.

## Customer Owner Interrupted Invite Recovery Contract Implementation V1 — IMPLEMENTED / NOT LIVE

ADR 0089 + PR #137 implement the provider-native recovery contract selected by ADR 0088.

Web now has a public `/recover-access` journey. Without staged recovery state it submits a neutral provider-native `POST /auth/v1/recover` request using only the existing publishable browser key and `redirect_to=https://app.wandora.com.br/recover-access`. With a valid recovery callback it accepts only exact `sb + type=recovery + bearer + access/refresh + unexpired expires_at`, stores that state separately under `wandora.auth.recovery.v1`, removes provider credentials from the URL before React renders and reuses the hardened ADR 0087 password finalizer.

The adversarial review found and fixed an important dispatcher collision: the pre-existing invite handler would otherwise strip a valid recovery fragment before the recovery handler saw it. Invite now explicitly defers recovery callbacks and recovery explicitly defers invite callbacks; unsupported provider flows still fail closed.

Invite and recovery both finish through:

```text
authenticated GET /auth/v1/user
-> authenticated PUT /auth/v1/user
-> password grant with the chosen password
-> only then normal Wandora session + /api/v1/me
```

The recovery request completion UI is account-enumeration neutral. No Auth admin/service credential, Core recovery proxy, Wandora recovery-token table or `localStorage` recovery persistence was added.

The GitHub-hosted Web/Core/Platform Admin/Gateway workflows for the implementation head again failed before runner assignment with `steps=null`; they are not classified green. The accepted infrastructure exception was independently reproduced against the exact Web branch with the real pinned Dockerfile and a synthetic publishable key:

```text
TypeScript strict = green
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_OWNER_INTERRUPTED_INVITE_RECOVERY_V1_OK
WANDORA_WEB_SHARED_PASSWORD_FINALIZATION_V1_OK
WANDORA_WEB_DIGITAL_EMPLOYEE_HIRE_BRIDGE_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
Vite production build = green

isolated route smoke:
/healthz = 200
/recover-access = 200
/accept-invite = 200
/api/v1/not-reviewed = 404
```

The implementation remains **not deployed**. No real invite/recovery was requested or generated, no Auth user/tenant/provider state was created and eligibility remains unchanged. ADR 0088's anti-abuse gate remains mandatory because live CAPTCHA is still disabled.

## Customer Owner Invite + Recovery Production Activation Preflight V1 — COMPLETE / ACTIVATION BLOCKED

ADR 0090 closes the no-effect production activation preflight.

The application/Web source base entering this preflight is `main@5f135e9070380e28c64f244c8a7126644cfa793c`; PR #138 is documentation-only and does not change that application tree. The retained Web build context was hash-compared against all 34 `apps/web` files at that base and is byte-for-byte equivalent. PR #137 head -> merge also has no file delta.

A real-key, non-live Web candidate is staged locally:

```text
wandora/web:owner-access-candidate-5f135e90
manifest list = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

It was built with the existing public Supabase ANON/publishable key without emitting the key, passed strict TypeScript plus all invite/recovery/hire verifiers and Vite build, and passed isolated route smoke:

```text
publishable-key fingerprint = expected
/healthz = 200
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me without session = 401
```

The old ADR 0089 proof image used a synthetic publishable key and is not promotable. The current live Web also predates owner invite/recovery and is not the candidate.

Auth redirect/origin preflight is green: live SITE_URL is `https://app.wandora.com.br`, the allow-list covers `https://app.wandora.com.br/**`, public signup remains disabled, and an OPTIONS preflight to `/auth/v1/recover` from the Wandora app origin returns 200 with the exact allowed origin. No recovery POST was made.

Production activation is nevertheless **blocked** by anti-abuse:

- GoTrue CAPTCHA is not configured live;
- the current Web sends no CAPTCHA token, so enabling provider CAPTCHA now would break recovery;
- the public Supabase Traefik router has no recovery-specific rate limiter;
- Traefik HTTPS is public-bound and a direct-origin route exists, so forwarded Cloudflare client-IP headers are not accepted as a trusted local rate-limit identity without a proven Cloudflare-only origin boundary;
- the installed Cloudflare DNS token can read the zone but receives 403 on the HTTP rate-limit ruleset, so no compatible edge rule is currently provable.

No edge rule, Auth config, Web runtime or production service was changed.

The activation/rollback plan is frozen: after anti-abuse is separately proven, promote only the Web image; rollback restores `wandora/web:candidate-af542864d267`. Post-deploy checks must preserve Hire ON, eligibility 0, unfinished hires 0, Human Send OFF, Gateway outbound OFF, Auth signup disabled, and zero recovery-token/sent state until a separately authorized real recovery test.

## Customer Owner Recovery Edge Anti-Abuse Control Preflight V1 — COMPLETE / CREDENTIAL GATE

ADR 0091 closes the no-effect edge anti-abuse design against the real Cloudflare zone.

Read-only zone evidence:

```text
zone = wandora.com.br
status = active
plan = Free Website
```

The Free plan provides one zone-level rate-limiting rule, Path matching, IP counting, a 10-second counting window and 10-second mitigation. Method is not available in the Free rule expression, so the selected recovery guard intentionally counts both browser OPTIONS and POST traffic.

Selected V1 rule:

```text
ref = wandora_owner_recovery_burst_guard_v1
phase = http_ratelimit
path = /auth/v1/recover
action = block
characteristics = cf.colo.id + ip.src
requests = 6
period = 10 seconds
mitigation = 10 seconds
```

The threshold accounts for one browser recovery attempt potentially consuming both an OPTIONS preflight and POST. It is combined with GoTrue's existing provider-side recovery/OTP and SMTP frequency controls.

The current Traefik DNS token remains intentionally insufficient for WAF: it can read the zone but receives 403 reading the `http_ratelimit` entry point. Only the DNS token is evident on the VPS. ADR 0091 rejects widening that credential; future execution requires a separate zone-scoped WAF token.

ADR 0090's local-origin evidence was refined: a loopback Traefik route does not prove public bypass. A new direct-origin attempt from the independent authorized `28server` timed out before TCP/TLS establishment, while the normal Cloudflare hostname remains reachable. Exact UFW rules remain unreadable without interactive sudo, so the execution contract must reprove the external direct-origin negative rather than claiming a fully enumerated firewall allow-list.

The future activation proof is effect-free with respect to Auth: after creating the edge rule in its own later slice, validate the limiter using only repeated OPTIONS requests. No `POST /recover` is needed. Because Cloudflare rate limiting can have short enforcement delay and per-data-center counters, validation requires a bounded burst to trigger, not an exact request ordinal.

No Cloudflare rule, Auth config, Web runtime, tenant/provider state or eligibility changed during this preflight.

## Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 — BLOCKED PRE-MUTATION

ADR 0092 records an explicit operator credential/custody gate before any Cloudflare mutation.

Observed host custody:

```text
existing DNS token:
  /opt/wandora/data/traefik/secrets/cloudflare_dns_api_token
  owner root:wandora-ops
  mode 0640

dedicated WAF custody:
  /opt/wandora/data/cloudflare/secrets/
  absent

/opt/wandora/data = root-owned
wandora-admin noninteractive sudo = unavailable
```

No alternate WAF/Rulesets token exists. The DNS token remains intentionally insufficient and must not be widened.

The required operator action is to issue a separate Cloudflare token scoped only to `wandora.com.br` with Zone Read + Zone WAF Read/Edit (or current UI-equivalent Write), then install it as:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
```

No Cloudflare rule, Web/Auth runtime, recovery/invite, tenant/provider state or eligibility changed. After the token is securely installed, resume the same execution slice at ruleset read/snapshot; stop if the Free-plan slot is already occupied.

## Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 — COMPLETE

ADR 0093 closes the Cloudflare edge activation.

The dedicated WAF credential is stored at:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
size = 53 bytes
```

The existing DNS token was not widened.

Immediately before mutation, Cloudflare returned `404 / 10003` for the zone `http_ratelimit` entry point, proving no rate-limit ruleset existed.

The created and read-back rule is exactly:

```text
ruleset id = 56c46388452f4328b27a6e6bf5f55cc8
rule id = 77758d45428d43fa8c8810569579f90f
ref = wandora_owner_recovery_burst_guard_v1
path = /auth/v1/recover
action = block
characteristics = cf.colo.id + ip.src
period = 10 seconds
requests = 6
mitigation = 10 seconds
exact match = true
```

OPTIONS-only validation from independent `28server` proved the edge control without generating recovery state:

```text
baseline OPTIONS = 200
bounded burst = multiple 429 responses
after 12 seconds = 200

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
```

The direct-origin TCP check from `28server` still timed out on port 443, so no new external origin bypass became reachable.

The owner-access Web candidate remains staged but not running:

```text
wandora/web:owner-access-candidate-5f135e90
sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

Live Web remains `wandora/web:candidate-af542864d267`.

No invite/recovery, tenant/provider state, eligibility, Human Send or Gateway outbound effect occurred.

## Customer Owner Invite + Recovery Web Production Activation Execution V1 — COMPLETE

ADR 0094 closes the owner-access Web production promotion.

Source provenance remained exact: no `apps/web/` file changed between the proven candidate source base and current main.

Production now runs:

```text
WANDORA_WEB_IMAGE=wandora/web:owner-access-candidate-5f135e90
image id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
wandora-web = healthy
restarts = 0
```

Only `wandora-web` was recreated. Core/Auth/Gateway/Cloudflare configuration were not changed in this deployment transaction.

External validation:

```text
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me unauthenticated = 401
recovery OPTIONS = 200
direct-origin TCP:443 = timeout / unreachable
```

Post-deploy safety state:

```text
Auth signup disabled = true
Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

Rollback is image-only to `wandora/web:candidate-af542864d267`.

No real invite/recovery was generated or sent.

## Customer Owner First Real Access End-to-End Validation Preflight V1 — COMPLETE / BLOCKED BEFORE INVITE

ADR 0095 closes the no-effect first-real-access preflight.

Current live owner-access foundation remains green:

```text
Web = wandora/web:owner-access-candidate-5f135e90 / healthy
Core/Auth/Gateway = healthy
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me unauthenticated = 401

Cloudflare recovery guard:
  exact /auth/v1/recover
  6 requests / 10 seconds / IP
  block 10 seconds
```

No-effect durable state remains:

```text
Auth users = 1
recovery_sent rows = 0
recovery_token rows = 0
Auth one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

The preflight found a real production blocker that earlier “SMTP configured” checks did not prove away. Live GoTrue points at:

```text
GOTRUE_SMTP_HOST = supabase-mail
GOTRUE_SMTP_PORT = 2500
```

but `supabase-mail` does not resolve from the Auth container, TCP probing returns `bad address`, and the live Supabase Compose service inventory contains no mail service. Those values are the same development/default values present in `.env.example`, not an operational transactional relay.

The target gate also remains real: the only existing Auth/Wandora owner is already linked to the three legacy/canary/internal organizations. ADR 0086 still forbids creating another synthetic tenant merely to advance rollout. None of Empresa Exemplo, Customer Hire Canary or Internal Supervised Proof is repurposed as the first real customer.

Decision:

- do not send the first invite yet;
- keep Supabase Auth as invite/password/recovery authority;
- first fix/prove transactional SMTP in a separate slice;
- later freeze one genuinely new owner mailbox + real customer organization;
- primary first proof is the normal `/accept-invite -> first password -> password grant -> /api/v1/me` path;
- `/recover-access` is contingency for an actual interruption, not something to force during the first happy-path proof;
- keep Paperclip bootstrap, provider wiring, eligibility and hiring outside the owner-access proof.

No invite/recovery, Auth user, tenant, Paperclip resource, eligibility or outbound effect occurred.

## Customer Owner Transactional E-mail Delivery Foundation Preflight V1 — COMPLETE

ADR 0096 closes the no-effect SMTP foundation preflight.

Decision:

```text
provider        = Resend SMTP
sending domain  = notify.wandora.com.br
sending region  = sa-east-1
from             = Wandora <acesso@notify.wandora.com.br>
smtp host/port   = smtp.resend.com:587 / STARTTLS
credential       = sending-only key restricted to notify.wandora.com.br
custody          = Docker secret file, never Supabase .env/Git
```

The live Auth container resolved and reached the selected SMTP endpoint and observed STARTTLS without authenticating or issuing MAIL/RCPT/DATA. The selected sender-domain DNS names are currently unused; `mail.wandora.com.br` was rejected because it already resolves to the VPS.

The secret-file compose design was adversarially tested with synthetic material. A naive override was rejected because it retained the password environment key and allowed Compose-time dollar interpolation. The accepted design removes `GOTRUE_SMTP_PASS` from the versioned environment mapping, mounts a dedicated secret and reads it only inside the container immediately before `exec /usr/local/bin/auth`.

No Resend account/domain/key was created, no DNS record changed, no GoTrue configuration changed and no invite, recovery or test e-mail was sent. No Auth user, tenant, provider binding or eligibility state was created. Human Send and Gateway outbound remain OFF.

## Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1 — COMPLETE

ADR 0097 executes ADR 0096 Phase A and makes the external delivery foundation real without activating Auth SMTP.

Live provider foundation:

```text
Resend domain = notify.wandora.com.br / verified
region        = sa-east-1
DKIM          = published + verified
sending CNAME = rsend.notify + send.notify / DNS-only / verified
DMARC         = _dmarc.notify / v=DMARC1; p=none;
credential    = dedicated sending-only/domain-scoped operator key
custody       = /opt/wandora/data/supabase/secrets/gotrue_smtp_pass
               root:wandora-ops / 0640
```

Independent VPS read-back observed the provider DNS and exact DMARC value. Secret-structure/leak checks proved a nonempty 36-byte Resend credential with no trailing newline and no exact-value match in shell history, Supabase `.env`, Compose text or live Web/Core/Gateway/Auth service environments.

A STARTTLS SMTP authentication proof returned `235` and immediately `QUIT 221` with no `MAIL FROM`, `RCPT TO` or `DATA`.

Live GoTrue was deliberately not changed and still uses:

```text
GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

No invite, recovery or test e-mail was sent. No Auth/Core/Web/Gateway service was recreated. Human Send and Gateway outbound remain OFF.

## Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1 — COMPLETE

ADR 0098 closes the no-effect activation preflight and versions the exact Auth-only startup candidate.

The adversarial proof found that local Docker Compose file-backed secrets preserve host permissions and explicitly ignore secret long-syntax `uid/gid/mode`. Therefore the protected `root:wandora-ops/0640` credential is not readable directly by the image's non-root `supabase` user.

The accepted candidate does **not** weaken custody. It resets the inherited container password mapping, mounts the secret only into Auth, uses a minimal root startup shell to read it, and immediately `exec su -p` drops the final GoTrue PID 1 back to UID/GID 1000 before `/usr/local/bin/auth` runs. Disposable no-network proof verified the drop and showed no resident root parent.

A protected rollback snapshot exists at:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-preflight-v1-20260919T012450Z
```

It contains byte-identical live base/overlay copies, exactly the six prior SMTP_* values under mode 0600, hashes and Auth identity metadata. Values are operator-secret material and must never be printed.

The exact candidate was rendered with future non-secret SMTP settings and the real Resend secret did not appear. A Docker Compose dry-run proposed only:

```text
supabase-auth Recreate -> Recreated -> Starting -> Started
```

The future `.env` keeps `SMTP_PASS=` intentionally empty only to satisfy upstream interpolation; the real credential remains file-only.

Live production remains unchanged:

```text
GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

No Auth service recreation occurred and no invite, recovery or test e-mail was sent.

## Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1 — COMPLETE

ADR 0099 executes the exact ADR 0098 activation contract in production.

Pre-execution drift checks matched the frozen evidence byte-for-byte. The canonical overlay was materialized at:

```text
2d35d6ea292c0749d4edb3654cec007a6e5ffc6086d8f44516e53742abfaa280
```

A fresh protected execution snapshot was created at:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-execution-v1-20260919T013658Z
```

The live non-secret SMTP source is now:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=
SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
SMTP_SENDER_NAME=Wandora
```

The actual SMTP credential remains only in the reviewed file secret. The live render proved the real secret absent, `GOTRUE_SMTP_PASS` absent from container `Config.Env`, and only Auth mounting the secret. The dry-run again proposed only the Auth recreation.

The approved command recreated **only** `supabase-auth`. DB, Web, Core, Gateway and Paperclip container identities remained unchanged.

Live Auth is now:

```text
image              = supabase/gotrue:v2.196.0
health             = healthy
restarts           = 0
PID 1 UID          = 1000
SMTP host/port     = smtp.resend.com:587
SMTP user          = resend
sender             = Wandora <acesso@notify.wandora.com.br>
```

An SMTP dialogue from the recreated Auth namespace resolved the relay, received the normal `220` greeting, advertised `AUTH PLAIN LOGIN` and `STARTTLS`, and returned `220 Ready to start TLS`. No AUTH, MAIL FROM, RCPT TO or DATA was issued by this activation slice.

Post-activation no-effect proof:

```text
auth_users          = 1
recovery_sent       = 0
recovery_token      = 0
one_time_tokens     = 0

eligibility_rows    = 0
eligibility_enabled = 0
unfinished_hires    = 0

Customer Digital-Employee Hire = ON
Human Send                     = absent / OFF
Gateway outbound               = absent / OFF
```

Auth, DB, Web, Core, Gateway and Paperclip all remain healthy with zero restarts. No invite, recovery or test e-mail was sent and no customer/business state was created.

## Customer Owner First Real Invite Execution V1 — COMPLETE

ADR 0101 sent exactly one real Supabase Auth invite to the explicitly authorized genuine new owner target. The target address remains intentionally absent from Git.

## Customer Owner First Invite Acceptance + First Password Validation V1 — COMPLETE

ADR 0102 closes the first real owner authentication path.

Production evidence proves:

```text
Auth user confirmed           = yes
first password present        = yes
invite one-time token         = consumed / 0 rows
confirmed_at                  = 2026-09-19 02:10:52 UTC
fresh normal last_sign_in_at  = 2026-09-19 02:12:14 UTC
active Auth sessions          = 1
latest session created        = 2026-09-19 02:12:14 UTC
target Wandora identity rows  = 0
target membership rows        = 0
eligibility rows              = 0
eligibility enabled           = 0
```

The recipient explicitly signed out and logged in again with e-mail + the newly created password. Current Web code reaches `/api/v1/me` only after a successful Supabase password grant; the observed “Conta ainda não vinculada” state is the canonical `403 unlinked` result for a valid Auth identity that has no Wandora organization membership yet.

Therefore invite acceptance, first password, normal repeat login and authenticated bootstrap are proven. No tenant or eligibility effect was created.

Read-only readiness for the next slice also reconfirmed:

```text
organizations                 = 3
tenant provisioning requests  = 1
Private Tenant Provisioning V2= present
platform provisioner EXECUTE  = true
Core EXECUTE V2               = false
authenticated EXECUTE V2      = false
platform provisioner password = absent
platform provisioner connlimit= 0
eligibility rows/enabled      = 0 / 0
unfinished hires              = 0
```

## Customer Owner First Real Tenant Access Validation V1 — COMPLETE

ADR 0105 proves the first genuine owner customer session after ADR 0104.

Human-visible proof:

```text
organization = MEDICSPRO
user = Alessandro Aranha
customer surface = Trabalho
state = Nada aguardando sua atenção
```

Fresh login/API evidence:

```text
/api/v1/me                   = 200
work attention read          = 200
digital-employees/team read  = 200
conversations read           = 200
```

An earlier request from an already-open `/approvals` navigation returned a transient 503 before recovering to 200. The actual fresh `/login` bootstrap returned 200 and subsequent tenant reads remained 200.

Independent canonical reconciliation:

```text
target Auth rows                    = 1
target confirmed/signed-in          = 1 / 1
target Wandora mapping rows         = 1
MEDICSPRO active orgs               = 1
MEDICSPRO active owner memberships  = 1
MEDICSPRO employees                 = 0
MEDICSPRO control bindings          = 0
MEDICSPRO employee bindings         = 0
MEDICSPRO eligibility               = 0
unfinished hires                    = 0
```

No customer token/password was shared or extracted. No privileged JWT impersonation was used. No Paperclip/provider, eligibility, hire or outbound mutation occurred.

## Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1 — COMPLETE

ADR 0106 reuses the already-proven canary Paperclip company-bootstrap contract for the real MEDICSPRO tenant without creating provider state.

Fresh read-only evidence:

```text
main entering preflight              = 6865551b5c841234714834cc37b904d52eb13768
open PRs                             = 0
Paperclip image                      = wandora/paperclip:v2026.831.1
Paperclip source commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
Paperclip health                     = ok
deployment                           = authenticated / private
bootstrapStatus                      = ready
database backup                      = enabled / ok
Board credential isInstanceAdmin     = true
Paperclip companies                  = 2
Paperclip MEDICSPRO exact matches    = 0

MEDICSPRO active org                 = 1
MEDICSPRO digital employees          = 0
MEDICSPRO control bindings           = 0
MEDICSPRO employee bindings          = 0
MEDICSPRO hire operations            = 0
MEDICSPRO eligibility                = 0
unfinished hires total               = 0
eligibility rows/enabled             = 0 / 0
```

The exact future provider payload is:

```json
{"name":"MEDICSPRO"}
```

with SHA-256:

```text
6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b
```

The protected auth store is valid only when the CLI explicitly targets its matching private API base. A read-only call without the matching API base returned 401 before any effect; adding `--api-base http://127.0.0.1:3100` resolved the expected Board identity and exact two-company baseline. The future execution must not rely on CLI default API-base selection.

Provider create remains non-idempotent. After dispatch, timeout/reset/unreadable response/non-201/interruption are potentially effectful and must be reconciled through provider reads. No blind retry, direct SQL repair or second company is allowed.

This preflight created no Paperclip company, Organization Adapter HMAC/secret/config, Wandora provider binding, eligibility, employee or hire operation. Customer Hire remains globally ON but MEDICSPRO eligibility remains zero; Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1 — COMPLETE

ADR 0107 executed the exact ADR 0106 provider request once and stopped before any Organization Adapter wiring or customer-hire effect.

Provider result:

```text
Paperclip companies total       = 3
MEDICSPRO exact matches         = 1
MEDICSPRO provider company id   = a63f27a8-dbac-4552-a456-b3a21302226b
MEDICSPRO status                = active
Board MEDICSPRO membership      = owner / active
MEDICSPRO agents                = 0
MEDICSPRO company secrets       = 0
MEDICSPRO plugin config         = null
```

The exact payload was `{"name":"MEDICSPRO"}` and its pre-dispatch SHA-256 again matched `6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b`. The installed non-TTY CLI path was re-read before dispatch and confirmed one `POST /api/companies` with interactive auth recovery disabled.

Independent Wandora/no-effect proof:

```text
MEDICSPRO digital employees      = 0
MEDICSPRO control bindings       = 0
MEDICSPRO employee bindings      = 0
MEDICSPRO hire operations        = 0
MEDICSPRO eligibility            = 0

control bindings total           = 2
employee bindings total          = 2
hire operations total            = 2
unfinished hires total           = 0
eligibility rows/enabled         = 0 / 0
```

Future deterministic HMAC path seed:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e
```

The matching host HMAC file is absent. Auth, DB, Web, Core, Paperclip and Messaging Gateway remain healthy. Organization Adapter and global Customer Hire remain ON, but MEDICSPRO remains ineligible; Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1 — COMPLETE / EXECUTION BLOCKED

ADR 0108 revalidated the exact real-tenant wiring boundary without creating it.

```text
Wandora organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Paperclip company     = a63f27a8-dbac-4552-a456-b3a21302226b
MEDICSPRO agents      = 0
MEDICSPRO secrets     = 0
MEDICSPRO plugin cfg  = null

MEDICSPRO control bindings   = 0
MEDICSPRO employee bindings  = 0
MEDICSPRO hire operations    = 0
MEDICSPRO eligibility        = 0 / 0 enabled
```

The deterministic future Core custody target remains absent:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e

paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac
exists = false
```

Binding authority is unchanged: `supabase_admin` may INSERT the private mapping, while `wandora_core_runtime` may SELECT but not INSERT. Future execution remains operator-owned and uses one exact INSERT without UPSERT.

The Organization Adapter plugin is `wandora.organization-adapter-v1@0.1.0`, ready/healthy. `local_encrypted` is healthy and the protected ADR 0075 master-key copy still matches the live key.

The second adversarial review found the retained recovery DB is stale relative to current Paperclip state:

```text
protected recovery snapshot = paperclip-local-encrypted-20260918T090456Z
snapshot hashes             = green
snapshot master.key         = matches live
canary company in snapshot  = yes
canary live HMAC secret     = absent from snapshot
MEDICSPRO company           = absent from snapshot
```

The only newer logical backups are still inside the Paperclip Docker volume; the newest observed preflight backup (`paperclip-20260919-030454.sql.gz`) predates the MEDICSPRO company creation at 03:23:39 UTC.

Therefore the recovery mechanism remains proven, but the retained out-of-volume DB+key pair does not represent current state. Wiring execution is blocked until a fresh current-state pair is created and proven using ADRs 0074–0075.

Future wiring order remains:

```text
current-state recovery refresh
-> exact operator-owned Wandora control binding
-> one protected deterministic-path Core HMAC
-> one company-owned Paperclip local_encrypted secret
-> company-scoped secret_ref plugin config LAST
-> independent validation
```

No HMAC, Paperclip secret/config, Wandora binding, eligibility or employee was created by ADR 0108. Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1 — COMPLETE

ADR 0109 clears ADR 0108's recovery blocker.

Exactly one fresh official Paperclip manual backup was created:

```text
source backup = paperclip-20260919-034717.sql.gz
size          = 334736 bytes
trigger       = manual
started       = 2026-09-19T03:47:17.080Z
finished      = 2026-09-19T03:47:18.896Z
```

The current-state protected pair now exists at:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T034717Z/
```

with directory `0700`, files `0600`, byte-identical source/copy hashes and green gzip validation. The previous ADR 0075 snapshot remains retained and green.

The fresh backup contains the live canary HMAC secret/config state and the real MEDICSPRO company. An isolated no-network PostgreSQL 18 restore using Paperclip's own restore/decrypt code proved:

```text
RESTORE_OK                  = true
MEDICSPRO_COMPANY_PRESENT   = true
CANARY_CONFIG_PRESENT       = true
LOCAL_ENCRYPTED_DECRYPT_OK  = true
HMAC_HASH_MATCH             = true
WRONG_KEY_DECRYPT_REJECTED  = true
```

No secret plaintext was emitted. The PostgreSQL 17.6 helper was client-only; the restore server remained embedded PostgreSQL 18.

All proof-only container/image/harness state was removed.

Post-refresh MEDICSPRO remains intentionally unwired:

```text
employees                  = 0
control bindings           = 0
employee provider bindings = 0
hire operations            = 0
eligibility                = 0 / 0 enabled
HMAC file                  = absent
Paperclip agents           = 0
Paperclip company secrets  = 0
Paperclip plugin config    = null
unfinished hires total     = 0
```

Auth, DB, Web, Core, Paperclip and Messaging Gateway remain healthy with zero restarts. Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1 — COMPLETE

ADR 0110 makes the real MEDICSPRO control-plane wiring live.

```text
Wandora control binding     = exactly 1
Core deterministic HMAC    = present / 0640 / readable
Paperclip company secret    = exactly 1 active local_encrypted
Paperclip plugin config     = exact secret_ref / lastError=null
secret referenceCount       = 1
Paperclip agents            = 0

MEDICSPRO employees         = 0
employee provider bindings  = 0
hire operations             = 0
eligibility                 = 0 / 0 enabled
```

The adversarial review caught that the first generated HMAC, while strong and correctly shaped, did not literally satisfy ADR 0108's full 32-random-byte contract. Before closure and while MEDICSPRO remained ineligible/employee-free, the same Paperclip secret was rotated to a Node `crypto.randomBytes(32)` value. Provider version 1 is now `previous`; version 2 is `current`.

Hash-only proof shows the final Core HMAC, Paperclip version-2 `value_sha256` and `fingerprint_sha256` are identical:

```text
020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8
```

The single secret usage is the Organization Adapter plugin's required `hmacSecret` binding with `versionSelector=latest`. Temporary rotation/staging files were removed, the ADR 0109 recovery pair remains hash-green, all relevant runtimes remain healthy with zero restarts, and Human Send/Gateway outbound remain OFF.

## Customer Owner First Real Tenant Eligibility Rollout Preflight V1 — COMPLETE

ADR 0111 accepts MEDICSPRO as the first real `ana-commercial-v1` eligibility rollout target without enabling it.

```text
active real owner path       = 1
MEDICSPRO employees          = 0
matching legacy Ana          = 0
control binding              = 1
employee provider bindings   = 0
ana-commercial-v1 hire ops   = 0
Paperclip agents             = 0
Paperclip secret/config      = exact / healthy
Core HMAC ↔ secret hash      = match

target eligibility rows      = 0
global eligibility rows      = 0
enabled eligibility rows     = 0
```

The dedicated `wandora_customer_hire_operator` remains NOLOGIN/least-privilege and is the only role with setter execution. A production no-effect rehearsal proved `supabase_admin -> BEGIN -> EXCLUSIVE LOCK -> zero-enabled check -> SET LOCAL ROLE -> RESET ROLE -> ROLLBACK`, ending with zero rows.

No eligibility, employee, hire, provider-agent or outbound effect occurred.

## Customer Owner First Real Tenant Eligibility Rollout Execution V1 — COMPLETE

ADR 0112 executed exactly the frozen serialized operator transaction for MEDICSPRO + `ana-commercial-v1`.

```text
eligibility rows/enabled      = 1 / 1
enabled target                = MEDICSPRO + ana-commercial-v1
MEDICSPRO employees           = 0
employee provider bindings    = 0
MEDICSPRO hire operations     = 0
unfinished hires              = 0
Paperclip agents              = 0
Organization Adapter          = unchanged / ready
Human Send                    = OFF
Gateway outbound              = OFF
```

The setter ran only under `SET LOCAL ROLE wandora_customer_hire_operator` inside the ADR 0111 exclusive-lock transaction. The postcondition assertions passed before COMMIT, then an independent connection and Paperclip read proved that eligibility alone created no employee/provider/outbound effect.

## Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1 — COMPLETE

ADR 0114 revalidates the first real MEDICSPRO hire boundary after eligibility became live.

Fresh production evidence:

```text
MEDICSPRO active owner path       = 1
MEDICSPRO eligibility            = 1 enabled
MEDICSPRO control binding        = 1
MEDICSPRO employees              = 0
employee-provider bindings       = 0
MEDICSPRO hire operations        = 0
global unfinished hires          = 0
MEDICSPRO Paperclip agents       = 0
Human Send                       = OFF
Gateway outbound                 = OFF
```

The running Core image's packaged JS was inspected rather than trusting its OCI revision label alone and contains the tenant-eligibility/reconciliation contract. A no-effect call through the actual live Core read service against the live database projects MEDICSPRO as:

```json
{"itemCount":0,"hire":{"catalogKey":"ana-commercial-v1","available":true,"state":"available"}}
```

The deployed Web has no `apps/web/` delta from its source revision to current main. It persists one organization-scoped UUIDv4 idempotency key in session storage before the canonical POST, retains it on ambiguous outcome and clears it only after validated success. The customer route remains normal human session -> active owner/admin -> eligibility -> collision/binding checks -> one durable hire operation -> Paperclip reconciliation -> paused/supervised finalization.

Capability Reuse Gate passes with no new domain code: Paperclip remains the employee control-plane authority behind the existing Organization Adapter; Wandora keeps only policy, stable projection, binding and idempotency/reconciliation state.

A fresh normal owner browser session is deliberately an execution-time pre-dispatch gate. No bearer token was extracted or manufactured during preflight.

## Customer Owner First Real Tenant Digital-Employee Hire Execution V1 — COMPLETE

ADR 0115 records the first genuine MEDICSPRO owner hire through the normal customer browser contract.

```text
MEDICSPRO Ana                       = exactly 1
status / autonomy                   = paused / supervised
employee-provider bindings          = exactly 1
ana-commercial-v1 hire operations   = exactly 1 / completed
global unfinished hires             = 0
MEDICSPRO Paperclip agents          = exactly 1 / paused
Paperclip adapter                   = wandora_mastra
hire projection                     = already-hired

outbound attempts                   = 0
outbound messages                   = 0
Human Send                          = OFF
Gateway outbound                    = OFF
```

The normal owner clicked `Contratar Ana` once. The durable hire journal retained the original idempotency key and no retry was required. Independent provider reconciliation confirmed the managed Paperclip Ana is paused, has zero budget, no heartbeat and the explicit provider pause reason requiring separate activation.

## Customer Owner First Real Tenant Digital-Employee Activation Preflight V1 — COMPLETE / NO-GO

ADR 0116 revalidated the first real MEDICSPRO activation boundary without any resume or outbound effect.

Fresh evidence is split cleanly:

```text
exact Wandora <-> Paperclip MEDICSPRO/Ana mapping = GREEN
Paperclip Ana                                      = paused / org-chain healthy
Paperclip adapterType                              = wandora_mastra

wandora_mastra registered in live Paperclip        = NO / exact adapter read returns 404
live Organization Adapter agents.resume capability= NO
customer activation Core route                     = absent
customer activation Web action                     = absent

Human Send                                         = OFF
Gateway outbound                                   = OFF
```

The pinned Paperclip SDK does provide company-scoped `ctx.agents.resume(agentId, companyId)`, guarded by the `agents.resume` plugin capability, and the provider resume transition converges `paused -> idle`. The installed Wandora plugin remains intentionally narrower with only `agents.managed`, `webhooks.receive` and `secrets.read-ref`.

Therefore `adapterType=wandora_mastra` is not treated as runtime readiness, the Board credential is not accepted as a customer-activation shortcut, and Wandora must never project `active` before an exact provider resume/readback succeeds.

The future path remains provider-first and keeps Human Send/Gateway outbound independent. No new Wandora lifecycle/control-plane model is approved; only minimum external-effect safety state may be proposed later if serialized reconciliation cannot prove replay/concurrency safety.

## Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1 — COMPLETE / MERGED

ADR 0117 promotes the ADR 0037 laboratory bridge into production-shaped repository contracts without activating production.

Canonical merged boundary (`main` = `7bc8c4790e37b0410703bf58979458200810d5a9`):

```text
Paperclip external adapter package = @wandora/paperclip-adapter-mastra@0.1.0
adapter type                       = wandora_mastra
supportsLocalAgentJwt              = true
private Core route                 = POST /internal/v1/paperclip/execution
Core runtime gate                  = disabled by default
migration source                   = 20260919_014_paperclip_execution_binding_resolver_v1.sql
production migration               = NOT applied
production adapter install         = NOT performed
```

The adapter uses a dedicated file-backed HMAC and forwards the Paperclip run token only in a secret header. Core independently calls private Paperclip `/api/agents/me` using that run-scoped token and requires exact agent/company plus `wandora.organization-adapter-v1 / ana-commercial-v1` managed identity before resolving Wandora state.

Core then requires the exact Wandora employee-provider binding and `status=active / autonomy=supervised` before calling the existing Agent Runtime/Mastra boundary. A paused employee therefore cannot execute merely because the adapter artifact exists or is later installed.

No new Paperclip-like task/control-plane domain is created. The only new DB capability is a least-privilege active organization resolver executable by `wandora_core_runtime`.

The current deterministic runtime makes duplicate execution of the same run non-effectful at this stage. This is not a general idempotency claim for future model/tool/external effects; those require a newer durable effect/reconciliation contract before activation.

PR #166 was squash-merged only after all seven workflows on head `0d6ee0ba593e69e74cae851e127bf146b36f38f1` were green. Post-merge production proof confirms migration 014 is still absent, the live Paperclip adapter store has zero `wandora_mastra` records, MEDICSPRO Ana remains exactly one `paused + supervised` employee with one provider binding and one completed hire operation, and the Core bridge/Human Send/Gateway outbound enable flags remain absent/OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1 — COMPLETE / NO-GO

ADR 0118 completed the requested no-effect production preflight.

Fresh production evidence remains:

```text
main entering preflight = 2d4adc5c81ce6ce36554fd9e3fa399656dd7d612

migration 014 resolver      = ABSENT
wandora_mastra live adapter = ABSENT / 404
Core execution bridge       = OFF
Organization Adapter        = ready
agents.resume               = absent

MEDICSPRO Ana / Wandora     = exactly 1 / paused + supervised
MEDICSPRO provider binding  = exactly 1
MEDICSPRO hire              = exactly 1 / completed
MEDICSPRO Ana / Paperclip   = exactly 1 / paused / no heartbeat

Human Send                  = OFF
Gateway outbound            = OFF
MEDICSPRO outbound attempts = 0
```

Exact artifacts are frozen:

```text
adapter artifact id = 10580337991
adapter ZIP sha256  = bd523953c42b2e8be23311c70c55be01c9248248e2e38358761e8c7d29a2414f
adapter tgz sha256  = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f

Core artifact id    = 10580881710
Core ZIP sha256     = 0387b4bf0f08f2c518b6249bf9515a37a080ffd4b36403d547902f5410ca1c05
Core archive sha256 = b4acc5bac69743493865a69fa51757d32d2ab5bc738d9b277fccd62c3e3a7287
Core source tree    = fb69ab98faa7cf116fadb9b17974cf0f65224dd9
```

The candidate source tree equals the canonical bridge-code squash-merge tree. Current `main` differs only by later documentation, so no rebuild is justified by commit-SHA difference alone.

The preflight blocks live execution on three missing production-readiness contracts:

1. Paperclip lacks a canonical/live bridge runtime overlay for the dedicated HMAC mount and Core bridge URL;
2. Core `/readyz` does not yet prove the migration-014 resolver when the bridge flag is enabled;
3. there is no single disposable integrated attestation using an actual pinned Paperclip run-scoped token through Paperclip -> Core -> Agent Runtime/Mastra.

The exact future migration/HMAC/Core/Paperclip/adapter order and rollback rules are frozen in ADR 0118. The verified adapter must be installed from a restart-stable extracted directory under persistent `/paperclip`, never from `/tmp` or a CI workspace.

## Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1 — COMPLETE

ADR 0119 closes the three repository-readiness gaps from ADR 0118 without activating production.

```text
Paperclip runtime custody overlay             = implemented / CI-validated
Core bridge-aware resolver readiness          = implemented / fail-closed
disposable pinned Paperclip -> Core -> Mastra = GREEN

pinned Paperclip = 65ec059bde30d98c92165b24a30a540800dd1f6f
run status       = succeeded
execution id     = canonical exec_sha256 shape
migration 014    = NOT applied
```

The disposable proof uses Paperclip's native managed-agent service for synthetic Ana identity and a proof-only resolver shim; it does not install/re-run the live Organization Adapter.

Production remains dormant by contract: no live bridge secret, no live adapter install, no Core/Paperclip bridge promotion/recreation, no `agents.resume`, no Ana activation/resume, Human Send OFF and Gateway outbound OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2 — COMPLETE / GO

ADR 0120 revalidates the merged ADR 0119 implementation against canonical Git, final CI artifacts and the actual dormant production runtime.

```text
main entering preflight = cb52b601d440b5abb9412005fc6503c7b8065adc
open PRs               = 0

migration 014          = ABSENT
live bridge HMAC       = ABSENT
Core bridge            = OFF
Paperclip bridge       = ABSENT live
wandora_mastra store   = []
agents.resume           = absent

MEDICSPRO Ana / Wandora   = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip = exactly 1 / paused
Ana wakeups / runs         = 0 / 0
Human Send                 = OFF
Gateway outbound           = OFF
outbound attempts          = 0
```

The final PR #169 adapter artifact ZIP is `ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952`; the contained tgz remains exactly `0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f`.

The final bridge-aware Core candidate is frozen as archive `b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d`, OCI config `1a4f06bc...`, OCI manifest `1fd3f3d7...`, source tree `abacb9da0949a63210080a01bdd95b087e98d02e`. The PR merge-ref, PR head and canonical `main@cb52b601...` all share that exact source tree.

Live Core/Paperclip base Compose files remain byte-identical to Git. The bridge overlays exist only in Git. HMAC custody remains viable with `0640 root:wandora-ops`: Core already receives the `wandora-ops` GID and Paperclip runs as root.

The V2 decision is GO only for a separately executed bridge-foundation activation transaction. It does not authorize `agents.resume`, Ana activation/resume, Human Send or Gateway outbound. If the short-lived Actions artifacts expire or cannot be retrieved, provenance must be re-established before any production effect.

## Paperclip -> Wandora/Mastra Activation Execution pre-mutation recovery + host hygiene gate — COMPLETE

ADR 0121 amends ADR 0120 after post-merge evidence showed two execution-preparation risks: the newest Paperclip recovery snapshot predates the current MEDICSPRO Ana, and stale disposable/proof containers consume material RAM while one host-network proof owns `127.0.0.1:3100`.

ADR 0120's GO remains valid, but Activation Execution V1 must begin with:

```text
Gate A: reconcile + clean proven disposable high-cost containers, preserve proof volumes, free localhost:3100, re-check headroom
Gate B: fresh current Paperclip DB + master.key snapshot, disposable restore/decrypt/state proof
Gate C: exact PR #169 artifact availability/provenance
then: Wandora DB backup/rehearsal -> migration 014 -> HMAC -> Core -> Paperclip -> adapter -> STOP
```

No bridge mutation, employee resume or outbound effect is authorized until these gates pass.
## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 — COMPLETE

ADRs 0122–0125 record the completed production bridge activation and its two corrective stops.

After migration 014 became live in ADR 0122:

- ADR 0123 created the dedicated bridge HMAC, promoted Core/Paperclip bridge runtime and installed `wandora_mastra` exactly once, then stopped when Paperclip's `gosu node` privilege drop could not read the root-custodied secret;
- ADR 0124 corrected the secret wrapper after the first wrapper promotion failed closed with `Cmd=null`;
- ADR 0125 validated the final live bridge foundation.

Current validated state:

```text
migration 014                                  = LIVE / verified
dedicated bridge HMAC                          = present / root:wandora-ops / 0640
Core bridge                                    = LIVE / healthy / ready
Paperclip bridge                               = LIVE / healthy
Paperclip tmpfs bridge secret                  = 0400 / 1000:1000 / host hash match
wandora_mastra                                 = exactly 1 / loaded
adapter test-environment                       = PASS

Ana / Wandora                                  = exactly 1 / paused + supervised
Ana / Paperclip                                = exactly 1 / paused / wandora_mastra
Ana wakeups / heartbeat runs                   = 0 / 0
agents.resume                                  = absent
Human Send                                     = OFF
Gateway outbound                               = OFF
MEDICSPRO outbound attempts                    = 0
```

Continuity rules:

- **do not repeat migration 014;**
- **do not reinstall `wandora_mastra`;**
- the live bridge foundation is not authorization to run Ana;
- provider resume / `agents.resume`, Wandora `paused -> active`, Human Send and Gateway outbound remain separate future effects.

## Paperclip + Mastra Capability Canonicalization / Authority Collision Audit — ADR 0126

The canonical capability maps are:

- `docs/PAPERCLIP_CAPABILITY_MAP.md`;
- `docs/MASTRA_CAPABILITY_MAP.md`;
- `docs/CAPABILITY_COLLISION_MATRIX.md`.

Key authority split:

```text
Paperclip = durable organizational control plane
            company/agent lifecycle
            tasks/runs/routines
            organizational skills
            control-plane decisions/review
            decision training
            task watchdog/liveness
            Paperclip-controlled connections/grants/secrets

Wandora  = product semantics/stable IDs/tenancy
            authorization/policy/projections
            adapter mappings/reconciliation
            external-effect authorization
            compliance/effect audit
            billing/retention/privacy

Mastra   = execution runtime
            workflows/tools
            execution-local goals/task lists/signals
            runtime skills
            memory/observability/evals when separately adopted
            workspaces/sandbox/token-context guardrails
```

Resolved collisions:

- durable business recurrence -> **Paperclip Routine**, not a parallel Wandora scheduler or Mastra schedule;
- durable organizational work -> **Paperclip task/issue**, not Mastra task lists/goals;
- organizational skill catalog/policy -> **Paperclip**; runtime materialization -> **Mastra**;
- control-plane decision/review -> **Paperclip**; customer commitment/external effect -> **Wandora**;
- Decision Training -> **Paperclip decision evidence**; Evals -> **Mastra execution-quality evidence**;
- Connections/grants -> **Paperclip is the leading specialist candidate**; Mastra `@mastra/connect` is not adopted as a competing authority.

## Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof — GREEN

ADRs 0127–0128 record the production-derived disposable compatibility proof.

Production remains:

```text
Paperclip image  = wandora/paperclip:v2026.831.1
Paperclip source = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

Qualified candidate:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

Final proof:

```text
schema-faithful live/proof canonical SHA
= 379673af39dc3d8d0dfcbd7bf5c751bde96ef6fae6bb88079c13e956959f8356

live == proof schema                     = true
migrations 0231..0279                    = PASS
MEDICSPRO + owner                        = preserved
Ana                                      = preserved / paused / wandora_mastra
agents.resume                            = absent
Ana wakeups / heartbeat runs             = 0 / 0
Organization Adapter                     = ready
local_encrypted decrypt/hash/wrong-key    = PASS / PASS / PASS
wandora_mastra copied existing package    = load PASS
official adapter test-environment         = HTTP 200 / PASS
real run-scoped JWT /api/agents/me        = 200
tampered run token                        = 401
mapped Core -> Mastra run                 = succeeded
Mastra model                              = mastra-deterministic
unknown managed mapping                   = fail-closed / Mastra not invoked
bad HMAC                                  = 401
v831 rollback lab                         = PASS before cleanup
final proof cleanup                       = complete
production drift                          = none
```

Important backup-fidelity finding:

- the normal Paperclip logical backup preserves logical data/recovery state but does **not** serialize PostgreSQL CHECK constraints;
- it remains required together with the matching `master.key`;
- upgrade rehearsal and exact rollback additionally require a fresh PostgreSQL 18.1 schema-faithful `pg_dump -Fc`.

Upgrade state:

```text
disposable compatibility = GREEN
production upgrade        = NOT EXECUTED
next authorization level  = Production Upgrade Preflight V1 only
```

## Mastra version/adoption checkpoint

Production Core remains:

```text
@mastra/core          = 1.66.0
@mastra/memory        = NOT_FOUND
@mastra/observability = NOT_FOUND
@mastra/evals         = NOT_FOUND
```

Upstream `@mastra/core@1.67.0` is not required by the Paperclip upgrade proof and must not be bundled into that change.

Memory, Observability, Evals, workspaces/sandbox and richer runtime skills remain separately reviewed adoption slices. `MASTRA_TELEMETRY_DISABLED=true` remains the current live default.

## Paperclip v2026.916.0 Production Upgrade Preflight — GREEN / STOP before mutation

ADR 0129 freezes the real production rollback and execution contract without upgrading Paperclip.

Candidate remains exactly:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

Fresh protected recovery set:

```text
/home/wandora-admin/backups/
paperclip-v916-production-upgrade-preflight-v1-20260920T004119Z/

official backup =
paperclip-20260920-003950.sql.gz
SHA-256 =
b279ddd16aa67c76c33a47c1de649760c2d2061e6e37f22294209049471867d0

schema-faithful PostgreSQL 18.1 pg_dump -Fc SHA-256 =
6e830685e30969a34826f37b212bf25eae19395b632845f40b4142e28567fbbd

fresh dump restore/schema equality =
8f60a06a73283d9d774cff4ef5f5c9fb5131b025b2d8db752d9bcbcce3c5c612
= GREEN
```

The copied `master.key` is byte-identical to live. The protected Compose base, bridge overlay/wrapper, `adapter-plugins.json`, current `wandora_mastra` package and current Organization Adapter package are byte-identical to live.

Exact v831 image availability is frozen with:

```text
wandora/paperclip:rollback-v2026.831.1-pre-v916-20260920T004119Z
-> sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
```

The current `wandora_mastra@0.1.0` runtime bytes remain v916-qualified by ADR 0128. Its `compatibility.json` still pins v831.1 and is now explicitly classified as stale provenance metadata. Before a re-attested package is promoted, emit a new immutable compatibility-only artifact (recommended `0.1.1`) with the v916 image/commit while keeping `index.mjs` byte-identical and `adapterType=wandora_mastra`.

Production remains:

```text
Paperclip                = v2026.831.1 / healthy / restart 0
migration ledger         = 229 / max 229
Ana / Wandora            = exactly 1 / paused + supervised
Ana / Paperclip          = exactly 1 / paused / wandora_mastra
Organization Adapter     = exactly 1 / ready
agents.resume            = absent
Ana wakeups / runs       = 0 / 0
Human Send               = OFF
Gateway outbound         = OFF
MEDICSPRO outbound       = 0
production upgrade       = NOT EXECUTED
```

Irreversibility rule:

> once the first v916 migration from `0231..0279` commits, image-only rollback is forbidden; rollback requires the protected schema-faithful pre-upgrade database restore plus matching `master.key` and exact frozen v831 runtime/extensions.

The exact future sequence and rollback decision tree are frozen in:

`docs/operations/paperclip-v2026-916-0-production-upgrade-execution-v1.md`.

## Paperclip v2026.916.0 Production Upgrade Execution V1 — COMPLETE / LIVE

ADR 0130 records the production execution from `main@fa666370184d31d031d5b554153786a8b708b777`.

The already-green ADR 0128 disposable proof and ADR 0129 preflight were reused rather than repeated. Immediately before mutation, the protected rollback set was revalidated and proved fresh: a PostgreSQL 18.1 restore of the protected `pg_dump -Fc` matched live across deterministic fingerprints of all 358 public base tables, and schema matched after normalizing only pg_dump's random restrict token.

Production now is:

```text
Paperclip image        = wandora/paperclip:v2026.916.0
Paperclip image ID     = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
Paperclip source       = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
Paperclip health       = healthy / API status ok
Paperclip restarts     = 0

migration ledger       = 278 / max 278
new ledger entries     = 49
startup migration set  = 0231..0279 / applied

Organization Adapter   = exactly 1 / ready / v0.1.0
wandora_mastra         = exactly 1 / v0.1.0 / testEnvironment pass

MEDICSPRO Ana/Wandora  = exactly 1 / paused + supervised
MEDICSPRO Ana/Paperclip= exactly 1 / paused
MEDICSPRO wakeups/runs = 0 / 0
agents.resume          = absent
Human Send             = OFF
Gateway outbound       = OFF
MEDICSPRO outbound     = 0
```

Post-upgrade validation additionally proved:

- company/memberships and Organization Adapter config/bindings survived;
- the `local_encrypted` path resolves successfully without exposing plaintext: a deliberately invalid signed webhook reached `invalid_wandora_signature`, which the fixed plugin order can reach only after secret resolution and before managed reconcile;
- the existing **Wandora Internal Supervised Proof** identity was exercised through Paperclip's normal `heartbeatService.wakeup()` path, so Paperclip minted the run-scoped JWT internally and Core validated it through `/api/agents/me` before mapping/execution;
- the initial bounded on-demand proof run plus one timer heartbeat that fired during the short synthetic idle window both completed `succeeded`; during later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` path ran once more and `3d316b82-eaa2-4ceb-a89e-f25e9263fec6` also completed `succeeded`; final cleanup returned the proof agent to `paused`, kept the proof issue `cancelled`, and left zero pending proof runs/wakeups;
- a syntactically valid forged JWT with a false signature returned 401, while the successful proof traversed `wandora_mastra -> Core -> deterministic Mastra`; the proof tenant outbound-attempt count remained unchanged;
- unknown Paperclip company mapping was revalidated live through the Core runtime service and returned `company-unmapped` / `UNKNOWN_MAPPING_FAIL_CLOSED=true`;
- no compatibility-only `wandora_mastra` repack was promoted;
- no Mastra upgrade or Organization Adapter behavior change occurred.

The protected ADR 0129 recovery set and exact v831 rollback image remain retained. Because v916 migrations are now committed, image-only rollback is forbidden; any return to v831 requires the protected schema-faithful database restore plus matching `master.key` and frozen v831 runtime/extensions.

## NEXT EXECUTABLE SLICE

Next: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**.

Reconcile ADR 0116's earlier activation assumptions against the now-live Paperclip v2026.916.0 control plane and the canonical Paperclip/Mastra capability maps. Determine which safety capabilities are actual prerequisites before employee activation instead of adopting every new provider feature by default.

This next slice must begin from REAL NOW and finish with MEDICSPRO Ana still paused unless a later separately reviewed activation execution explicitly authorizes resume. Human Send and Gateway outbound remain separate effect gates.

## Operational safety

- Git is source of truth; Portainer is not.
- Merged migration != live migration.
- Canonical package != installed plugin.
- Provider consoles stay operator-only.
- Secrets/tokens never enter Git, business DB payloads or logs.
- External effects fail conservatively; uncertain effects are never blindly retried.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain separate explicitly reviewed effects.
- A proof/candidate/archive being staged or loaded does not mean its runtime is active.
- After timeout/chat/tool loss, reconcile state before retrying any effect.

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety/state persisted, the decision survived adversarial review, execution was independently validated, and any production effect remains bounded by a separately reviewed activation step.

## Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1

ADR 0131 reconciles ADR 0116 against the live Paperclip v2026.916.0 runtime.

Read-only reconciliation proved:

```text
main                         = 1c1c3c88aa4ef50d56a66d8a1948b96464b49ee3 at slice start
Paperclip                    = v2026.916.0 / dffc2b3... / healthy / restart 0
migration ledger             = 278 / max 278
MEDICSPRO Ana / Wandora      = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip    = exactly 1 / paused / wandora_mastra
MEDICSPRO wakeups/runs       = 0 / 0
completed hire               = exactly 1
unfinished hires             = 0
control + employee binding   = present / exact
agents.resume                = absent
Human Send                   = OFF
Gateway outbound             = OFF
MEDICSPRO outbound attempts  = 0
```

v916 resolves the old execution-adapter/bridge blocker from ADR 0116 but does not replace the Wandora activation boundary. Native Paperclip `agents.resume` remains a distinct capability from `agents.managed`; resume converges the provider lifecycle to `idle` and does not request a wakeup. Existing managed-agent reconciliation does not force an already resumed agent back to paused.

The remaining blockers before first real activation are deliberately narrow:

1. add a company-scoped, signed Organization Adapter activation action for the fixed managed Ana and grant only the necessary `agents.resume` capability; it must never expose arbitrary provider agent IDs or call `agents.invoke`;
2. add the Wandora owner/admin Core activation contract that revalidates the exact employee/hire/bindings, calls the adapter, reconciles Paperclip, and only then changes the Wandora projection `paused -> active`;
3. expose customer-safe activation availability/action in the Web/read model;
4. prove timeout/concurrency/already-idle/fail-closed paths in candidate/disposable tests without resuming MEDICSPRO Ana.

ADR 0131 deliberately does **not** approve a second lifecycle engine or a new activation journal. Paperclip resume is convergent and exact provider readback can recover an ambiguous response; a new durable journal requires separate evidence.

Status mapping is now explicit:

```text
Paperclip paused = lifecycle stopped
Paperclip idle   = resumed and waiting, not running
Wandora active   = product-eligible for authorized work
supervised       = still governed by Wandora policy/effect boundaries
```

Human Send and Gateway outbound remain independent Wandora-owned effect gates and are not activation prerequisites.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1**

Implement and qualify the minimum adapter/Core/Web contract above. Do not resume MEDICSPRO Ana, do not create a real wakeup/run, do not grant `agents.invoke`, and keep Human Send/Gateway outbound OFF.



## Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1 — MERGED / PRODUCTION STILL DORMANT

ADR 0132 records the completed implementation slice.

Canonical Git:

```text
PR #182 head = c6d9e2d00431f475e6226b430c73af07bbd8d960
PR #182      = merged
main         = 60527c39ddd962367674c82db16156caa201fa35
CI           = 7/7 GREEN
```

The repository now contains the narrow Organization Adapter v0.2.0 activation candidate, owner/admin Core activation route, customer-safe Team/Web projection and candidate migration 015 least-privilege activation finalizer.

The implementation intentionally preserves the authority split:

```text
activation intent
-> Wandora owner/admin + exact mappings
-> company-scoped Organization Adapter
-> Paperclip managed.get
-> Paperclip agents.resume only if paused
-> Paperclip managed.get == idle
-> Wandora paused -> active projection through migration-015 helper

NO agents.invoke
NO task/wakeup/heartbeat/run
NO Mastra call during activation
NO Human Send/Gateway outbound enablement
```

Mastra remains the already-qualified execution dependency used only later when Paperclip has an authorized concrete run through `wandora_mastra -> Core -> Agent Runtime -> Mastra`.

Fresh post-merge production readback remains:

```text
Paperclip                    = v2026.916.0 / healthy
Core/Web/Gateway             = healthy
MEDICSPRO Ana / Wandora      = exactly 1 / paused + supervised
control + employee binding   = 1 / 1
completed hire               = 1 / ana-commercial-v1
MEDICSPRO outbound attempts  = 0
migration 015 functions      = 0 / absent live
activation runtime flag      = absent / OFF
Human Send                   = OFF
Gateway outbound             = OFF
```

**Merged does not mean live:** migration 015 is unapplied, Organization Adapter v0.2.0 is not promoted by this checkpoint, live resume authority is not changed by this checkpoint, and Ana is not activated.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT.**

It must reconcile fresh runtime state, rehearse migration 015 + rollback on disposable restore, pin exact v0.2/Core/Web artifacts and rollback assets, prove zero pending MEDICSPRO wakeup/run/timer-heartbeat risk, revalidate outbound OFF, freeze the future execution order, and stop without applying/deploying/resuming anything.
## ADR 0133 — First real employee Production Activation Preflight V1 GREEN (2026-09-20)

The no-effect production activation preflight for MEDICSPRO Ana is complete and GREEN.

Proven immediately before and after the disposable rehearsal:

- migration 015 remains absent live;
- Organization Adapter live remains v0.1.0 without `agents.resume`;
- activation runtime gate, Human Send and Gateway outbound remain OFF;
- MEDICSPRO has exactly one Ana `paused + supervised`, one control binding, one employee binding and one completed hire;
- Paperclip Ana remains `paused`, with zero wakeups, zero heartbeat runs and zero open routine runs;
- MEDICSPRO outbound attempts remain zero;
- Mastra/Agent Runtime remains the existing reusable execution dependency and is not called by activation.

Migration 015 + canonical verifier passed against a live-derived disposable restore, including idempotent replay and an independent pristine rollback restore. Exact Core, Web and Organization Adapter v0.2.0 artifact digests/provenance and current rollback anchors are frozen in ADR 0133.

The activation path is proven to use only `agents.resume` as new Paperclip authority and not `agents.invoke`, tasks, wakeups, heartbeats, runs, routines or Mastra. The existing execution bridge continues fail-closed for `Paperclip idle + Wandora paused`.

The next executable slice is **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**. It is separately effectful and must not begin without a fresh REAL NOW and second adversarial review.


## Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1 — COMPLETE / GREEN

ADR 0135 records the completed first real MEDICSPRO employee activation.

Final live state:

```text
MEDICSPRO organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Wandora Ana = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
Wandora state = active + supervised

Paperclip company = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana = da6cfc6b-e16f-483a-95f1-bacee8e54365
Paperclip state = idle / wandora_mastra
```

Activation foundation:

```text
migration 015 = LIVE / canonical verifier GREEN
Organization Adapter = wandora.organization-adapter-v1@0.2.0 / ready
Core = wandora/core:organization-adapter-candidate-8d2a53e3c264
Web = wandora/web:candidate-eda946c36ec4
Paperclip = wandora/paperclip:v2026.916.0
Human Digital-Employee Activation = ON
Human Send = OFF
Gateway outbound = OFF
```

The Web Auth artifact defect discovered before activation was corrected by PR #185 / ADR 0134. The replacement Web candidate is login-capable and retains the reviewed activation bridge.

Post-effect proof:

```text
Ana count = 1
control bindings = 1
employee bindings = 1
completed exact-catalog hire = 1
unfinished hires = 0
outbound attempts = 0

Paperclip wakeups = 0
heartbeat runs = 0
open routine runs = 0
total routine runs = 0
task sessions = 0
runtime last_run_id = null
runtime tokens/cost = 0
MEDICSPRO run_identity_contexts = 0
```

The owner activation crossed the intended lifecycle point exactly once through the normal authenticated Web contract. Activation did not invoke Mastra and did not create a run. Mastra remains a lazy execution dependency for later legitimate work.

Do not create synthetic work, wakeups, heartbeats, Mastra runs or outbound effects merely to demonstrate that Ana is active. Any first real post-activation work is a separate reviewed slice.

## Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Preflight V1 — COMPLETE / REAL EXECUTION BLOCKED

ADR 0136 records the first no-effect preflight after the real MEDICSPRO Ana activation.

Fresh read-only reconciliation proved:

```text
main at slice start          = 1f13f10dc8782a459d01c7c514189e1368650831
MEDICSPRO Ana / Wandora      = exactly 1 / active + supervised
MEDICSPRO Ana / Paperclip    = exactly 1 / idle / wandora_mastra
assigned Paperclip issues    = 0
wakeup requests              = 0
heartbeat runs               = 0
routine runs                 = 0
task sessions                = 0
run identity contexts        = 0
runtime last_run_id          = null
runtime tokens / cost        = 0 / 0
MEDICSPRO outbound attempts  = 0
Human Send                   = OFF
Gateway outbound             = OFF
critical runtime             = healthy
```

No synthetic work was created.

The authoritative first-work source is now frozen conceptually as:

```text
authenticated MEDICSPRO owner
-> Wandora customer work-admission contract
-> company-scoped Organization Adapter
-> Paperclip durable issue assigned to Ana
-> Paperclip assignment wakeup/run
-> run-scoped Paperclip identity
-> wandora_mastra
-> Wandora Core execution bridge
-> Agent Runtime
-> Mastra
-> supervised internal result
-> customer-safe Wandora projection
-> STOP before external effect
```

Paperclip v2026.916.0 remains authority for durable organizational work. Exact source inspection proved that the normal assigned-issue path is the provider-native work trigger. The Plugin SDK exposes `issues.read`, `issues.create` and `issues.wakeup` separately; generic plugin issue creation does not itself dispatch the run. The live Organization Adapter v0.2.0 intentionally lacks those issue capabilities.

The current Wandora customer surface also lacks a customer-safe Paperclip work-create contract and result projection. Existing `wandora.work_items` / `work_proposals` remain the messaging-supervision vertical slice and are **not** precedent for a parallel general task engine.

The minimum remaining gaps are:

1. authenticated owner/admin work admission for an exact active + supervised employee;
2. narrow Organization Adapter issue read/create/wakeup capability;
3. minimum Wandora-owned idempotency/reconciliation state for the distinct issue-create and wake provider effects;
4. customer-safe projection of Paperclip work/result for supervision.

First real work execution is therefore **NO-GO** until those gaps are implemented and separately promoted. Human Send and Gateway outbound stay OFF; any eventual first run must stop after an internal, reviewable result.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1 — NO REAL WORK**

Implement and qualify only the minimum customer-safe Wandora/Core + Organization Adapter contract above, preferably against disposable/candidate Paperclip. Do not create MEDICSPRO real work, wakeups or runs during implementation, and do not enable Human Send or Gateway outbound.


## First legitimate work contract implementation V1 — QUALIFIED / PRODUCTION DORMANT

ADR 0137 accepts the repository implementation of the customer-safe first-work contract.

Final qualified implementation head:

```text
PR #188 code-bearing head = 21ba162b463dbdeb6be3c84419c46afa0d465335
PR #188 final head        = 843b4e5a7f53e837e826929856cc2924b36cac8b
PR #188 CI                = 7 / 7 GREEN
PR #188                   = merged
main after merge          = 97290031e1aa567e6207c88873fa92d2ff3698ba
```

Accepted repository boundary:

```text
authenticated owner/admin
-> Wandora work admission + stable idempotency request
-> private integration-safety journal (migration 016)
-> signed company-scoped Organization Adapter v0.3
-> Paperclip issue authority + fail-closed dispatch receipt
-> Paperclip run
-> wandora_mastra@0.2.0
-> existing Core execution bridge
-> Agent Runtime / Mastra
-> supervised internal result
-> Wandora customer-safe projection
-> STOP before external effect
```

Paperclip remains the authoritative task/run control plane. The Wandora journal is limited to request idempotency, provider-effect reconciliation, exact run receipt and customer result projection; it is not a second task lifecycle.

Fresh final production readback after qualification remained:

```text
Wandora Ana                  = active + supervised
Paperclip Ana                = idle / wandora_mastra
assigned Paperclip issues    = 0
wakeups                      = 0
heartbeat runs               = 0
routine runs                 = 0
task sessions                = 0
runtime last_run_id          = null
runtime tokens / cost        = 0 / 0
outbound attempts            = 0
migration 016 live           = absent
customer work flag           = OFF
Human Send                   = OFF
Gateway outbound             = OFF
```

Repository acceptance does **not** authorize production promotion.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Preflight V1 — NO EFFECT**

Reconcile post-merge main and exact immutable candidate provenance, prove migration-016 rollback/readiness, live plugin/adapter promotion plan and customer-safe stop boundary. Do not create MEDICSPRO work or enable any outbound effect.


## Post-merge checkpoint — first legitimate work contract implementation V1

The repository implementation slice is closed.

```text
PR #188 final head = 843b4e5a7f53e837e826929856cc2924b36cac8b
CI                 = 7 / 7 GREEN
merge method       = squash
main               = 97290031e1aa567e6207c88873fa92d2ff3698ba
```

No production artifact was promoted by this merge. Fresh post-merge read-only checks kept Core/Web/Paperclip/Gateway healthy, MEDICSPRO Ana exactly one and `active + supervised`, migration 016 absent, customer work flag absent/OFF and outbound attempts zero. The last successful exact Paperclip readback immediately before merge remained `idle / wandora_mastra` with zero assigned issues, wakeups, heartbeat runs, routine runs, task sessions and runtime usage.

Do not execute first MEDICSPRO work from this checkpoint. The next slice is **Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Preflight V1 — NO EFFECT**.


## First legitimate work Production Preflight V1 — COMPLETE / GREEN

ADR 0138 records the no-effect production preflight after ADR 0137.

The preflight discovered and closed two additional end-to-end idempotency gaps through PR #190:

- concurrent same-key Core admission now reconciles a unique race to the existing operation;
- browser work identity survives timeout, refresh, rapid duplicate submit and 503 availability responses through an opaque session-scoped UUID + SHA-256 fingerprint.

Final repository checkpoint:

```text
PR #190 final head = 768be4e0177f52cbc957a517640457a4b6905a2a
PR #190 CI         = 5 / 5 GREEN
main after merge   = e867585622abd0ee020bf45756eda6b53ef4fec8
```

Fresh production remained dormant:

```text
Wandora Ana                  = exactly 1 / active + supervised
Paperclip Ana                = exactly 1 / idle / wandora_mastra
assigned issues              = 0
heartbeat runs               = 0
task sessions                = 0
routine runs                 = 0
runtime session / last run   = null / null
runtime tokens / cost        = 0 / 0
MEDICSPRO outbound attempts  = 0
migration 016                = absent
customer work gate           = OFF
Human Send                   = OFF
Gateway outbound             = OFF
```

Production promotion order is frozen as:

```text
fresh rollback/provenance capture
-> migration 016 + verifier
-> wandora_mastra@0.2.0 + required Paperclip restart
-> Organization Adapter v0.3 + exact capability/config validation
-> Core candidate with work gate still OFF
-> Web candidate
-> customer-work overlay LAST
-> readiness/customer-safe availability validation
-> STOP before any work submission
```

Paperclip v916 source review proved adapter replacement requires a restart and that local same-key plugin installation does not itself provide the capability-escalation approval semantics described by the generic upgrade comments. ADR 0138 therefore explicitly approves only the exact Organization Adapter v0.3 capability set and requires hash/manifest verification before promotion.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — NO REAL WORK**

The execution may promote the already-qualified components only in the frozen order above. It must not create MEDICSPRO work, issue/wakeup/run or any outbound effect.

After that promotion is independently green, first real work still requires a genuine authenticated MEDICSPRO owner instruction and must stop at the supervised internal result.

## Model Provider / Mistral supervised assigned-work foundation V1 — QUALIFIED / PRODUCTION DORMANT

ADR 0142 accepts the repository implementation of a real model-provider path for Paperclip-assigned supervised internal work.

Repository boundary:

```text
Paperclip work/run authority
-> wandora_mastra
-> private Core bridge
-> Mastra Agent Runtime
-> Mistral V1 provider
-> bounded structured internal summary
-> Wandora logical model = wandora-supervised-v1
-> no external effect
```

V1 pins:

```text
runtime mode = mastra-supervised-model
provider = mistral
model = mistral-small-2603
base URL = https://api.mistral.ai/v1
max output tokens = 768
provider timeout = 45000 ms
bridge timeout candidate = 60000 ms
automatic model retries = 0
```

The provider credential is file-backed only. No real credential is committed or currently mounted in production.

The inbound proposal path remains `mastra-deterministic`; model egress is limited to `executeAssignedTask(...)` and only bounded task title/description cross that boundary.

Qualification completed with 8/8 focused runtime tests, 1/1 Paperclip adapter contract, 126/126 canonical Core disposable tests and 30/30 post-migration work/adapter tests.

Fresh production remains:

```text
Core Agent Runtime = mastra-deterministic
model provider env = absent
model secret = absent
customer work gate = ON
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO Ana = exactly 1 / active + supervised
work journal = 0
outbound attempts = 0
live wandora_mastra = 0.2.0
```

Repository acceptance does not authorize production activation.

### NEXT EXECUTABLE SLICE

**Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**

Reconcile merged main and live state, provision a fresh key only through the reviewed secret-file path, run one synthetic non-customer provider attestation, prove zero customer/Paperclip/outbound state delta, and stop before changing the live Core runtime mode.


## 2026-09-21 Mistral credential custody + real-provider attestation — GREEN / RUNTIME STILL DORMANT

ADR 0143 is the newest model-provider checkpoint.

```text
main used for attestation = 82ea046ede32605f8d5511ef06bc47ecf060d2ea
credential custody        = /opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
credential metadata       = 0640 / wandora-admin:wandora-ops
live Core model key mount = absent
live Core runtime         = mastra-deterministic

real provider proof:
  provider              = mistral
  model                 = mistral-small-2603
  logical model         = wandora-supervised-v1
  input/output/total    = 222 / 44 / 266
  cached input          = 0
  exit                  = 0

post-call MEDICSPRO:
  Ana                   = exactly 1 / active + supervised
  work journal          = 0
  outbound attempts     = 0

post-call Paperclip Ana:
  status / adapter      = idle / wandora_mastra
  issues                = 0
  wakeups               = 0
  heartbeat runs        = 0
  task sessions         = 0
  routines / runs       = 0 / 0
  runtime session/run   = null / null
  runtime token/cost    = 0
```

Human Send and Gateway outbound remain OFF. All critical production containers remained healthy with restart count zero.

Do not repeat the successful real-provider call merely because a chat changes. Re-attest only for a concrete freshness reason.

Next slice: **Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT**. It must stop before any live Paperclip adapter replacement or Core runtime switch.


## 2026-09-21 — AI Runtime Portability + Model Provider Authority Review V1 (ADR 0144)

Starting authority: `main@e7f1050a99dbab8da26e4aa06f36556e999ce243` / ADR 0143.

Read-only production reconciliation confirmed Core remains healthy on `mastra-deterministic` with no live provider/model/key env, Mistral credential host-custodied but unmounted, Paperclip v2026.916.0 healthy, MEDICSPRO Ana `active + supervised` / Paperclip `idle`, zero MEDICSPRO work/run/usage/outbound and Human Send/Gateway outbound OFF.

Portability decision: **Case A**. ADR 0142's concrete Mistral configuration is an internal runtime detail, not product identity. `wandora-supervised-v1` is canonically the Wandora logical execution/AI profile and survives replacement of Mastra/provider.

Repository-only hardening for this slice:

- `AssignedTaskResult` now carries normalized input/output/cached/total token usage;
- Mastra `totalUsage` is mapped at the adapter boundary;
- deterministic runtime reports zero usage;
- deterministic assigned-work result now uses `wandora-supervised-v1` instead of the framework-specific `mastra-deterministic` label;
- no production work rows existed, so no data migration is required.

No AI Profile table/catalog, provider router, budget engine, cost engine, secret manager or usage-history table was added.

Portability GREEN permits a future **Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT**, but that preflight must independently qualify cost governance because Paperclip cost-event ingestion for Core/Mastra model calls is not yet proven and Mastra TokenCostControl observability/storage prerequisites are not configured.

## ADR 0145 — Model Provider / Mistral Production Runtime Activation Preflight V1

Status: **NO-GO for production activation / NO EFFECT preflight complete.**

The preflight starting from `main@d5f98ed92a29b351b243c4873bf17a2d13cdfc78` qualified the exact current-main Core candidate, `wandora_mastra@0.3.0` promotion, host-side platform-secret injection, local readiness/fail-closed behavior, 45s provider deadline < 60s bridge timeout, zero automatic provider retry, provider-error handling and Runtime-X portability without changing production.

Production remains deliberately unchanged:

```text
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF
Gateway outbound    = OFF
MEDICSPRO work      = 0
MEDICSPRO outbound  = 0
Ana                 = active + supervised / Paperclip idle
Paperclip run state = zero
```

The only activation blocker is aggregate cost governance. Paperclip has native budget enforcement, but the Core/Mastra path does not currently emit an authoritative billed-cents cost event into Paperclip; the Paperclip cost-event contract requires caller-supplied `costCents`. Mastra native cumulative cost control is not yet production-qualified because its observability/storage prerequisites are not configured. Per-execution controls (single step, max output 768, 45s deadline, zero retry, bounded task input) are GREEN but are not an aggregate spend ceiling.

Do **not** create a Wandora provider-pricing table, cost engine, second budget ledger, model router or tenant secret manager to close this gap.

Next canonical slice:

**Model Provider Runtime Native Cost Governance Qualification V1 — NO EFFECT**

It must choose the minimum Mastra/Paperclip-native aggregate spend guard using synthetic/disposable evidence only. Production Core must remain deterministic; the Mistral secret must remain unmounted; Mistral must not be called. Only after that slice is GREEN may a separate Model Provider / Mistral Production Runtime Activation Execution V1 be authorized.

## ADR 0146 — Native model-provider cost governance qualification

Status: **architecture GREEN / provider-account proof pending / NO EFFECT**.

Starting from main at 39abbeefa2531da3ed319afe6baff97f4f07e96a, the cost-governance gap from ADR 0145 was re-run through the Capability Authority / Reuse Gate.

The accepted hard aggregate provider-spend boundary is the native Mistral Workspace monthly spending limit. Mistral API keys are Workspace-scoped, and current official Mistral documentation states that a Workspace reaching its spending limit rejects API requests with HTTP 429.

A disposable synthetic 429 proof through the exact qualified Agent Runtime produced one request and zero model retries. The Wandora execution-uncertainty journal also prevents Paperclip recovery from turning the same uncertain work into a second model invocation.

Mastra TokenCostControl remains optional defense in depth rather than a hard billing ceiling because its cumulative observability path is approximate and contains fail-open behavior. Paperclip remains operational budget authority but its current billed-cents budget path requires authoritative costCents supplied by the caller.

Production remains unchanged: Core mastra-deterministic, no model env/mount, live wandora_mastra 0.2.0, Human Send OFF and Gateway outbound OFF.

Next effect boundary: **Mistral Production Workspace Spending-Limit + Credential Scope Preflight V1 — NO EFFECT**. Production activation remains blocked until the real custodied production key is proven to belong to a dedicated production Workspace with an explicit finite monthly spending limit.

## ADR 0147 — Provider-neutral runtime risk guard / cost-governance correction

Status: **provider-neutral activation guard GREEN / ADR 0146 Mistral-specific blocker superseded / NO EFFECT**.

Starting from `main@47e5d43ed4419e0608ec34b3d941611a8cbd708d`, the architecture was reconciled against ADR 0144 and the Capability Authority map.

ADR 0146's technical findings are retained, but its requirement for a dedicated capped Mistral Workspace before model-runtime activation is superseded. Provider-account spending controls remain optional/conditional defense in depth; they are not part of the universal Agent Runtime contract.

The activation-critical portable guard is the already-qualified combination of bounded admitted work, exact identity, one step, zero automatic model retries, bounded output, 45-second provider deadline below the 60-second bridge deadline, structured output, fail-closed ambiguity handling, no automatic provider fallback and no implicit external effect.

Runtime activation creates no work or inference. First legitimate MEDICSPRO model-backed work remains a separate bounded owner-driven effect slice. Broad unattended/recurring workloads remain separately gated.

Production was not changed by this correction and remained Core `mastra-deterministic`, no model env/mount, live `wandora_mastra@0.2.0`, Human Send OFF, Gateway outbound OFF, exactly one MEDICSPRO Ana active+supervised, work journal 0 and outbound 0.

**Model Provider / Mistral Production Runtime Activation Execution V1 is architecturally GO as a separate production-effect slice**, subject to fresh state reconciliation and ADR 0145's already-frozen adapter-first/Core-second promotion and rollback order. It must stop before creating customer work.

## ADR 0148 — Model Provider / Mistral Production Runtime Activation Execution V1

Status: **EXECUTED / GREEN — model-backed runtime live and dormant**.

Starting authority: `main@fd190a4dd8cd42647defaee33fecfb065b00b5e0` / ADR 0147.

Production now is:

~~~text
Core image           = wandora/core:organization-adapter-candidate-d5f98ed92a29
Core image id        = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
Core health/ready    = healthy / 200
Agent Runtime        = mastra-supervised-model
logical profile      = wandora-supervised-v1
current provider     = mistral
current model        = mistral-small-2603
model secret mount   = read-only

Paperclip            = wandora/paperclip:v2026.916.0 / healthy
wandora_mastra       = exactly 1 / 0.3.0 / loaded
adapter environment  = PASS

Human Send           = OFF
Gateway outbound     = OFF
~~~

Final MEDICSPRO reconciliation:

~~~text
Ana / Wandora          = exactly 1 / active + supervised
Ana / Paperclip        = idle / wandora_mastra
work operations        = 0
outbound attempts      = 0
issues                 = 0
wakeups                = 0
heartbeat runs         = 0
task sessions          = 0
routines / runs        = 0 / 0
runtime session/run    = null / null
runtime tokens / cost  = 0 / 0
~~~

The activation slice made **zero model calls**. Core readiness does not call Mistral. No database migration was applied.

Rollback assets are retained at:

`/home/wandora-admin/executions/model-provider-runtime-activation-execution-v1-20260921/rollback`

Do not repeat adapter installation or Core/Paperclip recreation merely because a chat changes. Reconcile live state first.

Next effect boundary: **Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1**. It requires separate authorization, at most one owner-driven MEDICSPRO work request, Human Send/Gateway outbound OFF, and STOP at supervised result.


## ADR 0149 — First model-backed legitimate work pre-effect reconciliation

Status: **NO-GO for effect — technical readiness GREEN; genuine owner work content not yet admitted**.

Fresh reconciliation from `main@506800c45467c020a49aef340866dea806c8cfb5` proved the ADR 0148 runtime remains healthy and dormant: exactly one MEDICSPRO Ana `active + supervised` / Paperclip `idle / wandora_mastra`, work operations/issues/wakeups/heartbeat/task sessions/routines/runtime runs/model usage/outbound all zero, Human Send OFF and Gateway outbound OFF.

The current implementation already satisfies the bounded execution guard: `maxSteps=1`, `maxRetries=0`, structured bounded output, provider 45s deadline below the 60s bridge deadline, exact run correlation, fail-closed uncertain replay and no automatic fallback path.

The remaining gate is product authority, not infrastructure. ADR 0136/0141 requires the first work title/description to be a genuine business instruction submitted by the authenticated MEDICSPRO owner through the Wandora customer work surface. Engineering/operator context must not invent that content, mint/extract an owner session or create a synthetic Paperclip issue/wakeup merely to demonstrate the model path.

Therefore ADR 0149 records **zero production effect** and preserves the same next effect slice. Once the owner submits the genuine work request, reconcile the exact operation before any retry and allow at most one issue/run/model execution, stopping at the supervised Wandora result with outbound still OFF.


## ADR 0150 — First legitimate model-backed MEDICSPRO work + lifecycle remediation checkpoint

Status: **real work/result succeeded; exact-one-Paperclip-run invariant failed historically; duplicate model execution contained; adapter remediation qualified in disposable, not live**.

The authenticated MEDICSPRO owner submitted exactly one legitimate work request through Wandora Web. Production evidence is:

```text
Wandora work id         = 9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab
work status             = result_recorded
logical result profile  = wandora-supervised-v1

Paperclip issue         = MED-1 / 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
intended run            = 9bbeb869-fe06-4eb2-bfdd-f51a60d536ac / succeeded
automatic continuation  = dca7387e-07fe-4119-93f0-3c5af8080d1d / failed before model
historical issue status = blocked

model calls             = exactly 1
model usage             = 333 input / 372 output / 705 total / 0 cached
outbound attempts       = 0
Human Send              = OFF
Gateway outbound        = OFF
routines / routine runs = 0 / 0
task sessions           = 0
Ana                     = active + supervised
```

The second Paperclip run was created by native stranded-issue reconciliation because live `wandora_mastra@0.3.0` returned a successful legacy/direct adapter result without terminalizing the issue. Exact Wandora run binding rejected the continuation with 409 before Agent Runtime/provider execution, preventing a second model call.

Repository PR #204 qualifies `wandora_mastra@0.4.0` so customer-work success terminalizes the exact Paperclip issue with the same run-scoped identity only after the Wandora result is committed, and returns normalized per-run usage. Disposable pinned-Paperclip proof requires `run_count=1`, `continuation_count=0` and usage `11|7|2`.

Production remains on `wandora_mastra@0.3.0`; do not replay the legitimate work merely to clean up historical counters. The next effect boundary is **Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Preflight V1 — NO EFFECT**.


## ADR 0151 — Paperclip customer-work terminal disposition + usage adapter production promotion preflight

Status: **GO for a separate production execution; NO EFFECT performed by the preflight**.

The merged canonical source is `main@c44634ea8f03b491db32fbde9917a2b7a7fcbd16`. The exact `wandora_mastra@0.4.0` package was rebuilt deterministically from that main and frozen at:

```text
/home/wandora-admin/preflights/paperclip-customer-work-terminal-promotion-v1/candidate-0.4.0
sha256 = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c
```

The exact live 0.3.0 registry/package were copied read-only to `rollback-0.3.0`. Live Paperclip still has exactly one `wandora_mastra@0.3.0`, loaded, with official `test-environment=pass`.

MED-1 remains `blocked` with no live run, no checkout/execution run, no scheduled retry, no active recovery action, no blockers and no review path. Its only historical recovery action is resolved. Pinned Paperclip source plus official CLI contract establish the safe historical repair as a board-authenticated, status-only `blocked -> done` mutation with no comment/resume/reassignment/run identity; this path does not enqueue an assignee wake.

The future execution order is frozen in ADR 0151 and the production runbook. Before replacement/restart it must reuse Paperclip's native instance Task Drain and wait for `quiescent=true`; the drain is process-local and is cleared by restart, so it is only a pre-restart quiescence guard. Then promote 0.4.0 through the official instance-admin local-directory adapter boundary, restart only Paperclip once as required, validate one loaded 0.4.0 registration + test-environment PASS and immediately prove no new run/model/outbound activity, then terminalize MED-1 exactly once and prove historical runs remain 2, model calls remain 1 and outbound remains 0.

No historical usage backfill is authorized. The 705-token historical model event remains evidenced by Core; 0.4.0 reports normalized per-run usage prospectively.

Next slice: **Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Execution V1**.

## ADR 0152 / ADR 0153 — Paperclip capability reuse, provider portability and companion Core promotion correction

A full Paperclip capability/portability audit was completed as a repository/no-effect slice against:

```text
Wandora base main = 2e3a9e41eb0013c14da079d95120f03a85ee8f90
Paperclip live    = v2026.916.0
Paperclip source  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
upstream radar    = master@8813a501058b29ae293fee7e94038a737d7d1594
```

### Canonical architecture decision

Paperclip is the current **specialist operational control-plane provider**, not the Wandora product contract.

Wandora remains semantic authority for customer/product identity, customer work/result semantics, commercial policy and final external-effect authorization.

Provider integration may use:

```text
external adapter  -> runtime bridge (current: wandora_mastra)
Paperclip plugin  -> provider-side additive control-plane capability
connector / MCP   -> governed provider-side tool access
```

without making Paperclip IDs, enums, UI or state machines customer-facing Wandora contracts.

The mandatory Exit Test is:

> If Paperclip were replaced, only provider adapter/bindings plus migration of provider-owned operational state should need to change.

Do not achieve portability by duplicating Paperclip tables/state into Wandora.

### Reuse / quarantine decisions

Do not build generic Wandora duplicates for task/run lifecycle, recurrence, watchdog/recovery, organizational Skills, task approval/review, operational budget ledger, generic workspace manager, connector/MCP grant authority, Case/Pipeline engine, provider pricing engine or model router without a proven Wandora-owned gap and a superseding ADR.

Paperclip experimental features default to QUARANTINE. Live production readback confirms these are currently OFF:

```text
Cases
Pipelines
Agent Chat
Chat Connectors
```

### Provider exit strategy

Pinned Paperclip already provides company export/import + export fidelity for company/agents/projects/issues/skills.

Its own fidelity report explicitly states that approval history, cost-event history and activity history are not included.

Provider exit therefore uses:

```text
Paperclip native export
+ minimal Wandora provider-binding/receipt manifest
+ targeted archive/export for adopted non-portable history
```

not a shadow database.

### Usage / cost-event finding

Pinned Paperclip proves:

```text
positive adapter usage
  -> runtime usage totals
  -> Paperclip costEvents
```

If no authoritative monetary cost is supplied, tokens are recorded with:

```text
costCents  = 0
costStatus = unpriced
```

Current v2026.916.0 budget policy supports only `billed_cents`, so unpriced token events do not enforce monetary hard stops.

Wandora must not create a provider-pricing engine merely to manufacture a monetary value.

### Critical production-promotion correction

Fresh inspection of the **compiled live Core** proved the current Paperclip execution bridge returns only:

```text
executionId
model
summary
```

and omits normalized usage.

Current main differs from the live Core executable by exactly one Core source file:

```text
apps/core/src/paperclip-execution/service.ts
```

The live adapter 0.3.0 safely ignores an additive Core `usage` field, and adapter 0.4.0 safely accepts missing usage.

Therefore ADR 0153 supersedes only ADR 0151's **adapter-only execution order**:

```text
Task Drain
-> companion Core image promotion
-> validate Core / no activity
-> adapter 0.4.0 replacement
-> restart Paperclip
-> validate 0.4.0
-> status-only MED-1 repair
-> final unchanged historical counters
-> STOP
```

No new customer work is authorized as telemetry smoke.

### Companion Core candidate

Existing GREEN Core Candidate Artifact:

```text
workflow run      = 35603026602
artifact id       = 10640665492
artifact ZIP sha  = ffebefcbc96596fc97b8506ad0a20fae3f749529f2b75ebddacb3113456cc5b3
artifact source   = 61cbb34d4bfde0350cc765111dc778b22a2a168f
image tag         = wandora/core:organization-adapter-candidate-61cbb34d4bfd
archive sha256    = f278d4466a849a55379297b043dd62eb037eb1659d50513179c35a3d012087a5
OCI manifest      = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
```

The artifact source and current main have zero diff under `apps/core/**` and `infra/stacks/core/**`.

If the artifact is expired/unavailable when execution begins, STOP and regenerate through canonical CI. Do not rebuild an unqualified Core candidate on the VPS.

### Production remains unchanged by ADR 0152/0153

```text
Paperclip = healthy / wandora_mastra@0.3.0
Core      = healthy / image source d5f98ed...
MED-1     = blocked / no live runs / no active recovery
historical Paperclip runs = 2
historical Core model calls = 1
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

Next executable effect remains a separately reviewed **Core companion + wandora_mastra@0.4.0 production promotion execution**, following ADR 0153 and the amended ADR 0151 runbook.


## ADR 0154 — Paperclip Customer-Work Terminal Disposition + Usage Core/Adapter Production Promotion Execution V2

Status: **EXECUTED / GREEN for accepted scope**.

Production now runs the qualified companion Core `wandora/core:organization-adapter-candidate-61cbb34d4bfd` (image id `sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873`) and exactly one `wandora_mastra@0.4.0`. Paperclip remains `v2026.916.0`, healthy, and official adapter test-environment is PASS.

The frozen V2 sequence was executed without replay or provider validation call: Task Drain -> companion Core image-only promotion -> persistent adapter 0.4.0 stage -> one official install/replace -> one Paperclip recreate -> validation -> one Board status-only MED-1 repair -> STOP.

Final invariants:

```text
MEDICSPRO Wandora Ana = exactly 1 / active + supervised
Wandora work          = exactly 1
MED-1                 = done / no live run / 2 historical runs
historical run usage  = null / null (no backfill)
historical model calls= exactly 1
outbound attempts     = 0
Human Send            = OFF
Gateway outbound      = OFF
```

The new Core container produced zero model-usage events, so promotion did not call the provider. The historical second Paperclip run remains preserved; no synthetic/customer replay was used to normalize counters.

Paperclip Ana remains `error` with historical `errorReason=wandora_execution_failed_409` and `updatedAt=2026-09-21T11:49:40.115Z`, tying that projection to the pre-promotion continuation failure. ADR 0154 explicitly forbids hiding it with resume/reassignment in this slice.

### NEXT EXECUTABLE SLICE

**Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1 — NO EFFECT**.

Before any second legitimate customer work, determine the Paperclip-native least-authority transition back to an execution-ready managed-agent lifecycle state. Do not replay MED-1, do not create task/wakeup/run/heartbeat, do not call the model, do not enable Human Send/Gateway outbound, and do not mutate production merely to obtain context.


## ADR 0155 — MEDICSPRO Ana historical Paperclip error-state reconciliation preflight

Status: **NO EFFECT / NO LIFECYCLE MUTATION REQUIRED**.

Pinned Paperclip v2026.916.0 source proves agent `error` is still both assignable and invokable. Ana's current scheduler policy is disabled (`heartbeatEnabled=false`, `intervalSec=0`, `schedulerActive=false`), her org chain is healthy, MED-1 is `done`, live runs are empty and no recovery action is active.

Therefore the historical `errorReason=wandora_execution_failed_409` projection does **not** block legitimate future work and must not be normalized merely for readiness.

Paperclip does provide a dedicated Board-only `POST /api/agents/{id}/clear-error` primitive that conditionally performs `error -> idle`, clears lifecycle error/pause fields and preserves historical runs/runtime diagnostics. It is more precise than `resume`, but it is **not authorized or required** by ADR 0155.

Do not use `resume`, `pause -> resume`, wakeup, retry/recovery, generic status PATCH, managed-agent reconcile or direct SQL to erase this historical projection.

Current accepted invariants remain:

```text
Ana / Wandora               = active + supervised
Ana / Paperclip             = error (historical diagnostic; invokable)
MED-1                       = done
MED-1 live runs             = 0
MED-1 historical runs       = 2
Wandora work operations     = 1 / result_recorded
MEDICSPRO outbound attempts = 0
Human Send                  = OFF
Gateway outbound            = OFF
```

There is **no mandatory historical-error clear execution slice** before future work. Any later operator-facing cleanup of the Paperclip lifecycle display requires a separate explicit effect authorization and must use `clear-error`, not a broader substitute.


## ADR 0156 — second legitimate customer-work preflight correction

Status: **NO EFFECT / IMPLEMENTATION GAP FOUND**.

Pinned Paperclip still treats Ana's historical `error` as invokable, but live Organization Adapter 0.3.0 contains a stricter Wandora-owned `status === idle` customer-work gate. Therefore the provider is ready while the current normal Wandora work-admission path is not.

The accepted least-authority correction is repository-side only: preserve the existing conservative serialization posture but accept `idle | error` before calling Paperclip `issues.requestWakeup`. Keep `running` and all other states rejected locally, and keep Paperclip as the final invokability authority.

Do not clear/resume/pause Ana to satisfy the plugin. No second legitimate work is authorized until a corrected Organization Adapter candidate is implemented, qualified, promoted in a separate execution slice and revalidated.


## ADR 0157 — Organization Adapter 0.3.1 compatibility implementation

Status: **IMPLEMENTED IN REPOSITORY / NO PRODUCTION EFFECT**.

Organization Adapter 0.3.1 changes only customer-work pre-admission from literal `idle` to `idle | error`, keeps `running` and all other states rejected, and leaves Paperclip `issues.requestWakeup` as final invokability authority.

Disposable qualification in exact `wandora/paperclip:v2026.916.0` passed strict typecheck, bundles, 16/16 tests, artifact verification, pinned manifest validation and reproducible `npm pack`.

Candidate package SHA-256: `49bc32b4d22b3000310e01db13c51a3348dc66774a4bf880571154136b3d0240`.

Production remains on Organization Adapter 0.3.0. No second legitimate work is authorized until a separate 0.3.1 promotion preflight and execution are completed.


## ADR 0159 — Organization Adapter 0.3.1 production promotion preflight

Status: **NO EFFECT / GO FOR SEPARATE EXECUTION**.

Live Organization Adapter remains exactly one `0.3.0 / ready`. The qualified 0.3.1 promotion artifact is the canonical GitHub Actions package from `main@d4d9ecc69cce33f6b0553b8372e576c56a4d91ac`: artifact ZIP SHA-256 `2a6bba462b4998736493eb70f00da90ba8f4d99117bbae384fbeb87467d9ce2f`, package SHA-256 `06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d`.

Pinned Paperclip source proves the correct local-path promotion is **soft uninstall without purge + local-path reinstall**. The same plugin row/ID and company config are preserved across that path. Plugin load starts the new worker in-process, so no Paperclip restart is required.

The future execution must not clear/resume Ana or create a second customer work as validation. Current invariants remain Ana `active + supervised` in Wandora, historical `error` in Paperclip, MED-1 done, 0 live runs, 2 historical runs, one recorded Wandora work and zero outbound attempts.


## ADR 0160 — Organization Adapter 0.3.1 production promotion execution

Status: **EXECUTED / GREEN**.

Production now runs exactly one `wandora.organization-adapter-v1` at `0.3.1 / ready / healthy`, with the same plugin ID `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, the same company config hash `83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326`, and no Paperclip restart.

Promotion used the ADR 0159 path: exact CI artifact staging -> one soft uninstall without purge -> same-row/config readback -> one local-path install -> in-process worker activation.

Safety state is unchanged: Ana remains Wandora `active + supervised` and historical Paperclip `error / wandora_execution_failed_409`; MED-1 remains `done`, live runs 0, historical runs 2, work count 1, added model calls 0, outbound attempts 0, Human Send OFF and Gateway outbound OFF.

No second legitimate customer work is authorized by the promotion itself.


## ADR 0161 — MEDICSPRO Ana second legitimate customer work production execution

Status: **EXECUTED / GREEN**.

A genuine authenticated MEDICSPRO owner submitted the second legitimate supervised work through the normal Wandora Web surface while Paperclip Ana still carried the truthful historical `error / wandora_execution_failed_409` projection.

Organization Adapter 0.3.1 admitted the work without lifecycle normalization. The normal path created exactly one new Wandora work and one new Paperclip issue, ran exactly one native assignment execution through `wandora_mastra@0.4.0 -> Core -> Agent Runtime/Mastra -> Mistral`, recorded 273 input + 740 output = 1013 total tokens prospectively, terminalized the issue as `done`, and naturally finalized Ana from historical `error` to `idle`.

Final invariants:

```text
Wandora works          = 2 total
Paperclip issues       = 2 total
new issue runs         = 1
continuation runs      = 0
active recovery        = none
new model calls        = 1
outbound attempts      = 0
Human Send             = OFF
Gateway outbound       = OFF
```

No `clear-error`, resume/pause, direct SQL work creation, synthetic work, privileged owner impersonation, retry or external send was used.

Next recommended axis: **Customer Product Surface / Demo Readiness**, prioritizing real canonical product state over placeholders before additional infrastructure expansion.

## ADR 0162 — Customer Product Surface Canonicalization V1

Status: **IMPLEMENTATION FOUNDATION / CODE + CI GREEN / NO PRODUCTION EFFECT**.

The approved Wandora customer-panel prototype is now the canonical design direction for customer-facing surfaces. Its visual language, navigation, hierarchy and business vocabulary are accepted; its demonstration names, counts, money, approvals, tools, rules and activity are not production truth unless backed by a real contract.

The first implementation slice ports the approved cream/black/lime/yellow design language into the existing React/Vite/TanStack Web shell and replaces the fictitious dashboard with a real-state-only Início.

The new Início reuses only existing authenticated digital-employee and customer-work reads and derives only employee count, active employee count, returned work count, review-ready count and latest work. It deliberately does not invent approval, revenue, conversation, opportunity, meeting, outbound or tool-connectivity facts.

No backend capability, migration, runtime mutation or outbound effect is introduced. Human Send and Gateway outbound remain unchanged/off.

Next page-by-page convergence should continue from the canonical matrix in `docs/product/customer-surface-canonicalization-v1.md`, with grounding / `Regras da casa` authority review before expanding autonomous outbound behavior.


## ADR 0163 — Customer Team Surface Canonicalization V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The owner-approved Equipe design has been ported into the existing React/Vite/TanStack customer Web using only real authenticated digital-employee, activation, hire-availability and customer-work contracts.

Real role/status/supervised-autonomy state remains authoritative. Prototype-only trainings, performance scores, human teammates, response-time claims, candidate queues and unsupported autonomy levels are not promoted as product truth. Non-current autonomy levels are visibly future/non-actionable.

The existing activation safety contract remains intact, including explicit customer copy that activation **Não inicia trabalho** and **não libera envios externos**.

All existing Web/Core/Platform Admin/Messaging Gateway checks were GREEN on the implementation head before this documentation checkpoint. No production deployment, runtime mutation, employee activation, work creation or outbound effect occurred.

Next recommended slice: **Customer Work Result Presentation V1**, including safe rich-text/Markdown presentation for legitimate internal work results.


## ADR 0164 — Customer Work Result Presentation V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The customer-work result surface now has a bounded safe renderer for headings, paragraphs, strong text, inline code, lists and quotes. Markdown link/image targets are discarded and raw HTML remains escaped React text.

The result renderer does not use `dangerouslySetInnerHTML`, `innerHTML` or model-provided hyperlinks. A dedicated build verifier proves the safe-rendering contract and remains GREEN alongside the existing customer-work idempotency verifiers.

The `Início` latest-work preview now uses normalized plain text instead of exposing raw Markdown markers.

No backend, execution, model, database, outbound or production runtime effect occurred.

Next product-surface target: canonicalize `Conversas` against existing real reads, then review `Empresa / Regras da casa` authority for grounding.


## ADR 0165 — Customer Product Surface Web Production Promotion V1

Status: **EXECUTED / GREEN**.

The exact merged-main Web artifact from `main@2e23abd8852558155a4e1475c5891962ab03d6fa` / Web CI #628 is now live.

Production Web:

```text
tag = wandora/web:candidate-2e23abd88525
host OCI manifest id =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916
health = healthy
restart = 0
```

The live stack selector is now reconciled to the same tag. A previously stale selector from ADR 0135 was identified and corrected during the promotion; rollback authority remains the actual prior live image `candidate-88facf57466d`.

The deployed customer bundle contains the canonical shell, real-state-only Início, Equipe canonicalization and safe internal work-result rendering from ADRs 0162–0164.

Public routes remain available, unauthenticated `/api/v1/me` remains 401, MEDICSPRO remains at exactly 2 customer works with Ana `active + supervised`, outbound attempts remain 0, Human Send remains OFF and Gateway outbound remains OFF.

Only Web was recreated.

Next recommended slice: **Conversas Surface Canonicalization V1**, followed by `Empresa / Regras da casa` grounding authority review.


## ADR 0166 — Customer Conversations Surface Canonicalization V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The customer `Conversas` surface now uses the canonical Wandora visual/product language while reusing only the already-live tenant-authorized list/history contracts from ADRs 0020 and 0021.

Real contact labels, open/closed status, associated employee, latest message, bounded recent history and inbound/outbound direction are rendered. `hasEarlierMessages` remains explicit.

No unread model, presence, typing state, composer, takeover, assignment mutation or outbound action was added. The page remains `somente leitura` and provider-neutral.

Implementation CI was GREEN across Web, Core, Platform Admin and Messaging Gateway.

Production Web remains governed by ADR 0165 until a separate promotion of the new merged-main artifact.


## ADR 0167 — Customer Conversations Surface Production Promotion V1

Status: **EXECUTED / GREEN**.

The exact merged-main Web artifact from `main@65908b76c667e1326b0c73584766b8cc4ad73c0e` is live as:

```text
wandora/web:candidate-65908b76c667
host OCI manifest id =
sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e
healthy / restart 0
```

The canonical `Conversas` surface is now production-active and remains explicitly read-only. No composer, send, takeover, unread/presence or new backend capability was activated.

MEDICSPRO remains at exactly 2 customer works, Ana remains `active + supervised`, outbound attempts remain 0, and Core/Paperclip/Gateway were unchanged.

Next axis: **Empresa / Regras da casa Capability Authority Review V1** for grounding.


## ADR 0168 — Permanent Session Continuity + Provider Pluggability Guardrails V1

Status: **CANONICAL GUARDRAIL / NO PRODUCTION EFFECT**.

Future sessions must recover from repository + live state rather than visible chat history. Handoff prompts are bridges only. After timeout, disconnect or chat change, verify whether prior operations executed before repeating them.

Provider portability is now explicitly universal:

> **Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.**

For every material provider-backed capability, separate:

- semantic authority;
- minimum durable product state;
- operational authority;
- current provider implementation;
- replacement/migration boundary.

Paperclip, Mastra and future specialist providers remain replaceable behind Wandora-owned contracts/adapters. Operational lifecycle, orchestration, runtime memory, retrieval, embeddings/vector search, context assembly, tool execution and runtime skills remain delegable unless a newer ADR proves a Wandora-unique reason to own implementation.

ADR 0158 remains the current normal CI authority: GitHub-hosted `ubuntu-24.04`; ADR 0113 is historical/fallback-only.


## ADR 0169 — Empresa / Regras da Casa Grounding Authority + Durable Contract V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The grounding authority review concludes that official company facts, owner house rules and their provenance/source references are Wandora-owned durable product semantics. Paperclip remains control-plane authority for Skills, Decisions/Decision Training, Connections/grants and organizational lifecycle. Mastra/runtime remains implementation authority for memory, retrieval, embeddings/vector search, context assembly, runtime skills/tools and evals when separately qualified.

Migration `20260922_017_organization_grounding_contract_v1.sql` introduces only the minimum `wandora.organization_grounding_entries` contract. Core receives tenant-scoped SELECT only; no Core writes and no direct browser/authenticated table access are authorized.

Disposable Supabase/PostgreSQL proof is GREEN: migration apply, RLS isolation, cross-tenant denial, Core write denial and provenance constraint all passed.

**Migration 017 is NOT live.** No MEDICSPRO facts/rules were created, no runtime grounding was injected, no model call or outbound effect occurred. Human Send and Gateway outbound remain OFF.

Next recommended slice: **Organization Grounding Owner Mutation + Customer Read Contract V1 — code-only / no production effect**, followed separately by Runtime Grounding Projection V1.


## Organization Grounding Owner Mutation + Customer Read Contract V1 — code-only checkpoint

ADR 0170 implements the bounded owner/admin mutation + customer read contract over migration 017.

- Core table authority remains SELECT only under tenant RLS.
- Owner/admin mutations use narrow audited SECURITY DEFINER functions.
- member mutation and cross-tenant access fail closed.
- corrections create a new approved_correction entry and retire, rather than rewrite, prior history.
- approved_source and approved_correction require explicit evidence references.
- browser roles have no direct table/function access.
- no Paperclip/Mastra/runtime projection was introduced.

Migration 017 remains absent from production; no real MEDICSPRO grounding was created and outbound gates remain outside this slice.
## ADR 0171 — Organization Grounding Runtime Projection V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The Paperclip execution boundary now requires a provider-neutral Wandora grounding snapshot before Agent Runtime execution. Active `fact` entries project to `officialFacts[]`; active `rule` entries project to `houseRules[]`; retired entries are excluded; `workContext` remains separate from official truth.

The projection reuses migration 017 only, runs tenant-scoped/read-only, exposes no provider IDs, gives runtime no write authority, and adds no memory/RAG/vector/embedding/chunking/document subsystem. The existing execution-bridge readiness gate now fails closed when the migration-017 read boundary is unavailable.

Migration 017 remains **ABSENT in production**. No MEDICSPRO grounding was created, no Core/Web/Paperclip/Gateway deployment occurred, no model call/work/run/outbound effect occurred, and Human Send/Gateway outbound remain unchanged/off.

Next recommended slice: **Empresa / Regras da Casa Customer Surface V1 — CODE ONLY / NO PRODUCTION EFFECT**, before any production migration/promotion.


## ADR 0172 — Empresa / Regras da Casa Customer Surface V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The customer /company surface now consumes only the canonical Core grounding API from ADR 0170. Active facts and rules are shown separately as **Fatos oficiais da empresa** and **Regras da Casa**; retired entries remain visible as preserved history.

Owner/admin memberships receive create, correction and retirement controls. Members remain read-only. Correction is append-and-retire with mandatory evidence; there is no hard delete or edit-in-place path. Raw sourceRef is not rendered back to the customer; optional sourceLabel may be shown.

No new table, migration, grounding store, RAG, vector, embedding, chunking, document store, memory or provider-specific customer contract was created.

The production-shaped Web Docker build and all prior Web verifiers are GREEN, including WANDORA_WEB_COMPANY_GROUNDING_SURFACE_V1_OK.

Migration 017 remains **ABSENT in production**. No MEDICSPRO fact/rule was created, no Core/Web deployment occurred, no model/work/run/outbound effect occurred, and Human Send/Gateway outbound remain unchanged.

Next decision after exact-head CI/merge: **Organization Grounding Production Promotion Preflight V1 — NO EFFECT**; production promotion is not implied by this code-only slice.

## ADR 0200 — Customer Company Profile + First Access Onboarding Production Promotion Execution V1 — Partial Checkpoint

Status: **PARTIAL / FAIL-CLOSED**.

Migration 019 is now live and verified. The exact qualified Core and Web candidates from executable `main@0a7f368331882f6dcfe4ff1fe722be6e442354a5` are production-active and healthy:

```text
Core = wandora/core:organization-adapter-candidate-0a7f36833188
Web = wandora/web:candidate-0a7f36833188
```

A fresh protected pre-019 backup was captured and restore-readiness proved in a disposable PostgreSQL container. The canonical onboarding overlay was activated briefly and Core remained ready, but production has zero unlinked Auth users and no canonical legitimate smoke e-mail alias.

The required invite-only smoke therefore could not be performed without inventing identity state. The onboarding flag was turned back OFF. No organization profile, new identity, employee, provider binding, work, model run or outbound effect was created.

Do not repeat migration 019 or Core/Web promotion. Next slice is **Customer Company Profile + First Access Onboarding — Invite-Only Smoke + Final Flag Activation V1**, requiring one legitimate e-mail address authorized to receive the production invite.

## ADR 0201 — Customer Company Profile + First Access Onboarding Invite-Only Smoke — Invite Execution V1

Status: **PARTIAL / EXACTLY ONE REAL INVITE APPLIED / ACCEPTANCE PENDING**.

One explicitly authorized real production invite was sent through the existing Supabase Auth provider-native invite route with redirect to /accept-invite. The target address is intentionally omitted from Git.

Read-back proved exactly one pending invited Auth identity: target auth rows=1, invited_at present=1, confirmation_sent_at present=1, confirmed=0, signed in=0, target one-time tokens=1. No retry occurred.

The target still has zero Wandora identity mappings, no organization/profile and no hire operation. Core/Web/Auth/Paperclip/Gateway remain healthy. The onboarding flag remains OFF.

One globally-enabled MEDICSPRO ana-commercial-v1 eligibility row is pre-existing and unrelated to this invited identity.

Next safe slice: **Customer Company Profile + First Access Onboarding — Invite Acceptance + Final Flag Activation + Company Profile Smoke V1**. The recipient must first open the delivered Wandora invite and establish the first password. Do not resend automatically; reconcile provider state first if delivery is questioned.


## ADR 0201 final — Customer Company Profile + First Access Onboarding

Status: **COMPLETE / PRODUCTION ONBOARDING ACTIVE / REAL INVITE-ONLY SMOKE PASSED**.

The authorized invite was accepted and the recipient completed company onboarding successfully. Production reconciliation proves exactly one Auth identity, one Wandora identity, one organization, one active owner membership and one organization profile for the new tenant. The onboarding flag is ON and Core/Web/Auth/Paperclip/Gateway are healthy with zero restarts.

Scoped to the new organization: digital-employee eligibility=0, hire operations=0, outbound attempts=0. No Paperclip/Mastra/work/outbound side effect was created by onboarding.

BrasilAPI remains enrichment-only; CPF/CNPJ/CEP validation remains local and deterministic. With the live adapter headers, provider probes from Core returned HTTP 200 for both CEP and CNPJ.

## ADR 0202 — Provider-Neutral Business System Contract + VendaERP Read-Only Adapter V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The first ERP integration slice introduces a provider-neutral Business System read contract plus a VendaERP adapter. V1 is deliberately limited to connection probe, companies, products, stock, price tables/product prices, people/customers/suppliers and orders.

No integration table, secret manager, browser credential flow, Paperclip Connection, Mastra tool exposure, production credential or live VendaERP call is part of this slice. Paperclip Connections/grants/secrets remains the candidate organizational connection authority and must be qualified before real credential onboarding. Paperclip Tool Gateway remains quarantined.

Mobile/conversational access is now an explicit invariant: channel address -> verified Wandora identity/contact -> organization relationship/role -> capability/effect authorization. A phone number alone never grants authority, and ERP party records are commercial mappings rather than Wandora identity authority.

Next safe slice after exact-head CI/merge: **Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1 — NO EFFECT**.

## ADR 0203 — Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1

Status: **COMPLETE / REUSE PAPERCLIP CONNECTIONS + SECRETS / LIVE CONNECTION NOT YET AUTHORIZED**.

Paperclip v2026.916.0 was inspected at pinned source `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`. It can represent the VendaERP credential set as three secret-backed header credential refs and already supplies company-scoped secrets, Connections, grants, installs, responsible-user routing and run-bound secret access.

Board/company APIs do not provide a general plaintext secret-read path to Wandora Core; agent secret value resolution is deliberately run-bound. Therefore Core must not retrieve the ERP token from Paperclip and call VendaERP as a secret bypass.

Paperclip Tool Gateway can internally resolve granted connection secrets and inject multiple HTTP headers, but remains quarantined by canonical authority and requires a dedicated read-only qualification before production use.

28PRO currently has no Paperclip company/provider binding, as intended by first-access onboarding. Any provider company required for Connections must be lazily materialized only after explicit integration intent and must not hire/activate an employee or create work.

Next safe slice: **Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**. Do not enter the real VendaERP token before that slice closes GREEN.

## ADR 0204 — Wandora Commercial Activation + Starter Digital Employee Product Contract V1

Status: **ACCEPTED PRODUCT CONTRACT / NO PRODUCTION EFFECT**.

Wandora's V1 commercial product includes one starter digital employee. Invite/account/company-profile onboarding remains a separate, effect-minimal transition and is not itself proof of purchase or entitlement.

`ana-commercial-v1` is reused as the starter employee V1. No second employee catalog, lifecycle engine or provisioning subsystem is introduced.

A customer-facing state described as Wandora active/ready for work requires: active organization + starter entitlement + exactly one Paperclip company binding + exactly one completed starter hire + exact employee/provider binding + Ana active/supervised. This readiness does not imply work execution, Mastra run, outbound messaging or ERP write authority.

ADR 0204 supersedes ADR 0203 only on provider-company timing for commercially activated customers: Paperclip company materialization belongs to starter-workforce provisioning, not to the later ERP-connection event. ERP remains an optional tool attached to the already-existing workforce.

28PRO is currently onboarded but not starter-workforce ready. No production mutation is authorized yet.

Next safe slice: **Starter Digital Employee Commercial Activation Composition V1 — CODE ONLY / NO EFFECT**. After that is GREEN, run **28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT** before any real provisioning.

## ADR 0205 — Starter Digital Employee Commercial Activation Composition V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

Core now has a provider-neutral starter-workforce readiness projection and authenticated read-only route `GET /api/v1/organizations/:organizationId/starter-workforce`.

Readiness is derived only from existing product/provider reconciliation state and returns one of: `commercial-activation-required`, `provider-company-required`, `hire-required`, `activation-required`, `ready`, `reconciliation-required`.

No new table/migration/state machine exists. Eligibility remains starter-provisioning policy rather than billing state. The route exposes no provider company/agent refs or secrets. Web Nginx allows only the exact UUID-scoped read route.

Local strict TypeScript typecheck/build and 6 dedicated tests are GREEN.

Next safe slice after exact-head CI/merge: **28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT**. Do not create the Paperclip company, enable eligibility, hire or activate Ana before that preflight freezes the exact sequence and ambiguity recovery.

## ADR 0206 — 28PRO Starter Digital Employee Production Activation Preflight V1

Status: **GREEN / NO EFFECT / PRODUCTION EXECUTION QUALIFIED**.

28PRO live state was reconciled as one active organization with one active owner and zero starter eligibility, zero Paperclip control-plane binding, zero employees, zero matching Ana, zero starter hire operations and zero employee/provider bindings.

Paperclip v2026.916.0 is healthy and contains exactly three existing companies: Wandora Customer Hire Canary, Wandora Internal Supervised Proof and MEDICSPRO. Exact `28PRO` provider-company matches = 0. The protected Board credential still reads as `isInstanceAdmin=true`.

Live Core has Organization Adapter, customer hire and customer activation gates ON. Paperclip Organization Adapter plugin is ready at v0.3.1. No Human Send flag and no Gateway outbound enable flag were observed.

The production execution sequence is frozen as: Paperclip company create -> Organization Adapter binding/HMAC/secret/config -> starter eligibility -> canonical paused-first hire -> supervised activation. Reconcile between every non-atomic effect; no blind retry.

No effect occurred in this preflight.

Next safe slice: **28PRO Starter Digital Employee Production Activation Execution V1**. After starter workforce is proven `ready`, resume the provider-neutral ERP path; VendaERP remains only the first ERP provider.

## ADR 0207 — 28PRO Starter Digital Employee Production Activation Execution V1

Status: **PARTIAL / SAFE STOP AT ORGANIZATION-ADAPTER SECRET CUSTODY STEP**.

Execution reconciled exactly one active Paperclip `28PRO` company (`5d7ec217-118c-4292-8136-0a9ab16926ea`), exactly one matching Wandora control-plane binding and an existing deterministic host HMAC file with `0640 wandora-admin:wandora-ops` custody.

Current Paperclip company state: 0 Organization Adapter secrets, plugin config `null`, 0 agents. Current Wandora starter state: 0 eligibility, 0 employees, 0 hire operations, 0 employee/provider bindings.

Remote execution tooling blocked the secret-transfer command before host execution. No secret-create request was dispatched. Do not recreate company, binding or HMAC.

Continuation begins only at Paperclip HMAC secret creation, then plugin config -> eligibility -> paused-first hire -> activation, with reconciliation after every effect.

### ADR 0207 continuation — 28PRO starter wiring ready for owner hire

28PRO Organization Adapter wiring is now complete: exactly one active Paperclip HMAC secret, exact company-scoped plugin config with referenceCount 1 and lastError null, and zero provider agents.

`ana-commercial-v1` eligibility is now enabled through the canonical least-privilege operator function. 28PRO still has 0 digital employees, 0 starter hire operations and 0 employee/provider bindings.

Next effect is the normal owner/admin authenticated hire from the customer UI. Do not replace that boundary with an operator/direct-provider shortcut.

### ADR 0207 complete — 28PRO starter workforce ready

Owner-authorized hire and activation completed through the existing customer contracts. Final reconciliation proves exactly one Ana, hire `completed`, one employee/provider binding, Wandora Ana `active + supervised`, Paperclip Ana `idle`, 0 work items and 0 outbound attempts.

28PRO is now starter-workforce ready. No Mastra run or external send was caused by activation.

Next safe slice: **Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**; only after that should the real 28PRO VendaERP read-only connection be activated.
