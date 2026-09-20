# ADR 0134 — Web Browser Auth Public Config Artifact Hardening V1

Status: Accepted / implementation in progress  
Date: 2026-09-20  
Base: `main@17af0a78a655faa1333c071a557b536c6c6e6948`

## Context

During **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**, the exact Web candidate qualified by PR #182 was promoted:

`wandora/web:candidate-8d2a53e3c264`

The container was healthy and the reviewed Core bridge route existed, but a real owner login failed with:

`A autenticação da Wandora ainda não foi configurada neste build.`

The failure occurred before any customer-owner activation request and before the Paperclip lifecycle point of no automatic rollback.

## REAL NOW / incident checkpoint

The defect was reconciled instead of retrying activation.

Proven current safety state after rollback:

- migration 015 remains live and its canonical verifier had already returned `DIGITAL_EMPLOYEE_ACTIVATION_PROJECTION_V1_OK`;
- Organization Adapter v0.2.0 remains live, ready and config-preserving;
- Core candidate `sha256:126fac5055560f385c93e0d3ded65fd9cc6021b52071eb33f74d469353979648` remains live and healthy;
- activation overlay was removed again;
- Human Send remains OFF;
- Gateway outbound remains OFF;
- Web was rolled back to `wandora/web:owner-access-candidate-5f135e90` / `sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5`;
- Wandora Ana remains `paused + supervised`;
- Paperclip Ana remains `paused`;
- outbound attempts remain zero;
- the owner activation point of no return was not crossed.

## Proven root cause

`apps/web/src/auth.ts` requires browser-public configuration from:

`import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.

If absent, the browser intentionally fails closed with the configuration error above.

`apps/web/Dockerfile` previously declared:

```dockerfile
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
```

but `.github/workflows/web-ci.yml` built reviewed candidates without passing the build arg.

Direct artifact comparison proved:

- prior working owner-access image: a browser publishable-key pattern is present in compiled JS;
- PR #182 Web candidate: no browser publishable-key pattern is present in compiled JS.

The CI bridge verifier therefore proved route forwarding but did not prove that the produced browser artifact was login-capable.

## Capability authority / security classification

The Supabase publishable/anon browser key is deliberately delivered to every customer browser and is not a server credential.

It does not grant service-role or Auth-admin authority. Tenant/domain authorization remains enforced by Supabase Auth sessions plus Wandora Core policy.

Treating this browser-public value as an undeclared production secret would create hidden deployment state without adding a security boundary.

## Decision

Make the existing browser-public Auth configuration deterministic in the reviewed Web build:

1. keep `VITE_SUPABASE_PUBLISHABLE_KEY` as a build-time browser contract;
2. give the Dockerfile the exact current production publishable key as the default ARG;
3. retain `--build-arg` override for alternate environments;
4. fail the Docker build if the resolved value is empty;
5. make Web CI inspect the built static assets and fail unless a publishable-key pattern is embedded;
6. emit `WANDORA_WEB_AUTH_PUBLIC_CONFIG_V1_OK` only after that proof.

No server credential, service role key, JWT signing secret or Auth admin key is added to Web or Git.

## Second adversarial review

Rejected alternatives:

- **blindly retry owner login or activation**: does not repair the artifact and risks confusing authentication failure with lifecycle state;
- **leave the activation overlay ON while investigating**: unnecessary effect surface before the owner can authenticate; it was removed;
- **use a GitHub secret for the browser publishable key**: creates hidden continuity state for a value intentionally public in every browser;
- **add only `.env.production` while retaining the Dockerfile empty ENV**: the explicit empty process env can override Vite dotenv loading and preserve the defect;
- **mint/extract an owner Auth token from the database**: bypasses the normal customer-owner authorization boundary;
- **rebuild production ad hoc and call it the reviewed candidate**: loses artifact provenance;
- **redesign Web runtime configuration in this activation incident**: larger scope than required; a runtime-config ADR may be considered later if multiple deployment environments require it.

## Implementation

Branch:

`fix/web-auth-public-config-v1`

Changes:

- `apps/web/Dockerfile`: deterministic browser-public Auth default + empty-value build gate;
- `.github/workflows/web-ci.yml`: compiled-artifact Auth-config gate.

A replacement production Web candidate must be produced by CI from this fix and must retain the activation bridge test already present in Web CI.

## Resume gate for Production Activation Execution V1

Do not re-enable the activation overlay or ask the customer owner to activate Ana until all of the following are true:

1. this fix passes all required repository CI;
2. the replacement Web artifact is downloaded and digest/provenance verified;
3. the replacement artifact proves both:
   - login/browser Auth public config present;
   - activation bridge route present;
4. the exact replacement Web image is promoted and healthy;
5. real owner login succeeds normally;
6. full no-effect gate is re-run: Wandora Ana paused, Paperclip Ana paused, zero wakeups/runs/outbound, Human Send OFF, Gateway outbound OFF;
7. only then re-enable the activation overlay and execute exactly one owner activation.

No Mastra/Agent Runtime execution is part of this hotfix.
