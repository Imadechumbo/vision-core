# Hermes Mission Supervisor — V15.5

Multi-Agent Control Plane for Vision Core.

## REGRA ABSOLUTA

**SEM PASS GOLD REAL → não promove, não libera, não marca stable.**

- `evidence_receipt` somente do Go Core
- Backend não pode fabricar evidence
- Hermes não pode inventar estado
- Memória antiga nunca vence scan/evidence atual
- Nenhum agente pode afirmar PASS, CI verde, backend online, deploy permitido ou arquivo alterado sem evidência real

## O que é Hermes Mission Supervisor

Hermes é o supervisor de controle multi-agente que:
- Registra e valida todos os agentes da missão
- Detecta e resolve conflitos entre agentes
- Bloqueia claims de alucinação (afirmações sem evidência real)
- Mantém política de memória baseada em evidência
- Emite decisão final de supervisão (`hermes_final_decision`)

Hermes **não altera arquivos**, **não fabrica evidências**, **não bypassa gates**.

## Agent Registry — 11 Agentes

| ID | Role | Category | Forbidden |
|----|------|----------|-----------|
| PIHarness | mission_runner | execution | promote_stable, deploy, fabricate_evidence |
| Hermes | supervisor_rca | decision | write_files, fabricate_evidence, bypass_gates |
| OpenClaw | planner_orchestrator | decision | apply_patch, approve_pass_gold, deploy |
| Scanner | context_builder | execution | write_files, fabricate_findings |
| PatchEngine | controlled_patch_executor | execution | alter_frontend_without_visual_auth, hardcode_pass_gold, fabricate_receipt |
| Aegis | security_policy_gate | validation | approve_without_scan, bypass_policy |
| GoCore | runtime_truth | validation | deploy, promote_stable, accept_backend_fabricated_evidence |
| PassGoldAuthority | final_evidence_authority | validation | patch_files, accept_failed_gates, approve_without_evidence |
| Archivist | evidence_memory | memory | override_current_scan, turn_hypothesis_into_fact |
| GitHubAgent | pr_ci_controller | governance | merge_without_gate, delete_branch_without_authorization, deploy |
| ReleaseController | release_gate | governance | deploy_without_pass_gold, tag_without_authorization, promote_stable_without_pass_gold |

## Skill Registry — 17 Skills

| ID | Owner | requires_evidence | failure_mode |
|----|-------|-------------------|--------------|
| repo_scan | Scanner | false | SCAN_FAILED |
| syntax_check | Scanner | false | SYNTAX_ERROR |
| go_test | GoCore | true | GO_TEST_FAILED |
| go_build | GoCore | false | GO_BUILD_FAILED |
| runtime_probe | PIHarness | true | BLOCKED_RUNTIME |
| contract_validation | Aegis | true | BLOCKED_EVIDENCE |
| fake_evidence_scan | Aegis | false | BLOCKED_EVIDENCE |
| visual_lock | Aegis | false | BLOCKED_VISUAL |
| frontend_guard | Aegis | false | BLOCKED_VISUAL |
| patch_plan | PatchEngine | false | PATCH_PLAN_FAILED |
| safe_autofix | PatchEngine | true | AUTOFIX_FAILED |
| rollback_check | Scanner | false | ROLLBACK_CHECK_FAILED |
| pr_readiness | GitHubAgent | true | PR_NOT_READY |
| ci_status_check | GitHubAgent | true | CI_CHECK_FAILED |
| memory_record | Archivist | true | MEMORY_RECORD_FAILED |
| conflict_resolution | Hermes | true | CONFLICT_UNRESOLVED |
| anti_hallucination_check | Aegis | true | HALLUCINATION_DETECTED |

## API / Tool Registry — 17 Tools

Write-capable tools (exigem `requires_authorization=true` e `forbidden_in_dry_run=true`):
- `github_api_pr_create`
- `github_api_merge_authorized_only`
- `github_api_deploy_authorized_only`
- `git_tag_authorized_only`
- `stable_promotion_authorized_only`

Read-only tools (write_capable=false):
- `local_shell_readonly`, `git_status`, `git_diff`, `git_fetch`, `github_api_read`
- `node_check`, `go_test`, `go_build`
- `backend_health_probe`, `backend_run_live_probe`
- `visual_lock_tool`, `frontend_guard_tool`

## Memory Policy

```json
{
  "enabled": true,
  "evidence_only": true,
  "stale_context_blocked": true,
  "current_scan_overrides_memory": true,
  "evidence_overrides_agent_claim": true,
  "pass_gold_requires_real_evidence": true
}
```

**Regras:**
1. Memória só registra evidência real
2. Memória antiga nunca vence scan atual
3. Memória antiga nunca vence runtime probe atual
4. Hipótese não vira fato
5. PASS GOLD nunca vem de memória antiga
6. Go Core evidence vence backend-derived evidence
7. Opinião de agente é o nível mais baixo de autoridade

**Hierarquia de autoridade (maior → menor):**
1. `aegis_security_policy`
2. `pass_gold_gate`
3. `go_core_evidence`
4. `runtime_probe_current`
5. `git_diff_current`
6. `scanner_current`
7. `stale_memory`
8. `agent_opinion`

## Anti-Hallucination — validateAgentOutput()

Bloqueia claims não verificáveis:

| Claim | Requer |
|-------|--------|
| `test_pass:true` | `exit_code` ou `log` real |
| `ci_green:true` | GitHub API evidence ou `gh_evidence` |
| `backend_online:true` | health probe real |
| `file_changed:true` | `git diff` não vazio |
| `real_evidence:true` | `evidence_receipt.source === "go-core"` |
| `pass_gold:true` | `evidence_receipt.source === "go-core"` + gates reais passados |
| merge/deploy/tag/stable | autorização explícita |

**Exemplos de bloqueio:**
- "teste PASS" sem log/exit code → `blocked_claims: ["test_pass"]`
- "CI verde" sem GitHub API → `blocked_claims: ["ci_green"]`
- "backend online" sem /api/health → `blocked_claims: ["backend_online"]`
- "evidence real" com `source: "backend"` → `blocked_claims: ["real_evidence"]`
- "PASS GOLD" sem evidence real → `blocked_claims: ["pass_gold"]`

## Conflict Detection — detectAgentConflict()

Conflitos detectados:

| Tipo | Severidade |
|------|-----------|
| `frontend_patch_no_visual_auth` | critical |
| `backend_online_claim_vs_failed_probe` | critical |
| `ci_green_claim_no_ci_status` | high |
| `deploy_allowed_true` | critical |
| `stale_memory_pass_vs_blocked_runtime` | critical |
| `patch_engine_out_of_scope` | critical |
| `github_agent_merge_no_ci_green` | critical |
| `evidence_source_not_go_core` | critical |

## Conflict Resolution — resolveAgentConflict()

**Conservador por definição**: conflito crítico → BLOCK.

| Tipo | Classification |
|------|---------------|
| `deploy_allowed_true` | BLOCKED_POLICY |
| `frontend_patch_no_visual_auth` | BLOCKED_VISUAL |
| `backend_online_claim_vs_failed_probe` | BLOCKED_RUNTIME |
| `ci_green_claim_no_ci_status` | BLOCKED_EVIDENCE |
| `stale_memory_pass_vs_blocked_runtime` | BLOCKED_RUNTIME |
| `patch_engine_out_of_scope` | BLOCKED_POLICY |
| `github_agent_merge_no_ci_green` | BLOCKED_EVIDENCE |
| `evidence_source_not_go_core` | BLOCKED_EVIDENCE |

Hermes **nunca** transforma BLOCKED_RUNTIME em MERGE_READY sozinho.

## Relação com PI Harness

Hermes é integrado ao PI Harness V15.5:
- Contexto criado no início da missão
- Evento registrado por camada (D0–D8)
- Claims finais validados com `validateAgentOutput()`
- Conflitos detectados e resolvidos com `detectAgentConflict()` / `resolveAgentConflict()`
- `hermes_final_decision` reflete estado real honesto

## Relação com Go Core Evidence

- Somente `evidence_receipt.source === "go-core"` é aceito como evidência real
- Backend não pode emitir evidence_receipt próprio
- `pass_gold:true` exige Go Core evidence + gates reais

## Relação com PASS GOLD

PASS GOLD somente se:
1. `evidence_receipt.source === "go-core"` ✓
2. Todos os gates passam ✓
3. `backend_stub === false` ✓
4. `failed_gates === []` ✓
5. `deploy_allowed === false` (sempre)

## Campos JSON hermes_*

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `hermes_supervisor_enabled` | boolean | true sempre |
| `hermes_mission_id` | string | ID único da missão Hermes |
| `hermes_agents_registered` | number | 11 |
| `hermes_skills_registered` | number | 17 |
| `hermes_apis_registered` | number | 17 |
| `hermes_memory_policy` | object | política de memória completa |
| `hermes_conflicts_detected` | number | total de conflitos detectados |
| `hermes_conflicts_resolved` | number | total de conflitos resolvidos |
| `hermes_agent_outputs_validated` | number | outputs validados |
| `hermes_hallucination_blocks` | number | claims bloqueadas |
| `hermes_final_decision` | string | PENDING \| MERGE_READY \| BLOCKED_* |

### Enum hermes_final_decision

- `PENDING` — não computado ainda
- `MERGE_READY` — pass_gold_candidate true + todos os gates ok
- `BLOCKED_RUNTIME` — backend offline ou runtime probe falhou
- `BLOCKED_EVIDENCE` — fake evidence ou source ≠ go-core
- `BLOCKED_VISUAL` — visual lock falhou
- `BLOCKED_SYNTAX` — sintaxe inválida
- `BLOCKED_GATES` — gates faltantes
- `BLOCKED_FATAL` — erro fatal na execução

## Proibições Absolutas

- `VISUAL_PATCH_AUTHORIZED` não deve aparecer em pi-harness ou Hermes
- `deploy_allowed: true` nunca pode ser emitido
- `pass_gold: true` nunca pode ser hardcoded
- `promotion_allowed: true` nunca pode ser hardcoded
- Hermes nunca altera frontend, backend ou go-core
- Hermes nunca faz push, PR, tag ou deploy

## V15.6 — Runtime Evidence Wiring

### Novo módulo: `tools/hermes/runtime-evidence.mjs`

Coleta, normaliza e valida evidência de runtime de múltiplas fontes. Separado do supervisor para isolamento de responsabilidades.

### 8 Fontes de Evidência

| Fonte | Trust Level | Descrição |
|-------|-------------|-----------|
| `go_core_evidence_receipt` | **authoritative** | Único receipt válido para PASS GOLD |
| `runtime_probe_actual` | high | Probe real contra backend vivo |
| `github_api_ci` | high | Status CI via GitHub API |
| `git_diff_current` | high | Diff atual do repositório |
| `local_test_exit_code` | medium | Exit code de testes locais |
| `scanner_current_state` | medium | Estado atual do scanner |
| `backend_claim` | low | Claim do backend (não pode fabricar evidence) |
| `memory_snapshot` | lowest | Snapshot de memória passada |
| `agent_claim` | lowest | Afirmação de agente sem evidência |

### 9 Regras de Validação

1. `evidence_receipt.source` deve ser `"go-core"` — única fonte authoritative
2. Backend não pode reivindicar evidence_receipt sem Go Core válido
3. `runtime_probe_pass:true` requer `backend_alive + mission_id + evidence_receipt`
4. CI success sem `evidence_present` → bloqueado
5. `test_suite_pass:true` sem `exit_code` ou `test_total` → bloqueado
6. `deploy_allowed:true` → bloqueio absoluto (`BLOCKED_POLICY`)
7. `pass_gold_candidate:true` sem Go Core evidence → bloqueado
8. Memória antiga com PASS contradizendo `BLOCKED_RUNTIME` → bloqueado
9. Claim de agente contradizendo evidência → bloqueio de alucinação

### Final Recommendation (máximo possível: SUPERVISED_READY)

| Código | Condição |
|--------|----------|
| `BLOCKED_POLICY` | deploy_allowed:true detectado |
| `BLOCKED_RUNTIME` | backend offline / runtime probe falhou |
| `BLOCKED_EVIDENCE` | evidence inválida ou rules 1-5, 7-9 violadas |
| `SUPERVISED_READY` | go_core válido + ≥3 sources presentes, sem erros |

> **Nota:** `MERGE_READY` nunca é emitido pelo runtime evidence — é decisão do supervisor com todos os gates confirmados.

### Novas Funções em `mission-supervisor.mjs`

- `attachRuntimeEvidence(context, runtimeEvidence)` — anexa evidence ao contexto Hermes
- `evaluateHermesEvidence(context)` — computa trust_score, sources e recommendation
- `renderEvidenceGraph(context)` — grafo de nodes/edges de fontes de evidência

### Novos Campos JSON (V15.6)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `hermes_runtime_evidence_enabled` | boolean | sempre true |
| `hermes_evidence_schema_version` | string | "v15.6" |
| `hermes_evidence_trust_score` | number | 0-100 |
| `hermes_evidence_sources_present` | array | fontes com evidence_present=true |
| `hermes_evidence_sources_missing` | array | fontes sem evidência |
| `hermes_evidence_validation_errors` | array | erros das 9 regras |
| `hermes_evidence_validation_warnings` | array | avisos não-bloqueantes |
| `hermes_evidence_graph` | object | grafo de evidências |
| `hermes_runtime_evidence_summary` | object | sumário completo |

## V15.7 — Runtime Evidence Decision Matrix + Release Readiness Gate

### Visão Geral

V15.7 adiciona a Decision Matrix como camada de transformação entre evidências coletadas e decisão de release explícita. A matrix avalia 8 gates, classifica o estado da missão e emite o Release Readiness Gate com score 0-100.

**REGRA ABSOLUTA:** `deploy_allowed`, `promotion_allowed`, `stable_allowed`, `release_allowed` sempre `false`. `release_candidate` é classificação teórica — não executa ação automática.

### Novo Módulo: `tools/hermes/decision-matrix.mjs`

8 exports:

| Função | Descrição |
|--------|-----------|
| `createDecisionMatrix()` | Cria matrix com defaults pessimistas (schema_version v15.7) |
| `evaluateDecisionMatrix(runtimeEvidence, hermesContext)` | Avalia 8 gates e determina decision_state |
| `evaluateReleaseReadiness(matrix, runtimeEvidence, hermesContext)` | Score 0-100, 3 levels, required_authorization |
| `normalizeBlockingReason(reason)` | Lookup em catalog de 21 razões com severity/gate/message/remediation |
| `deriveRequiredEvidenceChecklist(runtimeEvidence, hermesContext)` | 19 itens de checklist (release_authorization_present sempre false) |
| `deriveSafeNextActions(matrix)` | 4 ações seguras por estado (write_capable=false sempre) |
| `renderDecisionMatrixSummary(matrix)` | Sumário compacto com note classification-only |
| `renderReleaseReadinessGate(readiness)` | Gate de release com required_authorization |

### Decision States

| Estado | Quando |
|--------|--------|
| `BLOCKED_POLICY` | deploy/promotion/stable true, fake evidence, hardcoded, forbidden scope |
| `BLOCKED_RUNTIME` | backend offline, probe falhou, mission_id ausente |
| `BLOCKED_EVIDENCE` | go_core inválido, evidence_receipt ausente ou não go-core |
| `SUPERVISED_READY` | todos os gates locais pass, sem CI externo + sem autorização |
| `RELEASE_CANDIDATE` | teórico — não emitido automaticamente sem autorização explícita |

Policy gate é verificado primeiro — bloqueia imediatamente se violado.

CI gate sempre `pass: false` no harness — verificado externamente via GitHub API.

### Release Readiness Levels

| Level | Score | Estado |
|-------|-------|--------|
| `blocked` | 0 | BLOCKED_* |
| `supervised` | >0 | SUPERVISED_READY |
| `candidate` | >0 | RELEASE_CANDIDATE (teórico) |

Score 0 forçado em qualquer policy violation.

### Novas Funções em `mission-supervisor.mjs` (V15.7)

- `attachDecisionMatrix(context, matrix)` — anexa decision matrix ao contexto Hermes
- `evaluateHermesDecision(context)` — avalia decision matrix + release readiness gate, atualiza ctx
- `renderDecisionMatrixGraph(context)` — grafo da decision matrix com gates e blocking reasons

### Novos Campos JSON (V15.7)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `hermes_decision_matrix_enabled` | boolean | sempre true |
| `hermes_decision_matrix_schema_version` | string | "v15.7" |
| `hermes_decision_state` | string | BLOCKED_RUNTIME / BLOCKED_EVIDENCE / BLOCKED_POLICY / SUPERVISED_READY |
| `hermes_release_readiness` | string | blocked / supervised / candidate |
| `hermes_release_candidate` | boolean | sempre false |
| `hermes_decision_score` | number | 0-100 |
| `hermes_decision_blocking_reasons` | array | IDs das razões bloqueantes |
| `hermes_required_evidence` | array | IDs dos 19 itens de checklist |
| `hermes_safe_next_actions` | array | IDs das 4 ações seguras do estado atual |
| `hermes_release_gate` | object | Release Readiness Gate renderizado |
| `hermes_deploy_allowed` | boolean | sempre false |
| `hermes_promotion_allowed` | boolean | sempre false |
| `hermes_stable_allowed` | boolean | sempre false |

### Novos Campos em `renderHermesSupervisionReport` (V15.7)

`DECISION_MATRIX`, `DECISION_MATRIX_SUMMARY`, `RELEASE_READINESS_GATE`, `DECISION_STATE`, `DECISION_BLOCKING_REASONS`, `DECISION_SAFE_NEXT_ACTIONS`, `RELEASE_CANDIDATE`, `DEPLOY_ALLOWED`, `PROMOTION_ALLOWED`, `STABLE_ALLOWED`, `RELEASE_ALLOWED`

Todos os campos de deploy/promotion/stable sempre `false`.

## V15.8 — Runtime Evidence Authorization Layer

### Objetivo

Separar readiness técnico de autorização humana/operacional. A camada modela, valida e reporta autorização — não executa ação.

**authorization is modeled, not executed — explicit authorization is required — deploy/tag/stable remain blocked in V15.8**

### Módulo: `tools/hermes/authorization-layer.mjs`

| Export | Descrição |
|---|---|
| `createAuthorizationManifest()` | Cria manifest com `status: AUTHORIZATION_MISSING` |
| `createAuthorizationPolicy()` | Política com forbidden_actions e invariants todos false |
| `validateAuthorizationManifest(manifest, ev, dm)` | Valida manifest — retorna status + invariants |
| `evaluateAuthorizationLayer(manifest, dm, ev, ctx)` | Avalia camada completa — retorna deploy_allowed=false sempre |
| `deriveAuthorizationRequirements(dm, ev)` | Checklist de 9 itens de autorização necessária |
| `deriveAuthorizationAuditTrail(manifest, validation, dm)` | Trail de auditoria com eventos mínimos |
| `renderAuthorizationSummary(authLayer)` | Resumo para report humano |
| `renderAuthorizationGate(authLayer)` | Gate para output JSON |

### Estados de Autorização

| Status | Condição |
|---|---|
| `AUTHORIZATION_MISSING` | Manifest ausente — default |
| `AUTHORIZATION_INVALID` | Schema errado ou action inválida |
| `AUTHORIZATION_PARTIAL` | Falta approval ou evidence_refs crítico |
| `AUTHORIZATION_VALID` | Todas as validações passaram |
| `AUTHORIZATION_REJECTED` | Ao menos um approver rejeitou |
| `AUTHORIZATION_EXPIRED` | `expires_at` no passado |

### Invariantes — Sempre False

Independente do status de autorização:

- `deploy_allowed: false`
- `promotion_allowed: false`
- `stable_allowed: false`
- `release_allowed: false`
- `tag_allowed: false`

### Regras de Autorização vs. Decision State

| Decision State | release_authorized | deploy_authorized |
|---|---|---|
| `BLOCKED_*` | false | false |
| `SUPERVISED_READY` + valid auth | true | false |
| `RELEASE_CANDIDATE` + valid auth | true | true (mas deploy_allowed=false) |

### Novos Exports no Supervisor (V15.8)

- `attachAuthorizationLayer(context, authLayer)` — annexa ao contexto Hermes
- `evaluateHermesAuthorization(context, manifest)` — avalia e anexa camada de autorização
- `renderAuthorizationGraph(context)` — graph schema v15.8

### CLI: `--authorization-manifest <path>`

Opção segura para injetar manifest JSON. Se ausente → `AUTHORIZATION_MISSING`. Se inválido → `AUTHORIZATION_INVALID`. Nunca executa deploy/tag/stable.

### Novos Campos JSON (V15.8)

`hermes_authorization_layer_enabled`, `hermes_authorization_schema_version`, `hermes_authorization_status`, `hermes_authorization_valid`, `hermes_authorization_requirements`, `hermes_authorization_missing`, `hermes_authorization_errors`, `hermes_authorization_warnings`, `hermes_authorization_audit_trail`, `hermes_authorization_gate`, `hermes_release_authorized`, `hermes_deploy_authorized`, `hermes_tag_authorized`, `hermes_stable_promotion_authorized`, `hermes_release_allowed`, `hermes_deploy_allowed`, `hermes_tag_allowed`, `hermes_stable_allowed`

Todos os campos `*_allowed` sempre `false`.

---

## V15.9 — Authorization Manifest Test Harness + Signed Approval Simulation

### Módulo: `tools/hermes/authorization-harness.mjs`

| Export | Descrição |
|---|---|
| `loadAuthorizationFixture(name)` | Carrega fixture JSON de `tools/fixtures/authorization/` |
| `listAuthorizationFixtures()` | Lista todas as fixtures disponíveis |
| `createSignedApprovalSimulation(manifest, opts)` | Adiciona bloco de assinatura simulada (sha256, não produção) |
| `verifySignedApprovalSimulation(manifest)` | Verifica assinatura simulada, detecta tampering |
| `runAuthorizationScenario(name, opts)` | Executa cenário individual, retorna resultado com invariantes |
| `runAuthorizationScenarioMatrix(opts)` | Executa todos os 10 cenários, retorna matrix summary |
| `renderAuthorizationScenarioReport(matrix)` | Renderiza relatório de cenários |
| `createAuthorizationScenarioSummary(matrix)` | Cria sumário compacto |

### Fixtures (`tools/fixtures/authorization/`)

| Fixture | Status Esperado |
|---|---|
| `invalid-schema.json` | `AUTHORIZATION_INVALID` |
| `invalid-action.json` | `AUTHORIZATION_INVALID` |
| `partial-missing-approval.json` | `AUTHORIZATION_PARTIAL` |
| `partial-missing-evidence.json` | `AUTHORIZATION_PARTIAL` |
| `valid-release-review.json` | `AUTHORIZATION_VALID` |
| `rejected-release-review.json` | `AUTHORIZATION_REJECTED` |
| `expired-release-review.json` | `AUTHORIZATION_EXPIRED` |
| `signed-simulated-release-review.json` | `AUTHORIZATION_VALID` + `signature_valid=true` (assinatura adicionada em runtime) |

### Scenario Matrix (10 cenários)

| Cenário | Status Esperado |
|---|---|
| `missing_manifest` | `AUTHORIZATION_MISSING` |
| `invalid_schema` | `AUTHORIZATION_INVALID` |
| `invalid_action` | `AUTHORIZATION_INVALID` |
| `partial_missing_approval` | `AUTHORIZATION_PARTIAL` |
| `partial_missing_evidence` | `AUTHORIZATION_PARTIAL` |
| `valid_release_review` | `AUTHORIZATION_VALID` |
| `rejected_release_review` | `AUTHORIZATION_REJECTED` |
| `expired_release_review` | `AUTHORIZATION_EXPIRED` |
| `signed_simulated_release_review` | `AUTHORIZATION_VALID` + `signature_valid=true` |
| `tampered_signature` | `AUTHORIZATION_INVALID` + `signature_valid=false` |

### Signed Approval Simulation

Assinatura **simulada e determinística** para teste. Não utiliza chave criptográfica real de produção.

- Algoritmo: `simulation-sha256`
- `payload_hash` = `sha256(canonical_manifest_json)`
- `signature_value` = `sha256(payload_hash + "::simulation::" + signed_by)`
- `simulation: true` sempre presente
- Tampering detectado por divergência de `payload_hash` ou `signature_value`

**Invariante**: assinatura válida (`signature_valid=true`) **não libera** `deploy_allowed`, `release_allowed`, `tag_allowed`, ou `stable_allowed`. Todos permanecem `false`.

### CLI Flags V15.9

```
--authorization-scenario <name>       Roda cenário específico, inclui resultado no JSON
--authorization-scenario-matrix       Roda todos os 10 cenários, inclui matrix no JSON
```

### Campos JSON V15.9

`hermes_authorization_harness_enabled`, `hermes_authorization_harness_schema_version` (`v15.9`),
`hermes_authorization_scenario`, `hermes_authorization_scenario_status`,
`hermes_authorization_signature_present`, `hermes_authorization_signature_valid`,
`hermes_authorization_scenario_matrix`, `hermes_authorization_scenario_total`,
`hermes_authorization_scenario_passed`, `hermes_authorization_scenario_failed`,
`hermes_authorization_all_safe`, `hermes_authorization_all_allowed_flags_false`

### Por que deploy/tag/stable permanecem bloqueados

`authorization_valid=true` e `signature_valid=true` **não executam** deploy, tag, ou stable. A autorização é modelada, não executada. Sem PASS GOLD real (evidence_receipt do Go Core), nenhuma ação de release é liberada.

