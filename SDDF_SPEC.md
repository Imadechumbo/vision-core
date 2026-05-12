# SDDF_SPEC.md — V8.1 preservada + complemento V13.1

Esta SPEC é normativa para o VISION CORE. A versão V13.1 é um complemento de limpeza e owner único; ela não substitui nem reduz a SPEC V8.1 antiga.

## V8.1 — Gates preservados

### runtime_ownership_gate
- Deve existir um único owner operacional para execução de missão no frontend.
- Runtimes legados podem permanecer como artefatos históricos no repositório, mas não podem ser carregados ativamente por `frontend/index.html`.
- O owner único é o único componente autorizado a abrir stream SSE, chamar execução live e coordenar estado de missão.
- Qualquer novo runtime deve provar que não duplica ownership antes de ser carregado.

### report_truth_gate
- Relatórios só podem declarar sucesso quando houver evidência real observada.
- Não é permitido transformar stub, mock, consenso visual ou texto otimista em verdade operacional.
- Métricas, status GOLD, promoção ou conclusão precisam apontar para receipt, stream, resposta backend ou validação reproduzível.

### post_deploy_completion_gate
- Deploy não é considerado completo apenas porque build, push ou publicação terminaram.
- A conclusão pós-deploy exige verificação de rota, worker, stream, CORS e estado final observado.
- Se qualquer validação pós-deploy falhar ou ficar sem evidência, a missão permanece bloqueada ou em observação.

### observed_final_state_gate
- Estado final deve ser observado em runtime real, não inferido por intenção do patch.
- O estado final observado precisa registrar pelo menos: missão, endpoint, stream, gates executados e resultado.
- Sem observação final, `pass_gold` e `promotion_allowed` permanecem falsos no backend e não podem ser decididos pelo frontend.

## Estados oficiais de missão

Token normativo: estados oficiais de missão.

Os estados oficiais de missão são:

1. `queued` — missão recebida e aguardando execução.
2. `running` — execução ativa com stream aberto.
3. `gate_review` — evidências sendo avaliadas por gates SDDF.
4. `blocked` — execução bloqueada por ausência de evidência, erro ou violação de política.
5. `done` — execução terminada com estado final observado.
6. `failed` — falha técnica ou política sem conclusão segura.

Nenhum outro estado pode liberar promoção, merge, criação de PR ou PASS GOLD sem passar pelos gates preservados.

## Regra de novos runtimes

Token normativo: regra de novos runtimes.

A regra de novos runtimes é simples: adicionar arquivo não concede ownership. Um novo runtime só pode ser carregado quando:

- remove ou substitui explicitamente o owner anterior;
- passa pelo `runtime_ownership_gate`;
- não abre SSE duplicado;
- não instala handlers concorrentes de execução;
- não decide GOLD, promoção, merge ou PR no frontend;
- atualiza o guard para impedir regressão.

## Regression test TechNetGame Marvel Tokon

O regression test TechNetGame Marvel Tokon continua obrigatório como cenário canônico de validação. Ele deve comprovar que:

- o prompt de missão chega ao owner único;
- o backend aceita a missão por `POST /api/run-live`;
- o stream `GET /api/run-live-stream?mission_id=...` emite `open`, `step`, `gate` e `done`;
- o frontend apenas renderiza o estado recebido;
- nenhum runtime legado assume a missão;
- nenhuma promoção acontece sem evidence receipt real.

## Proibições absolutas

Token normativo: proibições absolutas.

As proibições absolutas são:

- carregar runtimes legados ativos em `frontend/index.html`;
- declarar `pass_gold:true` sem evidência real;
- declarar `promotion_allowed:true` sem evidência real;
- criar PR automaticamente pelo frontend;
- fazer merge automático sem gates observados;
- abrir SSE fora do owner único;
- chamar `/api/run-live` fora do owner único;
- transformar PASS GOLD visual em PASS GOLD operacional;
- substituir a SPEC V8.1 por um resumo menor.

## Complemento V13.1 — Clean Core sem merge

V13.1 corrige o diff para respeitar owner único e preservar a SPEC antiga. A aplicação frontend mantém a UI Gold visual e passa a carregar somente:

- `assets/v23-ui-system.js`
- `assets/v231-backend-agents.js`
- `assets/vision-ui-command.js?v=131`
- `assets/vision-runtime-owner.js?v=131`

### Responsabilidades V13.1

- `vision-ui-command.js` mantém chat, copiloto e anexos, mas não abre SSE, não chama `/api/run-live`, não cria PR, não decide PASS GOLD e não libera promotion.
- `vision-runtime-owner.js` é o owner único para execução live, stream SSE e pintura de estados recebidos.
- `tools/sddf-guard.mjs` falha se `index.html` carregar runtime legado, se houver mais de uma ocorrência do owner/command, ou se tokens proibidos voltarem ao HTML.
- `worker/src/index.js` mantém CORS dinâmico para Pages, `OPTIONS 204`, `POST /api/run-live`, `GET /api/run-live-stream?mission_id=...`, SSE `open/step/gate/done`, e bloqueio de PASS GOLD/promotion sem evidence receipt real.

### Compatibilidade

V13.1 é incremental. Nenhum trecho acima revoga V8.1; qualquer conflito deve ser resolvido em favor dos gates preservados, das proibições absolutas e do princípio de evidência real.
