# ADR 0356 — Current f279acc Core Rollback Freeze V2 Source Requalification V1

Date: 2026-09-30

Status: **CODE-ONLY REQUALIFICATION / LIVE CORE F279ACC GATES-OFF / HOST DEPLOYMENT PENDING / NO CURRENT-BASELINE CAPTURE**

## Objective

Requalify the existing Rollback Freeze V2 source contract for the exact Core now live after the ADR 0355 ambiguity-boundary correction was promoted gates-OFF, without changing backup/restore semantics or creating a new rollback subsystem.

## REAL NOW

Immediately before this source requalification:

- current `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `aef0526ebe4dbe292e06fe977d1241fbe0fe1296`;
- `refs/pull/369/merge = f279acc98687da894a1ce6570273b5949552a8c7`;
- merge parents are exactly current main + PR head;
- the exact PR head completed **17/17 workflows GREEN**;
- live Core tag = `wandora/core:organization-adapter-candidate-f279acc98687`;
- live Core image id = `sha256:c8994cc7b9a6bff15b212eba215d5a1360ee217b84df18a1b59409fb9fd1a4d8`;
- live Core revision = `f279acc98687da894a1ce6570273b5949552a8c7`;
- live Core is healthy with restart count 0;
- the exact 14-file production Compose chain is preserved;
- Fast Read, Semantic Fast Read, Semantic Selector and Human Send are OFF;
- Paperclip and Messaging Gateway remain healthy and unchanged;
- Task Drain is `false / 0 / 0 / quiescent=true`;
- stable non-secret selector `/opt/wandora/ops-workspace/core-runtime-image.env` points to the f279acc candidate.

The prior a49504c Rollback Freeze V2 receipt remains valid historical rollback evidence, but no Rollback Freeze V2 receipt exists yet for the immediately current f279acc live baseline.

## PROVEN EVIDENCE

The f279acc candidate was built by Core Candidate Artifact run `36686676435`, artifact id `11083604994`.

Candidate provenance:

- GitHub artifact ZIP SHA-256 = `8b4e020fe0a142a51305aef234750aeec1c944961af681e98687598f8f6baf14`;
- inner archive SHA-256 = `6e19be3980194f0a244ebcb610191068dd86502af63bbe316dacf46dba114936`;
- source SHA = `f279acc98687da894a1ce6570273b5949552a8c7`;
- source tree SHA = `ecc95e39f7b1ade7d215ee9cc5b83eb2f8e3f6a8`;
- image tag = `wandora/core:organization-adapter-candidate-f279acc98687`;
- OCI config digest = `sha256:5c42789791cfed7fa282164540d54ebb769ac7f69317d7e58142f6cea118b728`;
- OCI manifest/live image id = `sha256:c8994cc7b9a6bff15b212eba215d5a1360ee217b84df18a1b59409fb9fd1a4d8`;
- image user = `node`.

The artifact ZIP and inner archive were independently hashed on the production host before load. Managed-admin image inspection after load proved the exact revision, contract and user. The Core-only promotion then returned Recreated/Started/Healthy and post-promotion readback proved the exact image/revision/hardening/gates-OFF state.

## GAPS

The reusable Rollback Freeze V2 helper remains pinned to the prior a49504c live baseline. It must therefore fail closed against the new live f279acc baseline.

A bounded production re-attestation must not open until rollback readiness describes the immediately current live Core.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

Reuse the existing Rollback Freeze V2 helper, managed-admin wrappers, official Paperclip backup path, disposable restore/schema comparison and immutable receipt boundary.

No new:

- backup subsystem;
- state machine;
- service;
- database table;
- provider implementation;
- orchestration capability

is created.

## DECISION

Repin only:

- exact current Core image tag;
- exact current Core image id;
- exact current Core revision;
- immutable receipt/root/temp namespaces;
- managed-admin helper Git-blob pins;
- static verifier/CI current-vs-stale expectations.

The prior a49504c identity becomes stale for current-helper qualification but its historical receipt remains untouched.

No backup/restore control flow or semantic behavior changes.

## SECOND ADVERSARIAL REVIEW

A route review selected `proceed_fast`, with the main alternative `deep_review`, because this is a rollback-sensitive source change.

A second exact action review returned:

- decision = `confirm`;
- `confirm=0.51`;
- confidence = `0.35`.

No concrete authority or semantics violation was identified. The accepted safeguards are code-only execution, exact anchor substitutions, helper blob re-pinning, prior-baseline stale rejection and mandatory exact-head CI before any host deployment.

## EXECUTION

The source requalification changes exactly:

1. `scripts/operations/production-rollback-freeze-v2.sh`;
2. `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`;
3. `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`;
4. `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-precheck.mjs`;
5. `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-capture.mjs`;
6. `.github/workflows/semantic-fast-read-ci.yml`;
7. `docs/CANONICAL_STATE.md`;
8. `docs/WANDORA_PROJECT_SOURCE.md`;
9. this ADR.

Qualified source identities before commit assembly:

- helper Git blob = `d1203bdf2cc90a5471fe9536e886eedcef496c2b`;
- precheck wrapper Git blob = `be4616837539bafebe72e1729aa1669a91150682`;
- capture wrapper Git blob = `865a9b9338ce7f273140cfb35e401320383fce0f`;
- precheck verifier Git blob = `441c5f7e6964e7c85d0ee9391bce275478e207f5`;
- capture verifier Git blob = `a4aa61acd2833662feea31c13600b1094c76605d`;
- Semantic Fast Read workflow Git blob = `4933fbd7a71645bf797599a0a9cc458330958f52`.

## VALIDATION

Exact-head CI is required before any host byte deployment. Until then, this source requalification is not production-authorized.

## PRODUCTION EFFECT BOUNDARY

This source requalification performs no:

- host helper/wrapper installation;
- root precheck;
- rollback capture;
- Core recreation;
- attestation opening;
- TypeSafe/Mistral call;
- Paperclip Fast Read;
- VendaERP call;
- Human Send;
- Gateway outbound;
- WhatsApp effect;
- migration or database mutation.

Production remains the f279acc Core on the gates-OFF 14-file baseline.

## NEXT BOUNDARY

After exact-head CI GREEN:

1. stage the exact reviewed helper/wrapper bytes;
2. validate bytes and syntax;
3. deploy through existing managed-admin `install` only;
4. execute the zero-argument precheck under a separate human approval;
5. independently prove precheck marker + receipt absence;
6. execute exactly one persistent capture under another separate human approval;
7. validate the f279acc receipt and runtime invariants;
8. only then begin a fresh bounded production re-attestation preflight.
