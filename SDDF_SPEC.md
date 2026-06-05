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

---

## 21. Fetch Transparency Layer — Indicador de Fonte no Frontend

### 21.1 Problema identificado pós-§20

§20 introduziu `fetched_count` e `fetched_urls` na resposta de `/api/chat`.
Frontend descartava esses campos — operador não conseguia distinguir:

- Resposta com evidência real (`fetched_count > 0`)
- Resposta potencialmente alucinada (`fetched_count === 0`)

Violação implícita de §17: Evidence-Bound Answer Protocol proíbe respostas sem evidência, mas sem visibilidade o operador não pode auditar.

---

### 21.2 renderFetchBadge — Implementação

Função inserida em `vision-core-clean-runtime.js` imediatamente antes de `parseHermesBlock`. Chamada após `addToHistory('assistant', answer)` em cada resposta de `/api/chat`.

```javascript
// renderFetchBadge(data, container)
// data      → objeto JSON completo da resposta /api/chat
// container → chatStream

// Saída silenciosa se data.fetched_count ausente (backend pré-§20)

// fetched_count > 0 → badge verde
//   "🔗 N fonte(s) obtida(s) (hostname)"
//   badge.title = URLs completas

// fetched_count === 0 → badge vermelho
//   "⚠️ Nenhuma fonte obtida — resposta sem conteúdo real"

// Não bloqueia a resposta — torna o risco auditável
```

---

### 21.3 Regras de exibição

| `fetched_count` | `fetched_urls` | Badge | Cor |
|---|---|---|---|
| ≥ 1 | qualquer | 🔗 N fonte(s) obtida(s) | Verde `#22c55e` |
| 0 | presente | ⚠️ Nenhuma fonte obtida | Vermelho `#f87171` |
| 0 | vazio | ⚠️ Nenhuma fonte obtida | Vermelho `#f87171` |
| ausente | — | sem badge (silencioso) | — |

---

### 21.4 Cadeia §17 → §20 → §21

```
§17 — Evidence-Bound Answer Protocol
     IA proibida de responder sem evidência real

§20 — toolFetchUrl Anti-Alucinação
     Backend expõe fetched_count em todas as respostas
     GitHub API fallback quando README retorna 404

§21 — Fetch Transparency Layer
     Frontend exibe fetched_count como badge auditável
     Operador vê, audita, decide
```

---

### 21.5 Frase-síntese

```
fetched_count > 0  → badge verde  → evidência real injetada.
fetched_count === 0 → badge vermelho → risco visível ao operador.
§21 fecha o loop: backend mede, frontend mostra, operador decide.
```

---

## 22. Hermes Scope Rule — Hermes Governa Missão, Não Conteúdo

> Arquivo canônico: `SDDF_SPEC.md` seção 22
> Implementado em: `backend/server.js` — commit `6b85a94`

---

### 22.1 Diagnóstico que gerou esta regra (2026-06-02)

**Sintoma observado:** imagem enviada com `mode: "fix"` retornava `decisao: BLOCKED_INPUT` com mensagem
"A requisição excede o escopo da minha função de assistente técnico especializado em diagnóstico e correção de bugs."

**Causa raiz confirmada:** o `hermesDecisionMatrix` era injetado no `systemPrompt` ANTES de detectar
`hasImage`. O modelo recebia instruções Hermes (`Você é Hermes — supervisor de decisão`) e recusava
descrever imagens por interpretar a tarefa como "fora do escopo de análise de bugs."

**Evidência:**

| Teste | `mode` | `vision` | Resultado |
|-------|--------|----------|-----------|
| Antes do fix | `fix` | `True` | `BLOCKED_INPUT` — imagem chegou ao Gemini, Hermes bloqueou |
| Após FIX A | `fix` | `True` | Descreveu imagem corretamente (coral/salmão) |
| Controle | `vision-geral` | `True` | Funcionou antes e depois ✓ |

---

### 22.2 Regra canônica — Escopo do Hermes

```
HERMES GOVERNA MISSÃO DE FIX.
HERMES NÃO FILTRA TIPO DE CONTEÚDO.
```

**Hermes Decision Matrix ativa quando:**
- `mode === 'fix'` ou `mode === 'hermes'`
- **E** não há imagem no payload (`hasImage === false`)

**Hermes Decision Matrix inativa quando:**
- `hasImage === true` — independente do modo selecionado
- O operador está enviando conteúdo visual para análise
- Hermes não tem jurisdição sobre análise de imagem

---

### 22.3 Implementação — ordem de detecção obrigatória

```javascript
// ORDEM CORRETA (pós-FIX A):
const hasImage   = !!(body.image_base64 && body.image_base64.length > 10);  // ← detectar PRIMEIRO
const imageMime  = body.image_mime || 'image/jpeg';
const imageB64   = body.image_base64 || '';

const fixModeInstructions = hermesDecisionMatrix;  // calculado de mode, não de hasImage

const visionAddendum = hasImage
  ? '\n\nVOCÊ ESTÁ RECEBENDO UMA IMAGEM. Descreva o conteúdo visual com detalhes técnicos...'
  : '';

const systemPrompt = hasImage
  ? basePrompt + visionAddendum          // sem Hermes matrix quando há imagem
  : basePrompt + fixModeInstructions;    // Hermes matrix apenas para text-only fix
```

**Proibido:**
```javascript
// ERRADO — systemPrompt montado antes de hasImage ser declarado:
const systemPrompt = basePrompt + fixModeInstructions;   // linha X
const hasImage = !!(body.image_base64 ...);              // linha X+3 — tarde demais
```

---

### 22.4 Tabela de seleção de system prompt

| `hasImage` | `mode` | `systemPrompt` aplicado |
|-----------|--------|------------------------|
| `false` | `fix` / `hermes` | `basePrompt + hermesDecisionMatrix` |
| `false` | qualquer outro | `basePrompt` (sem additions) |
| `true` | qualquer | `basePrompt + visionAddendum` |

---

### 22.5 FIX B — `handleZipUpload` pipeline completo (mesmo commit)

Antes do FIX B, `handleZipUpload` tinha pipeline incompleto:

| Campo | Antes | Depois |
|-------|-------|--------|
| `mode` | `'fix'` hardcoded | `modeSelect.value` do usuário |
| `model` | ausente | `modelSelect.value` do usuário |
| Hermes render | ❌ raw text | ✅ `parseHermesBlock` + `renderHermesBlock` |
| Session history | ❌ ausente | ✅ `addToHistory` (user + assistant) |
| Fetch badge | ❌ ausente | ✅ `renderFetchBadge` (§21) |
| Timeout | ❌ sem timeout — hung forever | ✅ `AbortController` 25s com mensagem |
| `r.ok` check | ❌ JSON parse em qualquer resposta | ✅ `if (!r.ok) reject HTTP status` |
| Limpar textarea | ❌ não limpava | ✅ `promptInput.value = ''` após ZIP |

---

### 22.6 Frase-síntese

```
Hermes decide sobre código e missão de fix.
Hermes não é porteiro de tipo de conteúdo.
Quando há imagem, visionAddendum substitui hermesDecisionMatrix.
hasImage deve ser detectado ANTES de montar o systemPrompt.
```

---

## 23. Estilo de Resposta — Regra de Concisão Obrigatória

> Arquivo canônico: `SDDF_SPEC.md` seção 23
> Implementado em: `backend/server.js` — `basePrompt`, campo `ESTILO DE RESPOSTA`

---

### 23.1 Problema identificado

Respostas do Vision Core Copilot começavam com preâmbulos desnecessários que:
- Atrasam a informação técnica
- Parecem vazios ou condescendentes
- Contradizem o perfil de operador técnico do Vision Core

Exemplos de comportamento proibido observado:
```
"Olá! Ótimo que você perguntou isso. Claro que posso ajudar!
Você está querendo saber sobre o erro no CORS, certo? Vou explicar..."
```

### 23.2 Regra canônica

```
RESPOSTA COMEÇA COM CONTEÚDO.
NUNCA COM PREÂMBULO.
```

**Proibido:**

| Categoria | Exemplos banidos |
|-----------|-----------------|
| Saudação | "Olá", "Oi", "Olá!" |
| Validação vazia | "Ótimo", "Claro", "Com prazer", "Com certeza", "Perfeito", "Entendido", "Certo" |
| Oferta de ajuda | "Vou ajudar", "Posso te ajudar", "Fico feliz em ajudar" |
| Reafirmação | "Você está pedindo para...", "Você quer saber sobre..." |
| Encerramento vazio | "Espero ter ajudado", "Qualquer dúvida...", "Fico à disposição" |

**Obrigatório:**

| Regra | Descrição |
|-------|-----------|
| Começo técnico | Primeira linha é diagnóstico, código ou resposta objetiva |
| Proporcional | Resposta simples → curta. Complexa → detalhada |
| Sem repetição | Não reafirmar o que o usuário enviou |

### 23.3 Implementação — `basePrompt` (backend/server.js)

Adicionado ao final de `basePrompt`, antes do `.join('\n')`:

```javascript
`ESTILO DE RESPOSTA — REGRA OBRIGATÓRIA (SDDF §23):`,
`❌ PROIBIDO começar resposta com: "Olá", "Oi", "Ótimo", "Claro", "Com prazer",`,
`   "Entendido", "Certo", "Perfeito", "Com certeza", "Sem dúvidas", "Vou ajudar",`,
`   ou qualquer preâmbulo que não seja informação técnica.`,
`❌ PROIBIDO reafirmar o que o usuário disse (ex: "Você está pedindo para...").`,
`❌ PROIBIDO encerrar com: "Espero ter ajudado", "Qualquer dúvida...", "Fico à disposição".`,
`✅ OBRIGATÓRIO: começar diretamente pelo diagnóstico, código ou resposta objetiva.`,
`✅ OBRIGATÓRIO: proporcional — respostas simples têm respostas curtas; complexas têm detalhes.`,
`✅ Exemplo correto: "Bug em auth middleware. Token expiry usa < em vez de <=. Fix:"`
```

### 23.4 Escopo

- Aplicado a **todos os modos**: `vision-geral`, `corrigir-projeto`, `debug-cors`, `explicar-leigo`, `rodar-sddf`
- Aplicado a **todos os providers**: Groq, Gemini, OpenRouter, local
- **Não se aplica** ao `visionAddendum` (imagem) — já é direto por natureza
- `hermesDecisionMatrix` (`mode:fix`) já retorna JSON estruturado — esta regra complementa o texto após o bloco JSON

### 23.5 Exemplo padrão

```
❌ Antes (proibido):
  "Olá! Ótimo que você compartilhou o código. Vou analisar o problema.
   Você está tendo um erro de CORS, certo? Então..."

✅ Depois (correto):
  "CORS bloqueado porque o middleware global está após a rota /api/unzip-context.
   Mover para antes de todas as rotas. Fix:"
```

### 23.6 Frase-síntese

```
Resposta começa com conteúdo.
Nunca com preâmbulo.
Proporcional à complexidade.
Sem despedida vazia.
```

---

## §24 — Seleção Inteligente de Arquivos no ZIP (FIX D)

**Data:** 2026-06-02 | **Commits:** `45f155e` (v1, supersedido), `613a80f` (v2 JS-DESC), `61001e5` (backend)

### 24.1 Problema

O handler ZIP anterior iterava os arquivos na ordem interna do ZIP e cortava nos primeiros 20. Em projetos reais, os maiores arquivos (ex: `news-cache.json` 849 KB, `translation-cache.json` 124 KB) ocupavam slots valiosos sem contribuir com informação diagnóstica. O arquivo alvo (`games-2026-feature.js`, 23 KB, contendo o bug) ficava fora do top-20.

### 24.2 Iteração de design (4 estratégias testadas)

Medido no `technetgamev2` real (204 candidatos após SKIP_NAME, cap 20):

| Estratégia | Posição `games-2026-feature.js` |
|---|---|
| Sort ASC puro (v1) | 192/204 ❌ (top-20 eram stubs de 0–284B) |
| `front/` priority + ASC | 66/141 ❌ |
| Ext tier + ASC | 40/115 ❌ |
| **JS/TS DESC + ext tier (v2)** | **6/20 ✅** |

**Lição:** sort ASC otimiza "mais arquivos distintos" mas enche o contexto de stubs e READMEs triviais. O arquivo com o bug é quase sempre o de maior densidade de lógica. Selecionar por peso de código, não por contagem de arquivos.

### 24.3 Solução (v2)

**Frontend** (`handleZipUpload`) e **backend** (`/api/unzip-context`):

1. **SKIP_NAME** — filtrar arquivos por nome antes de qualquer processamento:
   ```
   Regex: /(?:cache|lock|\.min\.|\.bundle\.|\.map$|vendor\.)/i
   Exemplos eliminados: news-cache.json, package-lock.json, app.min.js, vendor.bundle.js
   ```

2. **Tier por extensão + JS/TS maior primeiro** — coletar TODOS os candidatos ≥ 200B, tier de extensão (1=JS/TS, 2=HTML, 3=CSS, 4=JSON, 5=outros), dentro do tier 1 ordenar DESC (maior = mais lógica), demais tiers ASC:
   ```javascript
   var sortKey = (tier === 1) ? -sz : sz;
   candidates.sort((a, b) =>
     a.tier !== b.tier ? a.tier - b.tier : a.sortKey - b.sortKey
   );
   candidates.slice(0, 20)
   ```

3. **Truncagem 12000 mantida** — arquivos > 12000 chars ainda truncados com aviso `...(truncado em 12000/N chars)`.

### 24.4 Evidência que motivou

- `technetgamev2` ZIP: 2567 KB / 204 candidatos pós-filtro
- `news-cache.json`: 849 KB — irrelevante para diagnóstico de cover image
- `games-2026-feature.js`: 23.2 KB — contém `LOCAL_REAL_COVERS` em offset 10162
- Com v2: arquivo alvo na posição 6/20; com v1 sort ASC: posição 192/204

### 24.5 v3 — Budget Total + Sub-tier front/ (commit `ec5103a`)

**Problema do v2**: 20 arquivos × 12K chars = 214K chars → ~53K tokens JS reais → Groq free tier falha → `copilotAnswer` echoa o input.

**Fix v3**:
- `TOTAL_BUDGET = 60000` chars — parar de adicionar arquivos quando budget atingido
- Sub-tier: `front/` = tier 1, `backend/` = tier 2 dentro do JS — `games-2026-feature.js` chega à posição 4
- Resultado: `main.js(12K) + feeds.js(12K) + hermes-meeting-room.js(12K) + games-2026-feature.js(12K) = 48K` — dentro do budget

**Problema residual do v3**: 70K chars de JS real → Groq ainda falha (>6K tokens), Gemini recebia apenas 5s efetivos após 15s de espera do Groq → timeout → local fallback → echo. Ver §26.

**Bug oculto do v3 — tier detection com ZIP root prefix**: `isFront` usava `indexOf('front/') === 0`, que falha quando o ZIP contém pasta raiz (e.g. `technetgamev2-main/front/assets/js/...`). Resultado: todos os JS eram tier 2, sem distinção front/backend — `games-2026-feature.js` caía na posição 6, fora do budget de 5 arquivos.

### 24.7 v4 — Tier Detection por Exclusão de Backend (commit `db00cd7`)

**Diagnóstico**: Simulação local mostrou todos os JS com `[T2]`. Path `technetgamev2-main/front/assets/js/games-2026-feature.js` → `indexOf('front/') === 0` retorna `false` (position 18, não 0).

**Fix v4**:
```javascript
// ANTES (v3 — falha com ZIP root prefix):
var isFront = relPath.indexOf('front/') === 0 || relPath.indexOf('src/') === 0 || ...;

// DEPOIS (v4 — exclusão de backend):
var isFront = !/(?:^|\/)(?:backend|server|node_modules)\//.test(relPath);
/* §24v4: front=not-backend; handles ZIP root prefix */
```

Lógica: em vez de tentar identificar pastas frontend (que variam), identificar pastas backend (mais estáveis) e excluir. Qualquer JS não-backend = tier 1.

**Resultado local**:

| Posição | Arquivo | Tier |
|---------|---------|------|
| 1 | main.js (43K) | T1 |
| 2 | feeds.js (32K) | T1 |
| 3 | hermes-meeting-room.js (30K) | T1 |
| **4** | **games-2026-feature.js (23K)** | **T1 ✓** |
| 5 | seo.js (12K) | T1 |

Budget: 5 × 12K = 60K (backend JS em T2, não compete).

**Teste de produção após deploy** (2026-06-02):
- Payload: 60563 chars → Groq skip (>24K, §26) → Gemini 45s
- `provider: gemini`, `model: gemini-2.5-flash`
- Hexe citado: ✓
- `LOCAL_REAL_COVERS` citado: ✓
- Resposta correta: "Ausência de mapeamento em `LOCAL_REAL_COVERS` dentro de `games-2026-feature.js`"

### 24.8 Frase-síntese (v4 final)

```
ZIP: filtrar lixo → JS/TS por exclusão de /backend/ (tier 1=front, tier 2=backend) →
     maior DESC → parar em 60K chars.
Groq: payload ≤24K. Gemini 45s: payload 24K–70K (§26).
games-2026-feature.js garantido na posição ≤4 para repos com root prefix ZIP.
```

---

## §25 — Gate Anti-Alucinação no Backend (FIX C) [IMPLEMENTADO]

**Status:** Implementado (commit `8b9e718`), smoke test 3/3 em produção EB.

### 25.1 Problema

`fetched_count===0` produz apenas badge visual no frontend. Hermes pode inventar patches mesmo sem nenhum arquivo real no contexto — viola §17 (Evidence-Bound).

### 25.2 Regra

Para `mode === 'fix'` e sem imagem:

```
SE fetched_count === 0
E message NÃO contém marcadores de contexto real:
  - /\[Arquivo: /          ← arquivo texto anexado
  - /\[CONTEÚDO DE /       ← toolFetch injetado (linha 1006 server.js)
  - /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt)\]/ ← arquivo ZIP (path com ext)
ENTÃO retornar BLOCKED_INPUT antes de chamar qualquer LLM
```

### 25.3 Ponto de inserção

`backend/server.js`, **após linha ~1133** (depois de `hasImage` definido, antes do provider chain):

```javascript
/* FIX C §25 — gate anti-alucinação: mode:fix sem contexto real → BLOCKED_INPUT */
if (mode === 'fix' && !hasImage) {
  const hasFetched = (req._toolFetchCount || 0) > 0;
  const hasFileCtx = /\[Arquivo: /.test(message) ||
                     /\[CONTEÚDO DE /.test(message) ||
                     /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt)\]/.test(message);
  if (!hasFetched && !hasFileCtx) {
    return sendOk(res, {
      answer: '```json\n' + JSON.stringify({
        decisao: 'BLOCKED_INPUT',
        motivo: 'Nenhum contexto de arquivo real fornecido.',
        instrucao: 'Envie um ZIP, anexe um arquivo, ou inclua uma URL com o código a analisar. Sem evidência real não é possível propor patch (SDDF §17+§25).'
      }, null, 2) + '\n```\n\nNenhum arquivo ou URL de código foi fornecido. Para análise no modo fix, anexe um ZIP ou arquivo com o código-fonte.',
      provider: 'gate',
      model: 'fix-c-gate',
      mode,
      fetched_count: 0,
      fetched_urls: [],
      anti_stub: true
    });
  }
}
```

### 25.4 Frase-síntese

```
Sem arquivo real = sem patch.
§17 passa de documentado para executável.
Gate roda antes de qualquer LLM — zero custo de token.
```

---

## §26 — Roteamento de Provider por Tamanho de Payload (FIX E)

**Data:** 2026-06-02 | **Commit:** `d33d144`

### 26.1 Problema: Echo por Overflow de Contexto

O backend tem 4 providers em cascata (Groq → Gemini → OpenRouter → local fallback). O fallback local (`copilotAnswer`) echoa o `body.message` de volta como resposta. Quando todos os providers falham, a resposta parece válida (HTTP 200, campo `answer`) mas é apenas o input repetido — com `provider: "local"`.

**Diagnóstico do echo nos testes ZIP:**

| Payload | Tokens estimados | Provider | Echo? |
|---|---|---|---|
| 6K chars (texto pequeno) | ~1.5K | groq | Não |
| 24K chars (2 arquivos JS) | ~6K | groq | Não |
| 40K chars (padding X) | ~100 (BPE merge) | groq | Não |
| 70K chars (JS real) | ~17K | local | **Sim** |

**Por que JS real ≠ padding**:  
BPE (Byte Pair Encoding) comprime runs de X's em poucos tokens. JavaScript real tokeniza ~4 chars/token. 70K chars de JS real ≈ 17K tokens. 40K chars de X's ≈ ~100 tokens.

**Causa da cascata**:
1. Groq free tier: ~6K tokens/request → falha com 17K tokens
2. Groq timeout: 15s (aguarda mesmo em falha)
3. Gemini timeout: 20s — mas começa APÓS 15s de espera do Groq → apenas 5s efetivos → timeout
4. OpenRouter: mesmo problema
5. `copilotAnswer` → echo do input

### 26.2 Fix: Roteamento por Tamanho + Timeout Estendido

**Commit `d33d144`** — `backend/server.js`:

```javascript
/* §26: pular Groq para payloads grandes (>24K chars = ~6K tokens Groq free tier) */
const groqPayloadOk = message.length <= 24000;
if (GROQ_KEY && !hasImage && groqPayloadOk) { /* Groq */ }

/* §26: timeout 45s (era 20s) — suporta payloads ZIP grandes */
signal: AbortSignal.timeout(45000)
```

**Resultado**:
- Payload ≤ 24K chars: Groq (fast path, ~1-2s)
- Payload > 24K chars: Groq pulado → Gemini recebe diretamente com 45s → suporta payloads ZIP até ~70K chars
- Total request time máximo: 0s Groq + 45s Gemini = 45s (dentro do EB LB timeout de 60s)

### 26.3 Identificação de Echo

**Sinal de echo**: `provider === "local"` na resposta + `answer.length ≈ input.length`.

O campo `provider` é a chave de diagnóstico: qualquer `provider: "local"` indica falha de todos os LLMs. **Não é uma resposta real.**

O frontend deve tratar `provider: "local"` como erro e exibir mensagem de aviso ao usuário (implementado: §27).

### 26.4 Frase-síntese

```
Echo = todos os providers falharam → copilotAnswer echoa input → provider:"local".
Fix: skip Groq para payload > 24K chars + Gemini timeout 20→45s.
Detectar echo: provider==="local" é o sinal.
```

---

## §27 — Echo Guard (Fallback Honesto + Warning Frontend)

**Status:** Implementado (commit `8cf8a0d`). CF Pages + EB deployed 2026-06-02.

### 27.1 Problema

`copilotAnswer(body)` incluía `Mensagem: ${message}` na resposta local. Para payloads de 60K chars, isso gerava uma resposta de 60K chars que a UI exibia sem qualquer indicação de que era um eco, não uma análise real.

Modo de falha silencioso: usuário via "texto longo, parece análise" → não percebia que era eco do próprio input.

### 27.2 Fix Backend — Resposta Safe sem Echo

**Ponto**: `backend/server.js` linha 1235 (local fallback, `/* ── 4. Local fallback ──`).

Antes:
```javascript
return sendOk(res, { answer: copilotAnswer(body), provider: 'local', ... });
// copilotAnswer inclui: `Mensagem: ${message}` ← echo do payload inteiro
```

Depois:
```javascript
/* §27: não ecoar payload — retornar erro honesto sem incluir body.message */
const _payloadLen = (body.message || '').length;
const _localAnswer = '⚠️ **Todos os provedores de IA falharam** (payload: ' + _payloadLen + ' chars).\n\n'
  + 'Causas prováveis:\n'
  + '- Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars; Gemini: timeout 45s)\n'
  + '- API keys ausentes ou quota esgotada (GROQ_API_KEY, GEMINI_API_KEY)\n'
  + '- Erro de rede ou timeout\n\n'
  + 'Ação: reduza o ZIP ou verifique as env vars no EB.';
return sendOk(res, { answer: _localAnswer, provider: 'local', ... });
```

### 27.3 Fix Frontend — Warning Banner

**Ponto**: ambos `vision-core-clean-runtime.js` e `vision-core-bundle.js`, em dois handlers cada:
1. Chat regular (linha `stopMissionAnimation`)
2. ZIP upload (linha `thinking.remove()` no `.then(function(d)`)

```javascript
/* §27 echo guard */
if (data && data.provider === 'local') {
  appendMsg('⚠️ Fallback local — todos os provedores de IA falharam. Reduza o payload ou verifique as API keys.', 'error');
}
```

Usa `appendMsg('...', 'error')` → banner vermelho (`color:#f87171`) acima da resposta de fallback.

### 27.4 Diagrama de Falha Resolvido

```
Antes:  provider:local → UI exibe 60K chars (silencioso, parece análise)
Depois: provider:local → UI mostra banner vermelho → depois exibe msg curta de erro
```

### 27.5 Frase-síntese

```
provider:"local" = falha. Backend: erro informativo (sem echo). Frontend: banner vermelho.
Modo de falha agora honesto e visível.
```

---

## §28 — Alinhamento de Timeouts e Diagnóstico da Cadeia Worker

**Status:** Implementado (commit `96e64c2`). CF Pages + Worker deployed 2026-06-02.

### 28.1 Cadeia de Timeout

```
Frontend AbortController  →  CF Worker subrequest  →  EB  →  Gemini
  25s (antigo, ❌)               sem sinal (antigo)        45s (§26)
  55s (atual, ✓)                 52s /api/chat (atual)     45s (§26)
```

### 28.2 Diagnóstico de Latência Empírica

| Payload | Chars | Provedor | Tempo real | CF free limit | Resultado |
|---------|-------|----------|-----------|---------------|-----------|
| 2 arquivos (games-2026-feature.js + main.js) | 24K | gemini-2.5-flash | **9.3s** | 30s | ✅ |
| 5 arquivos (FIX D v4 completo) | 60K | gemini-2.5-flash | **9s** | 30s | ✅ |

**Conclusão:** Gemini responde em ~9s para payloads até 60K chars. Não há risco de estourar o teto de 30s do CF Worker free plan.

### 28.3 Por que havia Echo antes do §26

O echo (provider:local) não era causado pelo frontend abortar antes do Gemini — era causado pela cadeia sequencial:

```
Groq tentativa (15s timeout) → FALHA (payload 60K > ~6K tokens limite free tier)
Gemini começa em t=15s com timeout 20s → timeout efetivo: 5s restantes da janela
Gemini em 5s → pode falhar → copilotAnswer echoa
```

§26 fix key: **skip Groq para >24K chars** → Gemini recebe diretamente → responde em 9s < qualquer timeout.

A extensão do timeout Gemini 20→45s foi preventiva, não o fix real. O fix real = skip Groq.

### 28.4 Análise do Worker

Worker `visioncore-api-gateway` não é bypass-ável porque:
- EB é HTTP (`http://vision-core-prod.eba-pdk6anxy...`) → browser bloqueia mixed content de página HTTPS
- Worker serve HTTPS + CORS + rate limit (120 req/min por IP)

Worker NÃO tem lógica crítica além de proxy:
- `/api/auth/signup` → stub (`demo-token-${Date.now()}`) — não é auth real
- `/api/github/create-pr` → stub — não é criação real de PR
- Rate limiting → in-memory por isolate, best-effort

### 28.5 Frase-síntese

```
Gemini: 9s para 60K chars. CF free 30s: seguro sem bypass.
Echo root cause: Groq 15s timeout consumia janela antes do Gemini.
Fix: skip Groq >24K → Gemini direto → 9s → todas as janelas satisfeitas.
```

---

## §29 — Staged ZIP Input (Multimodal Attach Pattern)

### 29.1 Motivação

Antes do §29, anexar um ZIP disparava a análise imediatamente (`handleZipUpload` rodava no evento `change` do `<input type="file">`). O usuário não tinha chance de digitar a pergunta antes do fetch ser enviado.

Comportamento problemático:
```
[attach ZIP] → JSZip extrai → fetch /api/chat (question = '' ou texto atual do input) → resultado
```

Pergunta era capturada **no momento do attach** — não no momento do clique ENVIAR.

### 29.2 Fix — Staged Pattern (espelho de `_attachedImg`)

Inspirado no padrão já existente para imagens (`_attachedImg`), que estágia no attach e só processa no `sendMessage`.

**Estado novo:**
```javascript
var _pendingZip = null; /* { file: File, buffer: ArrayBuffer } */
```

**Novo fluxo:**
```
[attach ZIP] → _stageZip(file)
  → FileReader.readAsArrayBuffer (buffer lido agora — sem custo de reprocessar depois)
  → _pendingZip = { file, buffer }
  → fileNote: "📦 arquivo.zip — adicione sua pergunta e clique ENVIAR"
  → (nenhum fetch)

[usuário digita pergunta]

[clica ENVIAR] → sendMessage()
  → detecta _pendingZip ≠ null
  → captura text/mode/model DO MOMENTO DO CLIQUE
  → limpa _pendingZip
  → chama _processZipBuffer(file, buffer, question, mode, model)
  → JSZip.loadAsync(buffer) → extração → fetch /api/chat
```

### 29.3 Funções

| Função | Responsabilidade |
|--------|-----------------|
| `_stageZip(file)` | Lê ArrayBuffer via FileReader, armazena em `_pendingZip`, atualiza UI indicator |
| `_processZipBuffer(file, buffer, q, mode, model)` | JSZip + seleção de arquivos (§24v6) + fetch `/api/chat` — idêntico ao antigo `handleZipUpload` exceto: buffer pré-lido e question/mode/model passados como parâmetros |
| `sendMessage()` | Pop `_pendingZip` antes do early-return `if (!text && !_attachedImg) return` |
| `_dispatchFiles(fileList)` | Chama `_stageZip(z)` para ZIPs (antes: `handleZipUpload(z)`) |

### 29.4 Invariantes preservados

- §24v5: dual guard `budget >= TOTAL_BUDGET || fileNames.length >= MAX_FILES`
- §24v6: `FILE_LIMIT = 24000`, `TOTAL_BUDGET = 80000`, `MAX_FILES = 5`
- §27: echo guard (`provider === 'local'` → banner vermelho)
- §28: AbortController 55s no `_processZipBuffer`
- `_pendingZip = null` ao entrar em `sendMessage` — sem disparo duplo

### 29.5 Commit

```
1a3f9ed  feat(frontend): ZIP staged input redesign — attach stages, ENVIAR fires
```

Aplicado em `vision-core-clean-runtime.js` e `vision-core-bundle.js`.

### 29.6 Frase-síntese

```
ZIP segue o padrão de imagem: ArrayBuffer lido no attach, análise disparada só no ENVIAR.
Pergunta capturada no momento do clique — não no momento do attach.
handleZipUpload → _stageZip + _processZipBuffer (question como parâmetro).
```

---

## §30 — Colapso Silencioso de Providers de Tier Gratuito

### 30.1 Evidência

Sessão de 03/06/2026 — diagnóstico do ZIP technetgamev2 via Vision AI Command.

Provider chain configurada: Groq → Gemini → Cerebras → OpenRouter → local.

Falhas observadas:

| Provider | Modelo configurado | Erro | Duração do silêncio |
|---|---|---|---|
| Cerebras | `llama-3.3-70b` | 404 — modelo removido da API | Horas (mascarado pelo fallback) |
| OpenRouter | `qwen/qwen3-plus:free` | 400 — modelo morto | Horas (mascarado pelo fallback) |

O fallback `local` (provider echo) mascarou as falhas por horas: o sistema continuava respondendo com conteúdo genérico, dando aparência de funcionamento normal.

### 30.2 Root Cause

O backend não distingue entre:
- **config-error** — modelo inexistente, chave inválida, endpoint errado (HTTP 4xx estático)
- **quota-error** — limite de uso atingido (HTTP 429, temporário)

Ambos caem silenciosamente no `catch` e passam ao próximo provider. O provider `local` é o último fallback e sempre responde — ocultando que todos os provedores reais falharam.

### 30.3 Correção aplicada

```bash
# EB setenv — efeito imediato sem redeploy de código
eb setenv CEREBRAS_MODEL=gpt-oss-120b OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
```

```javascript
// server.js — defaults corrigidos no código (proteção se env não estiver setado)
const CB_MODEL = process.env.CEREBRAS_MODEL || 'gpt-oss-120b';           // era: llama-3.3-70b
const OR_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct'; // era: qwen/qwen3-plus:free
```

Commit: `0dea5c2 fix(backend): correct Cerebras + OpenRouter model names`

### 30.4 Backlog (não implementado)

- Logar o HTTP status por provider em cada chamada (não apenas silenciar no catch)
- Distinguir config-error de quota-error: 4xx estático → alerta permanente; 429 → retry com backoff
- Dashboard de saúde de providers em `/api/health` com último status HTTP por provider

### 30.5 Frase-síntese

```
Providers de tier gratuito morrem sem aviso (Cerebras llama-3.3-70b→404, OpenRouter qwen3-plus→400).
O fallback local mascarou por horas. Fix: eb setenv + defaults corrigidos no código.
Backlog: logar HTTP por provider, distinguir config-error de quota.
```

---

## §31 — Saga do Budget de Contexto ZIP (§24 v6→v9)

### 31.1 Motivação

Sessão de 03/06/2026 — upload de `technetgamev2-PRE-hexefix-CLEAN.zip` com pergunta sobre a capa ausente do Hexe. Diagnóstico correto era esperado no arquivo `games-2026-feature.js`. Diagnóstico saiu sobre `main.js`.

### 31.2 Linha do tempo

| Versão | Mudança | Resultado |
|---|---|---|
| §24v6 | `MAX_FILES=5`, `TOTAL_BUDGET=80K`, `LEAD_LIMIT=24K` | ZIP grande: `main.js` entrava antes do `games-2026` |
| §24v7 | Tier-sort: JS front antes de JS backend, tamanho DESC dentro do tier | `games-2026` subiu no ranking, mas ainda entrava no meio |
| §24v8 | `MAX_FILES=4`, `TOTAL_BUDGET=60K`, `LEAD_LIMIT=12K`, tail inteiro | Seleção correta: `games-2026` era o tail (inteiro=True) |
| §24v9 | `contents.slice().reverse()` antes do join | Prompt invertido: `games-2026` aparece primeiro — IA lê o arquivo certo |

### 31.3 Root Cause real

O problema nunca foi o tamanho do budget. Foi a **ordem de montagem do prompt**:

```
ANTES (§24v8):  main.js 12K → feeds 12K → hermes 12K → games-2026 23K
DEPOIS (§24v9): games-2026 23K → hermes 12K → feeds 12K → main.js 12K
```

O LLM lê o início do contexto primeiro. Com `main.js` em primeiro, diagnosticava `main.js`. Com `games-2026` em primeiro, diagnosticou `games-2026` corretamente (NEEDS_FIX, confidence 0.92, patch estruturado).

**Lição:** Menos contexto não é sempre a solução. O que importa é **qual arquivo e em que ordem** o LLM recebe.

### 31.4 Commits

```
3e2f7ca  fix(zip): §24v8 budget revision — MAX_FILES=4, LEAD_LIMIT=12K, tail inteiro
c29fcc5  fix(zip): §24v9 reverse prompt order — tail file first
```

### 31.5 Invariante adicionada

> O arquivo mais relevante para a pergunta deve ser o **primeiro** no prompt.
> A seleção por tier+tamanho garante que ele seja o tail. O `reverse()` garante que o tail vá para o início.

### 31.6 Frase-síntese

```
Saga §24 v6→v9: o problema nunca foi o tamanho, foi qual arquivo e em que ordem chega.
Seleção correta (tier+size DESC) + reverse() no join → arquivo alvo primeiro no prompt.
Menos contexto = mais acerto é consequência da ordem, não do corte.
```

---

## §32 — _attachedImg Leak no ZIP Branch

**Data:** 2026-06-03 | **Commit:** pré-7d4d570

### 32.1 Root Cause

`sendMessage()` — ZIP branch faz `return` em ~linha 4268 antes de `_attachedImg = null` (~linha 4288).
Quando usuário anexa ZIP + imagem e clica ENVIAR:
- `_pendingZip` é consumido e processado corretamente.
- `_attachedImg` **persiste** no estado.
- No próximo clique de ENVIAR (ou refresh do campo), imagem vaza e é enviada com `mode:fix`.
- Gate §25 não bloqueia (`hasImage=true` → bypassa hermesDecisionMatrix → IA analisa imagem em vez do ZIP).

### 32.2 Fix

Adicionar antes de `_processZipBuffer()` no ZIP branch:

```javascript
/* §32 — limpar imagem anexada para não vazar no próximo ENVIAR */
_attachedImg = null;
if (readPrintBtn) { readPrintBtn.textContent = '▧ Ler print/imagem'; }
```

Aplicado em `vision-core-clean-runtime.js` e `vision-core-bundle.js`.

### 32.3 Frase-síntese

```
ZIP branch early return = _attachedImg nunca limpa. Imagem vaza no ENVIAR seguinte.
Fix: null + reset antes de _processZipBuffer().
```

---

## §33 — hermesDecisionMatrix: instrução imperativa de formato JSON

**Data:** 2026-06-03 | **Commit:** 7d4d570 | **Deploy EB:** app-260603_124503027666 | **Deploy CF Pages:** 8647de77.visioncoreai.pages.dev

### 33.1 Problema

Cerebras `gpt-oss-120b` respondia em markdown livre (texto narrativo) sem bloco ` ```json `.
`parseHermesBlock()` busca fence ` ```json ` — não encontrava → painel azul não aparecia.

Instrução original (fraca):
```
Retorne PRIMEIRO um bloco ```json com o patch (quando decisão = NEEDS_FIX):
```

### 33.2 Fix

```javascript
// backend/server.js — hermesDecisionMatrix (~linha 1086)
`OBRIGATÓRIO: sua resposta DEVE começar com um bloco \`\`\`json (mesmo que depois venha texto explicativo).`,
`NÃO responda em texto livre antes do bloco json. Formato exigido:`,
```

Instrução imperativa (`OBRIGATÓRIO`, `NÃO`) força modelo a colocar o bloco JSON primeiro independente de estilo padrão de resposta.

### 33.3 Evidência de Produção (PASS GOLD)

Teste ponta-a-ponta em **8647de77.visioncoreai.pages.dev** com `technetgamev2-PRE-hexefix-CLEAN.zip`:

| Step | Resultado |
|------|-----------|
| Painel azul aparece? | ✅ Confirmado pelo usuário |
| Gate ① Diff colorido | ✅ linha `+"Assassin's Creed Codename Hexe": 'assets/img/game-hexe.png'` |
| Gate ② Botão ⬇ Baixar | ✅ `ok:true`, `patched_content` 416→417 linhas |
| Gate ③ Hexe em LOCAL_REAL_COVERS | ✅ `aegis_ok:true`, syntax JS válida |

Anchor real: `'Pokemon Pokopia': 'assets/img/game-pokopia.jpg'`
Patch: key `"Assassin's Creed Codename Hexe"` com double-quotes (necessário por apóstrofe no nome).

### 33.4 Nota sobre quote style

Strings com apóstrofe em JS requerem double-quotes: `"Assassin's Creed Codename Hexe"`.
O pattern já existe no arquivo: `"Marvel's Wolverine": 'assets/img/game-wolverine.png'`.
Hermes (LLM) deve seguir este padrão; caso contrário Aegis (`node --check`) rejeita o patch.

### 33.5 Frase-síntese

```
Instrução fraca "Retorne PRIMEIRO" = estilo do modelo prevalece.
Instrução imperativa "OBRIGATÓRIO / NÃO" força bloco JSON antes do texto.
parseHermesBlock() detecta → painel azul → apply-patch → aegis OK → download.
```

---

## §34 — ensureHermesJson: re-prompt fallback quando mode=fix retorna texto livre

**Data:** 2026-06-03 | **Commit:** 65c151b | **Deploy EB:** app-260603_165230559588

### 34.1 Problema

`parseHermesBlock()` detecta apenas ` ```json ` fenced blocks.
Cerebras `gpt-oss-120b` (e ocasionalmente outros modelos) responde ao hermesDecisionMatrix
em markdown livre — diagnóstico correto em conteúdo, mas sem bloco JSON → painel azul não aparece.

§33 (`OBRIGATÓRIO / NÃO`) reduziu frequência mas não elimina: modelos com fine-tuning forte de estilo
ou sob carga podem ignorar instrução de formato.

### 34.2 Solução: helper ensureHermesJson

```javascript
async function ensureHermesJson(answer, callFn) {
  if (mode !== 'fix') return answer;
  if (!answer || answer.includes('```json')) return answer;
  const extractPrompt =
    'Baseado neste diagnóstico, retorne APENAS o bloco ```json estruturado. ' +
    'Sem texto antes ou depois. Campos obrigatórios: decisao, file, fix_type, patch, confidence, diagnosis.\n\n' +
    answer.slice(0, 3000);
  try {
    const extracted = await callFn(extractPrompt);
    if (extracted && extracted.includes('```json')) return extracted;
  } catch (_) {}
  return answer; // fallback: resposta original intacta
}
```

**Localização:** `backend/server.js` ~linha 1160 (antes dos providers).

### 34.3 Aplicação por provider

| Provider | callFn endpoint | temp | max_tokens | timeout |
|---|---|---|---|---|
| Groq | `api.groq.com/openai/v1/chat/completions` | 0 | 800 | 15s |
| Gemini | `generativelanguage.googleapis.com/...generateContent` | — | — | 20s |
| Cerebras | `api.cerebras.ai/v1/chat/completions` | 0 | 800 | 15s |
| OpenRouter | `openrouter.ai/api/v1/chat/completions` | 0 | 800 | 20s |

**Nota Gemini:** API Gemini não aceita campo `temperature` direto no top-level — omitido.
2ª chamada usa `contents` sem `system_instruction` (só o extractPrompt como user message).

### 34.4 Lógica de disparo

```
mode !== 'fix'        → skip (retorna answer original — sem overhead em chamadas normais)
answer inclui ```json → skip (provider obedeceu — caminho feliz, zero overhead)
answer SEM ```json    → 2ª chamada com extractPrompt (só o diagnóstico, sem contexto original)
  2ª chamada OK       → retorna nova resposta (deve conter ```json)
  2ª chamada falha    → retorna answer original (fallback gracioso, texto livre no chat)
```

### 34.5 Evidência de Produção

Smoke test com file context real (`config/api.js`), mode=fix:
```
provider: groq | model: llama-3.3-70b-versatile
has ```json block: True (Groq obedeceu §33 — helper não acionado)
decisao: NEEDS_FIX | confidence: 0.9
patch.search: "return API_URL;" → patch.replace: "return process.env.NODE_ENV === 'production' ? PROD_URL : API_URL;"
```

Groq obedeceu §33 diretamente. Helper entra em ação quando Cerebras/outro modelo não obedece.

### 34.6 Impacto em latência

- Caminho feliz (```json presente): **zero overhead**
- Fallback acionado (texto livre): **+1-2s** (Cerebras ~1s, Groq ~0.5s, Gemini ~3s)
- mode !== 'fix': **zero overhead** (check sai imediatamente)

### 34.7 Frase-síntese

```
§33 instrução forte reduz, não elimina. §34 é a rede de segurança:
LLM extrai JSON do próprio diagnóstico → tarefa trivial, temperatura 0, resposta rápida.
Frontend não muda — parseHermesBlock recebe JSON bem-formado em ambos os casos.
```

---

## §35 — Asset List Injection + User Message in ZIP Branch

**Commit:** `feat(§35): ZIP asset list injection + user message display + REGRA DE ASSETS`
**Data:** 2026-06-03

### Problema

Hermes sugeria paths de imagem inventados (ex: `assets/img/game-hexe.png`) porque:
1. `_processZipBuffer` não exibia a mensagem do usuário no chat (ZIP branch).
2. Assets binários (.png, .svg, .jpg, etc.) eram filtrados por `TEXT_EXTS` antes de chegar ao LLM → invisíveis.
3. `hermesDecisionMatrix` não tinha instrução explícita sobre uso de assets reais.

### Solução

**FIX 1 — Mensagem do usuário no ZIP branch** (`sendMessage`, antes de `_processZipBuffer`):
```javascript
if (text) {
  var _zipDisplay = text.slice(0, 300) + (text.length > 300 ? '…' : '');
  appendMsg('📦 ' + _pz.file.name + ' — ' + _zipDisplay, 'user');
}
```

**FIX 2 — Coleta de asset paths** (`zip.forEach`, antes do filtro `TEXT_EXTS`):
```javascript
var ASSET_EXTS = ['.png','.jpg','.jpeg','.gif','.svg','.webp','.ico','.mp4','.mp3','.woff','.woff2','.ttf','.pdf'];
var assetPaths = [];
// Coleta antes do filtro TEXT_EXTS:
if (ASSET_EXTS.indexOf(ext) !== -1) {
  assetPaths.push(/* relPath sem root prefix */);
}
// Injeta no contexto:
var assetContext = assetPaths.length > 0
  ? '\n\n[ASSETS DISPONÍVEIS NO PROJETO — use estes caminhos ao sugerir patches]\n'
    + assetPaths.sort().map(a => '  ' + a).join('\n')
  : '';
var context = question + assetContext + '\n\n' + contents.slice().reverse().join('\n\n---\n\n');
```

**FIX 3 — REGRA DE ASSETS no `hermesDecisionMatrix`** (backend):
```
REGRA DE ASSETS: quando o patch envolver caminho de arquivo (imagem, SVG, font):
  1. Verifique [ASSETS DISPONÍVEIS NO PROJETO] no contexto.
  2. Use SEMPRE um path da lista — NUNCA invente nomes de arquivo.
  3. Se lista ausente ou incompleta, use path mais próximo e explique em "diagnosis".
```

### Evidência

- ZIP de diagnóstico (`technetgamev2-PRE-hexefix-CLEAN.zip`) não tem imagens → `assetPaths = []`.
- ZIP de projeto completo terá assets; FIX 2 os expõe ao LLM.
- REGRA DE ASSETS preservada em §37 (`hermesDecisionMatrix` reformulado).

---

## §36 — Vision Core Standard Method (9-Stage Pipeline Panel)

**Commit:** `feat(§36): Standard Method panel — _activeMission + renderStandardMethodPanel`
**Data:** 2026-06-03

### Motivação

`EXECUTAR MISSÃO` anterior: `tryAgent(7070-7072)` → timeout → `/api/run-live` sem contexto.
Sem rastreamento de estado, sem confirmação humana, sem relatório de falha.

### Implementação

**Estado `_activeMission`:**
```javascript
var _activeMission = null;
/* { id, hermesObj, input, stage, evidence[], zipB64, startedAt } */
```

**Preenchido em 2 lugares:**
- ZIP flow (após `parseHermesBlock`): `_activeMission = { ..., zipB64: _lastZipB64, ... }`
- Chat flow (após `parseHermesBlock`): `_activeMission = { ..., input: text, ... }`

**`renderStandardMethodPanel(mission)`:** Painel azul com 9 etapas SDDF.
- Botão CONFIRMAR EXECUÇÃO → `confirmBtn.onclick` — verifica `h.patch + h.file + _lastZipB64`
- Chama `POST /api/chat/apply-patch` com `{ zip_base64, file_path, fix_type, patch, diagnosis }`
- Exibe `diff_preview`, `aegis_ok`, linha de resultado
- Botão 📥 BAIXAR ARQUIVO CORRIGIDO → Blob download

**Bugs corrigidos (commit follow-up):**
- BUG1: `h` sem `patch/file` (BLOCKED_INPUT) → mensagem de erro + cleanup, sem crash silencioso
- BUG2: `_lastZipB64 === null` → aviso no painel "ZIP não está em memória — reenvie"
- BUG3: `.catch()` → relatório estruturado com `❌ Erro: err.message` (não só texto inline)

**clearBtn:** `_activeMission = null; _lastZipB64 = null;`

### Regra

> O Confirm Gate (§8) é obrigatório. Nenhum patch é aplicado sem clique humano em CONFIRMAR.

---

## §37 — Padrão de Comportamento Multiagente + Hermes RCA + Hybrid systemPrompt

**Commit:** `feat(§37): multiagente basePrompt + Hermes RCA + hybrid systemPrompt`
**Data:** 2026-06-03
**Arquivo:** `backend/server.js`

### Mudanças

**1. `basePrompt` reformulado como sistema multiagente (SDDF V8.4):**
- 11 etapas do pipeline SDDF (§1 Intake → §11 Report)
- 10 agentes com papéis definidos (Hermes, Aegis, Scanner, Patch Eng., Confirm, Apply Eng., Rollback, Reporter, Vision, Intake)
- 7 regras absolutas do sistema (R1–R7)
- 4 métodos de acesso ao projeto (mantidos)
- Estilo §23 preservado

**2. `hermesDecisionMatrix` reformulado como Hermes RCA:**
- Etapas explícitas: §4 RCA, §6 CONFIRM, §7 EVIDENCE, §8 DECIDE, §9 PATCH
- Decision matrix com 4 decisões (NEEDS_FIX / BLOCKED_INPUT / ABORTED / READY)
- REGRA DE ASSETS (R6) preservada de §35
- NOTA SOBRE ASPAS: `"Assassin's Creed"` com double-quotes
- REGRA DE QUALIDADE: `confidence < 0.7 → BLOCKED_INPUT`
- Instrução `OBRIGATÓRIO` (§33) preservada

**3. Hybrid `systemPrompt` (3 caminhos):**
```javascript
const hasFileCtxForPrompt = /\[Arquivo: /.test(message) ||
                             /\[CONTEÚDO DE /.test(message) ||
                             /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt|mjs|cjs|jsx|tsx)\]/.test(message);

// visionAddendum:
//   hybrid (hasImage + hasFileCtxForPrompt + mode=fix): vision layer + hermesDecisionMatrix
//   image-only: "VOCÊ ESTÁ RECEBENDO UMA IMAGEM..."

// systemPrompt (3-way):
//   hasImage=T → basePrompt + visionAddendum (hybrid ou image-only)
//   hasImage=F → basePrompt + fixModeInstructions (code-only)
```

### Rotas validadas

| hasImage | hasFileCtxForPrompt | mode | Rota |
|---|---|---|---|
| false | true | fix | CODE-ONLY (Hermes RCA) |
| true | false | fix | IMAGE-ONLY (visual description) |
| true | true | fix | HYBRID (vision + Hermes RCA) |
| false | false | chat | CODE-ONLY (sem hermesDecisionMatrix) |

### Validate-syntax

```
node --check backend/server.js → EXIT:0 (PASS)
```

---

## §43 — Robustez ZIP: Seleção Inteligente ZIP Grande + Timeout Adaptativo Gemini

**Commit:** `feat(§43): seleção inteligente ZIP grande + timeout adaptativo`
**Data:** 2026-06-05
**Arquivos:** `frontend/assets/vision-core-clean-runtime.js`, `frontend/assets/vision-core-bundle.js`, `backend/server.js`

### Frontend — `_processZipBuffer` seleção por keyword

Após `Promise.all(promises)` resolve, calcular payload total:

```
totalChars = sum(contents[i].length)
```

Se `totalChars > 35000`:
1. Extrair keywords da pergunta (palavras > 3 chars, lowercase)
2. Pontuar cada arquivo:
   - +10 por keyword presente no `relPath`
   - +1 por keyword presente no conteúdo
3. Ordenar por score DESC
4. Acumular arquivos até `budget = 35000 chars`
5. Fallback: se nenhum arquivo cabe, pegar o primeiro (mais relevante)
6. Mostrar hint amarelo no chat: `📦 ZIP grande — analisando N de Y arquivos relevantes`

### Backend — `server.js` timeout adaptativo Gemini

```javascript
const geminiTimeout = message.length > 45000 ? 90000 : 45000;
// AbortSignal.timeout(geminiTimeout)
```

| Payload | Timeout Gemini |
|---------|---------------|
| ≤ 45K chars | 45s (padrão §26) |
| > 45K chars | 90s (ZIP grande) |

---

## §40 — Formato Completo de Resposta Multiagente

**Commit:** `feat(§40): formato completo multiagente + BLOCKED_RUNTIME + GO CORE + OPENCLAW`
**Data:** 2026-06-04
**Arquivo:** `backend/server.js`

### Pipeline completo de agentes no chat (ordem obrigatória)

```
MISSÃO RECEBIDA → HERMES → SCANNER → OPENCLAW → PATCHENGINE → GO CORE → AEGIS → DECISÃO
```

| Agente | Ícone | Cor | Conteúdo |
|--------|-------|-----|----------|
| MISSÃO RECEBIDA | 📋 | #60a5fa | Tipo / Risco / Escopo |
| HERMES | 🔮 | #a78bfa | Status do contexto / Regras aplicadas |
| SCANNER | 🔍 | #34d399 | O que foi encontrado |
| OPENCLAW | 🦾 | #f59e0b | Plano criado com N tarefas |
| PATCHENGINE | ⚙️ | #06b6d4 | Patch preparado ou bloqueado |
| GO CORE | ✅ | #4ade80 | Evidence receipt: presente/ausente · Runtime probe: OK/pendente |
| AEGIS | 🛡 | #f87171 | Validação: sem deploy, sem tag, sem stable |
| DECISÃO | ⚖️ | #e2e8f0 | Decisão final + próximo passo |

### Decisões possíveis (hermesDecisionMatrix)

| Decisão | Condição |
|---------|----------|
| `NEEDS_FIX` | Erro corrigível com evidência real → produza patch |
| `BLOCKED_INPUT` | Contexto insuficiente / arquivo protegido / confidence < 0.7 |
| `BLOCKED_RUNTIME` | Go Core sem evidence receipt — evidência de runtime ausente |
| `ABORTED` | Arquivo proibido (.env, secrets, CI/CD workflows) |
| `READY` | Sem alterações necessárias E sem diff no texto |

### Regra de resposta

> O chat sempre mostra: **O QUE** foi pedido · **QUEM** está responsável · **QUAL** evidência existe · **O QUE** está bloqueado · **QUAL** regra impede · **QUAL** próximo passo seguro.

### Mudanças em server.js

**1. `basePrompt` FORMATO DE RESPOSTA — adicionado OPENCLAW e GO CORE:**
```
OPENCLAW
- [plano criado com N tarefas]

GO CORE
- [Evidence receipt: presente | ausente]
- [Runtime probe: OK | pendente]
```
Inserido entre PATCHENGINE e AEGIS. DECISÃO atualizado para incluir `BLOCKED_RUNTIME`.

**2. `hermesDecisionMatrix` DECISION MATRIX — adicionado BLOCKED_RUNTIME:**
```
BLOCKED_RUNTIME → evidência de runtime ausente (Go Core sem evidence receipt)
```

### Frontend (sem mudança)

`agentIcons` e `agentColors` já continham GO CORE e OPENCLAW em ambos os arquivos:
```javascript
'GO CORE':  { icon: '✅', color: '#4ade80' }
'OPENCLAW': { icon: '🦾', color: '#f59e0b' }
```

### Validate-syntax

```
node scripts/validate-syntax.js → PASS: 8 JavaScript files
```

---

## §38 — UX Pós-Diagnóstico: Hint + Animações

**Commits:** `feat: §38 hint pós-diagnóstico + animações UX` · `fix(§38): hint ZIP flow — hasDiff fallback + setTimeout 300ms`
**Data:** 2026-06-04
**Arquivos:** `frontend/assets/vision-core-clean-runtime.js` · `vision-core-bundle.js`

### Mudanças

**1. Hint 🛡 "Clique EXECUTAR MISSÃO" pós-diagnóstico:**
- Aparece após qualquer resposta com `hermesObj` (```json presente) OU `hasDiff` (```diff / ```javascript presente)
- `hasReady` guard: não aparece quando resposta é `DECISÃO: READY` sem diff
- `setTimeout(300ms)` para renderizar após o corpo da resposta
- Injetado no ZIP flow (`_processZipBuffer`) e no chat flow normal

**2. CSS keyframes injetados dinamicamente (`id='vc-anim-styles'`):**
```css
@keyframes vcPulse  { 0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(139,92,246,.4); }
                      50%     { opacity:.85; box-shadow:0 0 0 6px rgba(139,92,246,0); } }
@keyframes vcSpin   { to { transform: rotate(360deg); } }
@keyframes vcProgress { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
```

**3. Condição final do hint (§38fix):**
```javascript
var hasDiff  = answer.indexOf('```diff') !== -1 || answer.indexOf('```javascript') !== -1;
var hasReady = answer.indexOf('DECISÃO') !== -1 && answer.indexOf('READY') !== -1;
if ((hermesObj || hasDiff) && !(hasReady && !hasDiff)) { /* render hint */ }
```

---

## §39 — Fluxo Multiagente Visível no Chat

**Commits:** `feat(§39): renderAgentReport + SVG spinner + progress bar + fade-in + showMissionProgress`
**Data:** 2026-06-04
**Arquivos:** `frontend/assets/vision-core-clean-runtime.js` · `vision-core-bundle.js`

### Mudanças

**1. `buildSpinner(size)` — SVG 12 segmentos:**
```javascript
// 12 linhas radiais, cores de #ffffff → #334155 (gradiente escuro)
// Animação: vcSpin .8s steps(12, end) infinite
// Usado em: thinking indicator do ZIP flow
```

**2. `showMissionProgress(thinkingEl)` — 10 passos 0–12.5s:**
| Delay | Texto | Agente |
|-------|-------|--------|
| 0ms | 📋 Mission Input — missão recebida | intake |
| 1200ms | 🔍 Scanner — lendo estrutura | scanner |
| 2800ms | 🔍 Scanner — arquivos identificados | scanner |
| 4200ms | 🔮 Hermes — analisando causa-raiz | hermes |
| 5800ms | 🔮 Hermes — RCA em progresso | hermes |
| 7200ms | 🦾 OpenClaw — montando plano | openclaw |
| 8500ms | ⚙️ PatchEngine — preparando patch | patchengine |
| 10000ms | 🛡 Aegis — verificando escopo | aegis |
| 11200ms | ✅ Go Core — aguardando evidência | gocore |
| 12500ms | ⏳ Finalizando diagnóstico | passgold |

Retorna array de timers — limpos com `clearTimeout` quando resposta chega.

**3. `showProgressBar` / `hideProgressBar` — sticky 3px gradient:**
```javascript
// Barra sticky no topo do chatStream
// background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)
// background-size: 200% 100%; animation: vcProgress 2s linear infinite
```

**4. `parseAgentReport(text)` — parser de blocos de agente:**
- Detecta: `MISSÃO RECEBIDA`, `HERMES`, `SCANNER`, `OPENCLAW`, `PATCHENGINE`, `AEGIS`, `GO CORE`, `DECISÃO`
- Retorna objeto `{ AGENT: conteúdo }` ou `null`

**5. `renderAgentReport(report, container)` — painel visual:**
- Um bloco por agente, com ícone + cor + conteúdo
- Injetado após `appendMsg` da resposta ZIP

**6. `appendMsg` fade-in:**
```javascript
// cls !== 'thinking': opacity 0→1, translateY 8px→0, transition .25s ease
```

**7. Spinner no ZIP thinking indicator:**
```javascript
thinking.appendChild(buildSpinner(18));
var _zipThinkSpan = document.createElement('span');
_zipThinkSpan.className = 'vc-thinking-text';
```

### Validate-syntax

```
node --check frontend/assets/vision-core-clean-runtime.js → EXIT:0
node --check frontend/assets/vision-core-bundle.js         → EXIT:0
```

---

## §GOV — Regras de Governança do Vision Core

Ancoradas na evidência das sessões de 01–03/06/2026. Vinculantes para toda execução futura.

---

### Regra Absoluta — PASS GOLD como portão único de promoção

> **Sem PASS GOLD validado, nenhuma mudança é promovida para produção.**

- PASS GOLD exige evidência de nível `real` (não `simulated`, não `dry-run`, não `sandbox`)
- `validate-syntax.js` PASS + smoke test com resposta esperada é o mínimo para o gate abrir
- Commits no `main` sem PASS GOLD são permitidos — deploy sem PASS GOLD não é

---

### Regra nº1 — Escopo Mínimo

> **Resolva apenas o problema apontado. Não expanda.**

Evidência que motivou a regra: correções de provider model (§30) começaram como "só o Cerebras" e ameaçaram expandir para refatoração de toda a cadeia de fallback. O escopo foi contido: 2 linhas no `server.js` + `eb setenv`. Funcionou.

Aplicação prática:
- Se a missão é "corrigir o modelo do Cerebras", não refatorar o fallback chain inteiro
- Se a missão é "inverter a ordem do prompt", não alterar o budget ou o tier-sort
- Cada commit toca o mínimo de arquivos que resolve o problema apontado

---

### Regra nº2 — Contexto Mínimo Suficiente

> **Usar o menor contexto que resolve. Mais contexto não é mais acerto.**

Evidência que motivou a regra: §31 mostrou que aumentar o budget (§24v6: 80K) não ajudou. O que ajudou foi ordenar corretamente 60K. O arquivo errado em primeiro posição gerava diagnóstico errado — independente do tamanho total.

Aplicação prática:
- Não adicionar arquivos ao contexto do LLM "por precaução"
- O arquivo mais relevante para a pergunta deve ser o primeiro no prompt (§24v9)
- `MAX_FILES=4`, `TOTAL_BUDGET=60K` é o equilíbrio validado — não alterar sem evidência de regressão

---

### Regra nº3 — Execução em Sandbox

> **Toda mudança é isolada, validada e reversível antes de ser promovida.**

Evidência que motivou a regra: o endpoint `POST /api/chat/apply-patch` (commit `fe7de77`) foi implementado, validado com `validate-syntax.js` (PASS 8 files) e smoke-tested com payload inválido antes do deploy. O deploy é separado da implementação.

Protocolo obrigatório:
1. Implementar em branch ou commit local
2. `node scripts/validate-syntax.js` — deve retornar PASS
3. Smoke test do endpoint com payload que deve retornar erro conhecido
4. Só então: `eb deploy` + `wrangler pages deploy`
5. Smoke test pós-deploy confirma comportamento em produção

---

### Tabela-resumo

| Regra | Enunciado | Evidência |
|---|---|---|
| Absoluta | Sem PASS GOLD, nada promove | SDDF §4, todas as sessões |
| nº1 — Escopo mínimo | Resolve só o apontado, não expanda | §30: 2 linhas resolveram o provider |
| nº2 — Contexto mínimo suficiente | Menor contexto que resolve; ordem importa mais que volume | §31: reverse() resolveu o que 80K não resolveu |
| nº3 — Execução em sandbox | Isolado, validado, reversível antes de promover | fe7de77: validate → smoke → deploy separados |

### Frase-síntese

```
Regra Absoluta: sem PASS GOLD nada promove.
Regra 1: escopo mínimo — resolve só o apontado.
Regra 2: contexto mínimo suficiente — ordem importa mais que volume (§31).
Regra 3: sandbox obrigatório — validar antes de promover (§30, fe7de77).
```

---

## §REAL-VALIDATION-1-PREP — Portão Estático de Validação V3.0.0

**Data:** 2026-06-04
**Status:** SPEC REGISTRADA — docs a gerar em `TEMP\vision-core-phase-missions\`

### Objetivo

Certificar o estado atual de Vision Core V3.0.0 com 4 documentos estáticos antes de qualquer promoção de milestone. Nenhuma feature nova é iniciada sem este portão fechado.

### Os 4 Documentos

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 1 | `VALIDATION-1-EVIDENCE.md` | Evidência coletada — commits, test results, PASS GOLD receipts |
| 2 | `VALIDATION-1-PIPELINE.md` | Estado do pipeline — providers, endpoints, latências, health |
| 3 | `VALIDATION-1-INTEGRATION.md` | Testes de integração — ZIP flow, apply-patch, Hexe end-to-end |
| 4 | `VALIDATION-1-GATE.md` | Gate decisão — PASS / FAIL com assinatura de sessão |

### Critérios de PASS por documento

**Doc 1 — EVIDENCE:**
- [ ] Commits desta sessão (d3d22ab → a2e37da) listados com hash e descrição
- [ ] PASS GOLD apply-patch confirmado (`aegis_ok=true`, `Hexe present=true`)
- [ ] Root cause §34 documentado (`_zipMode` fix)

**Doc 2 — PIPELINE:**
- [ ] Provider chain: Groq (skip>24K) → Gemini (45s) → Cerebras (gpt-oss-120b) → OpenRouter (meta-llama)
- [ ] Endpoints ativos: `/api/chat`, `/api/chat/apply-patch`, `/api/unzip-context`
- [ ] Latências medidas: Gemini ~12s (60K payload), apply-patch ~1.4s

**Doc 3 — INTEGRATION:**
- [ ] ZIP extract: 4 files, budget 59726/60K ✓
- [ ] Groq §26 skip confirmado (>24K) ✓
- [ ] `decisao=NEEDS_FIX`, `confidence=1.0`, `file` correto ✓
- [ ] apply-patch: `aegis_ok=true`, `Hexe` em `patched_content` ✓
- [ ] `_zipMode='fix'` forçado — `hermesDecisionMatrix` sempre injetado ✓

**Doc 4 — GATE:**
- [ ] Todos os 3 docs anteriores PASS
- [ ] `validate-syntax`: `node --check` nos 3 arquivos principais EXIT:0
- [ ] Nenhum teste falhando
- [ ] Decisão: PASS → milestone V3.0.0 certificado

### Protocolo de geração

```
1. Executar validate-syntax nos 3 arquivos principais
2. Gerar Doc 1 com evidência desta sessão
3. Gerar Doc 2 com estado atual de infra
4. Gerar Doc 3 com resultados dos testes automatizados
5. Gerar Doc 4 com decisão final de gate
6. Commit: docs(validation): REAL-VALIDATION-1-PREP — 4 static gate docs
```

### Localização

```
TEMP\vision-core-phase-missions\
  VALIDATION-1-EVIDENCE.md
  VALIDATION-1-PIPELINE.md
  VALIDATION-1-INTEGRATION.md
  VALIDATION-1-GATE.md
```

> **REGRA ABSOLUTA:** `VALIDATION-1-GATE.md` com decisão PASS é pré-requisito para qualquer novo milestone de feature. Sem portão fechado, sem avanço.

---

## §REAL-VALIDATION-2-PREP — Gate Visual com Evidência Humana

**Data:** 2026-06-04
**Status:** CHECKLIST GERADO — aguardando execução humana
**Arquivo:** `TEMP\vision-core-phase-missions\VALIDATION-2-MANUAL-CHECKLIST.md`

### Build deployado

| Item | Valor |
|------|-------|
| CF Pages URL | https://dd563741.visioncoreai.pages.dev |
| Commit | `625a19a` (§38+§39+§REAL-VALIDATION-1-PREP) |
| EB | `app-260604_092055680182` |
| `_zipMode='fix'` no bundle deployed | ✅ verificado |
| EB smoke test | provider=groq, ```json+decisao ✅ |

### 3 Testes do checklist

| # | Teste | Critério |
|---|-------|----------|
| 1 | ZIP Flow + Diagnóstico | NEEDS_FIX, diff com Hexe, hint 🛡, painel de agentes |
| 2 | EXECUTAR MISSÃO + Apply | Standard Method panel, aegis_ok=true, botão download |
| 3 | Arquivo baixado | Hexe em LOCAL_REAL_COVERS, JS válido, Crimson Desert preservado |

### Critério de PASS

Usuário executa os 3 testes na UI e confirma todos os checkboxes.  
**Sem PASS humano, nenhum novo milestone é iniciado.**

> **REGRA ABSOLUTA:** `VALIDATION-2-MANUAL-CHECKLIST.md` com todos os checkboxes marcados PASS = pré-requisito para V3.0.0 milestone final e início de qualquer nova feature V3.1+.

