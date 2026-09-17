# Paperclip Organization Adapter Managed Plugin V1 — disposable proof sources

This directory preserves the sanitized source used in the 2026-09-16 disposable Paperclip laboratory proof recorded in:

- `docs/decisions/0039-paperclip-managed-catalog-organization-adapter-v1.md`
- `docs/infra/paperclip-organization-adapter-managed-plugin-proof-v1-20260916.md`

It is **not** a production plugin package and must not be installed into live Paperclip as-is.

## Contents

`secretref/` is the signed-ingress proof. It requires `webhooks.receive`, `secrets.read-ref`, and `agents.managed`, resolves a company-scoped `secret_ref`, verifies timestamped HMAC, and reconciles one manifest-declared paused/zero-budget Ana proof agent.

`scope/` deliberately removes secret/HMAC handling so Paperclip host configured-company authorization can be tested independently.

## Exact laboratory hashes

```text
secretref/manifest.js sha256 = 3e6bf2d2239d3ce0f7f8198d1cf0a6006f3d6f83ba6e9b3046aaa6bb66aa3ff0
secretref/worker.js   sha256 = 9fafadbdbd5420b331668b5f34d1c66ecabdaaf1ecae0fccdb291246009f834e
scope/manifest.js     sha256 = 4051ab211238d54b9f38732efc06ba1106001856a03831368666c1391de2a7b5
scope/worker.js       sha256 = 8e67d12baf1a1f7f5234311ea3e85d91c01e11911da245963ac65285ff7c99ea
```

The proof ran against Paperclip image `wandora/paperclip:v2026.831.1`, source commit `65ec059bde30d98c92165b24a30a540800dd1f6f`.

No raw secret, secret identifier, disposable company identifier, board/API key, run JWT, or production provider identifier is intentionally stored in this directory.

## Architectural boundary

The proof supports manifest-declared **catalog employees** only. `agents.managed.reconcile()` is not arbitrary agent creation. A custom/dynamic employee path must receive a separate ADR and must not silently fall back to direct `agent-hires`.
