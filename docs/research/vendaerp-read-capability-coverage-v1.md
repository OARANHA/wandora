# VendaERP Read Capability Coverage V1

Status: **INVENTORY COMPLETE / DECISION READY / NO PRODUCTION EFFECT**
Date: 2026-10-01

## Source

- Project artifact: `swagger (1).json`.
- OpenAPI `3.0.1`, title `API de Integração`, version `v1`.
- Exact artifact SHA-256: `7e686ad743b4263d0aee53b50c7983c6c5cfcbabfc36573903eb15e7ed4089`.
- Provider-declared limit: 1,000 requests/hour per API key.
- Exact inventory: **98 paths / 107 operations**.
- The 98-path count matches the source recorded by ADR 0202. No newer VendaERP Swagger/OpenAPI artifact or repository copy was found in this review.

Every operation in the supplied Swagger requires the same three provider headers: `Authorization-Token`, `User`, and `App`. Tenant/customer isolation for Wandora must therefore continue to come from the governed Paperclip Connection/company binding and credential custody; the endpoint itself does not establish Wandora tenant authority.

## Classification rules

- `READ_SAFE`: non-mutating and suitable for bounded low-sensitivity projection.
- `READ_SENSITIVE`: non-mutating but returns or derives customer, financial, fiscal, operational, inventory, pricing, order, contract, production, or personal data.
- `WRITE`: creates/updates/triggers an effect but is not classified here as destructive.
- `DESTRUCTIVE`: cancellation, deletion, rescission, payment removal, or equivalent irreversible/high-impact effect.
- `OUT_OF_SCOPE`: provider diagnostics/user administration that is not Ana's commercial/administrative work.
- `QUARANTINE`: supplied Swagger is insufficient to prove side-effect semantics.

Classification follows semantics, not HTTP verbs. `Contratos/Renovar` is WRITE despite GET. `Fiscal/CalcularImpostos` is a non-persisting compute despite POST. `TranferenciasBancarias/Pesquisar` is a read despite POST. `Lancamentos/GetLinkPagamento` is quarantined because the Swagger has no summary and no response schema sufficient to prove that obtaining the link is side-effect free.

## Exact counts

- HTTP methods: GET **56**, POST **34**, PUT **10**, DELETE **7**.
- Primary semantic classes: READ_SAFE **11**, READ_SENSITIVE **42**, WRITE **38**, DESTRUCTIVE **11**, OUT_OF_SCOPE **4**, QUARANTINE **1**.
- Proven commercially useful non-mutating reads/computes: **53**.
- Useful read operations already represented by the current VendaERP MCP implementation: **8** endpoint operations.
- Useful read operations not yet exposed by the current MCP boundary: **45**.
- Mutating operations including destructive effects and the out-of-scope user-photo upload: **50**.

The current MCP implementation also exposes `Public/ping` as `vendaerp_probe`; it is operational health, not a commercial Ana capability.

## Provider boundary already present

The current VendaERP MCP package exposes **8 tools** and uses **9 HTTP GET paths**:

- `vendaerp_probe` → `business.connection.probe` → `Public/ping`;
- `vendaerp_list_companies` → `business.companies.list` → `Empresas/GetTodasEmpresas`;
- `vendaerp_search_products` → `business.products.search` + `business.products.price` → `Produtos/Pesquisar` or `Produtos/GetAll`;
- `vendaerp_get_product_stock` → `business.stock.read` → `Produtos/GetSaldo`;
- `vendaerp_list_price_tables` → `business.price_tables.list` → `TabelasPreco/Pesquisar`;
- `vendaerp_search_price_table_products` → `business.price_tables.products.read` + `business.products.price` → `TabelasPreco/Produtos`;
- `vendaerp_search_parties` → `business.parties.search` → `Pessoas/Pesquisar`;
- `vendaerp_search_orders` → `business.orders.search` → `Pedidos/Pesquisar`.

The Organization Adapter already projects **9 canonical BusinessCapability values** from these tools. No second ERP subsystem or duplicate Wandora tool registry is justified.

The owner/customer Semantic Fast Read path is narrower: `createVendaErpFastReadCapabilityAdapter()` currently binds only `vendaerp_search_products` and only `business.products.search` / `business.products.price`. Therefore provider support is broader than Ana's current customer-facing deterministic Fast Read support.

## Data-minimization findings

- Raw `Pessoa` includes PII plus provider fields `senha` and `salt`. The raw object must never cross into Ana's semantic result. The existing bounded party projection is the correct pattern.
- Raw `Produto` includes `precoCusto`, `lucroDinheiro`, `lucroPercentual`, extensive fiscal attributes and other commercially sensitive fields. The existing bounded product DTO deliberately exposes only a limited commercial subset.
- Raw `Pedido` includes customer identifiers, addresses, payment/freight fields, item lines, fiscal keys and invoice URLs. Order/status work must use a purpose-specific bounded projection.
- New endpoint exposure is therefore insufficient on its own: every admitted read needs an allowlisted provider-neutral output projection.

## Complete 107-operation inventory

| Domain | Endpoint / operation | HTTP | Purpose | Class | Side effect | Destructive | Sensitive | Tenant/customer scoped | Commercial need | Wandora capability | Current tool | Ana | Risk | Priority |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| Boletos | `/api/request/Boletos/Pesquisar` / `Boletos_Pesquisar` | GET | Busca pelos boletos emitidos no sistema ERP, ordenados pela data de vencimento (do mais recente para o mais antigo) | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.receivables.read | absent | candidate | high | P2 |
| Boletos | `/api/request/Boletos/HTML` / `Boletos_GetHtml` | GET | Swagger has no summary; operationId=Boletos_GetHtml | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.receivables.document.read | absent | candidate | high | P2 |
| Categoria | `/api/request/Categoria/Get` / `Categoria_Get` | GET | Este método destina-se à consulta de categorias de produtos no sistema, retornando um array de entidade Categoria, sendo que devem s... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | support business.products.search; no top-level capability needed yet | absent | candidate | low | P1 |
| CEP | `/api/request/CEP/Get` / `CEP_Get` | GET | Este método destina-se exclusivamente à consulta de CEP no sistema, retornando uma entidade CEP, sendo que devem ser feitas requisiç... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | medium | support address workflows; exact top-level capability deferred | absent | candidate | low | P3 |
| Configuracoes | `/api/request/Configuracoes/Get` / `Configuracoes_Get` | GET | Este método destina-se exclusivamente à consulta das configurações do E-Commerce no sistema, retornando uma entidade Configuração, s... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.read | absent | candidate | low | P3 |
| ContasBancarias | `/api/request/ContasBancarias/GetTodasContasBancarias` / `ContasBancarias_GetTodasContasBancarias` | GET | Retorna todas as contas bancárias cadastradas no sistema | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.bank_accounts.read | absent | candidate | high | P2 |
| Contratos | `/api/request/Contratos/DownloadContrato/{codigo}` / `Contratos_DownloadContrato` | GET | Este método destina-se ao download de contratos cadastrados no sistema sendo que devem ser feitas requisições GET através do modulo ... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate sensitive business.contracts.document.read | absent | candidate | high | P3 |
| Contratos | `/api/request/Contratos/Rescindir/{codigo}` / `Contratos_Rescindir` | POST | Este método destina-se a rescisao de contratos cadastrados no sistema sendo que devem ser feitas requisições POST através do modulo ... | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Criar` / `Contratos_Criar` | POST | Este método destina-se a criação de contratos no sistema sendo que devem ser feitas requisições POST através do modulo do cliente pa... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Renovar` / `Contratos_Renovar` | GET | Este método destina-se a renovação de contratos no sistema sendo que devem ser feitas requisições GET através do modulo do cliente p... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | WRITE effect; no read capability | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Remover` / `Contratos_Remover` | POST | Este método destina-se a exclusão de contratos cadastrados no sistema sendo que devem ser feitas requisições POST através do modulo ... | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Remover` / `Contratos_Remover` | DELETE | Este método destina-se a exclusão de contratos cadastrados no sistema sendo que devem ser feitas requisições POST através do modulo ... | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Atualizar` / `Contratos_Atualizar` | POST | Este método destina-se a atualização de contratos cadastrados no sistema sendo que devem ser feitas requisições POST através do modu... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/Atualizar` / `Contratos_Atualizar` | PUT | Este método destina-se a atualização de contratos cadastrados no sistema sendo que devem ser feitas requisições POST através do modu... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/EnviarParaAssinar` / `Contratos_EnviarParaAssinar` | POST | Executa a ação "Enviar para Assinar" do módulo de contratos, enviando o documento para a coleta de assinaturas | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/GerarBoletos` / `Contratos_GerarBoletos` | POST | Gera os boletos de todos os lançamentos financeiros do contrato. Processo é executado de forma assíncrona. | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Contratos | `/api/request/Contratos/GetAll` / `Contratos_GetAll` | GET | Este método destina-se a busca de contratos cadastrados no sistema sendo que devem ser feitas requisições GET através do modulo do c... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.contracts.read | absent | candidate | high | P3 |
| Contratos | `/api/request/Contratos/Pesquisar` / `Contratos_Buscar` | GET | Este método destina-se a busca de contratos cadastrados no sistema sendo que devem ser feitas requisições GET através do modulo do c... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.contracts.read | absent | candidate | high | P3 |
| Depositos | `/api/request/Depositos/GetTodosDepositos` / `Depositos_GetTodosDepositos` | GET | Retorna todos os depósitos cadastrados no sistema | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | support business.stock.read; no top-level capability needed yet | absent | candidate | low | P1 |
| Empresas | `/api/request/Empresas/GetTodasEmpresas` / `Empresas_GetTodasEmpresas` | GET | Retorna todas as empresas cadastradas no sistema | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | business.companies.list (existing) | vendaerp_list_companies | candidate | low | P1 |
| Equipamentos | `/api/request/Equipamentos/Pesquisar` / `Equipamentos_Pesquisar` | GET | Pesquise pelos equipamentos registrados no sistema ERP | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.equipment.search | absent | candidate | medium | P3 |
| Equipamentos | `/api/request/Equipamentos/Criar` / `Equipamentos_Criar` | POST | Endpoint para criação de novo equipamento | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Equipamentos | `/api/request/Equipamentos/Atualizar` / `Equipamentos_Atualizar` | PUT | Endpoint para atualização de equipamento existente | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Equipamentos | `/api/request/Equipamentos/Excluir` / `Equipamentos_Excluir` | DELETE | Swagger has no summary; operationId=Equipamentos_Excluir | DESTRUCTIVE | yes | yes | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Estoque | `/api/request/Estoque/BuscarQuantidades` / `Estoque_BuscarQuantidades` | GET | Este método destina-se somente a consulta de movimentações de estoque no sistema sendo que devem ser feitas requisições GET através ... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.inventory.movements.read | absent | candidate | medium | P3 |
| Expedicao | `/api/request/Expedicao/Buscar` / `Expedicao_Buscar` | GET | Este método destina-se a busca de ordens de expedição cadastrados no sistema sendo que devem ser feitas requisições GET através do m... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.fulfillment.read | absent | candidate | medium | P3 |
| Fiscal | `/api/request/Fiscal/InformacoesVenda` / `Fiscal_InformacoesVenda` | GET | Este método destina-se a busca de informações fiscais vinculadas a vendas cadastradas no sistema sendo que devem ser feitas requisiç... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.fiscal.sales.read | absent | candidate | high | P2 |
| Fiscal | `/api/request/Fiscal/ConsultarNFE` / `Fiscal_ConsultarNFE` | GET | Este método destina-se a busca de informações fiscais vinculadas a uma NFe emitida no sistema sendo que devem ser feitas requisições... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.fiscal.invoices.read | absent | candidate | high | P2 |
| Fiscal | `/api/request/Fiscal/ConsultarNfePeriodo` / `Fiscal_ConsultarNfePeriodo` | GET | Método utilizado para buscar informações fiscais relacionadas às NFEs emitidas no sistema dentro de um determinado período. As requi... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.fiscal.invoices.read | absent | candidate | high | P2 |
| Fiscal | `/api/request/Fiscal/EmitirNFCE` / `Fiscal_EmitirNFCE` | POST | Este método destina-se a emitir NFCe a partir do código da venda | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Fiscal | `/api/request/Fiscal/EmitirNFE` / `Fiscal_EmitirNFE` | POST | Este método destina-se a emitir NFe a partir do código da venda | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Fiscal | `/api/request/Fiscal/ExcluirNFE` / `Fiscal_ExcluirNFE` | DELETE | Este método destina-se a excluir uma NF-e que ainda não foi transmitida à SEFAZ (status "Em Edição"). | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Fiscal | `/api/request/Fiscal/CalcularImpostos` / `Fiscal_CalcularImpostos` | POST | Calcula os impostos de uma venda (ICMS, ICMS ST, FCP, IPI etc.) a partir do mesmo payload de Pedidos/Salvar, sem persistir venda, es... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive compute business.tax.calculate | absent | candidate | high | P2 |
| FormasPagamento | `/api/request/FormasPagamento/GetTodasFormasPagamento` / `FormasPagamento_GetTodasFormasPagamento` | GET | Busca todas as formas de pagamento do sistema | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | support business.orders.search; no top-level capability needed yet | absent | candidate | low | P1 |
| FormasPagamento | `/api/request/FormasPagamento/Pesquisar` / `FormasPagamento_Pesquisar` | GET | Buscar as formas de pagamento registradas no ERP | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | support business.orders.search; no top-level capability needed yet | absent | candidate | low | P1 |
| FormasPagamento | `/api/request/FormasPagamento/Criar` / `FormasPagamento_Criar` | POST | Endpoint para criar novas formas de pagamento no sistema ERP | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| FormasPagamento | `/api/request/FormasPagamento/Atualizar` / `FormasPagamento_Atualizar` | PUT | Endpoint para atualizar uma forma de pagamento existente no sistema ERP | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| FormasPagamento | `/api/request/FormasPagamento/Excluir` / `FormasPagamento_Excluir` | DELETE | Endpoint para removar uma forma de pagamento no sistema ERP | DESTRUCTIVE | yes | yes | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/Pesquisar` / `Lancamentos_Pesquisar` | GET | Busca por lançamentos financeiros no sistema conforme os filtros | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.entries.read | absent | candidate | high | P2 |
| Lancamentos | `/api/request/Lancamentos/GetAll` / `Lancamentos_GetAll` | GET | Retorna todos os lançamentos financeiros de forma paginada | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.entries.read | absent | candidate | high | P2 |
| Lancamentos | `/api/request/Lancamentos/Get` / `Lancamentos_Get` | GET | Busca um lançamento pelo seu código sequencial | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.entries.read | absent | candidate | high | P2 |
| Lancamentos | `/api/request/Lancamentos/Criar` / `Lancamentos_Criar` | POST | Método para criar um novo lançamento financeiro | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/Atualizar` / `Lancamentos_Atualizar` | POST | Atualiza um lançamento financeiro já existente | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/Remover` / `Lancamentos_Remover` | DELETE | Remove um lançamento financeiro através do seu código sequencial | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/AdicionarPagamentos` / `Lancamentos_AdicionarPagamentos` | POST | Adiciona um pagamento para um lançamento existente no sistema. O código do lançamento é informado no corpo da requisição | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/RemoverTodosPagamentos` / `Lancamentos_RemoverTodosPagamentos` | POST | Remover todos os pagamentos de um lançamento | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/GerarCobrancaIntegracao` / `Lancamentos_GerarCobrancaIntegracao` | POST | Cria uma nova cobrança para um lançamento utilizando as integrações de pagamento do ERP | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Lancamentos | `/api/request/Lancamentos/GetLinkPagamento` / `Lancamentos_GetLinkPagamento` | GET | Swagger has no summary; operationId=Lancamentos_GetLinkPagamento | QUARANTINE | unknown | no | unknown | yes — provider credential + Paperclip/Wandora binding | unproven | QUARANTINE; capability deferred | absent | no | unknown | Q |
| Marca | `/api/request/Marca/Get` / `Marca_Get` | GET | Retorna todas as marca cadastradas no sistema | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | high | support business.products.search; no top-level capability needed yet | absent | candidate | low | P1 |
| OperacoesPDV | `/api/request/OperacoesPDV/Salvar` / `OperacoesPDV_Salvar` | POST | Este método destina-se ao registro de uma operação no PDV no sistema sendo que devem ser feitas requisições POST através do modulo d... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OperacoesPDV | `/api/request/OperacoesPDV/Salvar` / `OperacoesPDV_Salvar` | PUT | Este método destina-se ao registro de uma operação no PDV no sistema sendo que devem ser feitas requisições POST através do modulo d... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OperacoesPDV | `/api/request/OperacoesPDV/Pesquisar` / `OperacoesPDV_Pesquisar` | GET | Pesquisa operações do PDV | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate sensitive business.pos.operations.read | absent | candidate | medium | P3 |
| Oportunidades | `/api/request/Oportunidades/Cadastrar` / `Oportunidades_Cadastrar` | POST | Cadastra uma nova oportunidade no sistema | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Oportunidades | `/api/request/Oportunidades/Atualizar` / `Oportunidades_Atualizar` | POST | Atualiza uma oportunidade existente no sistema | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Oportunidades | `/api/request/Oportunidades/AdicionarInteracoes` / `Oportunidades_AdicionarInteracoes` | POST | Adiciona uma interação em uma oportunidade já cadastrada no sistema | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Oportunidades | `/api/request/Oportunidades/Pesquisar` / `Oportunidades_Pesquisar` | GET | Pesquisa por oportunidades cadastradas no sistema conforme os filtros | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.opportunities.search | absent | candidate | medium | P3 |
| OrdensProducao | `/api/request/OrdensProducao/Pesquisar` / `OrdensProducao_Pesquisar` | GET | Este método destina-se exclusivamente a consulta de Ordens de Produção cadastradas no sistema sendo que devem ser feitas requisições... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate business.production_orders.read | absent | candidate | medium | P3 |
| OrdensProducao | `/api/request/OrdensProducao/Excluir` / `OrdensProducao_Excluir` | POST | Este método destina-se exclusivamente à exclusão de Ordens de Produção no sistema, sendo que devem ser feitas requisições POST atrav... | DESTRUCTIVE | yes | yes | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| OrdensProducao | `/api/request/OrdensProducao/Cadastrar` / `OrdensProducao_Cadastrar` | POST | Este método destina-se exclusivamente ao cadastro de Ordens de Produção no sistema sendo que devem ser feitas requisições POST atrav... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OrdensProducao | `/api/request/OrdensProducao/AvaliacaoConcluida` / `OrdensProducao_AvaliacaoConcluida` | POST | Este método destina-se exclusivamente para concluir a avaliação da Ordem de Produção no sistema, sendo que devem ser feitas requisiç... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OrdensProducao | `/api/request/OrdensProducao/Finalizar` / `OrdensProducao_Finalizar` | POST | Este método destina-se exclusivamente para finalizar a Ordem de Produção no sistema, sendo que devem ser feitas requisições POST atr... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OrdensProducao | `/api/request/OrdensProducao/BuscarCheckListQualidade` / `OrdensProducao_BuscarCheckListQualidade` | GET | Este método destina-se exclusivamente para buscar checklist da Ordem de Produção no sistema, sendo que devem ser feitas requisições ... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | support business.production_orders.read | absent | candidate | medium | P3 |
| OrdensProducao | `/api/request/OrdensProducao/AdicionarHistorico` / `OrdensProducao_AdicionarHistorico` | POST | Este método destina-se exclusivamente para adicionar o histórico da Ordem de Produção no sistema, sendo que devem ser feitas requisi... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| OrdensProducao | `/api/request/OrdensProducao/Impressoes` / `OrdensProducao_Impressoes` | GET | Este método destina-se exclusivamente para buscar impressoes da Ordem de Produção no sistema, sendo que devem ser feitas requisições... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | support business.production_orders.read documents | absent | candidate | medium | P3 |
| Pedidos | `/api/request/Pedidos/Pesquisar` / `Pedidos_Pesquisar` | GET | Este método destina-se exclusivamente a consulta de pedidos cadastrados no sistema sendo que devem ser feitas requisições GET atravé... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.orders.search (existing) | vendaerp_search_orders | candidate | medium | P1 |
| Pedidos | `/api/request/Pedidos/Salvar` / `Pedidos_Salvar` | POST | Este método destina-se ao cadastro e alteração de pedidos no sistema sendo que devem ser feitas requisições POST através do modulo d... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Pedidos | `/api/request/Pedidos/Salvar` / `Pedidos_Salvar` | PUT | Este método destina-se ao cadastro e alteração de pedidos no sistema sendo que devem ser feitas requisições POST através do modulo d... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Pedidos | `/api/request/Pedidos/SalvarEFaturar` / `Pedidos_SalvarEFaturar` | POST | Este método destina-se ao cadastro e alteração de pedidos no sistema fazendo o faturamento do pedido, as requisições devem ser feita... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Pedidos | `/api/request/Pedidos/SalvarEFaturar` / `Pedidos_SalvarEFaturar` | PUT | Este método destina-se ao cadastro e alteração de pedidos no sistema fazendo o faturamento do pedido, as requisições devem ser feita... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Pedidos | `/api/request/Pedidos/ExcluirPedido` / `Pedidos_ExcluirPedido` | DELETE | Este método destina-se a deletar os pedidos feitos via API, as requisições devem ser feitas por DELETE através do modulo do cliente ... | DESTRUCTIVE | yes | yes | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| Pedidos | `/api/request/Pedidos/GetTodosPedidos` / `Pedidos_GetTodosPedidos` | GET | Swagger has no summary; operationId=Pedidos_GetTodosPedidos | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | reuse business.orders.search; broad-list endpoint discouraged | absent | candidate | medium | P1 |
| Pessoas | `/api/request/Pessoas/Pesquisar` / `Pessoas_Pesquisar` | GET | Este método destina-se exclusivamente a consulta de pessoas cadastradas no sistema sendo que devem ser feitas requisições GET atravé... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.parties.search (existing) | vendaerp_search_parties | candidate | high | P1 |
| Pessoas | `/api/request/Pessoas/GetAll` / `Pessoas_GetAll` | GET | Swagger has no summary; operationId=Pessoas_GetAll | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | reuse business.parties.search; broad-list endpoint discouraged | absent | candidate | high | P3 |
| Pessoas | `/api/request/Pessoas/ConsultaInadimplencias` / `Pessoas_ConsultaInadimplencias` | GET | Este método destina-se exclusivamente a consulta de inadimplencias de pessoas cadastradas no sistema, retornando uma lista de entida... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.credit.delinquency.read | absent | candidate | high | P2 |
| Pessoas | `/api/request/Pessoas/Salvar` / `Pessoas_Salvar` | POST | Este método destina-se ao cadastro e alteração de clientes/fornecedores no sistema sendo que devem ser feitas requisições POST atrav... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Pessoas | `/api/request/Pessoas/Salvar` / `Pessoas_Salvar` | PUT | Este método destina-se ao cadastro e alteração de clientes/fornecedores no sistema sendo que devem ser feitas requisições POST atrav... | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| PlanosConta | `/api/request/PlanosConta/Pesquisar` / `PlanosConta_Pesquisar` | GET | Busca pelos boletos emitidos no sistema ERP, ordenados pela data de vencimento (do mais recente para o mais antigo) | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | support finance reads; top-level capability deferred | absent | candidate | high | P2 |
| Produtos | `/api/request/Produtos/Pesquisar` / `Produtos_Pesquisar` | GET | Este método destina-se exclusivamente à pesquisa de produtos cadastrados no sistema, retornando uma lista de entidade Produto, sendo... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.products.search / business.products.price (existing) | vendaerp_search_products | yes today | medium | P0 |
| Produtos | `/api/request/Produtos/GetAll` / `Produtos_GetAll` | GET | Swagger has no summary; operationId=Produtos_GetAll | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.products.search / business.products.price (existing tool fallback) | vendaerp_search_products | yes today | medium | P0 |
| Produtos | `/api/request/Produtos/Get` / `Produtos_Get` | GET | Este método destina-se exclusivamente à consulta de produtos no sistema, retornando uma entidade Produto, sendo que devem ser feitas... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | reuse business.products.search; no new capability yet | absent | candidate | medium | P0 |
| Produtos | `/api/request/Produtos/PesquisaEcommerce` / `Produtos_PesquisaEcommerce` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando uma lista de entidade Produto, sen... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/PesquisaEcommerceCount` / `Produtos_PesquisaEcommerceCount` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando o cálculo de produtos, sendo que d... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/TodosEcommerce` / `Produtos_TodosEcommerce` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando uma lista de entidade Produto, sen... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/TodosEcommerceCount` / `Produtos_TodosEcommerceCount` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando o cálculo das listas de produtos, ... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/GetByNomeWebEcommerce` / `Produtos_GetByNomeWebEcommerce` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando uma entidade Produto, sendo que de... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/GetByCodigoEcommerce` / `Produtos_GetByCodigoEcommerce` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando uma entidade Produto, sendo que de... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/GetSaldo` / `Produtos_GetSaldo` | GET | Este método destina-se exclusivamente à consulta de produtos no sistema, retornando uma lista com os saldos do produto em estoque, s... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.stock.read (existing) | vendaerp_get_product_stock | candidate | medium | P0 |
| Produtos | `/api/request/Produtos/ProdutosRelacionadosEcommerce` / `Produtos_ProdutosRelacionadosEcommerce` | GET | Este método destina-se exclusivamente à consulta de produtos do E-commerce no sistema, retornando uma lista de entidade Produto, sen... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium | candidate family business.ecommerce.products.read | absent | candidate | medium | P3 |
| Produtos | `/api/request/Produtos/Salvar` / `Produtos_Salvar` | POST | Este método destina-se ao cadastro e alteração de produtos no sistema sendo que devem ser feitas requisições POST através do modulo ... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Produtos | `/api/request/Produtos/Salvar` / `Produtos_Salvar` | PUT | Este método destina-se ao cadastro e alteração de produtos no sistema sendo que devem ser feitas requisições POST através do modulo ... | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Produtos | `/api/request/Produtos/Excluir` / `Produtos_Excluir` | DELETE | Este método destina-se exclusivamente à exclusão de produtos no sistema, sendo que devem ser feitas requisições DELETE através do mo... | DESTRUCTIVE | yes | yes | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | critical | DEFER_WRITE |
| ProdutosEstoque | `/api/request/ProdutosEstoque/Salvar` / `ProdutosEstoque_Salvar` | POST | Salva uma nova movimentação de estoque | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| ProdutosEstoque | `/api/request/ProdutosEstoque/Salvar` / `ProdutosEstoque_Salvar` | PUT | Salva uma nova movimentação de estoque | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| ProdutosFotos | `/api/request/ProdutosFotos/GetImagemPrincipalByProduto` / `ProdutosFotos_GetImagemPrincipalByProduto` | GET | Este método destina-se exclusivamente à consulta da foto principal dos produtos no sistema, retornando um entidade ProdutoFoto, send... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | medium | support product media; top-level capability deferred | absent | candidate | low | P3 |
| ProdutosFotos | `/api/request/ProdutosFotos/GetImagensByProduto` / `ProdutosFotos_GetImagensByProduto` | GET | Este método destina-se exclusivamente à consulta das fotos dos produtos no sistema, retornando uma lista de entidade ProdutoFoto, se... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | medium | support product media; top-level capability deferred | absent | candidate | low | P3 |
| ProdutosFotos | `/api/request/ProdutosFotos/GetImagem` / `ProdutosFotos_GetImagem` | GET | Este método destina-se exclusivamente à consulta das fotos dos produtos no sistema, retornando um array de bytes se a imagem é ou nã... | READ_SAFE | no | no | low | yes — provider credential + Paperclip/Wandora binding | medium | support product media; top-level capability deferred | absent | candidate | low | P3 |
| ProdutosFotos | `/api/request/ProdutosFotos` / `ProdutosFotos_SaveImagem` | POST | Salva uma nova imagem no sistema | WRITE | yes | no | depends | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Public | `/api/request/Public/ping` / `Public_Ping` | GET | Swagger has no summary; operationId=Public_Ping | OUT_OF_SCOPE | no | no | low | yes — provider credential + Paperclip/Wandora binding | none for Ana | business.connection.probe (existing; operational) | vendaerp_probe | no | low/out | OUT |
| Public | `/api/request/Public/version` / `Public_Version` | GET | Swagger has no summary; operationId=Public_Version | OUT_OF_SCOPE | no | no | low | yes — provider credential + Paperclip/Wandora binding | none for Ana | OUT_OF_SCOPE diagnostic | absent | no | low/out | OUT |
| SaldosBancarios | `/api/request/SaldosBancarios/Pesquisar` / `SaldosBancarios_Pesquisar` | GET | Retorna o saldo por conta bancária registrado no sistema ERP | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.bank_balances.read | absent | candidate | high | P2 |
| TabelasPreco | `/api/request/TabelasPreco/Pesquisar` / `TabelasPreco_PesquisarTabelasDePreco` | GET | Busca as tabelas de preço cadastradas no sistema | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.price_tables.list (existing) | vendaerp_list_price_tables | candidate | medium | P0 |
| TabelasPreco | `/api/request/TabelasPreco/Produtos` / `TabelasPreco_PesquisarProdutosTabelaPreco` | GET | Busca os produtos e respectivos preços por tabela de preço | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | high | business.price_tables.products.read / business.products.price (existing) | vendaerp_search_price_table_products | candidate | medium | P0 |
| TranferenciasBancarias | `/api/request/TranferenciasBancarias/Pesquisar` / `TranferenciasBancarias_Pesquisar` | POST | Este método destina-se à Pesquisa de Transferências Bancárias no sistema sendo que devem ser feitas requisições POST através do modu... | READ_SENSITIVE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | medium/high | candidate sensitive business.finance.bank_transfers.read | absent | candidate | high | P2 |
| TranferenciasBancarias | `/api/request/TranferenciasBancarias/Salvar` / `TranferenciasBancarias_Salvar` | POST | Salva uma nova transferência bancária no sistema | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| TranferenciasBancarias | `/api/request/TranferenciasBancarias/Salvar` / `TranferenciasBancarias_Salvar` | PUT | Salva uma nova transferência bancária no sistema | WRITE | yes | no | yes | yes — provider credential + Paperclip/Wandora binding | future WRITE | future effect contract; outside this slice | absent | no | high | DEFER_WRITE |
| Usuarios | `/api/request/Usuarios/Foto` / `Usuarios_PostUserPhoto` | POST | Upload da foto do usuário | OUT_OF_SCOPE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | none for Ana | OUT_OF_SCOPE user-profile mutation | absent | no | write/out | OUT |
| Usuarios | `/api/request/Usuarios/ValidarDadosTracker` / `Usuarios_ValidarDadosTracker` | GET | Swagger has no summary; operationId=Usuarios_ValidarDadosTracker | OUT_OF_SCOPE | no | no | yes | yes — provider credential + Paperclip/Wandora binding | none for Ana | OUT_OF_SCOPE provider-specific user validation | absent | no | low/out | OUT |

## Human-language coverage

| Human intent | BusinessCapability | VendaERP source/tool | Ana supports today? | Gap | Action |
|---|---|---|---|---|---|
| Quanto custa o produto X? | `business.products.price` | `Produtos/Pesquisar` via `vendaerp_search_products` | yes | none for proven price path | reuse |
| Existe o produto X? Qual código/SKU, categoria, marca ou unidade? | `business.products.search` | `Produtos/Pesquisar` / `Produtos/GetAll` via `vendaerp_search_products` | yes | semantic phrasing/ambiguity test coverage | reuse |
| Tem X em estoque? Quantas unidades temos? | `business.stock.read` | existing `vendaerp_get_product_stock`; product-search DTO also exposes bounded `stockBalance` | no | define aggregate-vs-deposit semantics and selector contract before binding | P0 reuse existing provider; no new endpoint first |
| Quais tabelas/preços específicos existem? | `business.price_tables.list` / `business.price_tables.products.read` | existing price-table tools | no | deterministic intent/result binding | P0/P1 reuse |
| Esse cliente/fornecedor está cadastrado? | `business.parties.search` | existing `vendaerp_search_parties` | no | party selector + safe-field renderer | P1 reuse |
| Me diga os dados do cliente X. | `business.parties.search` | same bounded party tool | no | explicit safe-field policy; never raw `Pessoa` | P1 reuse |
| Quais pedidos do cliente X estão abertos? / qual status do pedido 123? | `business.orders.search` | existing `vendaerp_search_orders` | no | order selector + deterministic renderer | P1 reuse |
| O que foi vendido hoje? | likely reuse `business.orders.search` if bounded order/item projection is sufficient | `Pedidos/Pesquisar`; current DTO omits item lines | no | prove whether item projection is needed | P1/P2; extend existing provider projection only if required |
| Existe nota desse pedido? | reuse `business.orders.search` | current order DTO already projects `invoiceNumber` | no | deterministic order lookup | P1; no fiscal endpoint required for simple existence |
| Quais detalhes da NFe / notas em um período? | candidate `business.fiscal.invoices.read` | `Fiscal/ConsultarNFE`, `Fiscal/ConsultarNfePeriodo` | no | new sensitive provider tool/projection + authorization | P2 separate sensitive-data slice |
| Há inadimplência / lançamentos / boletos / saldo bancário? | finance/credit capability family not yet canonical | multiple proven read endpoints | no | semantic contract + strong data minimization + role policy + provider extensions | P2 separate sensitive-data slice |

## Reuse Gate and decision

### Wandora-owned

- human intent/language;
- canonical `BusinessCapability` contract;
- tenant authorization;
- employee capability policy and rollout admission;
- effect authorization;
- provider-neutral result presentation.

### Paperclip/provider-owned

- Connection identity and credential custody;
- grants and effective tool policy;
- tool catalog/inventory;
- Tool Gateway session/execution;
- run lifecycle and tool audit.

### VendaERP-owned

- ERP endpoint implementation and business data;
- provider-specific request/response semantics behind the existing adapter.

### Durable state

No new Wandora table/migration is justified. Prefer on-demand reads. Do not replicate products, stock, parties, orders, fiscal records or finance data into Wandora without a separately proven Wandora-owned durability requirement.

### Decision

1. Do **not** expose all 53 useful reads merely because the Swagger contains them.
2. First reuse the current provider tools and the 9 existing canonical BusinessCapabilities.
3. Expand Ana's deterministic Fast Read layer in small semantic slices before creating new provider tools.
4. Add new provider endpoints only when a concrete human intent cannot be fulfilled safely by the existing bounded tool projections.
5. Fiscal/financial reads are a separate sensitive-data family and must not be bundled into the first reuse slice.
6. `Lancamentos/GetLinkPagamento` remains quarantined until provider semantics prove whether it is a pure read.
7. No WRITE/DESTRUCTIVE endpoint enters this program.

## Slice order

### P0 — daily product/availability work

- keep `business.products.search` and `business.products.price` as already proven;
- qualify `business.stock.read` for natural-language stock questions using the existing provider boundary;
- explicitly decide aggregate stock versus per-deposit stock semantics before code;
- then qualify price-table reads if a real customer workflow needs them.

### P1 — customer and order work

- `business.parties.search` through the existing bounded party tool;
- `business.orders.search` for customer/order/status/invoice-number questions;
- supporting company/category/brand/deposit/payment-form lookups only when needed by those intents.

### P2 — sensitive fiscal/financial reads

- NFe/fiscal details;
- receivables/boletos;
- financial entries and delinquency;
- bank accounts/balances/transfers;
- tax calculation as a non-persisting compute.

P2 requires a separate privacy/role/data-minimization decision before provider extensions.

### P3 — specialist or lower-frequency operational reads

- contracts, equipment, fulfillment, POS operations, opportunities, production orders, e-commerce catalog support and product media.

## Test and canary policy

Every admitted capability must first prove:

human question → semantic capability → selector → exact authorized tool → exact parameters → bounded provider-neutral result → understandable presentation.

Ambiguity must fail closed. No silent fallback to another capability/domain. Provider calls use no automatic retry.

Most reuse slices can be qualified with fixtures, contract tests, provider tests and CI. A new real canary is justified only when synthetic evidence cannot prove the runtime/provider contract. Any future real canary must be one bounded read, no retry, no fallback, followed by reconciliation.

## Next slice

**Semantic Fast Read Existing VendaERP Capability Reuse — Stock V1**.

Before implementation, make one deterministic semantic decision about what `business.stock.read` means for the first customer-facing slice: aggregate product balance, per-deposit balance, or a fail-closed two-step clarification. Reuse the existing VendaERP tool boundary; do not create a second integration subsystem or a new persistence layer.