# Paperclip synchronous webhook response v1

This retained patch extends the existing Paperclip plugin webhook transport at the
exact upstream base `v2026.916.1@d554c4789ed3930f8a53ac9fdf6503b3187097da`.

It does **not** add a new authentication surface. The public manifest-declared
webhook remains the ingress boundary and the plugin remains responsible for
signature verification before using protected capabilities.

Contract:

- existing `onWebhook(...): Promise<void>` handlers remain valid;
- `void` preserves the legacy `{ deliveryId, status: "success" }` HTTP response;
- a handler may optionally return a top-level JSON object;
- the serialized response is capped at 16 KiB in the worker and checked again by
  the host route;
- plugins cannot choose response status codes or response headers through this
  contract;
- invalid, non-JSON, or oversized responses fail through the existing failed
  delivery / HTTP 502 path;
- the synchronous response is not persisted in `plugin_webhook_deliveries`.

This is a provider implementation boundary retained by Wandora. It does not make
the response provider-neutral durable Wandora state and does not change the
authority split established by ADR 0168.
