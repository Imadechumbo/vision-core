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
