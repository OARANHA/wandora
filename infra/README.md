# Wandora Infrastructure

This directory will contain the version-controlled deployment definitions consumed by Docker Compose and, operationally, Portainer.

## Planned layout

```text
infra/
├── stacks/
│   ├── edge/
│   ├── org/
│   ├── agents/
│   ├── messaging/
│   ├── data/
│   └── observability/
├── env/
│   └── *.example
└── runbooks/
```

Create each stack only when its first real service is validated.

## Portainer usage

Portainer is the operator interface. Prefer Git-backed or repository-backed stack definitions when practical so the running configuration can be reconciled with this repository.

Do not use Portainer as a substitute for version control.

## Deployment order for the laboratory

The likely sequence is:

1. edge/reverse proxy and secure management access;
2. Paperclip spike stack;
3. Mastra/Wandora agent spike stack;
4. authenticated tool spike;
5. messaging gateway spike;
6. canonical data stack only when the product spike requires persistence beyond local development.

This order is deliberately different from building the full product upfront.
