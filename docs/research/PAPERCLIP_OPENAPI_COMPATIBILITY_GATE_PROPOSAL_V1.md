# Paperclip OpenAPI Compatibility Gate Proposal V1

Date: 2026-09-21  
Status: **Proposal — research only; not yet a CI gate**

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

Current Class A candidates:

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

The final list must be derived from actual Wandora integrations/tests, not this proposal alone.

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

## Proposed artifact

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

## Next implementation slice

After the capability audit is accepted, a small repository-only implementation may:

1. add a schema for `wandora-paperclip-api-contract.json`;
2. add a deterministic extractor/checker;
3. freeze the current v2026.916.0 contract;
4. run only in Paperclip compatibility/upgrade CI;
5. never contact production from CI.

That implementation is not part of this research slice.
