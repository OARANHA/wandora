# ADR 0113 — GitHub Actions Self-Hosted Runner Isolation V1

- Status: **Accepted / LIVE — isolated repository runner validated end-to-end**
- Date: 2026-09-19
- Scope: restore executable CI for the private Wandora repository without making the repository public and without granting workflow code control over the production Docker daemon.

## REAL NOW

Canonical Git entering this infrastructure slice:

```text
main = 90ce29465816e4b91fb7bf2d516e0119a6404731
open PRs = 0
repository visibility = private
```

The owner confirmed that the GitHub-hosted Actions allowance is exhausted. The observed PR #161 runs failed before runner assignment/steps, so rerunning the same GitHub-hosted jobs does not provide useful validation while that allowance remains unavailable.

The correct Wandora host was independently revalidated before any runner effect:

```text
hostname = wandora-vps-01
public IPv4 = 13.140.190.149
Ubuntu = 24.04.5 LTS
Docker = 29.8.0
CPU = 6
RAM = 11 GiB
root disk = 193 GiB / about 129 GiB free at preflight
```

No `wandora-ci` user, runner home or runner service exists on the host at entry.

## PROVEN EVIDENCE

The current CI workflows require Docker for image builds, Compose rendering and disposable database/runtime verification.

A disposable `docker:29.1.1-dind-rootless` probe was attempted without host mounts. Ubuntu's nested unprivileged-user-namespace policy rejected RootlessKit with `operation not permitted`, including an AppArmor-unconfined disposable retry. Both probes failed closed and were removed.

A rootful/privileged DinD sidecar would recover Docker functionality, but it would place a privileged container controlled by CI on the production kernel. That weakens the intended production boundary and is rejected.

## GAPS

The private repository needs executable Linux/Docker CI without:

- making the repository public for billing reasons;
- exposing `/var/run/docker.sock`;
- attaching workflows to production Docker networks;
- allowing CI to read `/opt/wandora` or operator homes/secrets;
- allowing CI resource pressure to consume the host without bounds.

## CAPABILITY AUTHORITY / REUSE GATE

GitHub Actions remains the CI control plane. Docker remains the build/test substrate. Wandora does not introduce a parallel CI scheduler.

The minimum Wandora-owned infrastructure is one repository runner identity plus one isolated rootless Docker user boundary on the existing Wandora host.

## DECISION

Create a dedicated Linux identity `wandora-ci` with:

- no login password;
- no membership in the host `docker` group or `wandora-ops`;
- a separate rootless Docker daemon and image store;
- GitHub runner v2.337.0 pinned to the official SHA-256;
- repository-level label `wandora-ci`;
- one job at a time;
- a hardened systemd runner service;
- explicit inaccessibility for production Docker socket, `/opt/wandora`, operator home and root home;
- a user-slice ceiling of 300% CPU, 3 GiB memory-high, 4 GiB memory-max;
- pre/post job hooks that prove the rootless boundary and clean disposable CI Docker state.

All normal CI workflows move from GitHub-hosted Ubuntu labels to:

```yaml
[self-hosted, linux, x64, wandora-ci]
```

Platform Admin CI also explicitly sets up Node 22.23.2 instead of depending on a GitHub-hosted image's preinstalled Node.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

1. **Make the repository public** — unnecessary disclosure of architecture/history merely to restore free hosted minutes.
2. **Runner as `wandora-admin`** — inherits operator groups and host Docker access.
3. **Mount host Docker socket** — gives workflow code root-equivalent control over production containers.
4. **Privileged/rootful DinD** — leaves a CI-controlled privileged container on the production kernel.
5. **Nested rootless DinD** — tested and rejected by the host's namespace policy.
6. **Remove workflow Docker use** — would rewrite established reproducible verifiers merely to fit the runner.

The selected host-rootless design requires a small operator bootstrap because `uidmap` and the dedicated system identity are host-level prerequisites. Registration credentials remain ephemeral and outside Git.

## EXECUTION CONTRACT

Execution order:

```text
canonical branch/workflow change
-> operator runs bootstrap-host-v1.sh on wandora-vps-01
-> prove rootless Docker cannot read host socket
-> generate repository runner registration token
-> stage token only in /run mode 0600
-> register runner
-> shred token
-> start hardened service
-> allow queued PR CI to execute on label wandora-ci
-> validate checks + host production runtime
-> merge only after validation
```

## VALIDATION GATES

The slice is not complete until all are true:

- GitHub shows `wandora-vps-01-ci` online/idle or executing;
- job hook prints `WANDORA_CI_ROOTLESS_BOUNDARY_OK`;
- CI Docker cannot see canonical production container names;
- host `/var/run/docker.sock` is unreadable/inaccessible to runner;
- Core, Web, Messaging Gateway, Platform Admin and Organization Adapter Plugin workflows execute rather than fail before runner assignment;
- production Wandora containers remain healthy and are not recreated by CI;
- no production secret or runner registration token enters Git/logs.

## CURRENT RESULT

The host bootstrap is now live on the correct Wandora VPS and independently reconciled:

```text
host                        = wandora-vps-01
public IPv4                 = 13.140.190.149
CI identity                 = wandora-ci (uid/gid 1002)
forbidden groups            = absent (docker / wandora-ops / sudo)
rootless Docker user daemon = active
CI CPU quota                = 300%
CI MemoryHigh               = 3 GiB
CI MemoryMax                = 4 GiB
CI TasksMax                 = 4096
runner service              = installed / inactive / disabled
runner registration         = absent
```

The hardened runner unit explicitly sets the rootless `DOCKER_HOST`, uses `NoNewPrivileges`, `PrivateTmp`, `PrivateDevices`, `ProtectSystem=strict`, `RestrictNamespaces=yes`, and makes `/opt/wandora`, `/home/wandora-admin`, `/root` and both production Docker socket paths inaccessible.

Production remained healthy after bootstrap:

```text
supabase-auth              = healthy
supabase-db                = healthy
wandora-core               = healthy
wandora-web                = healthy
wandora-paperclip          = healthy
wandora-messaging-gateway  = healthy
wandora-traefik            = healthy
```

PR #162 triggered seven workflows and all seven are currently `queued`, waiting for the custom `wandora-ci` label rather than failing before runner assignment.

Repository registration remains intentionally pending because the GitHub repository runner registration token is ephemeral operator credential material and must not be placed in Git or chat. The next bounded effect is token staging under `/run`, one-time runner registration, token shredding and execution of the already-queued PR checks.


## LIVE VALIDATION RESULT — 2026-09-19

The repository-scoped runner is live on the correct Wandora host and the isolation contract is proven.

```text
runner name              = wandora-vps-01-ci
runner version           = 2.337.0
runner labels            = self-hosted, linux, x64, wandora-ci
CI identity              = wandora-ci (uid/gid 1002)
host docker group        = absent
wandora-ops / sudo       = absent
runner service           = active + enabled
runner UMask             = 0022
runner CPU quota         = 300%
runner MemoryHigh        = 3 GiB
runner MemoryMax         = 4 GiB
runner TasksMax          = 4096
registration token file  = absent after successful registration
```

The runner pre-job and post-job hooks emitted:

```text
WANDORA_CI_ROOTLESS_BOUNDARY_OK
WANDORA_CI_CLEANUP_OK
```

The first live executions exposed a persistent-runner compatibility gap rather than product regressions: the runner service intentionally uses `PrivateTmp=yes`, while the rootless Docker daemon is a separate user service. Files created by workflow `mktemp` under the runner's private `/tmp` namespace therefore could not be bind-mounted by the Docker daemon. The final contract keeps `PrivateTmp=yes` and stages only Docker bind sources under `${RUNNER_TEMP:-/tmp}`, which is visible to both boundaries. Web smoke ports were also changed from a fixed host port to a Docker-assigned loopback port, avoiding collision with the live `wandora-first-day-v1` service.

Implementation-validation head:

```text
fad8d64070663aea823325f8970a24b90004295e
```

All seven PR checks completed successfully on that head:

```text
Core Candidate Artifact           #47  success
Core CI                            #452 success
Messaging Gateway CI              #421 success
Operator Consoles CI              #32  success
Organization Adapter Plugin CI    #115 success
Platform Admin CI                 #314 success
Web CI                             #389 success
```

Core's full verifier chain passed, including the reproducible Ana Core verifier, Private Tenant Provisioning V2, Customer Hire Tenant Eligibility V1, Organization Adapter activation rehearsal and deterministic runtime/bridge overlays.

The production Docker daemon remained separate from CI throughout validation. The critical production containers `supabase-auth`, `supabase-db`, `wandora-core`, `wandora-web`, `wandora-paperclip`, `wandora-messaging-gateway` and `wandora-traefik` remained `running|healthy` with restart count zero at the final host check.

The implementation merge gate is therefore satisfied subject only to the normal final PR-head CI revalidation after this documentation-only closure commit.
