# ADR 0158 — GitHub-Hosted CI Runners V1

Status: **ACCEPTED / REPOSITORY CI MIGRATION / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0113 introduced the isolated repository-scoped self-hosted runner `wandora-vps-01-ci` because the repository was private and GitHub-hosted runner allowance was unavailable at that checkpoint.

The repository is now public. The self-hosted runner remains deliberately isolated from production Docker authority, but it has become a throughput bottleneck: normal Core, Web, Messaging Gateway, Platform Admin, Paperclip and plugin checks queue behind one constrained runner.

The current repository contains nine GitHub Actions workflows and all nine normal jobs target:

```text
[self-hosted, linux, x64, wandora-ci]
```

No workflow in this set is a production deployment workflow. Repository audit found no GitHub secret use, VPS SSH/SCP/rsync dependency, production Docker socket dependency or direct production-host path dependency in these workflows.

## Decision

Normal Wandora repository CI moves to GitHub-hosted Ubuntu runners:

```yaml
runs-on: ubuntu-24.04
```

for all nine current workflows:

- Core Candidate Artifact;
- Core CI;
- Messaging Gateway CI;
- Operator Consoles CI;
- Organization Adapter Plugin CI;
- Paperclip/Mastra Adapter CI;
- Paperclip OpenAPI Compatibility;
- Platform Admin CI;
- Web CI.

The existing check/job names remain unchanged so repository review and branch-protection semantics do not change.

ADR 0113 remains historical evidence for the isolated VPS runner design, but is superseded for **normal CI execution** by this ADR.

## Hosted-runner compatibility correction

The Paperclip OpenAPI Compatibility workflow previously relied on Node 24.21.0 already existing under the self-hosted runner's `RUNNER_TOOL_CACHE`.

A fresh GitHub-hosted runner cannot rely on that machine-local cache.

The workflow therefore now provisions the exact runtime explicitly:

```yaml
- name: Set up Node 24.21.0
  uses: actions/setup-node@v4
  with:
    node-version: 24.21.0
```

The compatibility test itself remains dependency-free/offline after runtime bootstrap.

Fresh hosted-runner validation also exposed one rootless-runner assumption: synthetic `0640` bind-mounted secret files used a hard-coded container supplemental GID `0`. On GitHub-hosted rootful Docker the files retain the hosted runner user's real group ID. Core and Messaging Gateway CI now resolve `WANDORA_CI_CONTAINER_SECRET_GID=$(id -g)` into `GITHUB_ENV` before their Docker secret-mount checks, preserving group-readable least privilege without making synthetic secrets world-readable.

Other workflows already either:

- provision their required Node version explicitly;
- execute through pinned Docker images;
- build their own candidate image; or
- rely only on standard Ubuntu/Docker/Compose/Python/Bash capabilities supplied by the hosted Ubuntu runner.

## Authority boundary

GitHub Actions remains the CI control plane.

GitHub-hosted runners are disposable **test/build execution infrastructure only**. They receive no production authorization.

Production effects remain separately reviewed operator actions and must not be moved into ordinary pull-request CI.

Normal CI must not receive:

- production SSH credentials;
- production Docker socket access;
- Paperclip Board credentials;
- live model-provider credentials;
- live Supabase/PostgreSQL credentials;
- customer messaging credentials.

## Security consequence

The repository is public. Using disposable GitHub-hosted runners for pull-request CI reduces the need to execute public repository changes on a long-lived machine connected to the Wandora VPS.

The existing `wandora-vps-01-ci` runner may remain temporarily installed as rollback/fallback while hosted-runner migration is validated, but repository workflows no longer target its custom label.

After hosted CI is proven GREEN, the self-hosted runner should be stopped/deregistered from normal repository Actions rather than retained as an active public-repository execution target.

## SECOND ADVERSARIAL REVIEW

### Keep self-hosted because it is already isolated

Isolation protects production authority, but does not solve serial throughput. It also keeps a long-lived runner attached to a now-public repository.

**REJECT for normal CI.**

### Mix hosted and self-hosted jobs

This would preserve queueing and create two execution environments whose differences could mask CI failures.

**REJECT for the current nine normal workflows.**

### Move only slow jobs to hosted runners

This reduces some delay but leaves unnecessary environment divergence and does not eliminate public-repository self-hosted exposure.

**REJECT.**

### Move all normal CI to one pinned GitHub-hosted Ubuntu image

Provides parallel disposable execution, keeps job/check names stable and preserves the production boundary.

**ACCEPT.**

## Execution

Repository-only changes:

1. replace all nine `runs-on: [self-hosted, linux, x64, wandora-ci]` declarations with `runs-on: ubuntu-24.04`;
2. add explicit Node 24.21.0 setup to the OpenAPI compatibility workflow;
3. remove the OpenAPI gate's machine-local `RUNNER_TOOL_CACHE` assumption;
4. retain all existing tests, Docker builds, compose checks, artifact uploads and job names.

No VPS service, production container, database, secret, customer work, model call or outbound capability is changed by this repository migration.

## Validation

Before merge:

- all nine workflow YAML files must parse;
- no normal workflow may retain a `self-hosted` runner selector;
- no workflow may retain `RUNNER_TOOL_CACHE` dependency;
- the migration PR must execute the affected checks on GitHub-hosted runners;
- failures caused by fresh-runner assumptions must be corrected explicitly rather than bypassed.

After merge:

- verify the push workflows on the exact new `main`;
- confirm hosted runners execute without the VPS runner;
- then stop/deregister the legacy self-hosted runner as a separate CI-infrastructure cleanup effect.

## Rollback

If a workflow has a genuine hosted-runner incompatibility, fix the workflow/environment assumption first.

Temporary rollback to the isolated self-hosted runner is permitted only as a bounded CI recovery measure and must not become the silent default again.

Production runtime is outside this rollback because this ADR changes no production component.
