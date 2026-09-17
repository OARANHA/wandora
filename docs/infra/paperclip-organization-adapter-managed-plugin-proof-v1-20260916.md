# Paperclip Organization Adapter — Managed Plugin Proof V1

Date: 2026-09-16
Classification: **disposable laboratory evidence; no production effect**

## Purpose

Prove whether the Paperclip side of the Wandora Organization Adapter can use a headless plugin with company-scoped configuration instead of a broad Board API key, while preserving tenant isolation and provider-side idempotency for a catalog employee.

This proof does not install/configure the live Paperclip instance, does not apply Wandora migration 010 and does not activate customer hiring.

## Exact provider build

```text
Paperclip image:  wandora/paperclip:v2026.831.1
Paperclip source: 65ec059bde30d98c92165b24a30a540800dd1f6f
```

The source inspected for this proof is the source corresponding to the installed image on the Wandora VPS.

## Proof A — company-scoped secret-ref + managed reconcile

Sanitized disposable plugin characteristics:

```text
mode: multi-company headless plugin
capabilities:
  - agents.managed
  - webhooks.receive
  - secrets.read-ref
config:
  hmacSecret: secret-ref
managed resource:
  one manifest-declared Ana proof agent
  status: paused
  budget: 0
provider action:
  agents.managed.reconcile(stableAgentKey, companyId)
```

Proof artifact hashes:

```text
manifest.js sha256 = 3e6bf2d2239d3ce0f7f8198d1cf0a6006f3d6f83ba6e9b3046aaa6bb66aa3ff0
worker.js   sha256 = 9fafadbdbd5420b331668b5f34d1c66ecabdaaf1ecae0fccdb291246009f834e
```

No secret value, secret identifier, disposable company identifier or API credential is recorded here.

### Observations

1. With `secrets.read-ref` intentionally absent, the Paperclip host rejected `secrets.resolve` because the plugin lacked the required capability.
2. After adding only the missing capability, the worker became ready.
3. The plugin was configured for one disposable company with a config value of type `secret_ref`; raw HMAC material was not stored in plugin config.
4. A correctly signed request within the timestamp window reached `agents.managed.reconcile`.
5. First request returned success and created the declared managed Ana proof agent.
6. Repeating the same request returned success with the **same provider agent ID** and a resolved status rather than creating another agent.
7. Attempting to save another company's plugin config while referencing the first company's secret was rejected by Paperclip with a cross-company secret-reference validation error.

## Proof B — independent proactive company-scope gate

A second disposable plugin removed HMAC/secret handling so the Paperclip host company-scope gate could be tested independently.

Proof artifact hashes:

```text
manifest.js sha256 = 4051ab211238d54b9f38732efc06ba1106001856a03831368666c1391de2a7b5
worker.js   sha256 = 8e67d12baf1a1f7f5234311ea3e85d91c01e11911da245963ac65285ff7c99ea
```

The plugin was configured for exactly one disposable company.

Observed result:

```text
managed.reconcile(configured company)   -> HTTP 200
managed.reconcile(unconfigured company) -> host denial / HTTP 502 from webhook surface
```

The failure occurred at the Paperclip host authorization boundary, not in Wandora HMAC code.

## Source audit supporting the runtime proof

The installed Paperclip source confirms the observed behavior:

- managed-agent SDK methods are documented as operating on **manifest-declared plugin-managed agents** by stable key;
- the managed-agent service rejects an undeclared `agentKey`;
- `reconcile()` first resolves the existing company/plugin/key binding, can relink a same-company managed marker, and otherwise creates the missing agent;
- plugin config writes validate referenced secrets against the selected company;
- runtime secret resolution requires explicit company/plugin/config-path binding;
- proactive worker calls are authorized only within the plugin's configured-company scope;
- host RPC methods remain capability-gated.

This gives two independent company boundaries for the selected design:

```text
signed ingress
  -> company-owned secret-ref binding
  -> HMAC verification
  -> Paperclip configured-company host scope
  -> agents.managed capability
  -> company-scoped managed reconcile
```

## Important limitation found by adversarial review

`agents.managed.reconcile()` is not a generic arbitrary-agent creation API. It only accepts agent keys declared in the plugin manifest.

Therefore this evidence supports Wandora's first **catalog employee** model: known digital employee definitions are versioned as plugin-managed declarations and reconciled into authorized companies by stable key.

It does not support arbitrary customer-authored/custom employees. That capability remains outside V1 and must not silently fall back to direct `agent-hires`.

## Relationship to earlier `agent-hires` proof

The earlier disposable proof remains valid: repeated equal direct `agent-hires` requests can create distinct Paperclip agents. That evidence is why ADR 0038 introduced Wandora-owned idempotency/reconciliation state.

The selected V1 catalog path is stronger: provider-side `managed.reconcile` already has stable managed-resource semantics. Wandora's operation journal is still required for customer request idempotency, request-hash conflicts, local/provider partial success and durable provider mapping, but not to emulate idempotency inside the managed-resource provider call itself.

## Evidence boundary / remaining literal verifier

Two cross-company controls were executed separately:

- a secret reference owned by one company cannot be bound into another company's plugin config;
- a plugin configured for one company cannot proactively call `agents.managed.reconcile` for an unconfigured company.

The exact combined negative case — **a valid HMAC generated with Company A's final secret while the request target names Company B** — was not fabricated as completed. It remains a required final disposable verifier before production activation.

## Outcome

The laboratory evidence is sufficient to choose the V1 technical-identity/provider mechanism:

- Wandora-owned headless Paperclip plugin;
- per-company config;
- company-scoped `secret_ref` HMAC;
- capabilities limited to `webhooks.receive`, `secrets.read-ref`, `agents.managed`;
- `agents.managed.reconcile` for manifest-declared catalog employees;
- no Board API key in the normal tenant runtime path.

See ADR 0039 for the accepted architectural decision and remaining activation gates.