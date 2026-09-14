# Wandora Web — customer experience preview

This stack publishes the already validated customer Product Shell behind Traefik at `https://app.wandora.com.br`.

The preview intentionally contains only mock/product-contract data. It does **not** activate production customer auth, real Core writes, real WhatsApp connection or autonomous Ana sending.

## Runtime model

- `apps/web` builds the React/TanStack application in pinned Node 22;
- the final image serves static output through Nginx on container port 8080;
- the container joins only the existing external `wandora-edge` network;
- no application host port is published;
- Traefik routes `app.wandora.com.br` to `http://wandora-web:8080`;
- the preview response receives `X-Robots-Tag: noindex, nofollow, noarchive` at the edge.

## Build and deploy

Build a versioned image from `apps/web` and set `WANDORA_WEB_IMAGE` to that immutable deployment tag before `docker compose up -d`.

Example tag convention:

```text
wandora/web:preview-<git-sha>
```

Do not use this preview stack as evidence that production auth or Core wiring exists.

## Verification

After deployment, verify through the public hostname:

- `/healthz`
- `/`
- `/start`
- `/team`
- `/work`
- `/conversations`
- `/approvals`
- `/company`

Then perform a browser review on desktop and mobile before continuing into the durable Ana vertical slice.
