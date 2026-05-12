# SDDF SPEC — VISION CORE

Este documento preserva a SPEC histórica como base normativa e adiciona V13.1 apenas como complemento. Nenhuma seção V13.1 pode substituir, reduzir ou invalidar os gates, estados e proibições definidos abaixo.

## Gates obrigatórios preservados

### runtime_ownership_gate
- O runtime ativo deve ter um único owner carregado na UI.
- Runtimes legados não podem ser carregados em paralelo ao owner oficial.
- Qualquer novo runtime deve declarar ownership, versão, escopo e plano de rollback antes de ser ativado.

### report_truth_gate
- Relatórios devem representar apenas eventos observados ou evidências recebidas.
- A UI não pode inventar aprovação, PR criado, promoção liberada ou PASS GOLD.
- Estados demonstrativos devem ser rotulados como bloqueados, simulados ou indisponíveis.

### post_deploy_completion_gate
- Deploy só é considerado completo após validação programática e observação do estado final.
- Falhas pós-deploy devem manter a missão em estado bloqueado ou failed, nunca promoted.
- A conclusão deve registrar checks executados, resultado e evidências mínimas.

### observed_final_state_gate
- O estado final oficial de uma missão depende de evidência observável do runtime/backend.
- A ausência de receipt real mantém `pass_gold:false` e `promotion_allowed:false`.
- SSE, logs e score devem convergir para o mesmo estado final observado.

## Estados oficiais de missão

Os estados oficiais são:

1. `queued` — missão aceita para processamento.
2. `running` — runtime executando ou aguardando etapa ativa.
3. `blocked` — gate, política ou evidência ausente impede avanço.
4. `failed` — execução falhou de forma observada.
5. `completed` — execução terminou sem promoção automática.
6. `gold_candidate` — evidência suficiente para avaliação do servidor.
7. `gold` — aprovado apenas por backend com receipt real.

A UI pode exibir estados visuais equivalentes, mas não pode converter estados locais em `gold`.

## Regra de novos runtimes

Novos runtimes só podem ser adicionados se:

- não duplicarem owner de execução;
- não abrirem stream concorrente sem coordenação explícita;
- não reintroduzirem endpoints legados ativos;
- passarem pelo SDDF Guard;
- documentarem rollback e compatibilidade com os gates preservados.

## Regression test obrigatório — TechNetGame Marvel Tokon

Toda alteração em runtime, guard, score ou worker deve preservar um teste/regra de regressão para o caso TechNetGame Marvel Tokon:

- nenhuma missão pode ser promovida sem evidence receipt real;
- relatório final deve refletir a execução observada;
- runtimes legados não podem sequestrar ownership;
- falha em CORS, OPTIONS, POST live ou SSE deve bloquear conclusão.

## Proibições absolutas

É proibido:

- carregar runtimes legados em `frontend/index.html`;
- duplicar `vision-runtime-owner.js` ou `vision-ui-command.js`;
- abrir SSE a partir do arquivo de comando de UI;
- chamar execução live a partir de scripts inline do `index.html`;
- usar `executeBtn.onclick` como owner paralelo;
- criar PR pelo frontend;
- decidir PASS GOLD no frontend;
- liberar promoção sem evidence receipt real;
- retornar `pass_gold:true` ou `promotion_allowed:true` sem evidência real.

## Complemento V13.1 — Clean Core sem merge

V13.1 mantém o visual Gold e restringe o carregamento ativo da UI a:

- `assets/v23-ui-system.js`
- `assets/v231-backend-agents.js`
- `assets/vision-ui-command.js?v=131`
- `assets/vision-runtime-owner.js?v=131`

O complemento V13.1 define a separação de responsabilidades:

- `vision-ui-command.js` preserva UX, chat, copiloto e anexos sem SSE, execução live, criação de PR ou decisão de promoção.
- `vision-runtime-owner.js` é o owner único de submissão/observação live no frontend.
- `worker/src/index.js` deve manter CORS dinâmico para Pages, `OPTIONS 204`, `POST /api/run-live`, `GET /api/run-live-stream?mission_id=...`, eventos SSE `open`, `step`, `gate`, `done` e bloqueio de score sem receipt real.
- `tools/sddf-guard.mjs` é o gate programático mínimo para impedir regressões destrutivas no diff.
