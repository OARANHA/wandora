# ADR 0026 — Human Send Explicit Confirmation V1

Status: Accepted

## Context

A primeira prova outbound supervisionada demonstrou que uma mensagem pode ser enviada corretamente e o trabalho sair imediatamente da fila `attention-required`. Isso torna essencial que o humano saiba, antes do efeito externo, qual conteúdo está autorizando.

## Decision

O botão primário em `Trabalho` passa a abrir uma confirmação antes de qualquer POST de envio.

A confirmação deve:

- repetir o texto exato da proposta mostrada ao humano;
- mostrar o contato atual, mascarando-o quando tiver formato de telefone;
- deixar explícito que o primeiro clique não envia;
- exigir um segundo clique em `Confirmar e enviar` para executar o POST canônico;
- manter o texto não editável;
- preservar todas as revalidações server-side existentes no Core;
- manter confirmação pós-envio visível mesmo quando o trabalho sair da fila.

A Web continua sem escolher texto, destinatário, provider ou idempotency key no request de envio. O POST continua sem body de negócio e o Core deriva/revalida o efeito canônico.

## Safety boundary

Esta decisão não habilita outbound por si só. O runtime de produção pode permanecer com Human Send e Gateway outbound desligados enquanto a UX é validada.

Uma futura evolução poderá expor no contrato Core um preview explícito do recipient canônico. V1 melhora a agência humana sem ampliar o boundary de escrita existente.
