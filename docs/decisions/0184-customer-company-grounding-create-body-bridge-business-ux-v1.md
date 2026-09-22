# ADR 0184 — Customer Company Grounding Create Body Bridge + Business-Friendly UX V1

Status: ACCEPTED CANDIDATE / CODE ONLY / NO PRODUCTION EFFECT
Date: 2026-09-22

## Cause

The first real MEDICSPRO create returned HTTP 400 even though the authenticated read path was healthy. A no-effect check reproduced the failure directly against Core.

The Core HTTP server did not read request bodies for the reviewed grounding create/correct routes, so the grounding parser received no body and rejected every create.

## Decision

Add the grounding create/correct routes to the existing reviewed Human API body-read boundary and cover the behavior with a runtime test.

Keep the durable contract unchanged.

Update /company customer language to:
- Informação da empresa
- Regra da Casa
- O que sua equipe deve saber
- Esta informação veio de um documento ou fonte da empresa
- Onde essa informação está registrada?
- Nome da fonte
- Adicionar à empresa
- Ensine sua empresa à equipe digital

Internal fact/rule/provenance semantics remain unchanged.

## Validation

Local proof is GREEN:
- Core Human API runtime test 2/2
- Core typecheck/build
- Web grounding verifier
- Web typecheck/build and existing Web gates

## Boundary

No production promotion or grounding row is part of this code slice. Promotion remains a separate reviewed effect.
