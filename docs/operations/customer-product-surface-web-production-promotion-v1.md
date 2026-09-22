# Customer Product Surface Web Production Promotion V1

Status: **EXECUTED / GREEN**
Authority: ADR 0165.

Exact promoted source:

```text
main = 2e23abd8852558155a4e1475c5891962ab03d6fa
Web CI #628 = GREEN
artifact id = 10679243455
artifact digest =
sha256:c8516101dafb5bc099c0d9ac749284760d2e6b4d5e280c52545c484cc83c7343
```

Final production Web:

```text
tag = wandora/web:candidate-2e23abd88525
host OCI manifest id =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916
CI config digest =
sha256:15459bba6b51893dee7a4770004d4654f65a304dd1c6ed07ec1073fc5fd27e53
health = healthy
restart = 0
```

Only `wandora-web` was recreated.

Final selector:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-2e23abd88525
```

The previously stale selector was reconciled during this promotion.

Rollback:

```text
wandora/web:candidate-88facf57466d
archive sha256 =
61aaf658e8cddc81d0d7cbac06376c445a95ac264df971d12f756ebedcbb9f75
```

Public routes are GREEN and unauthenticated `/api/v1/me` remains 401.

MEDICSPRO remained unchanged:

```text
works = 2
Ana = active + supervised
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

No production component other than Web was recreated.
