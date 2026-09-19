# Wandora GitHub Actions self-hosted runner V1

This directory defines the bounded host setup for the repository-level Wandora CI runner.

## Security boundary

The runner is intentionally **not** a member of the host `docker` group and must never receive `/var/run/docker.sock`.

Docker-dependent CI jobs use a dedicated **rootless Docker daemon** owned by `wandora-ci`:

```text
GitHub Actions
  -> wandora-actions-runner.service
  -> user: wandora-ci
  -> DOCKER_HOST=/run/user/<ci-uid>/docker.sock
  -> rootless Docker data under /home/wandora-ci/.local/share/docker

Production Docker
  -> /var/run/docker.sock
  -> inaccessible to the runner
```

The systemd unit also makes `/opt/wandora`, `/home/wandora-admin`, `/root` and the host Docker socket explicitly inaccessible inside the runner service namespace.

One repository runner accepts one job at a time. The whole CI user slice is capped at 300% CPU, 3 GiB memory-high and 4 GiB memory-max so CI pressure fails the CI job rather than taking production memory without bound.

## Bootstrap

The canonical bootstrap is:

```bash
sudo bash infra/ci/github-actions-runner/bootstrap-host-v1.sh
```

It is intentionally registration-neutral. A successful bootstrap ends with:

```text
WANDORA_CI_HOST_BOOTSTRAP_READY
runner_registered=no
runner_service=inactive
```

## Registration token custody

Generate a repository self-hosted-runner registration token in GitHub under:

`Repository Settings -> Actions -> Runners -> New self-hosted runner`.

Do **not** paste the token into chat, Git, shell history, an environment file or a business database.

Stage it interactively on `wandora-vps-01`:

```bash
read -rsp 'GitHub runner registration token: ' TOKEN
echo
printf '%s' "$TOKEN" | sudo tee /run/wandora-actions-runner.token >/dev/null
unset TOKEN
sudo chmod 600 /run/wandora-actions-runner.token
```

Then run:

```bash
sudo bash infra/ci/github-actions-runner/register-runner-v1.sh /run/wandora-actions-runner.token
```

The registration helper consumes and shreds the token file only after successful registration.

## Workflow label

Repository workflows target:

```yaml
runs-on: [self-hosted, linux, x64, wandora-ci]
```

The custom runner also registers the informational label `docker-rootless`.

## Failure rules

- Never add `wandora-ci` to the host `docker` group.
- Never mount or proxy the production Docker socket into CI.
- Never attach CI jobs to Wandora production Docker networks.
- Never copy production secrets into the CI user's home.
- If the rootless boundary hook fails, the job must stop before repository steps execute.
- Registration/authentication state is operator infrastructure and must remain outside Git.
