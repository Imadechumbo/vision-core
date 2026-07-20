# API CONTRACT — Vision Core Backend

**Parte da série de arquitetura — leia `MASTER_SPEC.md` e `VISION_CORE_BACKEND_SPEC.md` antes deste.**

> Versão: 1.0.0 · Criado: 2026-07-09
> Fonte: leitura direta de `backend/server.js` (rotas reais) e `frontend/assets/vision-core-next-clean.js` (contratos confirmados por uso real). `docs/PARITY_AUDIT.md` confirma ~133 rotas reais em `server.js`, das quais ~25 são chamadas pelo Next hoje.

---

## Resumo

Contrato dos endpoints reais do backend (`backend/server.js`), único processo Express. Envelope de resposta uniforme: `sendOk(res, payload)` → `{ok:true, ...payload, time: ISOString}`. Erro: `{ok:false, error:'code', message?, time}`, status HTTP correspondente.

Toda resposta expõe `X-Request-ID`; envelopes `sendOk` incluem `request_id`. Um `X-Request-ID` recebido só é preservado se corresponder a `[a-zA-Z0-9._-]{8,96}`, senão o backend gera UUID.

## Objetivo

Documentar o formato real de request/response dos endpoints que o Vision Core Next consome, incluindo achados de contrato que já causaram bug real quando assumidos incorretamente — para que nenhum agente futuro repita o mesmo erro.

## Escopo

Os ~25 endpoints ativamente consumidos pelo Next + os endpoints de auth/billing que compõem o restante da API pública. **Não é exaustivo** — `server.js` tem ~133 rotas reais; o restante (rotas usadas só pelo frontend legado, scanner/hermes/obsidian/tools diversos) não está listado aqui, `grep` direto em `server.js` é a fonte de verdade para qualquer rota não citada.

## Fora do escopo

Endpoints da Camada 2 (governança interna) — não são HTTP, são scripts/CLI (`pi-harness.mjs`, `tools/real-validation/*`).

### Contratos CLI relacionados (não HTTP)

`vc-secret-guard verify-cloud --provider aws-eb ...` é um contrato de CLI,
não um endpoint. Ele audita env vars do Elastic Beanstalk em modo read-only e
só pode retornar metadados seguros: nome, presença, vazio/não-vazio, tamanho,
mínimo, compliance, severidade e nota. Nunca retorna valor, prefixo, sufixo,
hash, amostra, ou stderr bruto da AWS CLI. Códigos: `0` conforme, `1` achado
crítico (ou warning com `--strict`), `2` erro operacional sanitizado.

---

## Convenção de versionamento e compatibilidade

**Não há versionamento de URL** (`/api/v1/...`) — um único namespace `/api/*`. Compatibilidade é mantida por convenção, não por contrato formal: mudar o formato de resposta de um endpoint já consumido pelo Next é tratado como mudança de contrato que exige atualizar o frontend na mesma sessão (nunca deploy de backend que quebra o Next em produção sem coordenação). Endpoint desconhecido → catch-all `app.all('/api/*', ...)` retorna `404 {ok:false, ...}`, nunca 500 silencioso.

---

## Auth

| Método | Rota | Payload | Resposta | Erros conhecidos |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{email, password?, name?}` | `{user, token, token_type:'session', persisted:true, generated_password?, anti_stub}` | `400 valid_email_required` · `400 fallback_credential_rejected` (INCIDENTE-3) · `409 email_already_registered` |
| POST | `/api/auth/login` | `{email, password}` | `{user, token, token_type:'session', persisted:true, anti_stub}` | `400 fallback_credential_rejected` · `401 invalid_credentials` |
| GET | `/api/auth/oauth/google` \| `/github` | query opcional `return_to=next` | redirect para provedor OAuth; `state` carrega alvo fechado (`next`/legado), nunca URL livre | — |
| GET | `/api/auth/oauth/google/callback` \| `/github/callback` | query `code`, `state` | redirect com `#oauth-success&token=...` ou `#oauth-error=...`; se `state.target=next`, volta para `/vision-core-next.html` | — |
| GET | `/api/auth/me` | Bearer/cookie | dados do usuário | `401` se sessão inválida |
| DELETE | `/api/auth/me` | Bearer | `{message:'account_deleted', email_deleted, anti_stub}` | `401 unauthorized` — **ação irreversível (LGPD)** |
| POST | `/api/auth/logout` | Bearer | revoga o JTI da sessão | — |
| GET | `/api/auth/status` | — | status de auth | — |

**Achado de contrato crítico (INCIDENTE-4):** `signSession()`/`verifySession()` exigem `SESSION_SECRET` real no ambiente — sem ele, o processo **recusa subir** (não há mais fallback público). Rotacionar o segredo invalida todas as sessões ativas.

## Projetos

| Método | Rota | Auth/Payload | Resposta | Erros conhecidos |
|---|---|---|---|---|
| GET | `/api/projects` | Bearer/cookie obrigatório | `{projects:[...], anti_stub}` somente do owner autenticado | `401 not_authenticated` |
| POST | `/api/projects` | Bearer/cookie + `{name}` | `{project, anti_stub}`; `user_id` vem exclusivamente da sessão | `400 project_name_required` · `400 project_name_too_long` · `400 project_owner_not_assignable` · `401 not_authenticated` |

DECISION-023: o cliente nunca envia ownership. Visitante usa contexto efêmero no browser e não acessa `projects.json`.

## Conversas

Todas exigem sessão e revalidam owner + projeto (DECISION-024). `GET /api/chat/conversations?project_id=...&limit=50&offset=0` lista metadados com `total`/`next_offset`; `POST /api/chat/conversations` cria com `{project_id,title?}`; `GET|DELETE /api/chat/conversations/:id` abre/exclui; `POST /api/chat/conversations/:id/messages` aceita `{role:'user'|'assistant',content}`. O backend retém 90 dias e nunca recebe base64/anexo bruto por estas rotas.

## Logs correlacionados

`GET /api/logs?project_id=...&mission_id?&job_id?&limit=50&offset=0` exige auth e ownership. Retorna apenas `id,ts,request_id,project_id,mission_id,job_id,event,status`, sem `user_id`, email, IP, UA ou payload. `/api/logs/download` retorna `410 raw_log_download_retired`.

## Mission (Camada 1, produto)

| Método | Rota | Payload | Resposta | Notas |
|---|---|---|---|---|
| POST | `/api/copilot` | — | — | `checkMissionQuota` (5/mês FREE) |
| POST | `/api/run-live` | — | — | `checkMissionQuota` |
| POST | `/api/chat` | `{message, mode, model, display_input}` | `{answer}` | Sem quota. `mode:'fix'` exige `[Arquivo: ...]` na mensagem (gate anti-alucinação, `BLOCKED_INPUT` sem isso) |
| POST | `/api/chat/apply-patch` | `{file_content, file_path, fix_type, patch, diagnosis}` | `{diff_preview, ...}` | Aplica em memória, nunca escreve em disco sozinho |
| GET | `/api/mission/quota` | — | `{plan, remaining}` ou `{unlimited:true}` | — |
| GET/POST | `/api/mission/timeline` | — | `{entries:[...]}` | — |

## Agent (Vision Agent Local, pareamento real)

| Método | Rota | Payload | Resposta | Notas |
|---|---|---|---|---|
| POST | `/api/agent/register` | — | `{agent_id, agent_secret, status:'registered', anti_stub}` | Gera par novo a cada chamada |
| POST | `/api/agent/heartbeat` | `{agent_id?}` | `{status:'online', agent_id, anti_stub}` | — |
| GET | `/api/agent/status` | — | `{connected, last_seen_ms_ago, agent_id, mode:'connected'\|'download_ready', anti_stub}` | `connected=true` se heartbeat/poll nos últimos 15s |
| POST | `/api/agent/mission/queue` | `{type, target_path?, agent_id?, agent_secret?}` | **`{ok, mission_id, ...}`** — não `job_id` | `sf_dry_run_real` exige `target_path` (400 sem isso). `apply_patch`/`apply_patch_multi` exigem `agent_id`+`agent_secret` pareados (401 `agent_pairing_required` sem isso) |
| GET | `/api/agent/mission/pending` | — | fila filtrada por `agent_id` (`shiftForAgent`) | Exige `agent_secret` se `agent_id` reivindicado |
| POST | `/api/agent/mission/result` | `{agent_id, agent_secret?, ...}` | — | `agent_secret` **nunca** persistido junto (corrigido pós-vazamento) |
| GET | `/api/agent/mission/result/:id` | — | resultado ou `404 result_not_found` | **404 aqui NÃO é erro — é "ainda rodando"**, distinto de erro real de rede/5xx |

## Métricas / Observabilidade

| Método | Rota | Resposta | Notas |
|---|---|---|---|
| GET | `/api/metrics/agents` | `{agents:[{name, status, cost_usd, note?, active_providers?}], active_llm_providers, anti_stub}` | `cost_usd` sempre `null` hoje (nunca computado); `status` ∈ `ok`/`binary_not_found`/`PENDING_EVIDENCE`/`no_provider` |
| GET | `/api/metrics/summary` | `{runtime:{cpu,memory,heap,uptime_s,node_version,...}}` | — |
| GET | `/api/metrics/memory` | dados do memory layer (§72/§107) | — |
| GET | `/api/dora-metrics` | `{deployment_frequency, lead_time, mttr, change_failure_rate, pass_gold_count_30d, total_pass_gold, data_source, anti_stub}` | Strings "sem dados X" **já vêm prontas do backend** — frontend não precisa re-derivar vazio |

No Vision Core Next, estes payloads estruturados devem ser visualizados graficamente primeiro (barra/donut/gauge/sparkline/timeline conforme o dado). JSON bruto fica oculto por padrão e serve somente a diagnóstico. Regra registrada: toda métrica estruturada (numérica, temporal, percentual, categórica ou comparativa) tem representação gráfica; texto puro complementa, nunca substitui; JSON bruto fica sempre atrás de toggle explícito ("Ver JSON bruto"), nunca como conteúdo principal. Esta regra se estende a `/api/tools/marketplace` e `/api/security/history` (consumidos via `#vcFeatureViz`), e aos endpoints `/api/sf/*` (via `#vcSfFinalViz`) — cobertura fechada em `next-clean-58`.

## Vault

| Método | Rota | Payload | Resposta | Notas |
|---|---|---|---|---|
| POST | `/api/vault/snapshot` | `{label?, project?, triggered_by?}` | `{snapshot_id, created_at, label, anti_stub}` | — |
| GET | `/api/vault/snapshots` | — | `{snapshots:[...]}` | — |
| POST | `/api/vault/rollback/:snapshotId` | — | — | **Irreversível** — sobrescreve o estado atual |

## GitHub

| Método | Rota | Payload | Resposta | Notas |
|---|---|---|---|---|
| GET | `/api/github/status` | — | `{configured, policy}` | — |
| POST | `/api/github/create-pr` | `{repo, base_branch, head_branch, title, body?, files?, mission_id}` | `{pr_url, quality_gate, ...}` | **Auth + PRO/Enterprise + evidência PASS GOLD do Go Core obrigatórios. Irreversível** — cria branch+commit+PR real |

## Software Factory

Ver `SOFTWARE_FACTORY_SPEC.md` para o fluxo completo. Contrato resumido:

| Método | Rota | Resposta | Achado de contrato |
|---|---|---|---|
| POST | `/api/sf/mission-composer` \| `deploy-blueprint` \| `worker-handoff` \| `context-snapshot` \| `patch-validator` \| `risk-assessor` \| `rollback-planner` \| `gold-gate` | `{job_id}` | **Sempre assíncrono** — nunca `{content}` direto |
| GET | `/api/sf/job/:id` | `{status, result (string pura), provider}` | `result` já vem **desembrulhado** (`job.result.result`) — nunca objeto aninhado. `files` só existe pra `project-files`, nunca pros 8 módulos acima |
| POST | `/api/sf/fetch-url` | `{ok, content, url}` | **Único endpoint SF síncrono, sem job_id**. Exige sessão (`requireVisionAuth`) e bloqueia alvos locais/privados/link-local por protocolo, hostname, IP e resolução DNS antes do request. |
| POST | `/api/sf/project-files` | `{job_id}` (assíncrono, payload/resposta diferentes — `{description, accumulated_context, step1_analysis, step2_blueprint}`) | resultado em `data.files[]`, não `data.result` |
| POST | `/api/sf/generate-zip` | **Resposta binária ZIP**, síncrono | `Content-Type: application/zip` — frontend precisa `response.blob()`, não JSON |
| POST | `/api/sf/execute-project` | `{intent, queued, receipt}` ou `403 sf_real_execution_disabled`/`sf_real_execution_agent_not_allowed` | Exige sessao + `agent_id`/`agent_secret` pareados + `agent_id` em `SF_REAL_EXECUTION_ALLOWED_AGENTS`. `SF_REAL_EXECUTION_ENABLED=false` por padrao e allowlist ausente/vazia bloqueia todos os Agents. Backend deriva `target_root`, ignora flags vindas do cliente, enfileira `sf_create_project`, `deploy_allowed:false`, commit manual. |
| GET | `/api/sf/execution-intent/:hash` | `{intent, receipt, agent_result}` | Status da intent de execucao local; marca timeout como `timeout_cleanup_required` se o Agent nao devolver resultado dentro da janela. |

O Arquiteto do Modo Avançado do Next não adiciona endpoint novo: a sugestão de stack/timeline/agentes é local determinística e entra nos POSTs SF existentes como contexto (`sf_options.stack` e `architecture_preview`). As flags de segurança continuam falsas.

## Security / Tools

| Método | Rota | Resposta | Notas |
|---|---|---|---|
| POST | `/api/security/apply-fix` | escreve arquivo real + backup `.bak-*` | **Irreversível** (mitigado por backup automático) |
| GET/POST | `/api/security/history` | histórico de scans | — |
| GET | `/api/tools/marketplace` | lista estática de ferramentas | — |

## Providers (AI Vault)

| Método | Rota | Notas |
|---|---|---|
| GET | `/api/providers`, `/api/providers/list` | Exige sessão (`requireVisionAuth`). Nunca retorna a chave completa — `maskProviderKey()` |
| POST | `/api/providers/save`, `/test`, `/delete` | Exige sessão (`requireVisionAuth`). Cifrado AES-256-GCM em repouso |

## Billing

| Método | Rota | Auth | Notas |
|---|---|---|---|
| POST | `/api/billing/create-checkout-session`, `/portal`, `/cancel`, `/reactivate` | `requireVisionAuth` | Stripe real |
| GET | `/api/billing/customer`, `/subscription`, `/card` | `requireVisionAuth` | — |
| GET | `/api/billing/status`, `/api/billing/plans` | — | — |
| POST | `/api/billing/hotmart-webhook` | HMAC obrigatório | — |
| GET | `/api/usage/quota` | — | plano lido do banco, nunca do payload do token |

## SSO / Enterprise

| Método | Rota | Notas |
|---|---|---|
| GET/POST | `/api/sso/domains` | admin only |
| DELETE | `/api/sso/domains/:domain` | admin only |

## Saúde / diagnóstico

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/health` | `{ok, version, contracts:{...}}` — `version` é string hardcoded desatualizada (cosmético) |
| GET | `/api/readiness` | status de prontidão |
| GET | `/api/go-core/health` | status do binário go-core |

---

## Padrão de erro / fallback

| Situação | Resposta |
|---|---|
| Rota desconhecida | `404 {ok:false, error, time}` via catch-all `/api/*` |
| Validação de campo falhou | `400 {ok:false, error:'code_especifico', time}` |
| Não autenticado | `401 {ok:false, error:'unauthorized'|'not_authenticated', time}` |
| Conflito (ex.: email já existe) | `409 {ok:false, error, time}` |
| Erro interno | `500 {ok:false, error, message?, time}` |
| Endpoint indisponível por falta de config | `503 {ok:false, available:false, mode:'adapter_not_configured', config_required:[...], time}` |

**Nunca** um endpoint novo pode retornar `200 {ok:true}` sem `anti_stub:true` — convenção obrigatória da casa para nunca ter um endpoint indistinguível de um stub esquecido.

---

## Checklist de aceite

- [x] Contratos com achados reais documentados (job_id vs mission_id, 404-como-pending, result desembrulhado)
- [x] Ações irreversíveis marcadas explicitamente
- [x] Não inventa nenhum endpoint — todos verificados por leitura ou por uso real confirmado no frontend

## Pendências

- Catálogo completo das ~108 rotas não listadas aqui (usadas só pelo legado ou por tooling interno) — não priorizado nesta consolidação, `grep` em `server.js` é a fonte viva.

## Próximos passos

`docs/GIT-PROVIDER-SPEC.md` propõe endpoints genéricos `/api/git/status`/`/api/git/pr` (PLANEJADO) para suportar múltiplos providers Git sem duplicar contrato por provider.

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-09 | Criação — primeiro contrato de API consolidado. |

## Controle de versão

**1.0.0** — 2026-07-09
