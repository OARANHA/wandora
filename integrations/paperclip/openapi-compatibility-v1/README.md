# Paperclip OpenAPI Compatibility Gate V1

Repository-only, private provider dependency inventory. **NO PRODUCTION EFFECT.**
This is not a public Wandora API, a second capability registry or an upgrade approval.

## Run locally (offline)

From the repository root, with Node 24:

```sh
node integrations/paperclip/openapi-compatibility-v1/scripts/baseline.mjs verify integrations/paperclip/openapi-compatibility-v1
node integrations/paperclip/openapi-compatibility-v1/scripts/check.mjs integrations/paperclip/openapi-compatibility-v1/fixtures/paperclip-v2026.916.0.openapi.json integrations/paperclip/openapi-compatibility-v1/wandora-paperclip-api-contract.json
node --test integrations/paperclip/openapi-compatibility-v1/test/*.test.mjs
```

No npm install, network, environment configuration, credentials, Docker, database,
Paperclip server or model is needed. The checker only reads its two JSON inputs.

Candidate comparison:

```sh
node integrations/paperclip/openapi-compatibility-v1/scripts/check.mjs /absolute/path/candidate.openapi.json integrations/paperclip/openapi-compatibility-v1/wandora-paperclip-api-contract.json
```

Exit codes: `0 PASS`, `1 FAIL compatibility/coverage`, `2 FAIL invalid input`.
Diagnostics identify class, method, path, field and rule and have stable ordering.
Class A/B differences block; Class B identifies the affected specialist feature in
the manifest reason. Class C differences warn only. Additive paths/methods/optional
response fields, prose and changes outside the consumed subset are non-blocking.

## Versioned manifest

`wandora-paperclip-api-contract.json` uses `schemaVersion: 1`. Its strict executable
schema is `validateManifest()` in `scripts/check.mjs`, following existing explicit
JSON/assertion validators in this repository. Unknown manifest keys, invalid
classes/shapes, duplicates, absent evidence and empty inventories are rejected.

Each entry has an exact path/method, A/B/C class, runtime/operator/radar context,
reason, repository evidence anchors, client request shape, consumed response
projection, and declared security boundary. Evidence anchors are tested against
the checkout. This is a reviewed inventory, not automatic discovery of new usages:
when a caller/runbook changes, reviewers must update it or explain no dependency delta.

Request `required` means **always sent by this client**, not provider-required.
Candidate required properties must be in that set, including nested objects.
Response properties mean **consumed when present / expected in the selected
context**; `required` is used only when a provider presence guarantee is explicitly
needed. V1 avoids asserting global presence guarantees for contextual agent metadata
or adapter version. Enum values are only the values sent/branched on by Wandora.
Nullability is directional: request narrowing and response widening can break the
client; response narrowing is compatible. Path/query parameters are checked as well.

| Class A dependency | Methods | Evidence / consumed subset |
| --- | --- | --- |
| health | GET | E2E readiness + maintenance; `status` |
| agents/me | GET | Core run identity; `id`, `companyId`, `name`, `role`, managed metadata keys |
| adapters | GET | maintenance inventory; array `type`, `loaded`, `version` |
| adapters/{type} | GET | maintenance get/readback; same selected adapter fields |
| adapters/install | POST | disposable install + maintenance; local package request, `type`, `version`, `requiresRestart` |
| companies/{companyId}/adapters/{type}/test-environment | POST | official adapter check; empty body, `status` |
| issues/{id} | GET, PATCH | adapter status-only completion and ambiguity readback; maintenance run ownership readback |
| issues/{issueId}/live-runs | GET | maintenance empty array check |
| issues/{id}/runs | GET | maintenance historical array count |
| issues/{id}/recovery-actions | GET | maintenance `active` null/object check |
| instance/task-drain | GET, POST, DELETE | bounded TTL, quiescence projection, abort release |
| plugins/{pluginId}/webhooks/{endpointKey} | POST | actual Core reconcile/activate/work client; acknowledgment status/deliveryId |

All paths have `/api` prefix. There are 15 A operations, no fabricated B entries,
and 2 C GET routes (company cases/pipelines), from the canonical quarantine map.
Runbook dependencies describe the maintained operator/API contract. ADR 0154 records that the qualified Core + adapter 0.4.0 promotion has since executed successfully; this gate itself neither authorizes nor performs production execution.

### Deliberate exclusions

- `agents.resume`, managed agents, `issues.list/create/requestWakeup`, plugin state
  and secret refs are **SDK calls**, not HTTP calls to similarly named routes.
  Existing pinned plugin/adapter contract tests and disposable proof own that boundary.
- Pause and standalone agent wake REST routes have no current admitted runtime use.
- Disposable-only company/agent/issue setup and heartbeat invoke are test harness
  dependencies, not production HTTP dependencies. Existing E2E still tests them.
- Cost events are ingested internally by Paperclip from adapter usage; no direct
  cost-event REST dependency is invented. Other radar capabilities remain in the
  canonical capability maps rather than duplicating their whole catalog here.

## Honest baseline and coverage

Baseline source: `paperclipai/paperclip`, `v2026.916.0`,
`dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`.
The official `buildOpenApiDocument()` was executed locally without starting a server;
it produced 685 paths. No production OpenAPI endpoint was accessed.

The full generated spec is 2.7 MiB and mostly unrelated to this gate. We retain the
exact selected operations and referenced components (~88 KiB), **without dropping
optional request fields or required lists**, plus the full generated byte SHA-256
and generation metadata. Extraction is deterministic and source-pinned. The full
spec can be reproduced with the commands below; its size is not used as a reason
to discard consumed contract information.

Files:

- `fixtures/upstream-subset-v2026.916.0.json`: exact extracted OpenAPI, including its gaps;
- `fixtures/source-supplement-v2026.916.0.json`: explicit source-reviewed projections
  for 12 operations with generic responses, and the omitted plugin payload;
- `fixtures/paperclip-v2026.916.0.openapi.json`: normalized comparison input;
- `fixtures/provenance.json`: full upstream digest, artifact SHA-256s, source SHA,
  source/builder/lockfile provenance and generation dependency versions.

Most upstream responses are `{type: object, additionalProperties: {}}`, even when
the handler returns an array. The supplemental shapes are **not upstream OpenAPI
guarantees**. They are a manually reviewed consumed projection of pinned handlers,
types and the current Wandora plugin contract. Source file hashes and explanations
are retained in the supplement. No live payloads, customer IDs, private hostnames
or secret values were used.

**The raw upstream subset intentionally FAILS coverage.** The checker never fills
candidate holes with the old baseline, reads a supplement implicitly or treats an
unknown schema as compatible. For a future candidate whose OpenAPI is still
incomplete, independently review that candidate's pinned source, produce an explicit
candidate-specific supplement/projection, and submit its source provenance and
tests for review. Do not copy the old supplement and change a version label.
The generator checks the exact full-spec digest and relevant source-file hashes
before applying the reviewed supplement, and refuses to replace missing or typed
responses. A reviewer must decide any new schema evidence; this gate cannot infer
it from a generic response declaration.

### Security coverage is declared, not effective

The checker compares effective OpenAPI security inheritance, OR/AND requirements,
scopes, scheme transport/flow details and `x-paperclip-authorization`. It ignores
scheme descriptions and requirement order. Losing an actor declaration blocks.

Pinned v916 itself misstates some enforcement: adapter install and drain mutations
have stronger instance-admin checks in source; the plugin webhook authenticates
through plugin HMAC while OpenAPI describes Board auth. These mismatches are
preserved, not silently rewritten as upstream facts. Changes in the declarations
are detected; unchanged declarations do not prove actual auth unchanged. Run-JWT,
run-header, tenant, HMAC and instance-admin enforcement still require pinned-source
review and existing negative/disposable tests. This gate never uses Board credentials.

### Supported comparison subset

OpenAPI 3.0/3.1 JSON; local schema/requestBody/response/parameter refs; explicit
scalar/object/array shapes; nested consumed properties; request required sets;
directional type/nullability; consumed enum values; request numeric/string bounds,
format/pattern constraints; success status and JSON content; declared security.

Remote refs, cycles, missing/generic consumed schemas, ambiguous types, compositions
(`oneOf`, `anyOf`, `allOf`) on consumed nodes and unsupported consumed request
constraints fail for explicit qualification. The same constructs outside the
consumed subset do not block. This is intentionally not universal OpenAPI equivalence.

The gate cannot prove wake behavior, Task Drain process locality, retry ambiguity,
scheduler/recovery semantics, transaction/idempotency, data-dependent metadata,
SDK/loader contracts, or actual authorization enforcement. Every material upgrade
still requires **pinned-source review + migrations review + disposable proof +
rollback proof**. PASS is never authorization to upgrade, activate work or send.

## Baseline reproduction

Offline byte reproduction and digest verification use the first command above.
Full source reproduction is a separate developer task, **never CI**. With an
already checked-out pinned Paperclip source and its frozen-lockfile dependencies:

```sh
# Prepare source/dependencies outside CI if not already available:
git clone --branch v2026.916.0 --depth 1 https://github.com/paperclipai/paperclip.git /tmp/paperclip-v916
git -C /tmp/paperclip-v916 rev-parse HEAD
# Must print dffc2b3ca1b9e88fa21cb17493083e682dffd1ca.
(cd /tmp/paperclip-v916 && pnpm install --frozen-lockfile)

# Run from the Wandora repository root. Import the source builder only.
node --import /tmp/paperclip-v916/server/node_modules/tsx/dist/loader.mjs integrations/paperclip/openapi-compatibility-v1/scripts/export-upstream.mjs /tmp/paperclip-v916 /tmp/paperclip-v916.openapi.json
node integrations/paperclip/openapi-compatibility-v1/scripts/baseline.mjs generate /tmp/paperclip-v916.openapi.json /tmp/paperclip-v916 integrations/paperclip/openapi-compatibility-v1/wandora-paperclip-api-contract.json integrations/paperclip/openapi-compatibility-v1/fixtures/source-supplement-v2026.916.0.json
git diff --exit-code -- integrations/paperclip/openapi-compatibility-v1/fixtures
```

The initial export used the same locked `zod@4.4.3`, `express@5.2.1`, `tsx@4.23.12`
in a disposable local dependency directory (no server-wide install), linked only
to pinned `@paperclipai/shared`. Source generation is not a runtime/production task.
`verify` regenerates from committed inputs in memory and never rewrites fixtures.

## CI and maintenance

`.github/workflows/paperclip-openapi-compatibility.yml` uses the canonical isolated
`[self-hosted, linux, x64, wandora-ci]` runner. It reuses the already-provisioned Node
24.21.0 tool cache and fails if unavailable; it does not download Node. After the
ordinary repository checkout, all gate steps are offline and run in under a minute.
No upstream checkout, package install, Docker command, production path or secret.

A narrow workflow is intentional: the existing Paperclip adapter/plugin workflows
fetch upstream, install its dependencies and run heavy disposable integration proofs.
Those remain unchanged. They should not run merely to validate a JSON fixture change.
Changes to callers also trigger this inventory gate. Existing workflow exclusions
for runtime packages and negative customer-provider leakage tests remain unchanged.

Offline tests also compare the manifest version/source against both integration
compatibility files, the two pinned-source CI workflows and Paperclip Compose build/image
pins. Changes to those files trigger the gate. A provider bump cannot silently
keep an old baseline while these pins are checked.

Before upgrading, run the checker against the **candidate input**, not only the
baseline. CI validates the checked-in baseline, current provider pins and mutation
tests; reviewers must examine candidate comparison evidence, manifest changes and provenance changes;
a curated inventory cannot discover every newly added caller automatically.
