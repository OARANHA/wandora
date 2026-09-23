# GitHub Actions Artifact Host Transfer V1

## Purpose

Canonical host-side transfer and qualification of GitHub Actions artifacts for Wandora production promotion.

## Credential

Host-only file:

```text
/etc/wandora/github-artifacts.env
```

Expected names only:

```text
GH_TOKEN
GH_REPO
```

Required permissions:

```text
0640 root:wandora-ops
```

Never print, commit, copy into a container, or expose the token to application runtime.

## Helper

```text
/home/wandora-admin/bin/wandora-github-artifact
```

Usage:

```bash
/home/wandora-admin/bin/wandora-github-artifact \
  <artifact-id> \
  /home/wandora-admin/executions/<promotion>/artifact-download
```

Successful output must prove:

- GitHub digest;
- identical local ZIP SHA-256;
- internal `SHA256SUMS` success;
- manifest/source SHA;
- expected image tag.

## Promotion gate

Do not load/promote an artifact unless:

1. artifact is not expired;
2. GitHub digest matches the downloaded ZIP;
3. internal checksums pass;
4. manifest `source_sha` equals the exact intended merged `main`;
5. image tag matches the intended candidate;
6. relevant post-merge CI is GREEN;
7. pre-effect runtime/selector/rollback snapshot is recorded.

## Security property

Authentication is used only against GitHub API.

The helper obtains GitHub's signed artifact redirect, then downloads from the signed storage URL without forwarding the bearer token to the storage host.

## Failure handling

On 401:

- confirm token has Actions Read and repository access;
- confirm `GH_REPO`;
- rotate token if invalid/expired.

On 403:

- inspect token repository selection and Actions permission;
- do not fall back automatically to connector-hosted temporary URLs.

On digest/checksum mismatch:

- stop;
- do not load the image;
- redownload once through the canonical helper;
- if mismatch persists, investigate the artifact/workflow.

## Repository-write boundary and fallback

The host credential in `/etc/wandora/github-artifacts.env` is canonical for **artifact read/qualification**. Do not assume it has repository `contents:write` permission.

Observed failure mode on 2026-09-23:

- normal `git push` over HTTPS could remain blocked waiting on credential flow;
- a temporary `GIT_ASKPASS` that safely read `GH_TOKEN` from the host-only file proved the token itself was usable, but GitHub returned `403 Permission to OARANHA/wandora.git denied` for repository write;
- therefore artifact-read success does not prove push permission.

When repository write through the VPS credential is unavailable but an authorized GitHub connector is available, the accepted fallback is:

1. reconcile whether any prior push or connector operation already changed the remote branch;
2. never expose the host token in URLs, logs, process arguments or chat;
3. create/update only a non-protected work branch through the authorized GitHub API connector;
4. if an interrupted connector write left a partial branch, inspect its exact head before replacement;
5. reconstruct the intended tree from the reviewed local checkout;
6. compare the remote candidate tree SHA against the local `git rev-parse HEAD^{tree}` / `git write-tree` SHA;
7. only after exact tree equality, move the **work branch only** to the validated commit; force-update is acceptable only when the existing branch is proven to be an incomplete artifact of the same interrupted transport;
8. never force-update `main` or another protected/shared branch;
9. reopen/reconcile the PR state rather than creating duplicates after a timeout or chat interruption.

A remote commit SHA may differ from the local commit SHA because author/committer metadata can differ. The acceptance invariant is exact parent + exact tree/content, not commit-SHA identity.

## Rotation

The current credential is a fine-grained PAT. Rotate before expiry.

A future GitHub App installation token may replace PAT custody without changing the qualification contract.
