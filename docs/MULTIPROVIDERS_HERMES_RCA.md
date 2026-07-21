# HERMES RCA ADVERSARIAL — MULTIPROVIDERS

> Data: 2026-07-21 · Escopo: risco arquitetural da SPEC, sem auditoria de implementação e sem integração Colibri.

## Hipótese adversarial

O maior risco não é “um Provider falhar”; é o primeiro Provider integrado virar a arquitetura implícita e contaminar contratos, health, modelos e routing.

| Vetor | Falha provável | Evidência/gate normativo |
|---|---|---|
| Acoplamento | consumers acessam adapter/SDK diretamente | somente snapshots e contrato comum atravessam o boundary |
| Contrato específico | campo de Colibri/OpenAI vira obrigatório comum | extensão não pode mudar semântica normativa |
| Dependência de Provider | branches por `provider_id`/vendor | No Provider Special Case |
| Dependência de Model | família decide transport/executor | Model Registry separado; oferta muitos-para-muitos |
| Endpoint hardcoded | URL vira identidade/configuração global | endpoint pertence à configuração do transporte |
| Provider privilegiado | default/fallback por nome | policy versionada + razões auditáveis |
| Local especial | registry/pipeline local paralelo | `location` é atributo |
| Cloud especial | health/privacy inferidos de cloud | evidência explícita; `location` não prova propriedade |
| Provider × Model | catálogo replica models por executor | Model canônico + ProviderModelOffering |
| False health | cadastro ou probe vencido tratado como healthy | `unknown` default e expiração obrigatória |
| Duplicate registry | caches/views passam a aceitar escrita | Provider Registry é fonte única |

## Causas-raiz antecipadas

1. Pressa para integrar o primeiro Provider antes de fechar contratos.
2. Reaproveitamento de payloads nativos como domínio comum.
3. Confusão semântica entre disponibilidade de Model e saúde do Provider.
4. Fallback herdado/hardcoded disfarçado de policy automática.
5. Tratamento de local/cloud como topologia fixa em vez de metadado.

## Controles obrigatórios

- Contract tests reutilizáveis para todo Provider.
- Lint/review arquitetural contra IDs, vendors, endpoints e modelos hardcoded no core.
- Health temporal, fail-closed e separado de lifecycle.
- Explicação/auditoria de toda decisão de routing e failover.
- Negative tests provando que um Provider novo entra sem alterar core contracts.

## Veredito Hermes

SPEC aprovada somente sob arquitetura neutra de quatro superfícies. Qualquer adapter especial, registry duplicado, inferência de health/privacy por localização ou fallback nominal reabre o RCA antes da implementação.


## Phase 1.1 — RCA adversarial específica

Esta análise complementa a Phase 1; não repete o risco genérico de acoplamento.

| Falha | Causa | Sintoma/impacto | Detecção | Prevenção/gate |
|---|---|---|---|---|
| Capability inferida ou falsa | nome substitui evidência | rota incompatível | capability sem source/validated_at | No Capability Assumption |
| Health booleano/congelado | ausência de TTL/escopo | tráfego para alvo inválido | ONLINE vencido ou sem evidence | No Boolean Health; No Stale Health |
| Provider online, Model indisponível | propagação indevida de escopo | falha tardia | health Provider usado para offering | No False Health |
| Transport vira arquitetura | SDK/protocolo define domínio | vendor lock | branch/type por marca | No Transport Logic |
| Alias circular/ambíguo | alias vira identidade | Model errado ou loop | resolução não termina/não é única | No Alias Loop |
| Versão misturada | campo version genérico | compatibilidade falsa | dimensões ausentes | No Version Mixing |
| Model/Provider órfão | offering sem identidade registrada | catálogo inconsistente | referência sem owner | No Orphan Model/Provider |
| Benchmark como health/global | contexto/validade descartados | ranking falso | benchmark sem workload/validity | No Benchmark as Health |
| Custo desconhecido vira zero | ausência tratada como número | budget violado | unknown participa como 0 | No Unknown Cost as Zero |
| Privacy por location | local/cloud vira proxy | policy enganosa | dimensão sem evidência | No Privacy by Location |
| Discovery eleva confiança | descoberta auto-registra/ativa | alvo não validado elegível | salto para READY | No Discovery Trust Escalation |
| Lifecycle ignorado | routing consulta apenas health | disabled/removed recebe tráfego | candidato inelegível presente | No Lifecycle Bypass |
| Failover incompatível | retry ignora requisitos | capability/privacy violada | fallback fora do conjunto filtrado | No Incompatible Failover |
| Latência antiga | observação sem validade | classificação obsoleta | timestamp/validity ausente | No Stale Health |

Riscos residuais: taxonomia pode exigir extensão após evidência de Providers reais; comparabilidade de benchmark depende de workloads futuros; regras de idempotência variam por operação; fontes externas podem mentir. Phase 2 só pode iniciar após revisão desta RCA, aceite explícito dos riscos residuais e transformação dos gates aplicáveis em evidência executável.


## R1 — Security and Ownership Hardening

### SISTEMA ANALISADO

Provider Vault global, runtime Provider/status, scanner AST, status de conexão e transportes Gemini.

### OBJETIVO

Impedir observação/mutação anônima ou cross-tenant e retirar segredo de URLs antes do domínio canônico.

### HIPÓTESE DE FALHA

Sessão comum controlaria o singleton global; status antigo venceria configuração válida; URLs/logs poderiam carregar chave.

### CAUSAS RAIZ

Autorização baseada apenas em sessão, estado global sem owner, connected sem TTL e autenticação Gemini em query string.

### VETORES E EVIDÊNCIAS

- Todas as rotas Provider/runtime/scanner retornam 401 anônimo e 403 usuário comum.
- Somente role admin ou ADMIN_ALLOWED_EMAILS opera o vault.
- Status connected sem timestamp ou com mais de cinco minutos falha para env/prioridade default.
- Busca e teste estático confirmam ausência de `?key=` Gemini; header dedicado é usado.
- Respostas continuam mascarando credenciais.

### IMPACTO / DETECÇÃO / PREVENÇÃO

Impacto anterior: controle global e vazamento de metadata/segredo. Detecção: integração real e busca estática. Prevenção: `requireVisionAdmin`, TTL central, redaction preservada e testes permanentes.

### RISCO RESIDUAL

Vault continua global por decisão mínima; falta de admin configurado bloqueia a operação (fail-closed). Workspace ownership só pode surgir com modelo canônico futuro.

### VEREDITO

PASS. R1 pode encerrar; não autoriza R2 sem commit e handoff.

## R2 — Canonical MultiProviders Foundation

### SISTEMA ANALISADO

Provider Contract, Provider Registry, Model Registry, alias graph, ProviderModelOffering, lifecycle, discovery e configuration reference em backend/multiproviders-domain.js.

### OBJETIVO

Criar o núcleo canônico tenant-scoped sem permitir que detalhes do primeiro Provider, Model, Vendor, Transport ou runtime legado definam a arquitetura.

### HIPÓTESE DE FALHA

O primeiro executor contaminaria campos, defaults e identidade; chaves compostas vazariam tenants; aliases escolheriam silenciosamente; versões seriam misturadas; uma offering órfã confundiria Model com executor.

### CAUSAS RAIZ

Defaults permissivos, identidade construída por concatenação, versão tratada como número, alias sobrescrevível e ausência de vínculo explícito muitos-para-muitos foram encontrados durante a revisão e removidos antes do gate.

### VETORES

Provider nominal no core; endpoint/auth obrigatórios; local/cloud como discriminator; Model selecionando Provider; chave tenant:id colidindo; update sem versão esperada; alias circular/ambíguo; offering sem entidade; discovery promovendo lifecycle; propriedade desconhecida alterando semântica.

### EVIDÊNCIAS

Busca estática não encontra nomes de Providers/Models privilegiados no módulo. Chaves usam tuplas serializadas. Register idêntico é idempotente; conflito exige versão esperada. Discovery só produz evidência. Configuration recebe referência e versão seguinte explícita. Aliases possuem rollback atômico, detecção de ciclo e ambiguidade. Offering exige Provider e Model canônicos. Teste puro: 22/22 PASS.

### IMPACTO

Uma falha permitiria cross-tenant lookup, falsa identidade, executor implícito, configuração perdida ou catálogo inconsistente antes mesmo da migração.

### DETECÇÃO

Contract/negative tests, busca nominal, colisões adversariais de IDs, transições inválidas, conflitos otimistas, ciclos, ambiguidade e órfãos.

### PREVENÇÃO

Validação fail-closed; ownership em tenant_id; Provider e Model separados; offering explícita; lifecycle e Health separados; extensões isoladas; nenhuma I/O ou Vendor branch no domínio.

### RISCO RESIDUAL

Registry ainda é in-memory e não está composto como autoridade única do processo; persistência, concorrência real e bridge pertencem a R3. Health temporal efetivo e capabilities por escopo pertencem a R4. O módulo não pode receber tráfego até essas fases.

### VEREDITO

PASS para o escopo R2. Nenhum detalhe do primeiro Provider contaminou o contrato. Autoriza documentação/commit R2; não afirma runtime canônico ativo.