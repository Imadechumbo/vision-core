# VISION CORE V8.4 — SDDF CLEAN SPEC BASELINE

Esta SPEC é vinculante para impedir regressões de runtime duplicado, scripts legados, CORS instável, PASS GOLD falso e SSE sem contrato final.

## 1. Frontend — runtime único

`frontend/index.html` é o shell visual e não pode voltar a controlar a execução diretamente. Ele deve carregar somente estes scripts de runtime/comando:

1. `assets/v23-ui-system.js`
2. `assets/v231-backend-agents.js`
3. `assets/vision-runtime-owner.js`
4. `assets/vision-ui-command.js`

`frontend/index.html` não pode conter os marcadores legados abaixo:

- `executeBtn.onclick`
- `new EventSource`
- `RUN_PATH`
- `STREAM_PATH`
- `vision-runtime-v297`
- `vision-v297-interactions`
- `vision-v298-command-chat.js`
- `vision-v299`
- `vision-v2910`
- `vision-v32`
- `vision-v34`
- `vision-v35`
- `vision-v44`

## 2. Frontend — owner de execução

`frontend/assets/vision-runtime-owner.js` é o único owner do botão `executeBtn` e deve:

- controlar `executeBtn` via listener único;
- chamar `POST /api/run-live`;
- abrir SSE em `/api/run-live-stream` usando apenas `mission_id` na query string;
- nunca colocar texto da missão na URL do SSE;
- liberar lock em eventos `done`, `fail` e `error`;
- acumular evidência recebida do SSE em `window.__VISION_SSE_EVIDENCE__`.

## 3. Worker — gateway e contrato SSE

`worker/src/index.js` deve:

- aplicar CORS dinâmico para `https://*.visioncoreai.pages.dev` e `https://visioncoreai.pages.dev`;
- responder `OPTIONS` com HTTP `204`;
- preservar as rotas existentes;
- implementar `POST /api/run-live` sem conceder PASS GOLD no stub;
- implementar SSE em `/api/run-live-stream` com eventos `open`, `step`, `gate` e `done`;
- retornar `pass_gold:false` quando a evidência for insuficiente;
- nunca retornar `promotion_allowed:true` em stub.

## 4. PASS GOLD

`/api/pass-gold/score` não pode retornar `GOLD` quando não houver evidência real. Sem evidência suficiente, o retorno obrigatório é bloqueante:

- `status: "INSUFFICIENT_EVIDENCE"` ou equivalente não-GOLD;
- `pass_gold: false`;
- `promotion_allowed: false`.

## 5. Guard obrigatório

O comando abaixo é obrigatório antes de mudanças que toquem runtime, frontend shell ou gateway:

```bash
node tools/sddf-guard.mjs
```

O guard deve falhar se qualquer regra desta SPEC for violada.

## 6. Vision Software Factory — camada LLM/agentes

A Vision Software Factory é a camada de desenvolvimento governado por agentes e modelos LLM do Vision Core. Ela opera exclusivamente sobre arquivos de governança e tooling — não substitui, não duplica e não interfere com:

- o runtime frontend (seções 1–2);
- o gateway worker e contrato SSE (seção 3);
- o mecanismo de PASS GOLD (seção 4);
- o SDDF Guard (seção 5);
- o backend real (`go-core` ou equivalente).

A Software Factory produz módulos `.mjs` de governança que modelam e validam processos de engenharia. Ela não executa operações reais de release, deploy, tag ou PR sem autorização explícita.

## 7. Vision Software Factory — módulos canônicos

Todos os módulos da Software Factory seguem estrutura canônica obrigatória.

**Diretórios:**

- `tools/software-factory/` — módulos de governança;
- `tools/tests/software-factory/` — suites de testes correspondentes.

**Registro obrigatório:**

- cada módulo recebe um script em `package.json` com padrão `test:<módulo>-unit`;
- cada módulo e seu teste são listados em `tools/syntax-check.mjs`.

**Exports obrigatórios por módulo:**

- `STATUSES` — array com todos os status possíveis do módulo;
- `build(input)` — constrói o resultado a partir do input validado;
- `validate(result)` — valida invariantes do resultado;
- `render(result)` — retorna string legível com REGRA ABSOLUTA.

**Flags obrigatoriamente sempre `false` em qualquer estado:**

- `release_allowed`
- `deploy_allowed`
- `stable_allowed`
- `tag_allowed`
- `real_execution_allowed`
- `real_pr_creation_allowed`
- `production_touched`

## 8. Vision Software Factory — fases oficiais

As fases da Software Factory são vinculantes e sequenciais:

| Fase | Versões | Escopo |
|------|---------|--------|
| Software Factory Core | V201–V224 | Fundação: contratos, barreiras, gates, drills, ledgers |
| Controlled Patch Execution Preparation | V225–V234 | Preparação de patch controlado |
| Controlled PR Creation Preparation | V235–V244 | Preparação de criação de PR controlada |

**Restrições de fase:**

- V225–V234 não executa patch real em nenhum arquivo do repositório;
- V235–V244 não cria PR real via `gh pr create` nem qualquer outro mecanismo;
- execução real de patch ou PR só pode existir em fase posterior com autorização explícita do usuário.

Avançar para a fase seguinte sem concluir e validar a fase atual é proibido.

## 9. Vision Software Factory — agentes e permissões

**Agentes permitidos dentro da Factory:**

- `architect` — projeta estrutura de módulos e dependências;
- `scanner` — lê e mapeia estado atual do repositório;
- `context builder` — monta contexto de execução para a missão;
- `code writer` — escreve módulos `.mjs` dentro do escopo declarado;
- `test writer` — escreve suites de teste para os módulos;
- `security reviewer` — revisa módulos para ausência de flags proibidas;
- `evidence builder` — gera evidence receipt após validação;
- `pass gold reviewer` — avalia se PASS GOLD real está presente;
- `rollback planner` — define plano de rollback antes de execução real;
- `PR reviewer` — revisa conteúdo de PR antes de criação;
- `authority reviewer` — valida autoridade e escopo da missão.

**Nenhum agente pode, em hipótese alguma:**

- executar deploy, release, tag ou promoção stable;
- acessar ou modificar `.env`, `secrets`, `.github/workflows`;
- retornar `PASS GOLD` sem evidência real de execução;
- aplicar patch real fora do escopo declarado;
- criar PR real sem autorização explícita da fase correspondente.

## 10. Vision Software Factory — evidência, PASS GOLD e rollback

**Evidence receipt** é o registro imutável produzido após execução validada. Contém versão, módulos, resultado de testes, hashes e confirmação das flags de governança.

**Níveis de evidência:**

- `simulated` — execução simulada em sandbox, sem efeito real;
- `dry-run` — execução com saída real mas sem commit/push;
- `sandbox` — ambiente isolado com variáveis bloqueadas;
- `real` — execução real autorizada explicitamente, com evidence receipt completo.

**PASS GOLD real** exige evidência de nível `real` com todos os gates aprovados. Evidência de nível inferior (`simulated`, `dry-run`, `sandbox`) não concede PASS GOLD real.

**Rollback** deve ser planejado antes de qualquer execução real. Ausência de plano de rollback bloqueia a execução.

Sem evidência suficiente, o estado do módulo permanece bloqueado e não avança para a próxima fase.

## 11. Vision Software Factory — guard obrigatório

Os comandos abaixo são obrigatórios após qualquer modificação em módulos da Software Factory:

```bash
node tools/syntax-check.mjs
npm run test:<software-factory-module>-unit
npm run test:software-factory-phase-gate-unit
npm run test:software-factory-patch-execution-phase-gate-unit
npm run test:software-factory-pr-creation-phase-gate-unit
npm run test:explicit-release-execution-decision-barrier-unit
npm run test:real-repo-patch-phase-gate-consolidator-unit
```

Qualquer falha em qualquer comando acima bloqueia commit, push e PR. Não há exceção.

## 12. Vision Software Factory — proibição de linhas paralelas não autorizadas

**Números de versão são vinculantes.** Cada número de versão identifica um módulo específico e não pode ser reutilizado para outro módulo ou finalidade diferente.

**Proibições explícitas:**

- não reutilizar um número de versão (ex.: V226) para implementar módulo diferente do definido na fase;
- não reinterpretar módulos de governança (ex.: V231, V233) como assets de frontend ou backend;
- não criar linhas paralelas de versões não autorizadas na mesma sessão;
- trilhas `rejected` ou `superseded` devem ser descartadas via `git stash drop` ou `rm -f` — nunca mergeadas ao `main`;
- arquivos vazados por ferramentas externas (OpenCode ou equivalente) fora do escopo declarado devem ser removidos imediatamente antes de qualquer commit.

## 13. Vision Software Factory — ciclo operacional LLM/agentes

A Software Factory é o mecanismo de execução controlada de tarefas de engenharia via agentes LLM. Seu ciclo operacional é vinculante e não pode ser encurtado.

### 13.1 Recebimento de missão

A Factory recebe uma missão explícita com escopo declarado, versão-alvo e restrições de acesso. Missões sem escopo declarado são rejeitadas.

### 13.2 Montagem de contexto

Antes de qualquer execução, a Factory monta o contexto completo:

- estado atual do repositório (`git status`, `git log`);
- módulos relevantes ao escopo da missão;
- evidências de execuções anteriores quando aplicável.

### 13.3 Plano de execução

A Factory cria um plano estruturado (equivalente a `TodoWrite`) com tarefas discretas, ordem de dependência e critério de conclusão por tarefa. O plano é atualizado conforme tarefas são concluídas.

### 13.4 Loop principal

O loop principal da Factory executa iterações controladas:

1. seleciona próxima tarefa do plano;
2. escolhe a ferramenta correta para a tarefa (`Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash`);
3. executa a ferramenta dentro do escopo permitido;
4. valida resultado antes de avançar;
5. marca tarefa como concluída no plano.

### 13.5 Subagents e paralelismo

Quando uma tarefa requer profundidade de análise ou há tarefas independentes entre si:

- a Factory chama subagents especializados para análise profunda sem consumir contexto principal;
- tarefas sem dependência mútua são executadas em paralelo via fork;
- resultados de subagents são integrados ao contexto antes de continuar o loop.

### 13.6 Aplicação de patch

A Factory aplica patches somente dentro do escopo permitido declarado na missão:

- nenhum arquivo fora do escopo pode ser modificado;
- o diff gerado é validado antes de qualquer commit;
- arquivos proibidos (`.env`, `secrets`, `.github/workflows`, frontend, backend, go-core) nunca são tocados.

### 13.7 Validação de diff

Após cada patch, a Factory executa:

- verificação de sintaxe (`node --check` em todos os arquivos modificados);
- inspeção do diff para confirmar ausência de regressões fora do escopo.

### 13.8 Execução de testes

A Factory executa os testes correspondentes ao escopo modificado:

- todos os testes do módulo novo ou alterado devem passar;
- testes âncora de módulos dependentes são executados como validação adicional;
- qualquer falha bloqueia o avanço — não há merge com testes vermelhos.

### 13.9 Evidence receipt

Após validação completa, a Factory gera um evidence receipt com:

- versão implementada;
- módulos criados ou alterados;
- resultado dos testes (passed/failed);
- hash de conteúdo dos artefatos principais;
- flags de governança confirmadas como `false`.

### 13.10 Relatório final

Ao concluir a missão, a Factory emite relatório final contendo:

- resumo das tarefas concluídas;
- PRs criados e mergeados;
- resultado da validação final;
- próximo passo autorizado (se houver).

### 13.11 Barreira de PR real

A Factory só permite criação de PR real se PASS GOLD real estiver presente:

- `pass_gold: true` exige evidência real de execução, não stub;
- `real_pr_creation_allowed` permanece `false` em toda a cadeia de governança até autorização explícita;
- `production_touched` permanece `false` até execução humana autorizada.

**REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.**
