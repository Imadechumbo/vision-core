# MODEL REGISTRY SPEC

> Status: `SPEC_PHASE_1_COMPLETE` · Responde “quais modelos existem?”, nunca “quem executa?”.

## Identidade

Um Model possui `id` canônico estável, `family`, `display_name`, `vendor_origin` opcional, `version`, `modalities`, `capabilities`, `context_limits`, `lifecycle` e aliases documentados. Exemplos de famílias: GLM, GPT, Claude, Qwen, Kimi, DeepSeek, Gemma, Llama e Mistral.

## Relação com Providers

Model e Provider têm relação muitos-para-muitos por uma oferta:

```text
Model <- ProviderModelOffering -> Provider
```

A oferta referencia `model_id` e `provider_id` e pode declarar nome remoto, versão servida, limites e capabilities efetivas. Ela não altera a identidade canônica do Model e não torna o Model propriedade do Provider.

## Contratos lógicos

- `register_model(model)` valida identidade e versão.
- `get_model(model_id)` retorna definição canônica.
- `list_models(filter)` consulta catálogo sem escolher executor.
- `link_offering(provider_id, model_id, offering)` registra disponibilidade declarada.
- `unlink_offering(provider_id, model_id)` remove a oferta sem apagar Provider ou Model.
- `resolve_alias(alias)` retorna zero, um ou vários candidatos; ambiguidade nunca é resolvida silenciosamente.

## Invariantes

- Nome comercial não é identidade suficiente.
- Alias nunca substitui ID canônico em policy ou auditoria.
- Capabilities do Model são potencial técnico; capabilities da oferta são o efetivamente disponível naquele Provider.
- Modelo desconhecido não é criado implicitamente durante routing.
- Registry de Model não contém endpoints, credenciais, health do Provider ou política de failover.

## Lifecycle

Estados mínimos: `known`, `available`, `deprecated`, `retired`. `available` significa que existe ao menos uma oferta registrada, não que algum Provider esteja saudável agora.


## Phase 1.1 — Identidade, variante, alias e deployment

A identidade separa `family`, Model canônico, `variant`, `model_version` e `quantization`. Provider identifier, deployment, endpoint e snapshot pertencem à offering, não à identidade canônica.

`resolve_alias(alias, scope)` resolve cadeia acíclica para exatamente um ID canônico ou falha. Alias é escopado, não pode sobrescrever identidade canônica, formar ciclo, ser ambíguo ou virar fonte de verdade. Dois Models distintos nunca compartilham ID canônico; versão não pode ser descartada na offering. Model sem definição canônica é órfão e não recebe offering; Model sem offering continua conhecido, mas indisponível. Provider sem registro é órfão e não recebe offering.
