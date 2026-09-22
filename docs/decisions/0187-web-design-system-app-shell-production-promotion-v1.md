# ADR 0187 — Web Design System + App Shell Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Context

ADR 0186 introduced the customer Web design-system/app-shell slice:

- Dela Gothic One 400 for display;
- Space Grotesk Variable for body/interface text;
- JetBrains Mono Variable for operational labels;
- collapsible desktop sidebar;
- power-style logout wired to the existing real signOut path;
- complete six-route customer navigation.

This ADR records the production state that was already reached during an interrupted chat. The effect was reconciled before any attempt to repeat it.

## Canonical source

```text
main = 67966d42d23e1778d89c2430de8d59e2235dedfb
PR #246 = MERGED
```

PR-head checks were 5/5 GREEN:

- Core CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI;
- Organization Adapter Plugin CI.

Post-merge push workflows on the exact main were also GREEN:

- Core CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

## Artifact qualification

GitHub Actions Web artifact:

```text
artifact id = 10722734256
name = web-candidate-67966d42d23e1778d89c2430de8d59e2235dedfb
GitHub artifact digest = sha256:0b544336336d47225a54f9b470957afc8a65ea6e53f60006715efa486a88e319
```

The ZIP present on the VPS independently hashes to the same value.

Internal manifest:

```text
candidate_contract = wandora-web-reviewed-bridge-v1
source_sha = 67966d42d23e1778d89c2430de8d59e2235dedfb
source_tree_sha = bf9cbe51a70d4fe9fcf584128ffd188cf6761870
image_tag = wandora/web:candidate-67966d42d23e
archive_sha256 = 25576bff1aac7586fa63c73460fe238f891a9562bb9a47afa2c5f31eca0e195c
```

Internal SHA256SUMS also verifies:

```text
web-image.tar = 25576bff1aac7586fa63c73460fe238f891a9562bb9a47afa2c5f31eca0e195c
manifest.txt = 93ba32fb811f3fddc856030e2396701faf90420a4daa07e0d73530016f552785
```

The artifact manifest's image identifier and Docker live `.Image` value are different identifier forms and are not asserted to be interchangeable.

## Reconciled live state

Before any repeat action, runtime inspection proved the Web had already been promoted:

```text
Web image = wandora/web:candidate-67966d42d23e
Web revision = 67966d42d23e1778d89c2430de8d59e2235dedfb
Web = healthy / restart 0
persisted selector = wandora/web:candidate-67966d42d23e
```

Therefore no second promotion was attempted.

Other services remained unchanged:

```text
Core = wandora/core:organization-adapter-candidate-d8349b353bb7 / healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy / restart 0
```

## Public validation

```text
/healthz = 200
/login = 200
/ = 200
/team = 200
/work = 200
/conversations = 200
/approvals = 200
/company = 200
```

The live selector and live revision both match the merged-main Web candidate.

## Business-state safety

No product/business mutation was part of this visual promotion.

Readback remained:

```text
MEDICSPRO grounding = 0
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
```

Core, Paperclip and Messaging Gateway were not recreated for this slice.

## Evidence caveat

A local file named `web-image.before` in the interrupted execution directory already contains the promoted Web tag. It is therefore **not accepted as valid rollback evidence** for the pre-promotion image and is not used by this ADR as proof.

This ADR records only independently proven source/artifact/runtime evidence.

## Capability Authority / Reuse Gate

No capability authority changed.

- navigation remains Web presentation;
- sidebar collapse remains browser-local UI preference;
- logout reuses existing Wandora/Supabase session semantics;
- no provider capability was internalized;
- no database/migration/service/state machine/RAG/retrieval/memory subsystem was added.

ADR 0168 remains binding.

## Decision

**Web Design System + App Shell Production Promotion V1 is COMPLETE / GREEN.**

The new design system and app shell are live as a Web-only presentation change.

The separately authorized MEDICSPRO first real grounding execution remains pending normal authenticated owner interaction and is not implied by this visual promotion.
