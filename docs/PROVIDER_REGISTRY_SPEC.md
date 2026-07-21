# PROVIDER REGISTRY SPEC

> Status: `SPEC_PHASE_1_COMPLETE` · Fonte única de Providers.

## Responsabilidade

Registrar e consultar Providers; consolidar discovery, configuração, capabilities, health, benchmark, versionamento e lifecycle. Não escolhe rota e não define identidade de Model.

## Contratos lógicos

- `register(provider)` valida identidade/versão e cria ou atualiza de forma idempotente.
- `get(provider_id)` retorna snapshot ou `not_found`.
- `list(filter)` filtra por atributos neutros.
- `discover(source)` produz candidatos `discovered`; não os torna automaticamente `ready`.
- `configure(provider_id, configuration_ref)` associa configuração sem expor secrets.
- `observe_health(provider_id, observation)` registra evidência temporal.
- `record_benchmark(provider_id, model_id, result)` registra medição comparável.
- `transition(provider_id, expected_status, next_status)` aplica lifecycle com concorrência explícita.
- `remove(provider_id)` encerra elegibilidade; histórico/auditoria seguem política de retenção futura.

## Invariantes

- Um `id` identifica exatamente um Provider; atualização concorrente exige versão esperada.
- Registro não prova disponibilidade, autenticação ou health.
- Discovery não executa instalação nem cria credenciais.
- Benchmark nunca substitui health e sempre declara método, timestamp, amostra, região/host quando aplicável e versão do modelo/provider.
- Métricas expiradas não participam como verdade atual.
- Remoção e desativação tornam o Provider inelegível para novas rotas.

## Lifecycle

Transições válidas:

```text
discovered -> configured -> ready -> retiring -> removed
                    |          |
                    v          v
                 disabled <----+
```

Retorno de `disabled` para `configured` ou `ready` exige revalidação. `removed` é terminal para aquele `id` e versão; reuso silencioso do identificador é proibido.

## Health e discovery

Health é observado por probes compatíveis com o transporte configurado, mas normalizado para o contrato comum. Falha do próprio probe, ausência de credencial ou timeout não pode produzir `healthy`. Discovery pode ser manual, configurado ou fornecido por instalador; todos convergem no mesmo `register()`.

## Integrações futuras

- Vision AI Installer: após sucesso comprovado, solicita `register()`; o Registry ainda valida.
- Routing: consome snapshots elegíveis, nunca tabelas internas ou adapters.
- Vision Blueprint: consome uma view somente leitura futura.


## Phase 1.1 — Provider Lifecycle

Estados normativos mínimos: `discovered`, `registered`, `configured`, `validated`, `ready`, `disabled`, `removed`. `degraded` e `offline` pertencem a Health: um Provider pode permanecer `ready` mas temporariamente inelegível.

Fluxo normal: `discovered -> registered -> configured -> validated -> ready`. `disabled` é decisão administrativa; `offline` é observação. `removed` é identidade conhecida e terminal; não descoberto é ausência de registro. Retorno de `disabled` exige configuração válida e revalidação. Rotação de configuração/credencial ou mudança incompatível de versão leva a `configured`; expiração de credencial invalida readiness. Pular registro, configuração ou validação é proibido. Nenhum Provider recebe lifecycle especial.

## Phase 1.1 — Discovery Contract

Discovery produz candidato com fonte, confiança, identidade proposta, validade e evidência. Fontes possíveis: manual, Installer, importação, ambiente, serviço/rede local, catálogo administrado, plugin ou integração futura. Deduplicação usa identidade estável e evidência; conflito permanece explícito. Desaparecimento expira a descoberta, não remove automaticamente o registro. Redescoberta atualiza evidência sem elevar lifecycle.

Nenhuma descoberta cria confiança, configuração, validação ou READY; `register()` é explícito e ainda aplica validação e segurança. Instalação concluída apenas permite ao Installer solicitar `ProviderRegistry.register()`.

## Phase 1.1 — Benchmark Contract

Benchmark contém escopo, métrica, unidade, ambiente, workload, timestamp/validade, Model, Provider, Transport, configuration version, hardware, amostra, erro, benchmark version e critérios de comparabilidade. Resultado vencido não representa desempenho atual; benchmark não prova disponibilidade, não se generaliza entre Models/hardware e não decide Routing sozinho.
