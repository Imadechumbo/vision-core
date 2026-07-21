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
