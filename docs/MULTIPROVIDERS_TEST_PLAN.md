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
