# Paperclip Organization Adapter Private Client V1 — disposable proof source

Date: 2026-09-17
Classification: **laboratory-only; no production effect**

This directory preserves the final signed-request plugin contract exercised by the Paperclip Organization Adapter private-client proof.

## Contract

```text
POST /api/plugins/<plugin>/webhooks/employee-reconcile
content-type: application/json
x-wandora-timestamp: <unix-seconds>
x-wandora-signature: sha256=<HMAC-SHA256(timestamp + "." + exact raw body)>

{"companyId":"<provider company ref>","catalogKey":"ana-commercial-v1"}
```

The plugin:

- is headless and multi-company;
- resolves `hmacSecret` only through a company-scoped Paperclip `secret_ref`;
- accepts only the manifest-declared `ana-commercial-v1` catalog key;
- rejects timestamps outside a five-minute window;
- verifies the signature against the exact raw request bytes;
- calls `agents.managed.reconcile(catalogKey, companyId)` only after those checks;
- declares only `webhooks.receive`, `secrets.read-ref` and `agents.managed` capabilities;
- creates the managed catalog agent paused with zero budget.

The Paperclip webhook surface returns delivery status, not the managed agent's native UUID. Wandora therefore treats its private `provider_agent_ref` as an opaque stable reference to the provider-managed agent resource. For this provider it is derived from the stable plugin key + frozen provider company ref + catalog key; it is not a customer contract and is not claimed to be a Paperclip row ID.

## Executed disposable proof

Against `wandora/paperclip:v2026.831.1` / source `65ec059bde30d98c92165b24a30a540800dd1f6f`:

```text
Company A signed request -> Company A target: HTTP 200, one managed Ana
identical A replay:                         HTTP 200, still one managed Ana
Company A signature -> Company B target:   HTTP 502 invalid_wandora_signature
Company B managed Ana count after bad call: 0
Company B signed request -> Company B target: HTTP 200, one managed Ana
```

The test used synthetic disposable HMAC material and disposable Paperclip companies. No raw secret, secret identifier, company identifier, API key or production provider identifier is stored here.

## Boundary

This proof does not apply Wandora migrations 010/011 live, does not install/configure the live Paperclip instance, does not select a production Wandora-side secret resolver and does not expose customer hiring.
