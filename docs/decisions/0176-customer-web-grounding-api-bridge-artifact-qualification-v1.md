# ADR 0176 — Customer Web Grounding API Bridge Artifact Qualification V1

Status: **ACCEPTED / NO PRODUCTION EFFECT**  
Date: 2026-09-22

## Context

ADR 0175 / PR #233 corrected only the explicit customer Web/Nginx bridge for the already-live Wandora grounding contract. The code merged to `main@1800aa3d3fb4a0928f314eed4f1722f7adb59ef0` with the Web/Core/provider boundaries unchanged.

The next production effect must use an immutable, reviewed Web artifact rather than rebuild ad hoc from chat context.

## Qualification

Post-merge push workflows on the exact code merge commit are GREEN:

- Web CI;
- Core CI;
- Platform Admin CI;
- Messaging Gateway CI.

Web CI run `35732156884` produced:

```text
artifact id          = 10695249794
artifact name        = web-candidate-1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
artifact ZIP sha256  = adba9f361b1135e123c555f6ff4afb3b555c13ec3dc129b7347a9467ddc6a109
source sha           = 1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
source tree sha      = c98f0e3a13a4675a0c1b23e476bfa50e649edefe
candidate contract   = wandora-web-reviewed-bridge-v1
image tag            = wandora/web:candidate-1800aa3d3fb4
image id             = sha256:270a150454befd2e260c45ebbe9b5985a973a32905ac157ce1738d6acf1a243d
OCI archive sha256   = 1d76901fa02ca4b8cfeef8bdf9daf9fbb12c610951a5e629c3cd16c6facc960a
manifest sha256      = 3846a2f11a84d19d60cfdb81251ac5735385ff8078b3209cf06ffa9781807a5e
```

The downloaded artifact ZIP hash matched the GitHub artifact digest. Its internal `SHA256SUMS` verified both `web-image.tar` and `manifest.txt`.

## Production boundary

No production deploy occurred during this qualification.

Revalidated live state remains:

- migration 017 LIVE / verified;
- MEDICSPRO grounding rows = 0;
- Core = `wandora/core:organization-adapter-candidate-d90b225e6cc2`, healthy / restart 0;
- Web = `wandora/web:candidate-65908b76c667`, healthy / restart 0;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy / restart 0;
- Messaging Gateway = `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy / restart 0;
- MEDICSPRO customer works = 2;
- MEDICSPRO outbound attempts = 0;
- Human Send = OFF;
- Gateway outbound = OFF.

The public grounding route is still expected to return the old-Web Nginx 404 until a separately reviewed Web promotion.

## Decision

The exact artifact above is the qualified candidate for the next slice.

Next slice:

**Customer Web Grounding API Bridge Production Promotion Preflight / Execution V1 — WEB ONLY**

That future slice may promote only the corrected Web artifact. It must not reapply migration 017, restore the database, repromote Core, create real MEDICSPRO grounding, call Ana/model, create work/run/wakeup/session, enable Human Send/Gateway outbound, or send an external message.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication. This artifact qualification changes no capability authority.
