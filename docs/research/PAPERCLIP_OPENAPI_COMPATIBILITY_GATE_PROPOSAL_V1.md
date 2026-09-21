# Paperclip OpenAPI Compatibility Gate Proposal V1

Date: 2026-09-21
Status: **V1 repository implementation — baseline, deterministic checker, mutation tests and offline CI; NO PRODUCTION EFFECT**

Implementation: [`integrations/paperclip/openapi-compatibility-v1/`](../../integrations/paperclip/openapi-compatibility-v1/README.md).
The implementation notes below supersede the original candidate list and artifact sketch.

## Implementation decision and evidence

REAL NOW at implementation start: remote `main` and the local checkout were independently confirmed at
`7dbf7d671989c7dd5d41da86ebcb370286c89100` (merged PR #207). After ADR 0154 / PR #209 advanced canonical `main`, this gate was re-reviewed against
`6d8612fc9e47e07c2049adf4112554f9440570c2`; the only overlapping evidence file changed on main was the V2 operator runbook, whose relevant API anchors remain present. No production system, credential or customer data was accessed for this implementation.

PROVEN EVIDENCE / REUSE:

- Paperclip adapter tests already use Node `node:test`, `node:assert/strict` and
  `.mjs` with no install needed; Core uses TypeScript, `tsx`, Zod and Node tests.
- Component-local verifiers already live alongside integrations and in `scripts/`:
  adapter `verify-live-image.mjs`, plugin `scripts/verify-artifact.mjs`, Web `scripts/verify-*.mjs`.
- JSON contracts already use `JSON.parse` plus explicit shape/assertion checks;
  Zod is a Core runtime dependency, not an existing standalone OpenAPI gate.
  No executable OpenAPI comparator/extractor was found in Wandora. Transitive
  AJV/json-schema packages in Core's lockfile are not an existing verifier.
- Existing `paperclip-mastra-adapter-ci.yml` and `organization-adapter-plugin-ci.yml`
  fetch/install pinned Paperclip and qualify loader/SDK/disposable behavior. They
  remain authoritative for those boundaries. A separate narrow workflow avoids
  upstream/network/Docker requirements for this fixture-only gate.
- Actual HTTP consumers are Core `paperclip-run-identity.ts`, the Mastra adapter's
  issue completion/readback and Core `organization-adapter/paperclip-provider.ts`.
  Qualified maintenance dependencies come from ADR 0151/0153 and the V2 runbook.
  Every manifest operation records tested repository evidence anchors.

GAPS: the source-generated v916 OpenAPI has 685 paths but most critical responses
are untyped generic records; some auth declarations also understate or misdescribe
handler enforcement. Comparing generic objects would silently miss breaking changes.

CAPABILITY AUTHORITY / REUSE GATE: reuse Paperclip's own source builder and the
existing Node verifier style. This adds private repository compatibility evidence,
not a task engine, runtime dependency, public API, database, or capability registry.
Paperclip remains replaceable; only its implementation dependency inventory is frozen.

DECISION: 15 Class A operations (runtime plus explicitly labeled operator-runbook),
2 Class C GET routes (cases/pipelines), and no assumed Class B adoption. Include
the actually consumed plugin webhook. Exclude REST agent pause/resume/wakeup and
issue-create analogues where current code uses SDK calls instead. SDK coverage
remains with existing pinned tests.

Freeze an exact extracted dependency subset plus an explicit source-reviewed
response/payload supplement with per-source-file hashes. Full raw OpenAPI byte
SHA-256, upstream SHA, dependency versions and artifact hashes are recorded in
`fixtures/provenance.json`. Normalized input regeneration is deterministic offline;
full export reproduction is documented in the component README. The checker
accepts explicit candidate JSON + manifest and never applies the old supplement
to a candidate. Raw generic responses FAIL coverage, rather than reporting PASS.

## Second adversarial review — implementation

1. **Too much frozen / false positives?** Only sent request values and consumed
   response projections are checked. Additions, prose and unused optional fields
   are non-blocking. Enum narrowing outside the sent subset is accepted. Unsupported
   consumed compositions require qualification instead of an equivalence claim.
2. **Too little checked?** Generic responses are a blocker. Tests cover nested
   metadata, arrays, status-only writes, required properties/parameters, nullability,
   enum changes, success statuses, JSON media and local refs. New caller discovery
   and data-dependent semantics still require review.
3. **Assumed classes?** All A entries have source/runbook anchors. Runbook dependency
   is distinct from executed production state. No B entry was invented; SDK-only
   lifecycle/wakeup calls do not become assumed REST dependencies.
4. **Public Paperclip domain?** Files remain under the private integration directory;
   no Core/Web contract, provider ID, product state or runtime code is changed.
5. **Reproducible baseline?** Source builder at exact upstream SHA; full output digest;
   raw subset retained; reviewed supplement hashes; deterministic regeneration test.
   The manual supplement is review evidence, never claimed to be upstream-generated schema.
6. **Network/production CI?** After checkout, use cached Node and committed inputs only.
   No install/download/server/Docker/production call. Missing Node cache fails explicitly.
7. **Secrets/private URLs/customer IDs?** No live responses were used. Fixtures were
   inspected for credentials, private URLs and UUID/customer identifiers; none included.
8. **Duplicated tooling?** No existing Wandora comparator existed. Reuse Node tests
   and Paperclip's builder; no new runtime/package dependency or generic framework.
9. **Task Drain/adapters/issues covered?** Yes: path/method, bounded TTL, quiescence,
   adapter install/readback and issue status/readback mutations are tested. Missing
   upstream response detail requires candidate-specific reviewed evidence.
10. **Semantic limits explicit?** Wake behavior, Task Drain process locality, retry
    ambiguity, scheduler/recovery and transaction/idempotency require pinned-source
    review + disposable proof. Declared auth comparison does not prove enforcement;
    known v916 declaration/handler mismatches are documented without silently fixing them.

Rejected alternatives: accept a generic object as response compatibility; silently
copy baseline fields into future candidates; invent REST dependencies from SDK names;
freeze every upstream property; add a parallel capability registry; run live OpenAPI
from CI. The revised narrow implementation is accepted for review.

## Validation boundary

The baseline self-check, SHA-256/regeneration checks, evidence-anchor verification
and deterministic mutation/CLI tests run offline. The component README contains
exact commands and limitations. CI checks this checkout's baseline and checker;
future upgrades must explicitly submit and compare their candidate artifact.
Tests tie this inventory to both integration compatibility files, both source-pinned
CI workflows and the Compose build/image pins so an ordinary provider bump cannot
silently retain a stale baseline. Those inputs are read only, not changed by this slice.

Canonical runtime/source checkpoint documents are intentionally unchanged: this
branch does not promote a runtime or claim a merged/production capability. This
document and the component README preserve the repository slice decision.

## Goal

Future Paperclip upgrades must not rely on release notes or repository diffs alone.

Wandora should compare the exact API contract it depends on between:

- current production Paperclip;
- candidate Paperclip version;
- and, after promotion, the live runtime.

The gate is **not** a full OpenAPI semantic-equivalence checker. It is a narrow Wandora dependency contract.

## Why this exists

Paperclip is intentionally replaceable behind Wandora adapters, but a provider upgrade can still silently change:

- route existence;
- HTTP method;
- authentication model;
- request schema;
- response schema;
- required fields;
- enum values;
- provider-specific operational assumptions.

The existing source/disposable upgrade discipline remains authoritative. This gate adds machine-readable API evidence.

## Canonical source

Every running Paperclip instance exposes:

```text
GET /api/openapi.json
```

For production v2026.916.0 the audit observed 685 paths.

Never use current upstream master OpenAPI as proof for the production instance.

## Frozen dependency classes

### Class A — critical production dependency

A breaking difference is a hard upgrade blocker until explicitly reviewed.

Original proposal's Class A candidates (historical, **not** the implemented inventory):

```text
/api/health
/api/agents/me
/api/adapters
/api/adapters/install
/api/companies/{companyId}/adapters/{type}/test-environment
/api/issues/{id}
/api/issues/{issueId}/live-runs
/api/issues/{id}/runs
/api/issues/{id}/recovery-actions
/api/agents/{id}/resume
/api/agents/{id}/pause
/api/agents/{id}/wakeup
/api/instance/task-drain
```

The actual source-derived inventory is now the versioned manifest linked above.
In particular, SDK lifecycle calls do not prove use of their REST analogues.

### Class B — adopted specialist capability

A change blocks only the Wandora feature that depends on it and requires targeted qualification.

Examples once adopted:

```text
routines
cost-events / budgets
approvals / execution policy
secrets / responsible-user routing
tool connections / profiles / gateway
projects / execution workspaces
```

### Class C — radar only

Experimental/unadopted API presence is recorded but does not block Paperclip upgrades.

Examples today:

```text
Cases
Pipelines
Agent Chat
experimental chat connectors
unqualified Tool Gateway surfaces
```

## Original artifact sketch

For each accepted Paperclip production version, retain:

```text
paperclip-openapi.json
paperclip-openapi.sha256
wandora-paperclip-api-contract.json
```

The third file is a curated manifest of Wandora dependencies, for example:

```json
{
  "schemaVersion": 1,
  "paperclipVersion": "v2026.916.0",
  "sourceCommit": "dffc2b3ca1b9e88fa21cb17493083e682dffd1ca",
  "operations": [
    {
      "path": "/api/instance/task-drain",
      "methods": ["get", "post", "delete"],
      "class": "A",
      "reason": "pre-restart quiescence"
    }
  ]
}
```

Do not embed secrets, hostnames or live IDs.

## Comparison rules

For each declared dependency, fail the compatibility gate when the candidate:

- removes the path;
- removes an expected method;
- changes the security actor boundary unexpectedly;
- adds a newly required request property;
- removes a response field Wandora explicitly consumes;
- narrows an enum/value used by Wandora;
- changes nullability in a consumed field incompatibly.

Warn, but do not automatically fail, when:

- optional response fields are added;
- new methods/routes are added;
- descriptions/tags/examples change;
- unconsumed schemas change.

A warning can still become a blocker through adversarial review.

## Source-semantic verification remains mandatory

OpenAPI cannot prove behavior such as:

- Task Drain being process-local;
- issue completion triggering or not triggering wakeup;
- replacement install ambiguity;
- scheduler/recovery timing;
- transaction/idempotency semantics.

Therefore every material upgrade still follows:

```text
OpenAPI diff
+ pinned source review
+ migration review
+ disposable production-derived proof
+ rollback proof
```

## Provider replacement value

The curated dependency manifest also becomes an **exit inventory**.

If Paperclip is replaced, every Class A/B dependency is a concrete item that a new provider adapter must implement or explicitly retire.

That makes Paperclip portability measurable rather than aspirational.

## Implemented repository slice

The versioned manifest, strict executable manifest validation, deterministic
extractor/checker, v2026.916.0 baseline, negative tests and narrow offline CI are
implemented in the linked component. The original research-only proposal is now
superseded by the evidence and limitations at the start of this document.
Review/merge gates and every production effect remain separate.
