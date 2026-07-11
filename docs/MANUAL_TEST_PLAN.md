# MANUAL TEST PLAN — Vision Core Next (sessão 2026-07-10)

**Leia `docs/MASTER_SPEC.md` antes de qualquer coisa se ainda não leu.** Este documento cobre especificamente o estado do Vision Core Next: App Shell sem Mission Input, Security Lab, Software Factory (Modo Avançado + project-files/generate-zip), e a limpeza de segurança de dogfood (`PROVIDER_VAULT_SECRET` fail-closed).

---

## Nuance crítica antes de começar — o que roda contra produção vs. o que precisa de backend local

`frontend/vision-core-next.html` tem `API_BASE_URL` **fixo** no código (o Worker gateway de produção, `https://visioncore-api-gateway.weiganlight.workers.dev`) — não há mecanismo de troca de ambiente. Isso significa:

- **Testar o frontend abrindo o arquivo local** (`frontend/vision-core-next.html` direto no navegador, ou via `npx serve frontend/`) já chama o **backend real de produção**. Como nenhuma mudança desta sessão tocou `backend/server.js` (as mudanças de ETAPA 3 só conectam o frontend a endpoints que **já existiam e já respondem em produção** — `project-files`/`generate-zip`), **você pode testar tudo do App Shell e do Software Factory agora, sem subir nada localmente.**
- **A correção de segurança da ETAPA 1** (`PROVIDER_VAULT_SECRET` fail-closed em `backend/provider-vault-crypto.js`) está **só no git, não deployada no EB**. Para observar esse comportamento de verdade (processo recusando subir), você precisa rodar o backend **localmente** — a produção ainda roda o código antigo até um deploy real acontecer (fora do escopo desta sessão, "NUNCA: deploy... tocar produção/EB real").

---

## Pré-requisitos

| Item | Versão mínima | Necessário para |
|---|---|---|
| Node.js | 20+ (idealmente 24, `backend/package.json` pede `>=24.0.0`) | Backend local, testes |
| npm | 8+ | `npm install` em `backend/` |
| Go | 1.22+ | Só se for recompilar `bin/vision-core` — o binário já compilado normalmente já está presente |
| Playwright (Chromium) | já no `package.json` raiz | Rodar a suíte automatizada, se quiser revalidar antes do teste manual |

### Variáveis de ambiente obrigatórias (backend local)

Desde o INCIDENTE-4 (sessão anterior) e a limpeza de dogfood desta sessão, `backend/server.js` **recusa subir** sem estas duas — fail-closed, sem fallback silencioso:

| Variável | Exigência | Como gerar um valor forte |
|---|---|---|
| `SESSION_SECRET` | Obrigatória, ≥32 bytes, diferente do literal de fallback público conhecido | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PROVIDER_VAULT_SECRET` | Obrigatória, ≥32 bytes, diferente do literal de fallback público conhecido | mesmo comando acima, rode de novo pra um valor diferente |

**Caminho mais simples:** rode `./setup.sh` (Git Bash/WSL) — ele já gera as duas automaticamente em `backend/.env` (corrigido nesta sessão, ETAPA 4 — antes só gerava `JWT_SECRET`, que nem é usado pelo backend). Se `backend/.env` já existe, `setup.sh` não sobrescreve — adicione as duas linhas manualmente se estiverem faltando.

`JWT_SECRET` continua no `.env` gerado por compatibilidade, mas **não é lido por `server.js`** — não precisa se preocupar com ele.

---

## Como subir o ambiente local

### Opção A — só frontend, contra produção (mais rápido, cobre quase tudo desta sessão)

```bash
npx serve frontend/
# ou simplesmente abra frontend/vision-core-next.html direto no navegador
```

Abra `http://localhost:<porta>/vision-core-next.html` (ou o `file://` direto). Isso já é suficiente pra testar App Shell + Software Factory (roteiros 1 e 2 abaixo).

### Opção B — backend local (necessário só pro roteiro 5, fail-closed)

```bash
cd backend
node server.js
# Esperado: "Server listening on port 3000" (ou o PORT do .env)
# Health check: curl http://localhost:3000/api/health
```

Se faltar `SESSION_SECRET`/`PROVIDER_VAULT_SECRET`, o processo morre imediatamente com um erro claro (`SESSION_SECRET_REQUIRED` ou `PROVIDER_VAULT_SECRET_REQUIRED`) — **isso é o comportamento correto**, não um bug.

---

## Roteiro 1 — App Shell (composer único + Security Lab)

> **Correção de drift (reconciliação de 2026-07):** os passos 1.1-1.3 e 1.5 originais desta seção descreviam um painel "Mission Input" flutuante separado — removido definitivamente do Vision Core Next (`next-clean-54`, ver `docs/DECISIONS.md` DECISION-010). Reescritos abaixo para refletir o comportamento atual: o composer/chat principal é a única entrada de missão, sem painel paralelo.

| # | Passo | Resultado esperado | Se falhar, reporte |
|---|---|---|---|
| 1.1 | Abra `/vision-core-next.html`. Olhe o topo direito. | Só o Atomic Core (widget orbital discreto) no canto superior direito — nenhum painel/textarea de missão separado ali. Não compete visualmente com o chat central. | Screenshot + se qualquer painel/textarea de missão aparecer fora do composer principal |
| 1.2 | Digite uma missão diretamente no composer (textarea do rodapé) e envie. | O texto vai direto para `POST /api/chat` — não existe passo intermediário de "adicionar ao chat" nem toggle de expandir/colapsar um painel separado. | Se aparecer qualquer painel/textarea de missão adicional além do composer |
| 1.3 | *(passo removido — cobria um fluxo "Adicionar ao chat sem executar" de um painel que não existe mais; o composer sempre envia direto ao enviar.)* | — | — |
| 1.4 | Clique em "Security Lab" na sidebar. | Aba abre, mostra painel "Status seguro" (5 linhas: `/api/status`, `/api/queue/status`, `/api/agents/status`, `/api/jobs/latest`, `/api/heartbeat` — todas devem aparecer em âmbar "indisponível localmente" porque nenhum desses endpoints existe no backend real) + card "Secret Guard" (texto estático: `vc-secret-guard` SPEC/PLANEJADO, Rust core PLANEJADO, Scanner integration FUTURA). **Novo (`next-clean-58`):** logo abaixo da lista, um donut "Cobertura de políticas de segurança", um gauge "Conformidade visual" e uma timeline "Últimas verificações" aparecem depois que as 5 checagens terminam. | Se algum texto aparecer com mojibake (`Ã£`, `Ã©` etc. em vez de acentos normais), se o painel não aparecer, ou se o donut/gauge/timeline não aparecerem depois das checagens |
| 1.5 | Redimensione a janela do navegador pra largura de celular (~390px) ou use DevTools → device toolbar. | Composer vira bloco de largura total, ainda legível. Atomic Core (o widget orbital no canto) some completamente (`display:none`) — não deve sobrepor nada. | Screenshot se algo estiver sobreposto/ilegível |

## Roteiro 2 — Software Factory

| # | Passo | Resultado esperado | Se falhar, reporte |
|---|---|---|---|
| 2.1 | Clique "Software Factory" na sidebar. | Chat central continua visível; painel `#factory` aparece abaixo como contexto, sem textarea próprio de missão, com botões Provider/Model/Dry-run/PASS GOLD. | — |
| 2.2 | Deixe PASS GOLD marcado (padrão). Digite uma descrição de projeto simples (ex.: "um blog com login"), clique "Gerar Projeto". | Log aparece (`#vcSfLog`) mostrando `SEND`/`DONE` pra cada um dos 6 passos (5 padrão + PASS GOLD). Barra de progresso mostra "06 — Validar PASS GOLD" no final. Painel "PACOTE FINAL" aparece com o contexto acumulado. **Isso é uma chamada real a um provider de LLM** — pode demorar 10-60s por passo. | Se travar num passo por mais de ~2min, ou se `sf_options` no request (Network tab) mostrar `real_execution_allowed:true`/`deploy_allowed:true`/`writes_disk:true` (deveriam ser sempre `false`) |
| 2.3 | Desmarque PASS GOLD, gere de novo. | Só 5 passos rodam — o log nunca deve mostrar uma chamada a `/api/sf/gold-gate`. | Se o 6º passo rodar mesmo desmarcado |
| 2.4 | Marque 1-2 checkboxes de gerador opcional (Context Snapshot, Patch Validator, Risk Assessor, Rollback Planner), gere. | Passos extras (E1-E4) aparecem no meio da sequência, antes do PASS GOLD. | — |
| 2.5 | Clique "Modo Avançado" com uma missão no composer principal. | Painel do Arquiteto aparece com interpretação, stack sugerida, catálogo, grafo, agentes, timeline e preview. Um card de sugestão aparece no chat. Nenhum endpoint SF é chamado só por selecionar o modo. | Se aparecer segundo chat/textarea de missão, ou se a geração iniciar automaticamente |
| 2.5a | Aceite a sugestão, remova/adicione tecnologias no catálogo e navegue pela timeline. | Grafo e preview atualizam; warnings aparecem para combinações problemáticas; agentes críticos continuam bloqueados como REQUIRED. | Se Aegis/Scanner/PASS GOLD puderem ser desligados |
| 2.5b | Escolha um provider específico e gere. | `sf_options` no request mostra o provider escolhido, `mode:'advanced'`, `stack:[...]`, e `architecture_preview`; `real_execution_allowed/deploy_allowed/writes_disk` continuam `false`. | Se qualquer flag segura vier `true` |
| 2.6 | **Novo desta sessão:** depois que "PACOTE FINAL" aparecer, clique "Gerar Lista de Arquivos". | Botão vira "Gerando...", depois mostra uma lista de nomes de arquivo (ex.: `src/index.js`, `README.md`...) e o texto "N arquivo(s) gerado(s).". Botão "Baixar ZIP" aparece. | Se a lista nunca aparecer, ou se o status mostrar "Erro" persistente — capture a resposta de `/api/sf/project-files` no Network tab |
| 2.7 | **Novo desta sessão:** clique "Baixar ZIP". | O navegador baixa um arquivo `projeto-vision-core.zip` de verdade (deve abrir/extrair normalmente). | Se nada baixar, ou se o arquivo baixado estiver corrompido/vazio |
| 2.8 | Gere um projeto novo (descrição diferente) sem tocar em Gerar Lista de Arquivos. | O painel de lista de arquivos e o botão ZIP da geração anterior devem sumir — nunca deve ser possível baixar um ZIP de uma descrição antiga por engano. | Se a lista/ZIP da rodada anterior continuar visível após a nova geração começar |
| 2.9 | **Novo (`next-clean-58`):** durante e depois de uma geração (2.2), observe o bloco logo abaixo da barra de progresso. | Um donut "Etapas — DONE / FAIL / BLOCKED", barras "Duração por etapa" e um gauge "Progresso do pipeline" (`N/total`) aparecem e atualizam a cada etapa concluída — não só no final. Se você interromper a rede/forçar um erro no meio (ex.: desligue o Wi-Fi por 1 passo), as etapas restantes devem aparecer como `blocked` no donut, nunca sumir silenciosamente. | Se o bloco nunca aparecer, ficar preso em 0/N, ou não refletir uma falha real |

## Roteiro 3 — Métricas

| # | Passo | Resultado esperado | Se falhar, reporte |
|---|---|---|---|
| 3.1 | Clique "Métricas" na sidebar. | Painel carrega: agentes, DORA, runtime, memory layer e conectividade com gráficos nativos (barras, donut, gauge, sparkline/timeline) e texto complementar. Badge de fonte mostra "DADOS REAIS" (verde) quando os endpoints respondem. | Se o badge mostrar "FALLBACK LOCAL" persistentemente, o backend real pode estar fora do ar — verifique `https://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com/api/health` direto |
| 3.2 | Observe os agentes com custo. | Agentes sem custo mostram "sem dados de custo" em itálico — **nunca** deve aparecer "$0" pra um agente sem dado real. | Se algum agente mostrar "$0" sem ter custo real |
| 3.3 | Marque "Ver JSON bruto". | Um bloco de texto monoespaçado aparece com o payload combinado para diagnóstico; ele fica oculto por padrão e nunca é o conteúdo principal. | — |
| 3.4 | Clique "Agentes" → "Métricas agentes", "Tools" → "Marketplace" e "Tools" → "Histórico security". | Cada safe-read mostra resumo humano no chat e gráfico no painel contextual; não deve despejar JSON bruto como experiência principal. **Novo (`next-clean-58`):** abaixo do gráfico, um checkbox "Ver JSON bruto (diagnóstico)" revela um `<pre>` com o payload completo — some de novo ao desmarcar. | Se aparecer payload JSON cru no chat principal, ou se o checkbox de diagnóstico não existir/não funcionar |

## Roteiro 4 — Missions (Dry-Run com confirmação dupla)

| # | Passo | Resultado esperado | Se falhar, reporte |
|---|---|---|---|
| 4.1 | Clique "Missions" na sidebar, role até "Dry-Run Real". | Banner de risco vermelho sempre visível (sem botão de fechar). Campo `target_path` + botão "Rodar Dry-Run" desabilitado até preencher. | — |
| 4.2 | Preencha um caminho, clique "Rodar Dry-Run". | Botão vira "Confirmar dry-run em `<path>`"/"Cancelar" — **nenhuma requisição disparada ainda**. | Se uma requisição disparar antes da confirmação |
| 4.3 | Clique "Cancelar". | Volta ao estado inicial, zero requisições (confirme no Network tab). | — |
| 4.4 | Repita e clique "Confirmar" desta vez. | Requer o Vision Agent Local rodando (`localhost:7070`) pra completar de verdade — sem ele, espera até timeout de 5min e mostra mensagem de timeout, sem travar a UI. | Se a UI travar (não aceitar mais cliques) durante a espera |

## Roteiro 5 — Auth/Billing (verificação da correção de segurança desta sessão)

**Este roteiro precisa do backend local (Opção B acima) — não é testável contra produção, porque a correção ainda não foi deployada.**

| # | Passo | Resultado esperado | Se falhar, reporte |
|---|---|---|---|
| 5.1 | Renomeie/remova `PROVIDER_VAULT_SECRET` do `backend/.env`, rode `node server.js`. | Processo morre imediatamente, erro `PROVIDER_VAULT_SECRET_REQUIRED` no console — nunca sobe silenciosamente. | Se o processo subir mesmo sem a variável |
| 5.2 | Restaure `PROVIDER_VAULT_SECRET` com um valor forte, rode de novo. | Processo sobe normalmente, `curl http://localhost:3000/api/health` retorna 200. | — |
| 5.3 | `curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"teste@example.com","password":"vc-user-auto"}'` | Retorna `400 {"ok":false,"error":"fallback_credential_rejected"}` — a credencial legada do INCIDENTE-3 continua bloqueada. | Se retornar 200 com um token |
| 5.4 | Abra `frontend/index.html` (legado) localmente ou em produção, tente criar conta pelo modal de auth. | Funciona normalmente (gera senha aleatória server-side) — não deve mais enviar o literal `vc-user-auto`. Confira no Network tab que o campo `password` no POST de `/api/auth/register` está vazio, não `"vc-user-auto"`. | Se o literal ainda for enviado |

---

## Checklist geral (rodar antes de considerar a sessão validada)

- [ ] Roteiro 1 (App Shell) completo, sem regressão visual
- [ ] Roteiro 2 (Software Factory + project-files/generate-zip) completo, ZIP baixa de verdade
- [ ] Roteiro 3 (Métricas) completo
- [ ] Roteiro 4 (Dry-Run) completo, confirmação dupla funciona
- [ ] Roteiro 5 (fail-closed) completo, backend local recusa subir sem os segredos
- [ ] Nenhuma chamada de rede inesperada observada em nenhum passo "seguro" (4.3)
- [ ] `AGENT_APPLY_ENABLED` continua bloqueado (não faz parte deste roteiro, mas confirme visualmente que o painel de Agent Apply em Missions continua desabilitado)

## Se algo falhar

1. Não tente corrigir você mesmo — anote: passo exato, resultado observado vs. esperado, screenshot se visual, conteúdo da aba Network se for chamada de API.
2. Registre em `docs/CURRENT_STATE.md` como achado pendente, ou peça pro próximo agente investigar com esse contexto.
3. Nenhum achado deste roteiro deve virar deploy/commit de correção sem sua aprovação explícita — mesma regra de sempre.

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-10 | Criação — cobre ETAPA 0-4 desta sessão (consolidação de docs, dogfood cleanup, project-files/generate-zip, README). |
| 2026-07-11 | `next-clean-58` — passos novos para o gráfico de etapas do Software Factory (2.9), gráficos do Security Lab (1.4) e o toggle "Ver JSON bruto" nas ações safe-read fora da aba Métricas (3.4). |
| 2026-07 | Roteiro 1 (passos 1.1-1.3, 1.5) reescrito — descrevia um painel "Mission Input" flutuante já removido (`DECISION-010`); drift fechado na missão de reconciliação de specs. |

## Controle de versão

**1.2.0** — 2026-07 (drift fechado)
**1.1.0** — 2026-07-11
