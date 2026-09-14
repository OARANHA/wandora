# Evolution API — Wandora laboratory stack

This stack is the current WhatsApp laboratory provider behind the Wandora-owned `Messaging Gateway`.

## Version and boundary

- Evolution API: `2.3.7`
- image digest: `sha256:1bd8afc4a6cf48822e6cf02469aeae7bd35a12a6b616eacd1291926307f4d339`
- PostgreSQL and Redis are dedicated to the provider stack and are not published on host ports.
- Evolution itself publishes only `127.0.0.1:8081 -> 8080` for local/operator diagnostics.
- Customer code and digital employees must not call Evolution directly.

## Networks

The stack expects these pre-existing networks:

- `wandora-core` — internal Wandora service path;
- `wandora-edge` — ingress reachability for the operator Manager hostname;
- `wandora-evolution-data` — internal provider data network.

Create the data network as an internal bridge before first deployment if it does not exist.

## Secrets

Copy `.env.example` to a local `.env`, generate strong values locally, and keep the file out of Git.

Required variables:

- `EVOLUTION_DB_NAME`
- `EVOLUTION_DB_USER`
- `EVOLUTION_DB_PASSWORD`
- `EVOLUTION_API_KEY`

Never paste live secrets into documentation, issues, PRs, logs or chat transcripts.

## Operator Manager

`https://manager.wandora.com.br` is an operator-only hostname routed by Traefik. The DNS record is Cloudflare-proxied. Evolution still requires its API key for privileged requests.

Cloudflare Access is the preferred additional edge gate before this surface is considered production-hardened.

Evolution 2.3.7 rejects requests whose `Origin` is not allow-listed and also rejects some server-to-server requests that omit `Origin`. The Traefik Manager route injects the canonical Manager origin. Wandora's Evolution transport sends the Wandora application origin on internal provider calls for the same reason.

## WhatsApp pairing

For the validated Baileys integration, use QR pairing through WhatsApp **Devices linked / Connect a device**.

Do not rely on the phone-number pairing-code path on Evolution 2.3.7; current upstream reports show generated pairing codes may be rejected by WhatsApp while QR pairing succeeds.

## Webhook posture

Global webhook delivery stays disabled by default. Configure a per-instance webhook only to a private Wandora Messaging Gateway endpoint and subscribe only to required events.

The validated V1 laboratory path uses:

- event: `MESSAGES_UPSERT`
- private target: the Wandora Messaging Gateway on `wandora-core`

Raw Evolution webhook payloads must not be forwarded into Wandora Core. They contain provider-specific and sensitive fields and must be normalized first.

## Validated laboratory evidence — 2026-09-13

The current laboratory proved:

- private/pinned provider deployment with passworded PostgreSQL and API-key authentication;
- a real WhatsApp instance reached `state=open` after QR pairing;
- a real inbound WhatsApp text reached Evolution, the private webhook, and the Wandora normalization boundary;
- inbound provider identifiers and credentials did not cross the public Wandora event contract;
- duplicate inbound events derive the same deterministic Wandora `eventId` and are accepted once by the laboratory receipt store;
- a real outbound text sent through the Wandora Messaging Gateway returned `accepted: true` and was received on the destination phone;
- the adapter does not expose provider response IDs through the Wandora result contract.

## Production hardening still open

This is a validated laboratory provider path, not a production-complete messaging subsystem. Before customer production traffic, complete at least:

- persistent inbound receipt/idempotency storage;
- persistent outbound attempt state and reconciliation for `uncertain` deliveries;
- tenant-scoped connection resolution and authorization in Wandora Core;
- production observability and alerting;
- backup/restore procedure for provider state;
- Cloudflare Access for the Manager surface;
- documented provider reconnect/re-pair operational procedure.

## License notice

Evolution API 2.3.7 is used as a third-party component. Its upstream license permits use subject to its published Apache-2.0 terms plus additional project conditions. If Evolution remains in a deployed Wandora distribution, retain the required administrator/documentation attribution notice and re-check upstream licensing before commercial production changes.
