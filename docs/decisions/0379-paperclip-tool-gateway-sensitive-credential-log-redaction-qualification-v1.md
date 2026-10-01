# ADR 0379 — Paperclip Tool Gateway Sensitive Credential Log Redaction Qualification V1

Status: **QUALIFIED IN CODE/CI / NOT PROMOTED / NO PRODUCTION EFFECT**
Date: 2026-10-01

## Context

ADR 0378 completed the first owner-browser real customer Semantic Fast Read canary. During post-effect validation, the Paperclip HTTP request logger was observed to serialize the Tool Gateway session header name without an adequate redaction rule.

The credential value is intentionally not reproduced, copied, read, persisted, rotated, placed in a prompt, or used as test data in this slice.

This qualification follows ADR 0168: provider-owned operational mechanics stay behind the provider boundary. Portability is contract decoupling, not duplication of provider implementation.

## Real-now provenance

Wandora repository state at qualification:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #378 remains draft/open/unmerged at `7000bbc72573e1dd4c3219a1a522c4170483ac63`;
- this change is isolated in draft PR #379;
- qualified PR #379 head: `0d47451737d3f7000352b7c289e4e5838ebb62f2`.

Paperclip source reviewed:

- exact production-qualified source: `paperclipai/paperclip@d554c4789ed3930f8a53ac9fdf6503b3187097da` (`v2026.916.1`);
- current upstream source reviewed during this slice: `dd9983b8945aa087e43d7d3694f694999d3e3a37`.

Both source snapshots use Paperclip's own `HTTP_LOG_REDACT_PATHS` with pino/pino-http redaction. Both omit:

`req.headers["x-paperclip-tool-gateway-token"]`

Therefore the gap is provider-owned logger coverage, not a missing Wandora logger, secret store, proxy, or integration subsystem.

## Capability Authority / Reuse Gate

### Semantic authority

No new Wandora semantic capability is introduced.

### Durable product state

No new durable Wandora state, table, migration, credential record, or secret copy is introduced.

### Operational authority

Paperclip remains owner of Tool Gateway sessions, Tool Gateway authentication, HTTP request logging, and provider runtime mechanics.

### Provider implementation

The fix reuses Paperclip's existing native pino redaction boundary.

### Replacement boundary

Wandora carries a retained provider patch against the exact qualified Paperclip source until an upstream-compatible fix exists. Replacing Paperclip does not require internalizing its logger.

## Decision

Retain one narrow Paperclip patch:

`integrations/paperclip/patches/v2026.916.1-tool-gateway-log-redaction-v1.patch`

The patch:

1. adds only `req.headers["x-paperclip-tool-gateway-token"]` to the provider's existing `HTTP_LOG_REDACT_PATHS`;
2. adds synthetic logger tests proving the canary token string is absent from serialized HTTP logs for 200, 403 and 500 responses;
3. keeps the header key visible only as a redacted field;
4. changes no Tool Gateway authorization semantics, capability surface, connection state, tool policy, execution contract, or customer workflow.

The patch is composed into the existing Fast Read Paperclip candidate path and included in candidate provenance.

No parallel Wandora logger, proxy, middleware, secret store, or provider bypass is approved.

## Validation

An initial PR #379 head `52f0eb796ef2220b3cb30128e6fab17a8fc09e0f` correctly failed both Paperclip composition workflows because the newly authored patch had an invalid hunk length. No retry was performed blindly. The workflow logs were inspected, the exact patch formatting error was corrected, and a new head was produced.

Exact qualified head:

`0d47451737d3f7000352b7c289e4e5838ebb62f2`

All **7/7** workflows on that head completed GREEN:

- Core CI;
- Messaging Gateway CI;
- Platform Admin CI;
- Web CI;
- Paperclip OpenAPI Compatibility;
- Paperclip Fast Read Patch Composition CI;
- Paperclip Fast Read Production Candidate CI.

Provider composition evidence includes:

- terminal marker `PAPERCLIP_FAST_READ_QUALIFIED_PATCH_COMPOSITION_OK`;
- patched files:
  - `server/src/middleware/http-log-redaction.ts`;
  - `server/src/__tests__/http-log-redaction.test.ts`;
- focused composed tests: **5 test files / 84 tests passed**;
- `http-log-redaction.test.ts`: **54 tests passed**.

Candidate qualification evidence includes:

- terminal marker `PAPERCLIP_FAST_READ_PRODUCTION_CANDIDATE_V1_OK`;
- Docker config digest:
  `sha256:181be547f1f882cc8c016caf8bb0a2ab1c34286e81e9aac599c87bbf56662389`;
- compressed candidate artifact SHA-256:
  `3c8aeca90fc0aab2ee5eb5ce3dc258771d83e78526466e63a48c5d7936955ae6`;
- provenance explicitly includes the retained Tool Gateway redaction patch.

## Second adversarial review

The TypeSafe JEV advisory review returned `proceed_fast` with no new factual blocker.

The deterministic Wandora decision remains authoritative.

Rejected:

- creating a Wandora logger or log proxy;
- copying/rotating the real Tool Gateway session token in this slice;
- testing redaction through another customer ERP call;
- promoting Paperclip merely because CI is green;
- merging PR #378 as a side effect.

Accepted:

- provider-native redaction;
- synthetic tests;
- exact-source retained patch;
- CI/candidate provenance qualification only.

## Production state and stop condition

This ADR authorizes **no production promotion**.

No VendaERP/customer call was executed for redaction validation.
No rollout was expanded.
Human Send remains outside this change.
Messaging Gateway outbound remains outside this change.
No WRITE capability is enabled.

The security gap is **qualified for correction in the candidate**, but production still uses the previously promoted Paperclip image until a separately authorized promotion slice proves fresh runtime provenance, rollback readiness, and effect approval.

## Next slice

Proceed with **VendaERP Read Capability Coverage V1** as an inventory and semantic/provider reuse decision.

Do not add endpoints merely because they exist. First identify which useful reads are already exposed by the current VendaERP provider/tool boundary and which are already represented by canonical Wandora `BusinessCapability` values.
