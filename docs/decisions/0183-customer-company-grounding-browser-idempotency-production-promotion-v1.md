# ADR 0183 — Customer Company Grounding Browser Idempotency Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Context

ADR 0182 corrected customer grounding create retry safety before any real MEDICSPRO grounding existed.

The Web now preserves a browser-generated UUID + exact request fingerprint in sessionStorage and reuses that identity after ambiguous create responses.

## Artifact qualification

Post-merge Web CI from `main@8fb5201b0229dc904bdf2d868a09ddf4f95a67af` produced:

- artifact id = `10720490297`;
- artifact name = `web-candidate-8fb5201b0229dc904bdf2d868a09ddf4f95a67af`;
- artifact ZIP sha256 = `ff2dc1eacd23922939951c42b8a1dab17c5a19aef3e5b6e98a6cac37fea61d57`;
- source tree = `a3569305e24f6ccfea93dc934def8c8a321a4d06`;
- image tag = `wandora/web:candidate-8fb5201b0229`;
- manifest image id = `sha256:f58de1553d13de4d75f3a14a71c1a56bc3e7d18898a6a282388e373f69f59d52`;
- web-image.tar sha256 = `649cdc0ffd43b4d0f3ec7d6c5e4f0a3da1855fd2f2de5f2a85cecf4f8e07856e`;
- manifest.txt sha256 = `5a03f6ba1a7b770804746ba3a6bb69c1d1f85cc4fa44c5b42de9d72e110c48f1`;
- SHA256SUMS sha256 = `9359c1b6ef2eab961eaec370ba1ca42d12120c834e5edf21ee75115d8d46c50f`.

ZIP digest matched GitHub metadata and internal SHA256SUMS verified both payload files.

All post-merge push workflows on the exact main completed GREEN.

## Second adversarial review

The exact loaded artifact ran as a disposable private Web candidate against live Core:

- health = healthy / restart 0;
- /healthz = 200;
- /company = 200;
- /api/v1/me without session = 401;
- grounding without session = 401;
- out-of-contract grounding = 404;
- generic unreviewed API = 404.

The disposable candidate was removed.

## Execution

Pre-effect MEDICSPRO grounding rows = 0.

Only the Web image selector changed:

- before = `wandora/web:candidate-8ee226bcc0dd`;
- after = `wandora/web:candidate-8fb5201b0229`.

Prior selector backup:

`/home/wandora-admin/executions/company-grounding-browser-idempotency-promotion-v1/web.env.before`

sha256:

`b143854136c949f96364afdb6039db7f44bdf64faff8d487c12d9c7da86daaab`

Only `wandora-web` was recreated.

Core, Paperclip and Messaging Gateway container IDs remained unchanged.

## Post-promotion validation

Public boundary:

- /healthz = 200;
- /company = 200;
- /api/v1/me without session = 401;
- grounding without session = 401;
- out-of-contract grounding = 404;
- generic API = 404.

Live:

- Web = `wandora/web:candidate-8fb5201b0229`, healthy/restart 0;
- source revision = `8fb5201b0229dc904bdf2d868a09ddf4f95a67af`;
- Core/Paperclip/Gateway unchanged and healthy/restart 0;
- MEDICSPRO grounding rows = 0;
- works = 2;
- outbound attempts = 0.

## Decision

**Customer Company Grounding Browser Idempotency Production Promotion V1 is COMPLETE / GREEN.**

The first real MEDICSPRO grounding execution may now proceed only through a normal authenticated owner/admin session.

Semantic payload remains:

- F1/F2/F3 = fact;
- R1 = rule;
- provenance = owner_statement;
- sourceRef = `wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`.

The browser-generated retained UUID is the canonical create retry identity.
