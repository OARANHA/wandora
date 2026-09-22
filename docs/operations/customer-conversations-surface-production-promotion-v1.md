# Customer Conversations Surface Production Promotion V1

Status: **EXECUTED / GREEN**
Authority: ADR 0167.

Promoted source:

```text
main = 65908b76c667e1326b0c73584766b8cc4ad73c0e
Web CI #634 = GREEN
artifact id = 10680377258
```

Production Web:

```text
tag = wandora/web:candidate-65908b76c667
host OCI manifest id =
sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e
health = healthy
restart = 0
```

Rollback:

```text
wandora/web:candidate-2e23abd88525
archive sha256 =
1bcefea8af22d867741502f697294fe3ad1702bd28dbb6c00446bfe6f8dbad87
```

Only Web was recreated.

Validation:

```text
/conversations = 200
/api/v1/me unauthenticated = 401
conversations_surface = present
read_only_copy = present
MEDICSPRO works = 2
Ana = active + supervised
outbound attempts = 0
```

Core, Paperclip and Messaging Gateway remained unchanged and healthy.
