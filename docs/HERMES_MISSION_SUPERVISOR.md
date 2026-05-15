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
