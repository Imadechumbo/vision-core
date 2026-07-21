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
