# PROVIDER CONTRACT SPEC

> Status: `SPEC_PHASE_1_COMPLETE` · Contrato lógico, independente de linguagem e transporte.

## Provider

| Campo | Semântica | Regra |
|---|---|---|
| `id` | identidade estável e única | não deriva de endpoint ou credencial |
| `display_name` | nome humano | não participa de routing |
| `vendor` | organização/ecossistema | atributo, nunca discriminator de código |
| `transport` | mecanismo de comunicação | extensível; não implica localização |
| `location` | `local`, `cloud` ou outra localização futura | atributo, nunca módulo |
| `models` | referências a Model IDs oferecidos | não duplica metadados canônicos do modelo |
| `capabilities` | conjunto declarado/suportado | versionável e verificável |
| `health` | observação com estado, razão e timestamps | `unknown` é o default seguro |
| `status` | estado de lifecycle | distinto de health |
| `latency` | observação de latência + janela/amostra | nunca promessa absoluta |
| `cost` | metadados comparáveis de custo | moeda/unidade/fonte obrigatórias quando conhecido |
| `privacy` | propriedades e restrições declaradas | política avalia; nome/localização não substituem evidência |
| `context` | limites de contexto por oferta | valor desconhecido permanece desconhecido |
| `reasoning` | suporte/nível declarado | capability, não família de modelo |
| `streaming` | suporte declarado | não presume protocolo |
| `tools` | suporte e restrições | não presume schema de vendor |
| `multimodal` | modalidades aceitas/emitidas | conjunto explícito |
| `version` | versão do registro/adapter/configuração | mudança incompatível exige nova major contract version |

## Estados

Lifecycle mínimo: `discovered`, `configured`, `ready`, `disabled`, `retiring`, `removed`.

Health mínimo: `unknown`, `healthy`, `degraded`, `unhealthy`.

`status=ready` não prova `health=healthy`. Health contém `checked_at`, `expires_at`, `source` e `reason`; depois de `expires_at`, efetivamente é `unknown`.

## Capabilities mínimas

Capabilities são chaves neutras (`text`, `reasoning`, `streaming`, `tools`, `vision`, `audio_input`, `audio_output`, `embeddings`, `structured_output`) acompanhadas de limites quando relevantes. Um Provider pode oferecer capabilities diferentes por Model; a rota usa a interseção Provider × oferta de Model.

## Compatibilidade

- Campos obrigatórios ausentes invalidam registro.
- Campo desconhecido pode ser preservado, mas não altera semântica normativa.
- Alteração aditiva é compatível; remoção ou mudança semântica exige nova major version.
- Secrets nunca integram o contrato serializável, health, benchmark ou logs.

## Resultado comum

Operações futuras retornam sucesso explícito ou erro neutro categorizado (`configuration`, `authentication`, `transport`, `rate_limit`, `capacity`, `policy`, `model_unavailable`, `timeout`, `provider_error`). Mensagens nativas podem ser preservadas como detalhe redigido, nunca como lógica de domínio.


## Phase 1.1 — Capability Contract

Cada capability possui `capability_id` canônico, `capability_version`, `availability` (`unknown`, `unsupported`, `declared`, `validated`, `degraded`), limitações, origem da evidência, `validated_at` e escopo Provider, Model ou Provider+Model. O conjunto é aberto; exemplos iniciais: `chat`, `completion`, `reasoning`, `streaming`, `tools`, `function_calling`, `structured_output`, `json_mode`, `multimodal`, `vision`, `embeddings`, `image_generation`, `audio` e `transcription`.

`declared` registra alegação; `validated` exige evidência ainda válida. A combinação Provider+Model é o escopo efetivo. Nome de Provider, Vendor, Model ou família nunca é evidência.

## Phase 1.1 — Health Contract

Health nunca é booleano. Estados mínimos: `unknown`, `starting`, `online`, `degraded`, `offline`, `stopping`; estados extras exigem comportamento independente demonstrável. Campos: `status`, `checked_at`, `valid_until`, `ttl`, `latency`, `failure_reason`, `consecutive_failures`, `consecutive_successes`, `source`, `scope`, `evidence` e `last_transition_at`.

Escopos: Provider, Transport, Model, Capability, Credential e Endpoint configurado. Health de um escopo não se propaga aos demais. Evidência ausente ou vencida resulta em `unknown`; Provider online não prova Model ou Capability online; configuração válida e benchmark não provam health.

## Phase 1.1 — Transport Contract

Transport é configuração operacional com `transport_type` neutro, endpoint configurável, referência de autenticação, timeout, retry policy, streaming support, propriedades de segurança, protocol version, connection state e limitações. Famílias podem incluir HTTP/REST, WebSocket, gRPC, processo local, IPC, CLI, SDK ou protocolo customizado. Marca não é tipo arquitetural. Transport não determina capability, location ou privacy.

## Phase 1.1 — Cost e Privacy Metadata

Cost declara categoria (`unknown`, `free`, `metered`, `subscription`, `enterprise`, `internal`), moeda, unidade, custos de input/output/request/storage/fixo, estimativa, vigência, fonte e confiança. Dado ausente ou vencido é `unknown`, nunca zero.

Privacy usa dimensões explícitas: saída do dispositivo, retenção, uso em treinamento, criptografia em trânsito/repouso, isolamento de tenant, região, logging, operação offline, ownership de credencial, compliance e desconhecidos. Categorias de UI não substituem dimensões. Local não significa privado; cloud não significa inseguro.

## Phase 1.1 — Version Contract

Versões distintas: `provider_version`, `model_version`, `api_version`, `transport_protocol_version`, `contract_version`, `capability_version`, `configuration_version`, `benchmark_version` e `health_schema_version`. Compatibilidade é avaliada por dimensão. Migração futura deve declarar origem, destino e perda; esta SPEC não implementa migração.
