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
