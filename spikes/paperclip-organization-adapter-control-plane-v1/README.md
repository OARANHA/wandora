# Paperclip Organization Adapter Control-Plane V1

This directory preserves the safe, credential-free portion of the laboratory proof behind ADR 0039.

## Purpose

Prove the narrow Wandora -> Paperclip tenant boundary without Board API keys or inline shared secrets:

```text
Wandora signed request
  -> Paperclip plugin webhook
  -> company-scoped plugin config
  -> Paperclip secret_ref resolution
  -> managed agent reconcile
```

The plugin is headless and deliberately declares the managed agent paused with zero budget. It is a proof artifact, not a production deployment package and not a customer hiring API.

## Security contract

- `multiCompanyConfig: true`;
- capabilities are explicit: `agents.managed`, `webhooks.receive`, `secrets.read-ref`;
- config schema requires `hmacSecret` with `format: secret-ref`;
- the worker reads config for the requested company and resolves the secret through Paperclip at runtime using the same `companyId` plus `configPath`;
- HMAC covers `timestamp + exact raw body` and uses timing-safe comparison;
- stale requests outside the five-minute proof window fail;
- no raw HMAC secret, Board API key, provider token or real company identifier is committed here.

## Laboratory evidence

The exact installed Paperclip image used by the proof was:

```text
wandora/paperclip:v2026.831.1
```

Observed results before this artifact was promoted:

- a secret reference from one company could not be persisted into another company's plugin config (`HTTP 400`);
- a valid Company D signature could reconcile Company D, but a D-authorized attempt to run `agents.managed.reconcile()` against Company A was rejected by the Paperclip host before effect;
- the analogous cross-company `secrets.resolve()` attempt was also rejected by the host;
- sequential same-key reconcile returned `created` and then `resolved` with the same agent ID;
- a fresh disposable-company concurrency challenge with 20 simultaneous first reconciles produced 15 `HTTP 200`, 5 `HTTP 502` and 10 distinct managed agents.

The disposable concurrency company was deleted immediately after the probe. The test used only a synthetic lab HMAC value.

## Architectural conclusion

Paperclip managed resources are the preferred provider primitive because they already supply stable resource keys, relink/recovery behavior, operator-edit preservation, explicit reset semantics and native board approval integration.

They do **not** remove the need for Wandora request serialization: the first-create concurrency probe demonstrated duplicate agents under simultaneous calls. ADR 0038's hire-operation journal therefore remains, but only as the Wandora idempotency/concurrency/effect-safety boundary. It must not evolve into a parallel agent lifecycle.

See `docs/decisions/0039-paperclip-secretref-managed-agent-contract-v1.md`.
