# MULTIPROVIDERS — PLANO DE TESTES

> Status: planejado; nenhum teste funcional criado nesta fase.

## Contract

- Aceitar Provider mínimo válido e rejeitar campos obrigatórios ausentes.
- Executar a mesma suíte contra todo adapter futuro.
- Provar que campos/vendor extensions desconhecidos não alteram semântica comum.
- Redigir secrets e normalizar categorias de erro.

## Provider Registry

- `register()` idempotente; conflito de versão explícito.
- Discovery termina em `discovered`, nunca em `ready` implícito.
- Lifecycle aceita somente transições válidas e impede reuso de ID removido.
- Health começa/expira para `unknown`; falha de probe nunca vira healthy.
- Benchmark incomparável ou sem metadados não influencia routing.
- Uma única fonte gravável; cache/view somente leitura.

## Model Registry

- Um Model ligado a vários Providers sem duplicar identidade.
- Um Provider oferece vários Models via offerings.
- Alias ambíguo falha explicitamente.
- Remover offering não remove Provider nem Model.
- Capabilities canônicas e efetivas não são confundidas.

## Routing e failover

- Manual respeita Provider escolhido e rejeita inelegibilidade.
- Automático filtra capabilities, privacy, health, contexto e orçamento antes de ordenar.
- Empate é determinístico e não depende da ordem de registro.
- Nenhum Provider recebe privilégio nominal.
- `unknown`/health vencido é tratado conforme policy, nunca como healthy implícito.
- Failover respeita categorias, budget e idempotência; não mascara policy/auth/input errors.
- `no_eligible_route` contém razões neutras e auditáveis.

## Testes adversariais Hermes

- Adicionar Provider fictício com vendor, transport e location inéditos sem alterar core.
- Oferecer o mesmo Model em Provider local e cloud e obter avaliação uniforme.
- Alterar endpoint/configuração sem mudar identidade.
- Injetar modelo com nome semelhante e confirmar ausência de acoplamento por string.
- Simular registry divergente/cache stale e confirmar fail-closed.

## Gates Ponytail

- **No Provider Special Case:** zero branch no core por Provider/vendor.
- **No Model Coupling:** zero inferência de executor por Model/família.
- **No Hardcoded Provider:** zero Provider default/fallback nominal.
- **No Transport Assumption:** core não presume HTTP, SDK, CLI ou socket.
- **No Vendor Lock:** contrato e policy permanecem vendor-neutral.
- **No False Health:** sem evidência válida, health é `unknown`.
- **No Duplicate Registry:** uma única autoridade gravável para Providers e uma para Models.

## Evidência exigida na futura implementação

Contract tests, property/negative tests dos invariantes, testes determinísticos de policy, testes de concorrência/versionamento do registry, fault injection de health/failover e registro redigido da decisão. Testes reais por Provider serão adicionais, nunca substitutos da suíte comum.


## Phase 1.1 — Matriz Ponytail normativa

Gates equivalentes foram consolidados; cada linha define o futuro teste mínimo.

| Gate | Intenção | Violação | Evidência esperada | PASS | FAIL | Teste futuro |
|---|---|---|---|---|---|---|
| No Provider Special Case | core neutro | branch por Provider/Vendor | busca estrutural + contract suite | zero exceção | exceção nominal | provider fictício |
| No Model Coupling | separar Model/executor | família escolhe Provider | offering explícita | zero inferência | executor por nome | mesmo Model, 2 Providers |
| No Hardcoded Provider | policy explícita | default/fallback nominal | decisão versionada | sem nome fixo | Provider privilegiado | ordem aleatória |
| No Transport Assumption | domínio neutro | core presume protocolo | Transport Contract | tipo configurado | protocolo implícito | transport inédito |
| No Vendor Lock | extensão sem contaminar core | schema/SDK nativo normativo | adapter boundary | contrato comum | campo vendor obrigatório | adapter fictício |
| No False Health | evidência por escopo | health propagado | source/scope/validity | escopo correto | falso ONLINE | Model offline/Provider online |
| No Duplicate Registry | autoridade única | cache/view gravável | ownership de escrita | uma autoridade | segunda fonte | divergência simulada |
| No Capability Assumption | capability provada | nome vira suporte | source/status/validated_at | evidência válida | presunção | nomes enganosos |
| No Boolean Health | estado expressivo | true/false | schema temporal | enum + campos | boolean | validação de schema |
| No Version Mixing | dimensões separadas | version genérico | version contract | dimensões explícitas | mistura/perda | compatibilidade cruzada |
| No Transport Logic | Transport não decide domínio | transport define capability/privacy | negociação separada | zero inferência | propriedade derivada | mesmo transport, capacidades distintas |
| No Alias Loop | resolução finita/única | ciclo/ambiguidade | grafo + scope | ID único | loop/múltiplos | ciclos e colisões |
| No Stale Health | expirar evidência | ONLINE após valid_until | relógio/TTL | vira UNKNOWN | permanece ONLINE | TTL vencido |
| No Orphan Model | offering íntegra | model_id ausente | referência canônica | Model existe | órfão | link inválido |
| No Orphan Provider | offering íntegra | provider_id ausente | Registry lookup | Provider existe | órfão | Provider removido |
| No Benchmark as Health | separar evidências | benchmark altera health | owners distintos | health intacto | health promovido | benchmark alto/offline |
| No Unknown Cost as Zero | preservar incerteza | unknown=0 | categoria/fonte | unknown explícito | ranking como grátis | custo ausente |
| No Privacy by Location | usar dimensões | local=privado/cloud=inseguro | privacy evidence | policy dimensional | inferência | local com logging |
| No Discovery Trust Escalation | discovery não confia | auto READY | lifecycle trail | permanece discovered | salto de estado | fonte não confiável |
| No Lifecycle Bypass | respeitar eligibility | disabled/removed candidato | transition + route trace | excluído | roteado | disable/remove |
| No Incompatible Failover | preservar requisitos | fallback incompatível | candidate reasons | somente elegíveis | violação | capability obrigatória |

## Phase 1.1 — Cobertura futura por domínio

- Contract: obrigatórios, extensibilidade, contract version, propriedades desconhecidas e compatibilidade.
- Capabilities: declared/validated/unknown/unsupported/degraded; obrigatórias/opcionais/preferidas; Provider+Model; nenhuma inferência.
- Health: TTL válido/vencido, UNKNOWN, ONLINE, DEGRADED, OFFLINE, transições, escopos, credencial e Model indisponível.
- Lifecycle/Discovery: transições válidas/proibidas, disable/remove/recovery/revalidation, expiração, deduplicação, conflito, desaparecimento e registro explícito.
- Model Registry: múltiplos Providers, variante, versão, quantização, deployment, alias circular/ambíguo e órfãos.
- Transport: endpoint, timeout, autenticação, streaming, protocolo e ausência de inferências.
- Cost/Privacy: conhecido/desconhecido/vencido, unidades, retenção, região e location sem presunção.
- Benchmark: validade, contexto, workload, comparabilidade e independência de Health/Routing.
- Routing: manual/automático, requisitos, health, custo, privacy, exclusão, afinidade, failover, explicação, confiança e nenhum Provider privilegiado.
- Hermes: Phase 2 bloqueada até revisão do RCA e aceite dos riscos residuais.


## R1 — Ponytail Results

| Gate | Resultado | Evidência |
|---|---|---|
| No Global Provider Mutation | PASS | usuário comum 403 em save/delete/test/default |
| No Cross-Tenant Provider State | PASS | superfície global restrita a admin; nenhum tenant comum lê/lista |
| No Anonymous Provider Mutation | PASS | 401 em toda mutação |
| No Secret in URL | PASS | três caminhos Gemini migrados para header |
| No Secret in Logs | PASS | busca estática e respostas mascaradas |
| No Stale Connected Status | PASS | TTL de cinco minutos + teste de expiração |
| No Implicit Admin | PASS | role explícita ou allowlist; env vazia falha fechado |

Teste futuro permanente: `provider-security-boundary.test.mjs` mais suites existentes de vault/routing/admin.

## R2 — Testes executados

Comando: node tools/tests/multiproviders-domain.test.mjs

Resultado: 22/22 PASS. Regressões: provider security 23/23; vault routing 18/18; endpoints 23/23; crypto 16/16; callLLM wiring 12/12; agent admin auth 12/12; admin residuals 40/40; rc-security-hardening PASS. Git diff --check PASS. Cobertura: contrato válido/inválido, metadados obrigatórios, Health não booleano, separação Health/lifecycle, extensões, neutralidade nominal, tenant isolation inclusive colisão composta, idempotência/deduplicação, optimistic version, discovery sem promoção, configuration reference, lifecycle, Models, aliases em cadeia/ciclo/ambiguidade/colisão, offerings, órfãos, disponibilidade e remoção terminal.

## R2 — Ponytail Audit global

Arquivo funcional: backend/multiproviders-domain.js. Teste: tools/tests/multiproviders-domain.test.mjs. Correção em qualquer FAIL seria obrigatória antes do commit.

| Gate | Intenção | Evidência | Resultado | Risco residual / correção |
|---|---|---|---|---|
| No Provider Special Case | core neutro | busca nominal + provider fictício | PASS | adapter futuro deve usar extensions |
| No Model Coupling | Model não escolhe executor | offering explícita | PASS | R3 não pode inferir por nome |
| No Hardcoded Provider | nenhum default nominal | zero nomes conhecidos no módulo | PASS | composição futura sob teste |
| No Transport Assumption | domínio não presume protocolo | transport é objeto opaco | PASS | validação operacional em R4/R6 |
| No Vendor Lock | Vendor é dado | nenhum branch/SDK | PASS | adapters fora do core |
| No False Health | registro não prova Health | unknown explícito | PASS | expiração efetiva em R4 |
| No Duplicate Registry | uma classe autoritativa por catálogo | ProviderRegistry e ModelRegistry únicos | PASS | composition root em R3 |
| No Capability Assumption | evidência, não nome | capability_id/version/availability | PASS | resolução efetiva em R4 |
| No Boolean Health | estados expressivos | boolean rejeitado por teste | PASS | nenhum |
| No Version Mixing | dimensões separadas | versions + model/capability version | PASS | completar dimensões runtime em R3/R4 |
| No Transport Logic | transport não decide domínio | zero branch por transport | PASS | adapters isolados em R6 |
| No Alias Loop | resolução finita | ciclo em batch falha e rollback | PASS | persistência futura deve preservar atomicidade |
| No Stale Health | expiração temporal | contrato possui valid_until/ttl | NOT_APPLICABLE | evaluator pertence a R4 |
| No Orphan Model | offering íntegra | orphan_model testado | PASS | bridge não pode autocriar |
| No Orphan Provider | offering íntegra | orphan_provider testado | PASS | bridge não pode autocriar |
| No Benchmark as Health | owners separados | benchmark ausente do foundation | NOT_APPLICABLE | implementar separado em fase própria |
| No Unknown Cost as Zero | incerteza preservada | cost obrigatório, sem ranking | PASS | policy R5 deve interpretar unknown |
| No Privacy by Location | dimensões separadas | location e privacy independentes | PASS | policy R5 sem inferência |
| No Discovery Trust Escalation | discovery não confia | candidato não vira registro | PASS | R3/R8 preservam gate |
| No Lifecycle Bypass | elegibilidade respeita estado | transições/terminal testados | PASS | routing ainda não existe |
| No Incompatible Failover | fallback preserva requisitos | failover ausente | NOT_APPLICABLE | obrigatório em R5 |
| No Global Provider Mutation | sem singleton global | instâncias puras sem binding runtime | PASS | composição única em R3 |
| No Cross-Tenant Provider State | isolamento de owner | IDs iguais/compostos por tenant | PASS | persistência futura sob teste |
| No Legacy as Canon | legado não define domínio | módulo sem imports legados | PASS | bridge R3 temporária |
| No Silent Fallback | falha explícita | erros categorizados; sem routing | PASS | routing R5 exige receipt |
| No Hidden Default Provider | nenhum default | busca nominal | PASS | bridge deve expor defaults legados |
| No First Provider Privilege | primeiro adapter não existe | foundation fictícia | NOT_APPLICABLE | gate crítico R6 |
| No Adapter Contract Leak | nenhum adapter | domínio puro | NOT_APPLICABLE | suite comum R6 |
| No Install Equals Ready | Installer ausente | discovery permanece candidato | PASS | bridge R8 valida antes de ready |
| No UI as Source of Truth | zero UI/read model | registries são domínio | PASS | gate crítico R9 |
| No Secret Exposure | somente configuration_ref | nenhum campo de segredo | PASS | bridge deve redigir |
| No Non-Idempotent Retry | nenhum retry/I/O | módulo puro | NOT_APPLICABLE | gate crítico R5/R6 |

Verdicto Ponytail R2: PASS. Nenhum gate relevante está FAIL ou NO_EVIDENCE. NOT_APPLICABLE corresponde estritamente a comportamento ainda fora do escopo R2, não a ausência de teste de uma função implementada. A solução permanece em um módulo funcional e uma suíte, sem dependência, framework, adapter ou camada especulativa.
## R3 — Testes e Ponytail

Focados: multiproviders-domain 22/22; multiproviders-legacy-bridge 12/12; multiproviders-legacy-wiring 15/15. Regressões: vault routing 18/18; crypto 16/16; endpoints 23/23; security 23/23; callLLM 12/12; admin 12/12 + 40/40; hardening PASS; diff-check PASS.

| Gate R3 | Intenção | Evidência | Arquivos/testes | Resultado | Risco/correção |
|---|---|---|---|---|---|
| No Legacy as Canon | bridge não define domínio | imports somente domain; metadata neutra | legacy-bridge + 12 testes | PASS | retirar em R10 |
| No Duplicate Registry | uma autoridade em processo | composition root singleton compartilhado | runtime + wiring | PASS | persistência multi-processo futura |
| No Hidden Default Provider | defaults não entram no core | source_ref e offerings explícitas | server/Hermes + wiring | PASS | ordem ainda legada até R5 |
| No Silent Fallback | rejeição observável | receipt + log redigido | runtime + wiring | PASS | monitor externo futuro |
| No Compatibility Leak | segredo/função fora do contrato | rejeição de key/api_key/token/secret | bridge tests | PASS | adapters absorvem transport em R6 |
| No Permanent Bridge | retirada tem gate | ADR-050 + R10 | roadmap/docs | PASS | dívida controlada, não indefinida |
| No Cross-Tenant Provider State | scope preservado | bridges tenant-scoped | bridge test | PASS | runtime atual usa tenant sistema |
| No Discovery Trust Escalation | legado não vira ready | máximo configured | bridge tests | PASS | R4 valida readiness |
| No Orphan Model/Provider | offering íntegra | registries validam ambos | domain/bridge tests | PASS | nenhum |
| No Secret Exposure | metadata redigida | snapshots/logs sem segredo | bridge/wiring tests | PASS | nenhum |
| No Provider Special Case | core não ramifica | casos ficam nos callers legados | domain search | PASS | remover callers em R6/R10 |
| No Transport Assumption | bridge usa tipo legacy neutro | endpoint é referência | bridge/wiring | PASS | transport real em R6 |

Verdicto Ponytail R3: PASS. Não foi criada persistência, framework, base, endpoint novo, adapter prematuro ou abstraction layer além da ponte e composition root necessários. Gates de Health, policy/failover e adapter permanecem NOT_APPLICABLE nesta fase e serão obrigatórios em R4–R6.
## R4 — Testes e Ponytail

Focados: multiproviders-runtime-state 14/14; domain 23/23; bridge 12/12; wiring 16/16. Regressões: endpoints 23/23; security 23/23; callLLM 12/12; routing 18/18; hardening PASS; diff-check PASS.

| Gate R4 | Intenção | Evidência | Resultado | Risco/correção |
|---|---|---|---|---|
| No Capability Assumption | nomes não provam suporte | intersection Provider×Model×Offering | PASS | R6 adapters devem produzir evidence |
| No Boolean Health | estado expressivo | boolean rejeitado | PASS | nenhum |
| No False Health | ONLINE exige source/evidence/validity | negative tests | PASS | probes futuros |
| No Stale Health | vencimento vira UNKNOWN | relógio injetado/TTL | PASS | persistência futura preserva validity |
| No Lifecycle Bypass | disabled/removed inelegível | eligibility + transitions | PASS | R5 deve consumir API |
| No Scope Propagation | escopos independentes | Provider online, demais unknown | PASS | nenhum |
| No Evidence-Free Ready | READY separado de Health | eligibility exige ambos | PASS | bridge continua máximo configured |
| No Secret Exposure | evidence segura | rejeição recursiva | PASS | nenhum |
| No Duplicate Registry | mesmo composition root | wiring 16/16 | PASS | ledger é contrato interno, não Registry |
| No Version Mixing | capability_version separada | contrato e tests | PASS | health_schema version futura |
| No Provider Special Case | zero nome/vendor no runtime-state | busca estrutural | PASS | nenhum |
| No Model Coupling | offering explícita | resolveCapability exige IDs | PASS | nenhum |

Verdicto Ponytail R4: PASS. Um módulo puro e uma suíte; zero probe fictício, scheduler, banco, endpoint, dependency ou framework. Routing/failover, benchmark e adapter permanecem NOT_APPLICABLE até suas fases.
## R5 — Testes e Ponytail

Focados: router 24/24; domain 23/23; runtime-state 14/14; bridge 12/12; wiring 17/17. Regressões: endpoints 23/23; security 23/23; callLLM 12/12; vault routing 18/18; hardening PASS; diff-check PASS.

| Gate R5 | Intenção | Evidência | Resultado | Risco/correção |
|---|---|---|---|---|
| No Hardcoded Provider | nenhum nome/default | busca estática | PASS | adapter R6 não vira default |
| No Hidden Priority | policy explícita/versionada | invalid priority falha | PASS | nenhum |
| No Unknown Cost as Zero | unknown não é grátis | null + cost_unknown | PASS | nenhum |
| No Privacy by Location | dimensões explícitas | local com retenção reprova | PASS | nenhum |
| No Benchmark as Health | owners separados | benchmark extremo não muda route | PASS | ranking futuro exige comparabilidade |
| No Incompatible Failover | só elegíveis | plan deriva candidates filtrados | PASS | cutover futuro deve usar receipt |
| No Silent Routing | decisão explicada | candidates/reasons/receipt | PASS | persistência futura |
| No Non-Idempotent Retry | side effects protegidos | matriz failover | PASS | nenhum |
| No Stale Health | runtime eligibility | stale vira unknown | PASS | nenhum |
| No Lifecycle Bypass | READY obrigatório | runtime-state | PASS | nenhum |
| No Model Coupling | offering explícita | candidates por model_id | PASS | nenhum |
| No Secret Exposure | request redigível | secret fields falham | PASS | nenhum |

Verdicto Ponytail R5: PASS. Um engine puro sem dependency, DSL, pesos arbitrários, banco, queue, endpoint ou framework. Benchmark scoring e cutover foram deliberadamente evitados por falta de evidência/adapters.
## R6 — Testes e Ponytail

Focados: adapters 17/17; router 24/24; runtime-state 14/14; domain 23/23; bridge 12/12; wiring 19/19. Regressões legadas/segurança: 23/23 endpoints, 23/23 security, 12/12 callLLM, 18/18 routing, hardening PASS; diff-check PASS.

| Gate R6 | Intenção | Evidência | Resultado | Risco/correção |
|---|---|---|---|---|
| No First Provider Privilege | primeiro não vira default | composition root não instancia reference | PASS | nenhum |
| No Adapter Contract Leak | detalhes fora do core | describe/probe/invoke | PASS | Colibri usa extensions/adapter |
| No Vendor Field in Core | Vendor só atributo | busca nominal | PASS | nenhum |
| No Transport Assumption | host usa interface | memory é implementação teste | PASS | protocolo real isolado |
| No Default by Presence | registro explícito | wiring test | PASS | nenhum |
| No Secret Exposure | refs/credential efêmera | secret tests/serialization | PASS | nenhum |
| No False Health | probe obrigatório | invalid/timeout não READY | PASS | nenhum |
| No Install Equals Ready | onboarding para CONFIGURED | lifecycle test | PASS | R8 reutiliza |
| No Non-Idempotent Retry | host nunca repete | call count=1 | PASS | failover fica no router |
| No Duplicate Registry | host usa composition root | wiring | PASS | scratch registries são preflight descartável |
| No Partial State | preflight integral | segundo Model inválido | PASS | nenhum |
| No Cross-Tenant State | bindings escopados | tenant test | PASS | nenhum |

Verdicto Ponytail R6: PASS. Interface mínima e stdlib; zero SDK, HTTP client, DI framework, plugin system, banco, scheduler ou Provider comercial. O preflight descartável é validação, não segunda autoridade.
## R7 — Ponytail blocker audit

| Gate R7 | Resultado | Evidência |
|---|---|---|
| No Colibri Special Case | NO_EVIDENCE | nenhum adapter/protocolo local para testar |
| No Colibri Contract Leak | NO_EVIDENCE | contrato operacional ausente |
| No Colibri Privilege | PASS | nenhum registro/default/código criado |
| No Provider-Specific Core Change | PASS | core intacto após busca |
| No Parallel Architecture | PASS | nenhuma arquitetura Colibri criada |
| Evidence Before Change | FAIL_BLOCKER | detalhes oficiais ausentes |

Verdicto: PARAR. Os NO_EVIDENCE são críticos para R7 e não podem ser convertidos em PASS por mock ou suposição. R6 permanece PASS; R7 não iniciou implementação; R8 proibida.