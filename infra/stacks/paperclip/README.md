# Paperclip laboratory stack

This stack is the reproducible form of Wandora's organization/control-plane feasibility spike. It is not a declaration that Paperclip is a permanent product dependency.

## Prepare

From this directory:

```bash
./prepare-source.sh
cp .env.example .env
```

Replace all three placeholder secrets in `.env` with independent random values. Never commit `.env`.

The external Docker network `wandora-core` must already exist.

## Validate and start

```bash
docker compose config --quiet
docker compose build --pull paperclip
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:3100/api/health
```

Expected properties:

- source is pinned to the commit in `prepare-source.sh`;
- the service binds only to host loopback on port 3100;
- deployment mode is authenticated/private;
- data persists in `wandora-paperclip-data`;
- no model-provider credential is required for the infrastructure health test.

Do not publish port 3100 or expose Paperclip as a customer-facing Wandora API. Product code must reach it through a Wandora-owned Organization Adapter.
