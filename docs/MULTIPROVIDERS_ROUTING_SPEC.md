# MULTIPROVIDERS ROUTING SPEC

> Status: `SPEC_PHASE_1_COMPLETE` · Planejamento; nenhuma decisão executável implementada.

## Entrada lógica

Uma solicitação de rota contém: modo (`manual` ou `automatic`), Model/família opcional, capabilities obrigatórias, constraints de privacy/cost/latency/location, prioridade, contexto requerido e política identificada/versionada.

## Seleção

1. Carregar Model e ofertas sem inferência por nome.
2. Obter Providers `ready` e não desativados.
3. Excluir health `unhealthy` ou expirado/`unknown` quando a política exigir health comprovado.
4. Aplicar requisitos duros: capabilities, contexto, privacy, localização quando explicitamente pedida e orçamento máximo.
5. Ordenar candidatos restantes por prioridade da política e evidência comparável.
6. Retornar rota + razões ou `no_eligible_route`.

Modo manual fixa `provider_id` e opcionalmente `model_id`, mas ainda respeita invariantes de segurança e compatibilidade. Modo automático nunca favorece Provider por nome.

## Policies

Uma policy é declarativa, identificada e versionada. Critérios mínimos suportados pela SPEC: prioridade explícita, disponibilidade, privacidade, custo e latência. Empates usam regra determinística registrada; ordem de registro não é prioridade implícita.

## Failover

Failover é uma nova decisão de rota, não retry cego no mesmo caminho. Só ocorre para categorias permitidas pela policy, respeita orçamento total de tentativas/tempo/custo e registra a causa. Erros de policy, autenticação/configuração inválida ou input incompatível não fazem failover automático por padrão. Streaming ou tools podem tornar uma operação não repetível; nesses casos, failover exige prova de idempotência ou consentimento explícito futuro.

## Saída e auditoria

A decisão contém `provider_id`, `model_id`, `offering_version`, `policy_id`, `policy_version`, critérios aplicados, candidatos rejeitados com razões neutras, health/benchmark timestamps e `decision_at`. Secrets e payloads sensíveis são proibidos.

## Falhas explícitas

`model_unknown`, `manual_provider_ineligible`, `capability_unavailable`, `privacy_policy_unsatisfied`, `budget_unsatisfied`, `health_unavailable`, `no_eligible_route` e `routing_policy_invalid`.
