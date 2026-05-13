# SDDF Frontend Spec V14

Esta é a SPEC definitiva do frontend V14. Ela deve orientar a reconstrução após a colheita funcional, sem alterar o frontend ativo durante a Phase 0.

## Princípio de arquitetura

A V14 tem um shell mínimo, módulos explícitos e um único dono de execução. Nenhum arquivo legado, runtime paralelo, mock de sucesso ou script inline deve participar da execução.

## Estrutura obrigatória

### `frontend/index.html` é shell

- Deve conter apenas a estrutura mínima da aplicação.
- Deve carregar CSS e scripts permitidos de forma explícita.
- Não deve conter lógica executável inline.
- Não deve definir handlers de execução diretamente.

### `vision-api.js` centraliza HTTP

- Único módulo responsável por chamadas HTTP aos endpoints contratados.
- Deve encapsular erros, estados offline, bloqueios e parsing.
- Não deve fabricar sucesso quando o backend falhar.
- Não deve sobrescrever `window.fetch`.

### `vision-chat.js` controla chat/UX/auth

- Controla mensagens, input, anexos, estado de autenticação opcional e UX conversacional.
- Pode solicitar preparação ou execução, mas sempre via Runtime Owner.
- Deve explicar estados em linguagem simples para usuário leigo.
- Auth deve ser opcional e não-bloqueante.

### `vision-agent-local.js` controla orbit

- Controla a presença visual do Vision Agent Local.
- Mostra backend, workers, GitHub, bloqueios, offline e atividade.
- Não executa missão diretamente.

### `vision-runtime-owner.js` é único dono de execução

- Único módulo autorizado a iniciar `/api/run-live`.
- Único módulo autorizado a abrir `/api/run-live-stream?mission_id=...`.
- Coordena estados de execução, retries permitidos, eventos e evidências.
- Nunca usa `mission-${Date.now()}`.
- Nunca declara sucesso sem confirmação do backend/stream.

### `vision-report.js` controla relatório

- Renderiza Mission Report.
- Consolida resumo, status, evidências, logs, diff preview, PASS GOLD e bloqueios.
- Deve distinguir sucesso, falha, bloqueio, offline e inconclusivo.

### `vision-gold.css` controla visual

- Define dark SaaS, olho/logo, paleta roxo/ciano/verde/dourado e estados visuais.
- Deve manter layout minimalista e responsivo.
- Não deve esconder estados críticos por estética.

## Scripts permitidos exatos

`frontend/index.html` deve carregar somente estes scripts de aplicação V14, nesta ordem lógica:

1. `vision-api.js`
2. `vision-report.js`
3. `vision-agent-local.js`
4. `vision-runtime-owner.js`
5. `vision-chat.js`

Qualquer script adicional precisa de atualização formal desta SPEC antes de ser introduzido.

## Arquivos proibidos

A V14 não deve carregar, referenciar ou recriar arquivos com nomes/padrões legados como:

- `vision-runtime-v297`
- `vision-v297`
- `vision-v298`
- `vision-v299`
- `vision-v2910`
- `vision-v32`
- `vision-v34`
- `vision-v35`
- `vision-v44`

Também são proibidos módulos dedicados a mocks de OAuth, shims de validação, guards reduzidos ou create-pr fake.

## Regras de PASS GOLD

- PASS GOLD exige score real, critérios avaliados e evidence receipt.
- `pass_gold:true` isolado é inválido.
- O estado dourado só pode aparecer quando a evidência comprova aprovação.
- Estados offline, bloqueados ou inconclusivos nunca podem ser renderizados como PASS GOLD.

## Regras de Mission Report

- O Mission Report deve estar visível ou acessível durante toda missão.
- Deve registrar intenção, projeto, `mission_id`, eventos relevantes, diffs, logs, bloqueios e resultado.
- Deve preservar evidence receipts recebidos do backend/stream.
- Deve explicar o resultado para usuário leigo.
- Não deve declarar conclusão quando o stream falhar antes do evento final.

## Regras de Auth opcional

- O usuário pode operar em modo anônimo/local quando o backend permitir.
- Auth indisponível não pode bloquear o shell inteiro.
- OAuth mockado é proibido.
- Backdrops antigos que impedem a jornada são proibidos.
- Quando uma ação exigir autenticação, a UI deve explicar a necessidade e manter o restante utilizável.

## Regras de Guard

- Guards devem proteger contratos reais: endpoint, stream, evidence receipt, policy e permissões.
- Guard reduzido é proibido.
- Validation shim não substitui validação real.
- Em dúvida, o guard deve bloquear com mensagem clara em vez de permitir sucesso falso.
- Toda exceção de guard precisa ser documentada e testável.

## Regras de endpoints

A V14 deve usar os contratos documentados em `docs/V14_ENDPOINT_CONTRACTS.md` para:

- `GET /api/health`
- `GET /api/projects`
- `POST /api/run-live`
- `GET /api/run-live-stream?mission_id=...`
- `GET /api/pass-gold/score`
- `GET /api/workers/status`
- `GET /api/github/status`
- `GET /api/github/automerge-policy`
- `POST /api/copilot`
- `POST /api/diff/preview`
- `GET /api/logs/download`

## Critério de aceite V14

A V14 só é aceitável quando o frontend consegue iniciar missão real, acompanhar stream real, renderizar relatório real, expor bloqueios honestos e aprovar PASS GOLD apenas com evidence receipt. A experiência deve ser minimalista, auditável e livre dos sabotadores listados em `docs/V14_FAILURES_TO_NEVER_REPEAT.md`.
