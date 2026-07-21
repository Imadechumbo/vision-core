# MULTIPROVIDERS SPEC — Phase 1

> Status: `SPEC_PHASE_1_COMPLETE` · Data: 2026-07-21 · Somente especificação; nenhuma implementação autorizada.

## Objetivo

MultiProviders é a camada oficial que descreve, registra, observa e seleciona Providers de IA sem privilegiar vendor, transporte, localização ou modelo. `local` e `cloud` são valores do atributo `location`; nunca módulos, registries ou pipelines distintos.

## Limites

- Provider responde **quem pode executar**.
- Model Registry responde **quais modelos existem**.
- Routing escolhe um Provider elegível para um pedido.
- Vision AI Installer apenas chama futuramente `ProviderRegistry.register()` depois de uma instalação concluída.
- Vision Blueprint apenas poderá representar futuramente Providers, Models, Routing, Health e Failover.
- Colibri, OpenAI, Claude, Ollama e LM Studio são Providers comuns; nenhum possui contrato especial.

Fora da Phase 1: runtime, endpoints, persistência, UI, integração Colibri, instalação, execução, deploy, Tauri e Rust.

## Arquitetura normativa

```text
Consumer request
  -> Routing Policy
  -> Model Registry (identidade e requisitos do modelo)
  -> Provider Registry (candidatos, capabilities, health, lifecycle)
  -> ranked route / explicit no-route
```

O módulo possui quatro superfícies normativas e nenhuma outra:

1. `Provider Contract` — vocabulário comum e invariantes.
2. `Provider Registry` — registro, discovery, configuração, health, benchmark, versionamento e lifecycle.
3. `Model Registry` — identidade canônica e disponibilidade declarada em múltiplos Providers.
4. `Routing` — seleção manual ou automática, políticas, prioridade e failover.

## Regras duras

- Nenhum branch por nome de Provider, vendor, modelo, `local` ou `cloud` no domínio comum.
- Nenhum endpoint, SDK, formato de autenticação ou transporte presumido pelo contrato.
- Capabilities são dados declarados e verificáveis, não inferidas do nome.
- Health desconhecido nunca equivale a saudável.
- Registry é a fonte única; caches e views não podem virar registries paralelos.
- Provider e Model mantêm identidade independente e relação muitos-para-muitos.
- Ausência de rota elegível produz falha explícita; nunca fallback silencioso.

## Documentos normativos

- `PROVIDER_CONTRACT_SPEC.md`
- `PROVIDER_REGISTRY_SPEC.md`
- `MODEL_REGISTRY_SPEC.md`
- `MULTIPROVIDERS_ROUTING_SPEC.md`
- `MULTIPROVIDERS_HERMES_RCA.md`
- `MULTIPROVIDERS_TEST_PLAN.md`

## Critério de conclusão da SPEC

A Phase 1 documental termina quando os contratos, invariantes, decisões, RCA adversarial, filtros Ponytail e plano de testes estiverem coerentes e não houver código funcional. Implementação exige fase e autorização novas.


## Phase 1.1 — Refinamento arquitetural

Status: `SPEC_PHASE_1_1_COMPLETE`. A Phase 1 permanece normativa; esta seção fecha lacunas sem autorizar implementação.

Capability, Health, Lifecycle, Discovery, Transport, Cost, Privacy, Alias, Version e Benchmark não são módulos. São contratos ou metadados internos das quatro superfícies:

| Conceito | Owner normativo |
|---|---|
| Capability, Transport, Health, Cost, Privacy e versões do Provider | Provider Contract |
| Discovery, Lifecycle, observações de Health e Benchmark | Provider Registry |
| Identidade, variante, alias, deployment e versão de Model | Model Registry |
| Capability Negotiation, policies, classificação e failover | Routing |

Invariantes Phase 1.1:

- Capability é declarada, descoberta ou validada; nunca presumida por nome.
- Health é temporal, escopado e fail-closed; nunca booleano.
- Transport não define capability, location ou privacy.
- Custo desconhecido não é zero; privacy não deriva de local/cloud.
- Discovery não eleva confiança nem readiness.
- Cada dimensão de versão possui identidade própria.
- Benchmark é evidência contextual; não health nem decisão autônoma.
- Installer futuro entrega metadados comuns e solicita `register()`; instalar não significa READY.
- Blueprint futuro poderá representar Providers, Models, Capabilities, Routing, Health, Lifecycle, Discovery e Failover, sem runtime.
- Phase 2 continua bloqueada até autorização explícita.
