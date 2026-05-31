# SPEC — Software Factory Orchestration com Hermes
## Vision Core V2.9.10

> Arquivo canônico: `docs/SOFTWARE_FACTORY_SPEC.md`
> Referenciado por: `SDDF_SPEC.md` seção 16

---

## 1. Objetivo

A Software Factory é o harness de orquestração do Vision Core. Ela transforma uma solicitação em fases pequenas, auditáveis, testáveis e governadas.

Hermes atua como o supervisor lógico do fluxo: analisa resultados, identifica causa raiz, decide se a fase pode avançar, recomenda correção ou bloqueia a continuidade.

**Regra absoluta:**
SEM PASS GOLD REAL → não promove, não libera, não marca stable.

---

## 2. Arquitetura central

```
Mission Input
  → Software Factory Orchestrator
  → TodoWrite / Phase Plan
  → Execution Loop
  → Tool Results
  → Hermes RCA / Decision
  → Firewall
  → Verification
  → Evidence
  → PR / Merge Gate
  → Checkpoint
```

---

## 3. Papel da Software Factory

A Factory é responsável por:

- montar o plano da fase (TodoWrite)
- definir escopo permitido (Scope)
- criar branch
- criar/editar arquivos dentro do escopo
- rodar validações (node --check, testes)
- executar scans de segurança (Firewall)
- produzir evidência (Evidence)
- criar PR e aguardar merge gate
- executar checkpoint final

Opera por SDDF: **Scope → Design → Development → Firewall → Verification → Evidence → Handoff**

---

## 4. Papel de Hermes

Hermes é o supervisor de decisão. Decide:

- se o erro é de código, teste, escopo ou premissa
- se o resultado de ferramenta é confiável
- se o scan é comentário, fixture negativa ou risco real
- se a fase está `READY`, `BLOCKED`, `NEEDS_FIX` ou `ABORTED`
- se a próxima ação é patch, retry, rollback, bloqueio ou merge

**Atua em:** RCA · Decision Matrix · Patch Recommendation · Evidence Review · PASS GOLD Gate · Release Blocker Analysis

---

## 5. Camadas de orquestração

### TodoWrite — memória do plano

```
pending → in_progress → completed | blocked
```

- Nunca avançar sem atualizar o plano
- Nunca marcar `completed` sem evidência confirmada

### Subagent — investigação profunda

Uso: análise de causa raiz, leitura extensa, comparação de alternativas, auditoria de risco.

Hermes consome o resultado, mas a decisão final é sempre de Hermes.

### Fork — paralelismo seguro

Uso: validar múltiplos arquivos independentes, gerar módulos semelhantes, rodar checks paralelos.

**Fork não pode:**
- alterar regra central
- liberar produção
- criar release/tag
- marcar stable
- claimar PASS GOLD REAL

---

## 6. Loop principal

```
Passo 0 — Recebe missão com PhaseId e escopo declarado
Passo 1 — Planeja via TodoWrite (tarefas discretas + dependências)
Passo 2 — Escolhe ferramenta correta para a tarefa
Passo 3 — Executa dentro do escopo permitido
Passo 4 — Lê tool results
Passo 5 — Hermes: RCA + Decision
Passo 6 — Atualiza TodoWrite (marca completed ou blocked)
Passo 7 — Repete ou entrega
```

---

## 7. System Prompt em camadas

```
Zona Estática         → regras permanentes (SDDF, PASS GOLD, REGRA ABSOLUTA)
─────────────────── SYSTEM_PROMPT_DYNAMIC_BOUNDARY ───────────────────
Zona Dinâmica         → estado atual (repo, branch, fase, logs, tool results)
```

Hermes usa a zona dinâmica para tomar decisão contextual sem contaminar as regras permanentes.

---

## 8. Estados decididos por Hermes

| Estado | Descrição |
|--------|-----------|
| `READY` | Fase válida e pronta para PR ou merge |
| `MERGED` | Fase integrada na main com checkpoint limpo |
| `BLOCKED_INPUT` | Input inválido, incompleto ou inseguro |
| `BLOCKED_DEPENDENCY` | Fase anterior ou evidência necessária ausente |
| `NEEDS_FIX` | Erro corrigível encontrado — patch e retry |
| `ABORTED` | Risco alto, escopo quebrado ou ação sem autorização |

---

## 9. Hermes RCA

Quando há falha, Hermes produz estrutura completa:

```
Sintoma         → o que foi observado
Causa provável  → hipótese inicial
Causa raiz      → origem confirmada
Impacto         → o que afeta
Correção mínima → menor change que resolve
Arquivos        → quais arquivos são afetados
Risco           → risco da correção
Decisão         → NEEDS_FIX | BLOCKED_INPUT | ABORTED
```

---

## 10. Hermes Decision Matrix

| Condição | Decisão |
|----------|---------|
| Teste falhou | `NEEDS_FIX` |
| Syntax falhou | `NEEDS_FIX` |
| Escopo excedido | `BLOCKED_INPUT` |
| Arquivo proibido alterado | `BLOCKED_INPUT` |
| Scan detectou executável perigoso | `ABORTED` |
| Comentário defensivo no scan | Permitir |
| Fixture negativa em teste | Permitir |
| Hash não-determinístico (`Date.now`) | `NEEDS_FIX` |
| PASS GOLD REAL sem prova real | `ABORTED` |
| Deploy/release/tag/stable sem autorização | `ABORTED` |
| Produção tocada sem autorização | `ABORTED` |
| Tudo limpo | `READY` |

---

## 11. Formato padrão de fase

- **1 branch · 1 PR · máx 2 arquivos** (salvo exceção explícita documentada)
- evidence_hash determinístico (SHA-256, sem timestamps)
- testes Node puro (sem dependências externas)
- forbidden scan obrigatório antes de PR
- `render()` com REGRA ABSOLUTA
- checkpoint final após merge

**Exports obrigatórios por módulo:**

```js
export const STATUSES = [...];
export function build(input = {}) { ... }
export function validate(result) { ... }
export function render(result) { ... }
export default { STATUSES, build, validate, render };
```

---

## 12. Evidence Hash

**Permitido:**
- `crypto` SHA-256 (Node built-in)
- `hash_schema` fixo e documentado
- input normalizado antes do hash
- flags de governança estáticas

**Proibido:**
- `Date.now()` · `new Date()` · timestamps variáveis
- `Math.random()` · UUIDs aleatórios
- ordem instável de campos

Hermes bloqueia (`NEEDS_FIX`) qualquer fase com hash instável ou não-determinístico.

---

## 13. Firewall — scan obrigatório

Bloquear qualquer ocorrência executável de:

```
Date.now · fetch( · XMLHttpRequest · child_process · exec( · spawn(
deploy_allowed: true · release_allowed: true · tag_allowed: true
stable_promotion_allowed: true · production_touched: true
pass_gold_real_claimed: true · pass_gold_real_achieved: true
secrets_read: true · secrets_printed: true
```

**Classificação Hermes:**

| Tipo | Ação |
|------|------|
| `COMMENT` | Permitir — string dentro de comentário |
| `NEGATIVE_TEST_FIXTURE` | Permitir — teste que valida ausência do flag |
| `EXECUTABLE` | Bloquear — código que executa a ação proibida |
| `UNKNOWN` | Auditoria manual antes de avançar |

---

## 14. Política de produção

```
READY ≠ PASS GOLD REAL
READY ≠ deploy permitido
READY ≠ release permitido
READY ≠ stable permitido
```

Produção só avança com:
1. prova real de execução
2. evidência sanitizada e auditável
3. autorização humana explícita
4. plano de rollback definido
5. PASS GOLD REAL validado
6. gate final aprovado

Até lá, todos os flags permanece `false`.

---

## 15. Checkpoint obrigatório

```powershell
git checkout main && git pull origin main
git status && git log -12 --oneline
gh pr list --state open --limit 20
```

Hermes valida:
- main atualizada
- `origin/main` sincronizado
- working tree clean
- último commit esperado
- somente PRs conhecidas abertas

---

## 16. Modelo operacional completo

```
1.  Receber PhaseId + escopo declarado
2.  Confirmar main limpa (checkpoint)
3.  Montar TodoWrite com tarefas discretas
4.  Definir Scope (arquivos permitidos)
5.  Criar Design (estrutura do módulo)
6.  Executar Development (criar/editar arquivos)
7.  Rodar Verification (syntax + testes)
8.  Rodar Firewall (scan de executáveis e flags)
9.  Hermes: RCA + Decision
10. Se NEEDS_FIX → corrigir e repetir desde passo 6
11. Se READY → criar PR ou avançar merge gate
12. Produzir Evidence (hash SHA-256, flags confirmadas)
13. Handoff (entrega ao próximo responsável)
14. Checkpoint final (main limpa, PRs esperadas)
15. Declarar próxima fase autorizada (se houver)
```

---

## 17. Frase síntese

```
A Software Factory garante o processo.
Hermes garante a decisão.
TodoWrite garante a memória.
Subagent garante profundidade.
Fork garante paralelismo.
Firewall garante segurança.
Evidence garante auditabilidade.

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
```

---

## 18. Evidence-Bound Answer Protocol

> Spec completa: SDDF_SPEC.md seção 17

**Princípio:** toda resposta deve estar ancorada em evidência concreta — log, commit, diff, teste, scan ou checkpoint real.

**Proibido:** "parece ok" · "provavelmente passou" · "pode mergear" · "está correto" · sem prova.

**Formato obrigatório:**
Estado observado → Evidência → Diagnóstico → Decisão → Próximo comando → Bloqueio

**Regra de confiança:**
Sem checkpoint → sem decisão.
Sem diff       → sem merge.
Sem teste      → sem READY.
Sem evidência  → sem PASS GOLD REAL.

**Frase-síntese:**
A Software Factory não acredita em intenção; acredita em evidência.
