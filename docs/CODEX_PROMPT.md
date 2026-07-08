# CONTINUATION PROMPT — Vision Core Next (para Codex)

## Estado atual

- **HEAD:** `c8cdb981` — `docs: handoff atualizado com Apply-Fix (Etapa 7)` (pushado para `origin/main`).
- **Cache-bust:** `?v=next-clean-44` (no `vision-core-next.html`, links CSS + JS).
- **Frontend Next:** 3 arquivos — `vision-core-next.html`, `vision-core-next-clean.js` (~2110 linhas), `vision-core-next-clean.css` (~1450 linhas).
- **`AGENT_APPLY_ENABLED = false`** (gate de governança, intocado).
- **API_BASE_URL** = `https://visioncore-api-gateway.weiganlight.workers.dev` (produção).

## Protocolo de início

LEIA, NESTA ORDEM, ANTES DE QUALQUER EDIÇÃO:
1. `CLAUDE.md` (raiz do repo) — documento central, stack, arquitetura, convenções, **PROTOCOLO DE REVEZAMENTO**.
2. `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` — spec oficial do frontend paralelo.
3. `docs/CURRENT_HANDOFF.md` (este arquivo, versão oficial no repo).
4. Verificar CI divergence (`git fetch origin main && git log HEAD..origin/main --oneline`).
5. Se houver commits novos: `git pull --rebase origin main`.

APÓS LER:
- `git status` — working tree deve estar limpo (ignorar untracked debris).
- `git log --oneline -5` — confirmar HEAD em `c8cdb981`.
- `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list --timeout=60000` — 9/9 devem passar.

## O que foi implementado (sessão 2026-07-08)

| Etapa | Feature | Commit | Cache |
|-------|---------|--------|-------|
| 0 | Corte de escopo (seção 11 no SPEC) | `e03c4a69` | — |
| 1 | B-4: Badge de conexão agente | `28cda8fb` | v39 |
| 2 | B-5: AI Provider Vault (Settings) | `21a65e9d` | v40 |
| 3 | B-6: Vault Rollback (dupla confirmação) | `988d2afb` | v41 |
| 4 | B-2+B-3: Missões + Evidence viewer | `7d5028b8` | v42 |
| 5 | B-1: parseHermesBlock + hint diagnóstico | `d5575f56` | v43 |
| 6 | PARITY_AUDIT atualizado, specs permanentes | `8f693d2d` | — |
| 7 | Apply-Fix no Tools (POST /api/security/apply-fix) | `18833c4a` | v44 |

## Pendentes (prioridade: SF → Auth → Deploy)

### PRÓXIMO: SF — 7 passos restantes (~2 turnos)

Verificar endpoint real em `backend/server.js` para cada um, depois conectar UI.

**Passos (contrato job_id polling, igual ao SF Auto-Pilot existente):**
```
POST /api/sf/job/{step}  →  { job_id }  →  GET /api/sf/jobs/{job_id}  poll até done/error
```

Lista:
1. `project-files` — gerar estrutura de arquivos do projeto
2. `generate-zip` — gerar ZIP dos arquivos
3. `fetch-url` — baixar conteúdo de URL
4. `patch-validator` — validar patch antes de aplicar
5. `context-snapshot` — tirar snapshot do contexto
6. `risk-assessor` — avaliar risco de uma ação
7. `rollback-planner` — planejar rollback

**Onde adicionar UI:**
- O SF já tem painel `#vcFeaturePanel` com form e autopilot steps (5 steps + PASS GOLD).
- Adicionar novos steps como cards/checkboxes no mesmo painel, reusando padrão de polling.
- Cada step novo deve ter: checkbox, label, status (idle/polling/done/error), botão de executar.
- NÃO quebrar steps existentes (architecture, code, review, test, docs, gold-gate).

**Endpoint real ANTES de codar:**
```bash
grep -n "api/sf/job" backend/server.js | head -20
# Ver contrato em cada handler
```

### Auth (2-3 turnos, mais arriscado)
- Registro, login, OAuth Google+GitHub.
- NÃO começar sem alinhamento explícito.

### Deploy dropdown
- Bloqueado pela SPEC (seção 2). Decisão de escopo.

## Regras duras

1. **NÃO alterar:** `frontend/index.html`, `frontend/assets/vision-core-bundle.{js,css}`, `backend/server.js`, `bin/deploy-pages.sh`.
2. **Cache-bust:** incrementar `v=next-clean-N` no HTML sempre que JS/CSS mudar. Atual: 44 → próximo: 45.
3. **`AGENT_APPLY_ENABLED = false`** — intocado. Não reabrir sem pareamento real + aprovação registrada no HANDOFF.
4. **Double confirmation** para ações destrutivas (escrita em disco, POST não-GET). Mesmo padrão já usado em GitHub PR, vault rollback, agent-apply, apply-fix.
5. **Contrato real ANTES do mock:** ler endpoint em server.js, citar path verificado no commit.
6. **Zero innerHTML.** Usar `textContent`, `:not([hidden])`, `createElement` + `appendChild`.
7. **Temp specs** (criar e deletar): `tests/e2e/vision-core-next-{feature}.spec.mjs` com 5-6 testes, rodar com `npx playwright test`, deletar após CI passar.
8. **Permanent specs** (9 existentes, não deletar): `vision-core-next-agent-apply.spec.mjs` (4 testes) + `vision-core-next-sf.spec.mjs` (5 testes).
9. **Polling pausa em hidden:** usar `document.visibilitychange` + `document.hidden`.
10. **Git push:** usar PowerShell (Bash sem rede para GitHub).
11. **Working tree limpo** entre etapas. Commit antes de avançar.
12. **Nada de deploy** (CF Pages/EB), nada de `package.json` sem pedido explícito.

## Se encontrar CI bot commit divergente

```powershell
git stash push -m "temp"
git pull --rebase origin main
git stash drop
git push origin main
```

## Preview server local (para testes)

```powershell
# Já existe em tests/e2e/preview-server.mjs
# Iniciar:
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "tests/e2e/preview-server.mjs" ...
# Rodar testes:
npx playwright test tests/e2e/vision-core-next-{nome}.spec.mjs --reporter=list --timeout=30000
```

## Ao finalizar cada etapa

1. Rodar syntax check: `node --check frontend/assets/vision-core-next-clean.js`
2. Rodar permanent specs: `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list --timeout=60000`
3. Commit com mensagem descritiva
4. Push: `git push origin main`
5. Atualizar `docs/CURRENT_HANDOFF.md` com o que foi feito, novo HEAD, novo cache-bust
6. Atualizar este prompt (CODEX_PROMPT.md) se houver mudança de direção

## Arquivos relevantes

- `frontend/vision-core-next.html` — HTML principal (cache-bust v44)
- `frontend/assets/vision-core-next-clean.js` — JS principal (~2110 linhas)
- `frontend/assets/vision-core-next-clean.css` — CSS principal (~1450 linhas)
- `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` — spec oficial
- `docs/PARITY_AUDIT.md` — auditoria de paridade
- `docs/CURRENT_HANDOFF.md` — handoff vivo
- `backend/server.js` — API endpoints (NÃO ALTERAR, só consultar)
- `tests/e2e/vision-core-next-agent-apply.spec.mjs` — permanent, 4 testes
- `tests/e2e/vision-core-next-sf.spec.mjs` — permanent, 5 testes
- `tests/e2e/preview-server.mjs` — servidor local para testes
