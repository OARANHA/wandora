# ADR 0113 — GitHub Actions Self-Hosted Runner Isolation V1

- Status: **Accepted implementation — host bootstrap and repository registration pending**
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

Implementation is versioned on the infrastructure branch. Host bootstrap/registration are intentionally separate effects and must be validated before this ADR is closed as live.
