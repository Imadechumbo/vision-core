# Vision Core — Git Provider Abstraction Spec (§62)

**Versão:** V3.1.0 (proposta)  
**Data:** 2026-06-11  
**Status:** 🔵 SPEC CRIADA — implementação não iniciada  
**Objetivo:** Permitir que o Vision Core opere com GitHub OU GitLab
como provider de repositório, branch, commit e PR/MR — sem
travar o produto a um único fornecedor.

---

## Motivação

GitHub vem enfrentando sobrecarga de infraestrutura e algumas
empresas grandes migraram ou estão migrando para GitLab
(self-hosted ou SaaS). O Vision Core hoje (V3.0.0) só suporta
GitHub via GitHub REST API — isso é um risco de dependência
única e uma limitação de mercado para clientes Enterprise
que já usam GitLab.

## Escopo

NÃO é uma migração — GitHub continua sendo o padrão/default.
GitLab é adicionado como provider alternativo, selecionável
pelo usuário.

---

## Arquitetura Proposta

### Camada de abstração: GitProviderAdapter

```
backend/services/gitProviders/
  ├── GitProviderAdapter.js   (interface comum)
  ├── githubAdapter.js        (implementação atual, refatorada)
  └── gitlabAdapter.js        (nova implementação)
```

Interface comum (métodos que TODO adapter deve implementar):

```js
testConnection(token)
  → { connected: bool, user, scopes }

createBranch(repo, baseBranch, newBranch)
  → { branch, sha }

commitFiles(repo, branch, files[], message)
  → { commitSha }

createPullRequest(repo, sourceBranch, targetBranch, title, body)
  → { id, url, status }

getPullRequestStatus(repo, id)
  → { status, checks[], mergeable }

mergePullRequest(repo, id, method)
  → { merged, sha }

getCIStatus(repo, ref)
  → { status, jobs[] }
```

### Terminologia mapeada

| Conceito Vision Core | GitHub | GitLab |
|---|---|---|
| Repositório | repo | project |
| Pull Request | PR | Merge Request (MR) |
| Actions | GitHub Actions | GitLab CI/CD |
| Token | PAT (ghp_...) | PAT (glpat-...) |
| Webhook | GitHub webhook | GitLab webhook |
| Status checks | Checks API | Pipeline status |

---

## Mudanças por Componente

### Backend (server.js + novos arquivos)

1. Novo módulo `backend/services/gitProviders/`
2. Endpoint `/api/git/status` → genérico, recebe `?provider=github|gitlab`
3. Endpoint `/api/git/pr` (criar PR/MR) → genérico
4. Variáveis de ambiente:
   - `GITHUB_TOKEN` (existente)
   - `GITLAB_TOKEN` (novo)
   - `GITLAB_HOST` (novo, default `gitlab.com`, suporta self-hosted)
5. §53 diff contextual: sem mudança — diff é agnóstico de provider
6. §56 multi-DIFF: sem mudança

### Frontend (index.html — painel "GitHub Integration Real")

1. Renomear seção para "Git Integration Real"
2. Adicionar seletor: ⚪ GitHub  ⚪ GitLab
3. Campo de token muda label dinamicamente (PAT GitHub / PAT GitLab)
4. Para GitLab self-hosted: campo opcional "GitLab Host URL"
5. Texto "Criar PR PASS GOLD" → "Criar PR/MR PASS GOLD"
6. Status check: "Verificando GitHub..." → "Verificando {provider}..."

### AI API Vault

1. Adicionar GitLab como provider de "Tools Marketplace"
2. Token armazenado com mesmo padrão de segurança do GitHub token

### Software Factory (SF-06, SF-07)

1. SF-06 "Comando para Criação Real": pacote externo referencia
   "criar PR" → generalizar para "criar PR (GitHub) ou MR (GitLab)
   conforme provider configurado"
2. SF-07 "Recibo do Worker": campo de evidência "PR criado" →
   "PR/MR criado (provider: github|gitlab)"
3. SF-SPEC-LIBRARY: SF-06-009, SF-07-006 atualizadas para
   mencionar ambos providers

---

## Specs Novas (10 — §62-001 a §62-010)

### §62-001 HAPPY PATH — testConnection GitHub retorna connected=true

**Dado:** token `ghp_...` válido + provider=github  
**Esperado:** `{ connected: true, user: string, scopes: [...] }`  
**Critério PASS:** campo `connected === true` + `user` preenchido

---

### §62-002 HAPPY PATH — testConnection GitLab retorna connected=true

**Dado:** token `glpat-...` válido + provider=gitlab  
**Esperado:** `{ connected: true, user: string, scopes: [...] }`  
**Critério PASS:** campo `connected === true` + `user` preenchido

---

### §62-003 — createBranch funciona identicamente em ambos providers

**Dado:** repo/project existente, baseBranch="main", newBranch="feat/test-62"  
**Em GitHub:** `POST /repos/{owner}/{repo}/git/refs`  
**Em GitLab:** `POST /projects/{id}/repository/branches`  
**Esperado (ambos):** `{ branch: "feat/test-62", sha: string }`  
**Critério PASS:** estrutura de retorno idêntica, sem diferença para o caller

---

### §62-004 — commitFiles aplica mesmo diff em ambos providers

**Dado:** arquivo `test.js` modificado, mensagem de commit padrão  
**Em GitHub:** `PUT /repos/{owner}/{repo}/contents/{path}` (Base64)  
**Em GitLab:** `POST /projects/{id}/repository/commits` (actions[])  
**Esperado:** `{ commitSha: string }` em ambos  
**Critério PASS:** commitSha retornado, arquivo no repositório após commit

---

### §62-005 — createPullRequest (GitHub) vs createMergeRequest (GitLab)

**Dado:** sourceBranch="feat/test-62", targetBranch="main", title, body  
**Em GitHub:** `POST /repos/{owner}/{repo}/pulls`  
**Em GitLab:** `POST /projects/{id}/merge_requests`  
**Esperado (ambos):** `{ id: number, url: string, status: "open" }`  
**Critério PASS:** estrutura normalizada idêntica — caller não conhece diferença

---

### §62-006 EDGE — provider=gitlab sem GITLAB_TOKEN configurado

**Dado:** request com `provider=gitlab`, `GITLAB_TOKEN` não definido no ambiente  
**Esperado:** HTTP 400 ou 503, body `{ error: "GitLab token não configurado", code: "GIT_PROVIDER_TOKEN_MISSING" }`  
**Critério PASS:** resposta de erro clara, sem crash do servidor, sem exposição de outras variáveis de ambiente  
**Critério FAIL:** exceção não tratada (500), ou erro sem mensagem legível

---

### §62-007 EDGE — GitLab self-hosted com GITLAB_HOST customizado

**Dado:** `GITLAB_HOST=https://gitlab.empresa.com`, token válido  
**Esperado:** adapter usa `https://gitlab.empresa.com/api/v4/...` em vez de `https://gitlab.com/api/v4/...`  
**Critério PASS:** URL base construída corretamente, sem hardcode de gitlab.com  
**Critério FAIL:** request vai para gitlab.com ignorando o host customizado

---

### §62-008 SECURITY — token de um provider nunca vaza para o outro

**Dado:** ambos `GITHUB_TOKEN` e `GITLAB_TOKEN` configurados  
**Cenário A:** request github → resposta não deve conter string `glpat-`  
**Cenário B:** request gitlab → resposta não deve conter string `ghp_`  
**Nos logs:** nenhum token completo deve aparecer — apenas 4 chars finais (ex: `***abc1`)  
**Critério PASS:** zero ocorrências de tokens na resposta/log  
**Critério FAIL:** qualquer substring de token na resposta ou log

---

### §62-009 — getCIStatus normaliza Actions e Pipelines

**Dado:** ref="main"  
**GitHub resposta:** `{ check_runs: [{ name, conclusion, status }] }`  
**GitLab resposta:** `{ id, status, stages: [{ name, status, jobs: [] }] }`  
**Esperado (ambos, normalizado):**  
```json
{
  "status": "success|running|failed|pending",
  "jobs": [{ "name": string, "status": string }]
}
```  
**Critério PASS:** estrutura idêntica independente de provider

---

### §62-010 — Troca de provider no frontend não quebra sessão ativa

**Dado:** usuário com sessão ativa, PASS GOLD score=100, vault configurado  
**Ação:** trocar seletor de GitHub → GitLab no painel "Git Integration Real"  
**Esperado:**  
- PASS GOLD score persiste  
- AI API Vault persiste  
- Missões ativas não são canceladas  
- Apenas o token field e labels do painel git mudam  
**Critério PASS:** nenhum estado fora do painel git é afetado  
**Critério FAIL:** reload de página, logout, perda de missão ativa

---

## Stress Test §62 (futuro — não implementar agora)

```
scripts/stress-test-gitprovider-vision-core.js
Dashboard: porta 3105
10 cenários testando os adapters com mocks (sem chamar API real)
+ 2 cenários de integração real (1 GitHub + 1 GitLab) com
  repositório de teste dedicado
Total: 12 cenários
```

---

## Riscos e Mitigação

| Risco | Mitigação |
|---|---|
| GitLab self-hosted com cert TLS custom | reutilizar `NODE_TLS_REJECT_UNAUTHORIZED` já usado no projeto |
| Rate limits diferentes (GitHub vs GitLab) | adapter expõe `getRateLimit()`, Hermes ajusta retry |
| Diferenças de webhook payload | normalizar no backend antes de processar |
| Migração de clientes existentes | GitHub continua default — GitLab é opt-in |

---

## Roadmap de Implementação (fases)

| Fase | Entregável | Critério de avanço |
|---|---|---|
| 1 | GitProviderAdapter interface + githubAdapter refatorado | Testes V1–V4+SF+FP continuam 80/80 (sem regressão) |
| 2 | gitlabAdapter implementado + testConnection | §62-001/002 PASS |
| 3 | Frontend seletor GitHub/GitLab | §62-010 PASS |
| 4 | SF-06/SF-07 generalizados | SF stress test continua 15/15 |
| 5 | stress-test-gitprovider (12 cenários) | 12/12 PASS |

---

## Status

🔵 SPEC CRIADA — implementação não iniciada.  
Aguardando decisão de priorização vs. roadmap atual (V3.1.0).
