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

---

## 14. Vision Agent Local — fluxo de execução e papéis

### 14.1 Visão geral

O Vision Agent Local (`vision-agent.js`) é um processo Node.js sem dependências externas que roda na máquina do usuário e serve como ponte entre o Vision Core (AWS/Cloudflare) e projetos locais inacessíveis ao servidor remoto.

**Arquivos canônicos:**

| Arquivo | Localização | Propósito |
|---------|-------------|-----------|
| `vision-agent.js` | `frontend/downloads/` | Agente standalone, zero deps, distribuível |
| `index.js` | `backend/agent-local/` | Versão de desenvolvimento com estrutura de pacote |

### 14.2 Fluxo de execução — sequência completa

```
Missão recebida (via polling ou /run direto)
  │
  ├─ 1. scanProject(input)
  │      Percorre ROOT até profundidade 4
  │      Filtra por keywords do input (> 3 chars)
  │      Retorna: { files[], target, content(4000 chars) }
  │
  ├─ 2. Se sem target → retornar listagem
  │      action: "listing"
  │      output: lista de arquivos do projeto
  │
  └─ 3. Se target encontrado → askIA(content, input)
         POST /api/chat com mode=fix
         Envia: ARQUIVO:\n<content>\n\nMISSÃO:\n<input>
         Retorna: resposta AI com bloco ```json
           │
           ├─ 4. parsePatchFromAI(aiAnswer)
           │      Extrai bloco ```json ... ``` da resposta
           │      Schema: { diagnosis, file, fix_type, patch, confidence }
           │
           ├─ Se sem bloco JSON → retornar análise apenas
           │      action: "ai_analysis"
           │
           └─ 5. applyPatch(targetFile, patch, fix_type)
                  json_field   → merge no objeto JSON existente
                  code_patch   → { search, replace } string replace
                  full_replace → sobrescreve arquivo completo
                    │
                    ├─ 6. validatePatch(filePath)
                    │      .json  → JSON.parse()
                    │      .js/.mjs/.cjs → node --check
                    │      outros → assume válido
                    │
                    ├─ Se PASS → gitCommit(file, "fix: <diagnosis> [vision-agent]")
                    │      git add <file>
                    │      git commit -m <msg>   (sem push automático)
                    │      action: "patch_applied_committed"
                    │
                    └─ Se FAIL → git checkout -- <file>   (rollback)
                           action: "patch_rollback"
                           output inclui erro de validação
```

### 14.3 Papéis dos endpoints do servidor

| Endpoint | Método | Papel |
|----------|--------|-------|
| `GET /api/agent/mission/pending` | Polling | Agent consulta se há missão pendente (a cada `VC_POLL_MS` ms) |
| `POST /api/agent/mission/queue` | Frontend | Frontend enfileira missão quando agent está ativo |
| `POST /api/agent/mission/result` | Agent | Agent retorna resultado processado ao servidor |
| `GET /api/agent/mission/result/:id` | Frontend | Frontend polling para buscar resultado da missão |
| `GET localhost:70xx` | Health | Frontend detecta agent ativo antes de enfileirar |

### 14.4 Detecção de agent no frontend

O botão EXECUTAR MISSÃO (`v298RunBtn`) tenta detectar o agent antes de usar `/api/run-live`:

```
tryAgent([7070, 7071, 7072], timeout=800ms)
  │
  ├─ AGENT ATIVO
  │    POST /api/agent/mission/queue → { mission_id }
  │    Poll /api/agent/mission/result/:id a cada 2s (máx 30s / 15 tentativas)
  │    Exibe: "✅ AGENT EXECUTOU" + output
  │
  └─ AGENT INATIVO
       POST /api/run-live
       Se LOCAL_ACCESS_REQUIRED → "📋 ACESSO LOCAL NECESSÁRIO" + 4 métodos
       Se PASS GOLD → "✅ MISSÃO CONCLUÍDA"
```

### 14.5 Modo fix — contrato de resposta da IA

Quando o agent chama `/api/chat` com `mode=fix`, o sistema instrui a IA a retornar obrigatoriamente um bloco JSON estruturado:

```json
{
  "diagnosis": "descrição objetiva do problema",
  "file": "caminho/relativo/do/arquivo",
  "fix_type": "json_field | code_patch | full_replace",
  "patch": "<conteúdo do fix>",
  "confidence": 0.0
}
```

O agent tenta aplicar o patch somente se `file` e `patch` estiverem presentes e o arquivo alvo existir dentro de `ROOT`.

### 14.6 toolFetchUrl — injeção de contexto por URL

Quando o chat recebe uma mensagem contendo URLs públicas, o servidor faz fetch do conteúdo antes de chamar a IA:

- máximo 2 URLs por request
- GitHub blob → `raw.githubusercontent.com` automático
- até 4.000 chars por URL
- conteúdo injetado como `[CONTEÚDO DE <url>]\n<texto>` na mensagem

### 14.7 Variáveis de ambiente do agent

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VC_WORKER` | URL worker prod | Endpoint do Vision Core |
| `VC_POLL_MS` | `3000` | Intervalo de polling (ms) |
| `VC_PORT` | `7070` | Porta do health server (auto-incrementa se ocupada) |

### 14.8 Restrições do agent

- **Sem push automático** — `gitCommit()` executa `git add` + `git commit`, nunca `git push`
- **Escopo limitado a ROOT** — arquivos fora do diretório passado como argumento não são modificados
- **Rollback automático** — qualquer falha em `validatePatch()` reverte via `git checkout -- <file>`
- **Sem acesso a secrets** — o agent não lê `.env`, não acessa variáveis de produção
- **`pass_gold`** do agent é sempre `false` — PASS GOLD real exige evidência do Go Core, não do agent local

---


---

## 15. Decágono Multiagente — Arquitetura dos 10 Agentes

### 15.1 Visão geral

O MISSION INPUT do Vision Core exibe um decágono de 10 agentes especializados.
Cada agente tem papel único, responsabilidade definida e estado visual (AGUARDA / RUNNING / DONE / FAIL).

### 15.2 Os 10 agentes — papéis e data-key

| data-key | Nome | Papel | Categoria |
|---|---|---|---|
| `piharness` | PI HARNESS | Mission Runner / Orquestrador | Decisão |
| `hermes` | HERMES | Supervisor / RCA / Decisão | Decisão |
| `openclaw` | OPENCLAW | Executor / Patch Strategist | Decisão/Execução |
| `scanner` | SCANNER | Context Builder / Análise de Riscos | Execução |
| `patchengine` | PATCH ENGINE | Aplicação de Patch Controlada | Execução |
| `aegis` | AEGIS | Security Gate / Gatekeeper | Validação |
| `gocore` | GO CORE | Runtime Truth / Execução Controlada | Validação |
| `passgold` | PASS GOLD | Autoridade Final | Validação |
| `archivist` | ARCHIVIST | Memory Guard / Contexto | Memória |
| `githubagent` | GITHUB AGENT | PR / CI / Release Workflow | Governança |

### 15.3 Fluxo de execução — sequência decagonal
User / Mission Input
→ PI Harness          (orquestrador — aciona fluxo)
→ OpenClaw            (patch strategist — quebra em tarefas)
→ Scanner             (lê arquivos, logs, contratos, riscos)
→ Hermes              (RCA — supervisiona, decide, bloqueia)
→ PatchEngine         (aplica patch com backup + rollback)
→ Aegis               (valida — JSON.parse / node --check)
→ Go Core             (runtime truth — commit + evidence)
→ PASS GOLD           (autoridade final — gate)
→ GitHub Agent        (PR / CI / release)
→ Archivist           (memória — preserva histórico)

### 15.4 Estados visuais dos agentes

| Classe CSS | Estado | Visual |
|---|---|---|
| `v33-running` | Ativo | `.mi-icon` pulsa com glow (glow-running 1.2s) |
| `v33-done` | Concluído | `.mi-icon` brilho estável (glow-done 2s) |
| `v33-fail` | Erro | `.mi-icon` flash vermelho (glow-fail 0.6s) |
| `v33-idle` | Aguardando | `.mi-node` opacidade 0.45 |

Implementado via `activateAgent(key, state)` no `vision-core-clean-runtime.js`.

Estados possíveis: `'active'` → v33-running · `'done'` → v33-done · `'error'` → v33-fail · `'idle'` → v33-idle

### 15.5 Categorias de responsabilidade

| Categoria | Agentes |
|---|---|
| **Decisão** | PI Harness, Hermes, OpenClaw |
| **Execução** | Scanner, PatchEngine |
| **Validação** | Aegis, Go Core, PASS GOLD |
| **Memória** | Archivist |
| **Governança** | GitHub Agent |

### 15.6 Regras críticas do decágono

| Regra | Impacto |
|---|---|
| **SEM PASS GOLD REAL → não promove** | Nenhuma promoção sem evidence receipt do Go Core |
| **Evidence receipt só vem do Go Core** | Nenhum agente pode fabricar evidence receipt |
| **Aegis tem veto absoluto** | Em conflito de segurança, Aegis bloqueia |
| **Scan atual vence memória antiga** | Scanner sempre prevalece sobre contexto cacheado |
| **deploy_allowed=false até autorização** | Push/deploy nunca automático |

### 15.7 Mapeamento Vision Agent Local → Decágono

| Agente Decágono | Implementação no vision-agent.js |
|---|---|
| Scanner | `scanProject()` — byName > byContent |
| Hermes | `askIA()` — POST /api/chat mode=fix |
| PatchEngine | `applyPatch()` — json_field/code_patch/full_replace + backup |
| Aegis | `validatePatch()` — JSON.parse / node --check |
| Go Core (parcial) | `gitCommit()` — commit sem push |
| PASS GOLD | `pass_gold: false` sempre no agent local |

**O que ainda requer Go Core real:**
`evidence_receipt` SHA-256 · `promotion_allowed: true` · `deploy_allowed: true`

### 15.8 Status atual dos agentes (V2.9.10)

| Agente | Status | Nota |
|---|---|---|
| PI Harness | 🟡 Parcial | Frontend + go-core pipeline |
| Hermes | ✅ Funcional | /api/chat mode=fix + Decision Matrix |
| OpenClaw | 🟡 Stub | /api/openclaw/orchestrate mock |
| Scanner | ✅ Funcional | vision-agent.js scanProject() byName>byContent |
| PatchEngine | ✅ Funcional | applyPatch() com backup automático |
| Aegis | ✅ Funcional | validatePatch() JSON + node --check |
| Go Core | ✅ Funcional | go-core v5.6.0, PASS GOLD real |
| PASS GOLD | ✅ Funcional | gate real — sem evidência = sem promoção |
| Archivist | 🟡 Parcial | /api/memory/save + /api/memory/search |
| GitHub Agent | 🟡 Stub | /api/github/create-pr — requer GITHUB_TOKEN |

## 16. Software Factory — Orquestração com Hermes

> Spec completa: [docs/SOFTWARE_FACTORY_SPEC.md](docs/SOFTWARE_FACTORY_SPEC.md)

### Resumo executivo

A Software Factory transforma uma missão em fases auditáveis governadas pelo padrão SDDF:

**Scope → Design → Development → Firewall → Verification → Evidence → Handoff**

### Agentes no fluxo da Software Factory

| Agente | Papel |
|--------|-------|
| **Software Factory Orchestrator** | Controla o processo — planeja, executa, audita |
| **Hermes** | Controla a decisão — RCA, bloqueio, avanço |
| **TodoWrite** | Controla a memória — plano, progresso, estado |
| **Subagent** | Investigação profunda sem poluir o loop principal |
| **Fork** | Paralelismo seguro em tarefas independentes |
| **Firewall** | Impede ações perigosas — scan de executáveis e flags proibidos |
| **Evidence** | Torna cada fase auditável com hash SHA-256 determinístico |
| **Checkpoint** | Fecha o estado — main limpa, origin sincronizado, PRs conhecidas |

### Estados decididos por Hermes

| Estado | Condição |
|--------|----------|
| `READY` | Fase válida — testes passam, firewall limpo |
| `MERGED` | Fase integrada na main com checkpoint |
| `BLOCKED_INPUT` | Input inválido, incompleto ou inseguro |
| `BLOCKED_DEPENDENCY` | Fase anterior ou evidência ausente |
| `NEEDS_FIX` | Erro corrigível — patch e retry |
| `ABORTED` | Risco alto, escopo quebrado ou ação não autorizada |

### Firewall — flags proibidas (sempre `false`)

```
deploy_allowed · release_allowed · tag_allowed · stable_promotion_allowed
production_touched · pass_gold_real_claimed · secrets_read
```

### Regra absoluta

```
SEM PASS GOLD REAL → não promove, não libera, não marca stable.
READY ≠ PASS GOLD REAL
READY ≠ deploy permitido
READY ≠ release permitido
```

---

## 17. Evidence-Bound Answer Protocol — Anti-Generic-Answer

> Protocolo de Resposta Ancorada em Evidência
> Anti-alucinação obrigatório em todas as fases da Software Factory

### 17.1 Princípio central

Toda resposta, fase, PR, diagnóstico ou decisão deve estar ancorada em pelo menos um destes elementos:
log real          commit real       PR real
arquivo real      teste real        scan real
checkpoint real   diff real         erro real
estado git real

Se não houver evidência suficiente, a resposta obrigatória é:
não tenho evidência suficiente para afirmar isso
preciso do checkpoint
preciso do diff
preciso do log
preciso do resultado do teste

### 17.2 Regras absolutas
NÃO responder por padrão.
NÃO preencher lacuna com frase genérica.
NÃO assumir sucesso sem prova.
NÃO avançar fase sem checkpoint.

### 17.3 O que o protocolo proíbe

| Frase proibida | Por quê |
|---|---|
| "parece estar tudo certo" | sem log |
| "provavelmente passou" | sem teste |
| "pode mergear" | sem diff/scan |
| "PASS GOLD" | sem prova real |
| "produção liberada" | sem runtime proof |
| "arquivo corrigido" | sem git diff |
| "PR limpo" | sem gh pr diff --name-only |
| "hash determinístico" | sem teste de duas chamadas iguais |
| "scan limpo" | sem classificar hits |
| "deve funcionar" | sem evidência |
| "está ok" | sem checkpoint |

### 17.4 Formato obrigatório de resposta com decisão

Estado observado
Evidência usada
Diagnóstico
Decisão
Próximo comando seguro
Bloqueio, se existir


Exemplo correto:
Estado observado:
PR #736 OPEN/MERGEABLE, 2 arquivos no diff.
Evidência:
gh pr view, gh pr diff --name-only, node test 69/69, scan sem EXECUTABLE.
Diagnóstico:
Escopo correto, testes OK, hits apenas comentário/fixture.
Decisão:
Apto para merge controlado.
Próximo comando:
gh pr merge 736 --squash --delete-branch

### 17.5 Classificador anti-genérico

Uma resposta é **inválida** se:

não cita estado atual
não cita comando ou evidência concreta
não diferencia hipótese de fato
não mostra próximo passo
não mostra bloqueio quando existe
usa termos vagos sem prova


### 17.6 Regra de confiança
Sem checkpoint → sem decisão final.
Sem diff       → sem merge.
Sem teste      → sem READY.
Sem scan       → sem segurança.
Sem evidência  → sem PASS GOLD REAL.

### 17.7 Aplicação por fase na Software Factory

Para cada fase, os seguintes elementos precisam existir e ser verificados:

| Elemento | Verificação obrigatória |
|---|---|
| PhaseId | precisa existir no plano |
| Branch | precisa existir no repo |
| Arquivos | precisam bater com escopo permitido |
| Teste | precisa passar (resultado real) |
| Scan | precisa ser classificado (COMMENT/FIXTURE/EXECUTABLE/UNKNOWN) |
| PR | precisa ser real (número, state, mergeable) |
| Merge | precisa gerar commit real na main |
| Checkpoint | precisa confirmar working tree clean |

### 17.8 Anti-alucinação em PRs

**Antes de dizer "pode mergear"**, executar obrigatoriamente:

```powershell
gh pr view <id> --json number,title,state,mergeable,headRefName,baseRefName,url
gh pr diff <id> --name-only
node --check <source>
node --check <test>
node <test>
forbidden scan
```

**Antes de dizer "mergeado"**, confirmar obrigatoriamente:

```powershell
git checkout main
git pull origin main
git status
git log -12 --oneline
```

### 17.9 Anti-alucinação em diagnóstico de erro

Nunca responder só com "corrija X". Formato obrigatório:
Sintoma:
O que falhou (linha, comando, output).
Evidência:
Linha, teste, comando ou log exato.
Causa provável:
Hipótese técnica (marcada como hipótese).
Causa raiz:
Só declarar se houver prova concreta.
Correção mínima:
Patch específico e cirúrgico.
Validação:
Comandos para provar que o fix funcionou.

### 17.10 Regra para respostas com dados faltantes

Se faltar dado, a resposta correta é pedir **exatamente** o dado faltante:

```powershell
# Se falta estado do repo:
git status
git log -12 --oneline
gh pr list --state open --limit 20

# Se falta diff do PR:
gh pr diff 736 --name-only

# Se falta resultado de teste:
node tools/tests/<arquivo>
```

Não inventar o estado. Não assumir o resultado.

### 17.11 Aplicação no Vision Agent Local

O Vision Agent também segue o Evidence-Bound Answer Protocol:

| Ação do agent | Evidência exigida |
|---|---|
| "arquivo encontrado" | path real retornado pelo scanner |
| "IA analisou" | resposta real do /api/chat com conteúdo do arquivo |
| "patch aplicado" | applyPatch() retornou ok: true |
| "arquivo válido" | validatePatch() retornou ok: true |
| "commitado" | gitCommit() retornou hash real |
| "PASS GOLD" | NUNCA — apenas Go Core real pode emitir |

### 17.12 Frase-síntese
A Software Factory não acredita em intenção; acredita em evidência.
SEM PASS GOLD REAL → não promove, não libera, não marca stable.

---

## 18. Contexto de Sessão, Hermes Render e Obsidian

### 18.1 Contexto de Sessão — Session Memory

O Vision Core mantém contexto em memória durante a sessão do chat. Sem persistência em localStorage ou sessionStorage para histórico de mensagens.

**Estado em memória (frontend):**

```javascript
var _attachedFiles = [];   // arquivos de texto anexados ao próximo ENVIAR
var _attachedImg   = null; // { name, base64, mime, kb } — imagem para Gemini
// Chat stream: DOM apenas — não existe array de histórico
```

**Como o contexto é injetado:**

```javascript
// Arquivos de texto: prefixados antes da mensagem
var fileCtx = _attachedFiles.map(f =>
  '[Arquivo: ' + f.name + ']\n' + f.content.slice(0, 3000)
).join('\n---\n');
text = fileCtx + '\n\n' + userMessage;

// ZIP: extraído client-side via JSZip, conteúdo concatenado como texto plano
var context = question + '\n\n' + contents.join('\n\n---\n\n');
// → enviado direto ao /api/chat como message
```

**Reset de sessão:**

```
v298ClearBtn → limpa DOM do chat stream
              → NÃO faz chamada API
              → _attachedFiles e _attachedImg já foram consumidos no ENVIAR anterior
```

**Ciclo de vida:**
- Inicia: ao abrir ou recarregar a página
- Contexto de arquivo: descartado após cada ENVIAR (`_attachedFiles = []`)
- Contexto de imagem: descartado após cada ENVIAR (`_attachedImg = null`)
- Histórico: não existe — cada `/api/chat` é stateless no backend

---

### 18.2 Hermes Render — Animação e Painéis de Resultado

Hermes Render é o subsistema visual que reflete o estado da pipeline SDDF no MISSION INPUT e exibe painéis de resultado auditável.

#### 18.2.1 Animação de Agentes

Função central: `activateAgent(key, state)`

```javascript
// Keys: 'scanner' | 'hermes' | 'patchengine' | 'aegis' | 'gocore' | 'passgold'
// States: 'active' | 'done' | 'error' | 'idle'

// Mapeamento DOM:
//   texto:  document.getElementById('v33-t-' + key)
//   nó:     document.querySelector('[data-key="' + key + '"]')

// Classes CSS adicionadas no .mi-node:
//   active → v33-running  → keyframe glow-running 1.2s infinite
//   done   → v33-done     → keyframe glow-done 2s infinite
//   error  → v33-fail     → keyframe glow-fail 0.6s infinite
//   idle   → v33-idle     → opacity: 0.45
```

**Textos por estado:**

| Agent | Active | Done |
|-------|--------|------|
| scanner | `SCAN...` | `✓ SCAN` |
| hermes | `RCA...` | `✓ RCA` |
| patchengine | `PATCH...` | `✓ PATCH` |
| aegis | `AEGIS...` | `✓ AEGIS` |
| gocore | `COMMIT...` | `✓ COMMIT` |
| passgold | `GOLD...` | `★ GOLD` |

**Regra:** `activateAgent` usa `classList.add/remove` — nunca `node.style` no pai `.mi-node`. Inline styles no pai quebram o seletor filho `.mi-node.v33-running .mi-icon`.

#### 18.2.2 Typewriter Effect

```javascript
function typewriterEffect(el, text, speed) {
  // speed padrão: 10-12ms
  // chunk: 3 chars por tick
  // auto-scroll do chatStream a cada tick
}
```

Usado em: resposta de `/api/chat`, resposta de análise de ZIP.

#### 18.2.3 Painel de Validação Manual (SDDF §14)

Renderizado após `patch_applied_committed` com resultado de missão:

```javascript
function renderValidationPanel(res) {
  // res: { file, fix_type, hash, patch, mission_id }
  // Exibe: arquivo, fix_type, commit hash, diff do patch
  // Botões:
  //   ✅ Aprovar → POST /api/agent/mission/push { mission_id, file, hash }
  //   ❌ Reverter → POST /api/agent/mission/revert { mission_id, file }
}
```

**Contrato:** renderValidationPanel não é chamado sem hash confirmado de commit real.

#### 18.2.4 Outros painéis de render

| Função | Propósito |
|--------|-----------|
| `renderWorkerResultAuthorityPanel()` | Exibe authority panel após resultado de worker |
| `renderWorkerEvidenceChecklist()` | Checklist de evidência do worker |
| `renderWorkerEvidenceReceipt()` | Receipt de evidência com hash |
| `renderWorkerHandoffPackage()` | Pacote de handoff para agente externo |
| `renderMissionPrompt()` | Prompt gerado pela Mission Configuration |

---

### 18.3 Obsidian — Vault Local e API de Notas

O Vision Core mantém vault de notas Markdown para auditoria e memória de contexto longo.

#### 18.3.1 Estrutura de diretórios

```
memory/
  incidents/    — falhas e incidentes de runtime
  patterns/     — padrões recorrentes identificados por Hermes
  feedback/     — feedback do operador
  obsidian/     — notas do vault Obsidian
    VisionCoreVault/  — vault principal (VAULT_ROOT)
```

#### 18.3.2 API Obsidian (backend)

| Endpoint | Método | Ação |
|----------|--------|------|
| `/api/obsidian/status` | GET | Retorna `connected`, `mode`, flags de config |
| `/api/obsidian/connect` | ALL | Conecta vault (aceita `mode`) |
| `/api/obsidian/test` | ALL | Testa alcançabilidade |
| `/api/obsidian/write` | ALL | Escreve nota Markdown em `memory/obsidian/` |
| `/api/obsidian/search` | GET | Lista arquivos em `memory/obsidian/` |
| `/api/obsidian/disconnect` | ALL | Desconecta (`connected: false`) |

**`/api/obsidian/write` — formato de entrada:**

```json
{
  "title": "nome-da-nota",
  "context": "contexto da missão",
  "root_cause": "causa raiz identificada",
  "fix": "correção aplicada",
  "pass_gold": false
}
```

Resultado: arquivo em `memory/obsidian/{timestamp}-{title}.md` via `saveMarkdown()`.

#### 18.3.3 Variáveis de ambiente

```
OBSIDIAN_VAULT_PATH    — path local do vault Obsidian
OBSIDIAN_API_URL       — URL da Obsidian Local REST API
OBSIDIAN_SYNC_MODE     — 'local' | 'api' | 'disabled'
```

`/api/obsidian/status` retorna `connected: true` somente se `OBSIDIAN_VAULT_PATH` ou `OBSIDIAN_API_URL` estiver configurado.

#### 18.3.4 Frontend — botão Obsidian

```javascript
// Element: v299ObsidianBtn
obsidianBtn.addEventListener('click', function() {
  fetch(BACKEND_URL + '/api/obsidian/status')
  // Exibe toast: 'Obsidian: ✅ CONECTADO' ou '⚠ desconectado'
  // Muda texto do botão para '✓ Obsidian' se conectado
});
```

#### 18.3.5 Regras de governança

- Obsidian write **não substitui** evidence_hash SDDF
- Vault é memória auxiliar — não é prova de PASS GOLD
- `saveMarkdown()` sempre inclui `PASS GOLD: false` por padrão
- Sem acesso a secrets do .env nas notas exportadas

---

### 18.4 Frase-síntese

```
Sessão: in-memory, stateless por request, descartada no reload.
Hermes Render: CSS classes — nunca inline styles no .mi-node pai.
Obsidian: memória auxiliar — não é prova SDDF, não substitui evidence_hash.
```

---

## 19. Roadmap V3.0.0 — Pendências e Status de Implementação

### 19.1 Inventário de pendências (auditoria 2026-06-01)

| # | Pendência | Status antes | Status após fix |
|---|---|---|---|
| P1 | Bug Obsidian duplicata — `/api/obsidian/status` definido 2x | ❌ Bug | ✅ Corrigido |
| P2 | Session history multi-turn — contexto entre turns | ❌ Stateless | ✅ Implementado |
| P3 | Hermes JSON block parser — render estruturado | ❌ Texto puro | ✅ Implementado |
| P4 | Context badge UI — indicador visual de histórico | ❌ Ausente | ✅ Adicionado |
| P5 | Obsidian persistência real (DynamoDB/SQLite) | ❌ RAM only | 🔴 Pendente V3.1 |
| P6 | Obsidian indexação semântica | ❌ Ausente | 🔴 Pendente V3.1 |

---

### 19.2 Session History — `_sessionHistory[]`

Implementado em V3.0.0. Mantém até 6 items (3 pares user/assistant) em memória.

```javascript
// _sessionHistory = [
//   { role: 'user',      content: '... (máx 2000 chars)' },
//   { role: 'assistant', content: '... (máx 2000 chars)' },
//   ... até SESSION_HISTORY_MAX = 6
// ]
```

**Fluxo:**
- `ENVIAR` → `addToHistory('user', texto)` antes do fetch
- Resposta `/api/chat` → `addToHistory('assistant', answer)`
- Histórico injetado no próximo payload via `getHistoryPrefix()`
- `clearBtn` → `clearHistory()` limpa junto com DOM
- `updateContextBadge()` chamado a cada mutação do histórico

**Limite de tokens:** máx 6 items × 2000 chars = ~12000 chars de contexto. Pares mais antigos removidos via `splice(0, 2)`.

---

### 19.3 Hermes JSON Block Parser

Implementado em V3.0.0. Detecta blocos ` ```json ``` ` em respostas da IA.

```javascript
// parseHermesBlock(text)
// → null | { fix_type, decisao, diagnosis, file, patch, confidence, decision }
// Ativa somente se obj tem fix_type | decisao | diagnosis | decision

// renderHermesBlock(obj, container)
// → painel visual inserido em chatStream com:
//   - Decisão colorida: NEEDS_FIX=#fbbf24, READY=#22c55e, ABORTED=#f87171
//   - Arquivo + fix_type + confiança
//   - Diagnóstico expandido (HTML-escaped)
//   - <details> com patch JSON se presente
```

**Quando ativa:** somente se a resposta do AI contém ` ```json ``` ` com campos Hermes. Texto puro cai em `typewriterEffect` normalmente.

---

### 19.4 Context Badge — `v298ContextBadge`

Elemento DOM inserido após `v298FileNote`. Visível somente quando `_sessionHistory` tem ≥ 1 par completo.

```
Estado: display:none   → sem histórico
Estado: display:block  → "🧠 N turn(s) em contexto"
Reset:  clearBtn       → badge volta a display:none
```

---

### 19.5 Obsidian — Roadmap V3.1

Obsidian atual salva em filesystem do EB (RAM + disco efêmero) — dados perdidos em restart.

**V3.1 requer:**
1. Persistência via SQLite no EB ou DynamoDB
2. Indexação por projeto (hash do ZIP ou nome do repo)
3. Busca semântica por embedding
4. Auth por usuário (separar vaults por `vision_session`)

---

### 19.6 Frase-síntese

```
P1 (bug) + P2 (history) + P3 (hermes parser) + P4 (badge) = V3.0.0 DONE.
P5 (obsidian persist) + P6 (indexação) = V3.1 backlog.
Commit: 10e568e
```

---

## 20. toolFetchUrl — Protocolo de Fetch e Regra Anti-Alucinação

### 20.1 Diagnóstico (2026-06-02)

**Sintoma:** IA respondeu sem conteúdo real — inventou patch para arquivo que não existia.

**Evidência:**
- `fetched_count: 0` na resposta de `/api/chat`
- `/api/test-fetch?url=README.md` → `404 Not Found`
- `technetgamev2` não tem `README.md` em nenhum branch (`main` nem `master`)
- Node.js v20.20.2 — `fetch` disponível → não era bug de runtime

**Causa raiz:** toolFetchUrl v2 tentava somente `/main/README.md` para repo root. Recebia 404, descartava silenciosamente, injetava zero contexto. IA recebia payload sem conteúdo real e alucinava a resposta baseada em training data.

**Violação SDDF §17:** resposta sem evidência real é resposta proibida.

---

### 20.2 toolFetchUrl v3 — Fluxo corrigido

```javascript
// Para cada URL encontrada na mensagem:

// Caso 1 — GitHub blob (/blob/ na URL)
// → converte para raw.githubusercontent.com + branch + path

// Caso 2 — GitHub repo root (github.com/owner/repo)
// → tenta README.md em main
// → se 404: tenta README.md em master
// → se 404: fallback para GitHub API (sempre 200 em repos públicos)
//   https://api.github.com/repos/{owner}/{repo}
//   → retorna: name, description, language, topics, stars, updated_at

// Caso 3 — URL genérica
// → fetch direto com User-Agent: VisionCore/2.9.10
// → AbortController timeout 10s

// doFetch(url, label) → string | null
// Content-Type JSON → JSON.stringify(await r.json(), null, 2).slice(0, 5000)
// Content-Type text → (await r.text()).slice(0, 5000)
```

---

### 20.3 Resposta de diagnóstico — campos obrigatórios

Todos os providers em `/api/chat` agora retornam:

```json
{
  "answer":        "...",
  "provider":      "groq|gemini|openrouter|local",
  "fetched_count": 0,
  "fetched_urls":  ["https://..."]
}
```

**Regra:** se `fetched_count === 0` e a mensagem continha URLs → fetch falhou ou 404. IA respondeu sem contexto real.

---

### 20.4 Endpoint de diagnóstico — /api/test-fetch

```
GET /api/test-fetch?url={encoded_url}

Response:
{
  "url":          "url testada",
  "status":       200,
  "ok":           true,
  "preview":      "primeiros 500 chars do conteúdo",
  "node_version": "v20.20.2"
}

Error (fetch indisponível):
{
  "error":        "fetch not available",
  "node_version": "vX.Y.Z"
}
```

Usado para verificar se o EB consegue alcançar uma URL sem passar pelo AI.

---

### 20.5 /api/health — campos de runtime

```json
{
  "node_version":    "v20.20.2",
  "fetch_available": true
}
```

Adicionados em 2026-06-02 para diagnóstico de runtime sem acesso aos logs do EB.

---

### 20.6 Regra Anti-Alucinação — toolFetchUrl

Complementa SDDF §17 (Evidence-Bound Answer Protocol).

**Proibido:**
- Responder "o arquivo X contém..." sem `fetched_count > 0`
- Inventar conteúdo de repositório a partir de training data
- Citar patch de arquivo sem ter lido o arquivo real

**Obrigatório:**
- `fetched_count` visível na resposta
- Se `fetched_count === 0` e URL presente: informar usuário que o conteúdo não foi obtido
- Hermes classifica resposta sem evidência como `BLOCKED_INPUT`

**Hierarquia de confiança:**

| Fonte | Confiança | Evidência |
|---|---|---|
| Conteúdo real fetched (`fetched_count > 0`) | Alta | `[CONTEÚDO DE {url}]` injetado |
| Arquivo anexado pelo usuário | Alta | `[Arquivo: {name}]` injetado |
| ZIP extraído via JSZip | Alta | conteúdo real dos arquivos |
| Training data do modelo | **Zero** | proibido sem declaração explícita |

---

### 20.7 Frase-síntese

```
toolFetchUrl v3: README → master → GitHub API → never hallucinate.
fetched_count === 0 + URL presente = evidência ausente = resposta suspeita.
SDDF §17 + §20: sem fetch real → sem claim de conteúdo real.
Commit: b18ffbc
```

