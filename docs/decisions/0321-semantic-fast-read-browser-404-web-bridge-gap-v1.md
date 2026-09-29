# ADR 0321 — Semantic Fast Read Browser 404 Web Bridge Gap V1

Date: 2026-09-28

Status: **FAIL-CLOSED / ROOT CAUSE PROVEN / WEB-ONLY FIX IMPLEMENTED / WEB CI GREEN / NO PRODUCTION PROMOTION**

## Objective

Record the bounded Human Fast Read production-attestation attempt that executed exactly one owner/admin browser request, received HTTP 404 before reaching Wandora Core, closed the attestation window immediately, restored the gates-OFF baseline, and identified/remediated the missing reviewed Web ingress route in repository code only.

This ADR does not authorize a new production attestation attempt or a Web promotion.

## REAL NOW

The attestation retry started from:

- PR #369 exact source head `9f1e6e7eab35da8398abbb7c573392afa5e8a140` with 17/17 workflows GREEN;
- Rollback Freeze V2 precheck GREEN;
- exact PostgreSQL 18.1 recovery utility restored from the ADR 0300 immutable digest and validated in a network-disabled disposable container;
- Core baseline image `wandora/core:organization-adapter-candidate-2c2142237c9c`, digest `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- Paperclip `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Task Drain false/0/0/quiescent;
- Messaging Gateway outbound OFF;
- Tool Policies empty and exact 28PRO/Ana `vendaerp_search_products` qualification = allow / allow_profile / auditEvent null.

Opening and closing Compose renders were each proven with `config --quiet` and `config --images`, resolving exactly the pinned Core image.

## Execution evidence

After explicit human approval, only `wandora-core` was recreated with custody + attestation overlays.

Immediate state-first readback proved:

- Core healthy, restart 0;
- exact expected image/digest/revision;
- custody + attestation present in active Compose provenance;
- TypeSafe/System One and `wfri1` mounted read-only;
- Fast Read execution and Semantic Fast Read ON;
- Human Send OFF;
- Gateway outbound OFF;
- Task Drain quiescent.

The human-controlled browser preflight ran with `EXECUTE=false` and proved owner/admin session context, one active Ana and the exact request:

`Qual é o preço do produto PREMIUM PLUS?`

The human then executed exactly one request with `EXECUTE=true`.

Observed browser result:

- HTTP 404;
- body JSON parse result = null;
- no retry occurred.

The production Web access log independently recorded exactly one:

`POST /api/v1/organizations/{uuid}/digital-employees/{uuid}/fast-read` → `404` with 555 bytes.

## Mandatory close

The 404 was treated as attestation failure/ambiguity.

No investigation was performed before closure.

A fresh close approval was prepared only after the request, explicitly confirmed and applied once. Core was recreated back to the exact baseline Compose chain ending at `compose.semantic-fast-read.yaml`.

Post-close readback proved:

- Core healthy, restart 0;
- exact candidate image/digest/revision;
- custody/attestation overlays absent;
- TypeSafe and `wfri1` mounts absent;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- Task Drain false/0/0/quiescent;
- Gateway outbound OFF;
- Paperclip healthy and unchanged.

## Root cause

The exact production Web artifact was:

- image `wandora/web:candidate-5108f7ce8de3`;
- revision `5108f7ce8de3546750ea921fe5b7d1da46751586`;
- Nginx-based reviewed bridge.

Its `apps/web/nginx.conf` contains explicit reviewed allowlist locations for existing Human API routes but had no location for:

`/api/v1/organizations/{uuid}/digital-employees/{uuid}/fast-read`

The unmatched request therefore fell through to:

```nginx
location /api/ {
  return 404;
}
```

The same omission was present in PR #369 head `9f1e6e7...`.

The Core route was already present in the exact production Core revision and PR source. Therefore the failure occurred at the Wandora Web ingress boundary before the request reached Core.

Consequences:

- no TypeSafe semantic-route call from this request;
- no Mistral selector call from this request;
- no Paperclip Fast Read run from this request;
- no VendaERP read from this request;
- no ERP write;
- no Human Send;
- no Gateway outbound;
- no WhatsApp Fast Read.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

The gap is Wandora-owned public Web ingress routing. Fixing the explicit HTTP allowlist does not duplicate any Paperclip, Mastra, provider or Business System capability and requires no new state, migration, lifecycle, orchestration, approval or retry subsystem.

## Decision

Add exactly one reviewed Nginx location for the UUID-scoped Fast Read path, proxying to the existing Core Human API bridge while:

- forwarding Authorization;
- stripping browser Cookie;
- preserving the request body;
- not broadening the generic `/api/` bridge;
- leaving the catch-all 404 in place.

Extend Web CI with an isolated mock-Core assertion proving:

- POST method;
- exact path;
- Authorization forwarding;
- Cookie stripping;
- exact JSON request body;
- no Idempotency-Key;
- `/fast-read/again` remains 404.

## Second adversarial review

Fresh JEV 1.13.0 review returned `allow`.

## Repository execution and validation

Code-only commits:

- `7789467b0c2115dcb9614d1201ccfa1516a68c49` — `fix(web): proxy bounded fast-read route`;
- `9a3e8ce416f9e181bca19bf392c636a5a733e4e4` — `test(web): cover bounded fast-read bridge`.

The Web bridge verifier on head `9a3e8ce...` completed successfully, including build, reviewed bridge validation and Web candidate artifact upload.

No production Web image was promoted and no attestation window was reopened.

## Result

**FAIL-CLOSED / BASELINE RESTORED / ROOT CAUSE PROVEN / WEB BRIDGE FIX CODED + WEB CI GREEN / PRODUCTION STILL UNCHANGED.**

Next boundary:

1. finish exact-head CI on the final documentation head;
2. separately qualify/promote the exact reviewed Web artifact only;
3. reconcile live Web image/revision and route;
4. begin any new bounded attestation as a fresh slice from REAL NOW with new decision, second adversarial review and fresh approvals;
5. never reuse approvals from this attempt.
