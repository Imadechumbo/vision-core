#!/usr/bin/env node
/**
 * Hermes Mission Supervisor — V15.5
 * Multi-Agent Control Plane for Vision Core
 *
 * REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não stable.
 * Evidence receipt somente do Go Core.
 * Memória antiga nunca vence scan/evidence atual.
 */

const HERMES_VERSION = 'V15.6';

// ═══════════════════════════════════════════════════════════════════
// AGENT REGISTRY — 11 agents obrigatórios
// ═══════════════════════════════════════════════════════════════════

function loadAgentRegistry() {
  return [
    {
      id: 'PIHarness',
      role: 'mission_runner',
      category: 'execution',
      allowed_actions: ['route_difficulty', 'run_layers', 'collect_report'],
      forbidden_actions: ['promote_stable', 'deploy', 'fabricate_evidence'],
    },
    {
      id: 'Hermes',
      role: 'supervisor_rca',
      category: 'decision',
      allowed_actions: ['diagnose', 'validate_outputs', 'detect_conflicts', 'issue_supervisor_decision'],
      forbidden_actions: ['write_files', 'fabricate_evidence', 'bypass_gates'],
    },
    {
      id: 'OpenClaw',
      role: 'planner_orchestrator',
      category: 'decision',
      allowed_actions: ['classify_intent', 'create_task_plan', 'route_agents'],
      forbidden_actions: ['apply_patch', 'approve_pass_gold', 'deploy'],
    },
    {
      id: 'Scanner',
      role: 'context_builder',
      category: 'execution',
      allowed_actions: ['read_files', 'inspect_contracts', 'detect_current_state'],
      forbidden_actions: ['write_files', 'fabricate_findings'],
    },
    {
      id: 'PatchEngine',
      role: 'controlled_patch_executor',
      category: 'execution',
      allowed_actions: ['propose_patch', 'apply_authorized_patch', 'report_diff'],
      forbidden_actions: ['alter_frontend_without_visual_auth', 'hardcode_pass_gold', 'fabricate_receipt'],
    },
    {
      id: 'Aegis',
      role: 'security_policy_gate',
      category: 'validation',
      allowed_actions: ['scan_secrets', 'enforce_scope', 'block_unsafe_action'],
      forbidden_actions: ['approve_without_scan', 'bypass_policy'],
    },
    {
      id: 'GoCore',
      role: 'runtime_truth',
      category: 'validation',
      allowed_actions: ['emit_mission_id', 'emit_evidence_receipt', 'validate_runtime'],
      forbidden_actions: ['deploy', 'promote_stable', 'accept_backend_fabricated_evidence'],
    },
    {
      id: 'PassGoldAuthority',
      role: 'final_evidence_authority',
      category: 'validation',
      allowed_actions: ['evaluate_gates', 'block_promotion', 'approve_only_with_real_evidence'],
      forbidden_actions: ['patch_files', 'accept_failed_gates', 'approve_without_evidence'],
    },
    {
      id: 'Archivist',
      role: 'evidence_memory',
      category: 'memory',
      allowed_actions: ['record_evidence', 'record_decisions', 'flag_stale_memory'],
      forbidden_actions: ['override_current_scan', 'turn_hypothesis_into_fact'],
    },
    {
      id: 'GitHubAgent',
      role: 'pr_ci_controller',
      category: 'governance',
      allowed_actions: ['read_ci', 'open_pr_when_authorized', 'publish_status'],
      forbidden_actions: ['merge_without_gate', 'delete_branch_without_authorization', 'deploy'],
    },
    {
      id: 'ReleaseController',
      role: 'release_gate',
      category: 'governance',
      allowed_actions: ['prepare_release_when_authorized'],
      forbidden_actions: ['deploy_without_pass_gold', 'tag_without_authorization', 'promote_stable_without_pass_gold'],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// SKILL REGISTRY — 17 skills obrigatórias
// ═══════════════════════════════════════════════════════════════════

function loadSkillRegistry() {
  return [
    {
      id: 'repo_scan',
      owner_agent: 'Scanner',
      requires_evidence: false,
      allowed_tools: ['local_shell_readonly', 'git_status', 'git_diff'],
      outputs: ['file_list', 'scan_report'],
      failure_mode: 'SCAN_FAILED',
    },
    {
      id: 'syntax_check',
      owner_agent: 'Scanner',
      requires_evidence: false,
      allowed_tools: ['node_check'],
      outputs: ['syntax_result'],
      failure_mode: 'SYNTAX_ERROR',
    },
    {
      id: 'go_test',
      owner_agent: 'GoCore',
      requires_evidence: true,
      allowed_tools: ['go_test'],
      outputs: ['test_result', 'test_log'],
      failure_mode: 'GO_TEST_FAILED',
    },
    {
      id: 'go_build',
      owner_agent: 'GoCore',
      requires_evidence: false,
      allowed_tools: ['go_build'],
      outputs: ['binary_path', 'build_result'],
      failure_mode: 'GO_BUILD_FAILED',
    },
    {
      id: 'runtime_probe',
      owner_agent: 'PIHarness',
      requires_evidence: true,
      allowed_tools: ['backend_health_probe', 'backend_run_live_probe'],
      outputs: ['probe_result', 'evidence_receipt'],
      failure_mode: 'BLOCKED_RUNTIME',
    },
    {
      id: 'contract_validation',
      owner_agent: 'Aegis',
      requires_evidence: true,
      allowed_tools: ['local_shell_readonly', 'node_check'],
      outputs: ['contract_result', 'validation_errors'],
      failure_mode: 'BLOCKED_EVIDENCE',
    },
    {
      id: 'fake_evidence_scan',
      owner_agent: 'Aegis',
      requires_evidence: false,
      allowed_tools: ['local_shell_readonly', 'git_diff'],
      outputs: ['scan_hits', 'scan_clean'],
      failure_mode: 'BLOCKED_EVIDENCE',
    },
    {
      id: 'visual_lock',
      owner_agent: 'Aegis',
      requires_evidence: false,
      allowed_tools: ['visual_lock_tool'],
      outputs: ['lock_result'],
      failure_mode: 'BLOCKED_VISUAL',
    },
    {
      id: 'frontend_guard',
      owner_agent: 'Aegis',
      requires_evidence: false,
      allowed_tools: ['frontend_guard_tool'],
      outputs: ['guard_result'],
      failure_mode: 'BLOCKED_VISUAL',
    },
    {
      id: 'patch_plan',
      owner_agent: 'PatchEngine',
      requires_evidence: false,
      allowed_tools: ['local_shell_readonly', 'git_diff'],
      outputs: ['patch_proposal'],
      failure_mode: 'PATCH_PLAN_FAILED',
    },
    {
      id: 'safe_autofix',
      owner_agent: 'PatchEngine',
      requires_evidence: true,
      allowed_tools: ['local_shell_readonly', 'git_diff', 'git_status'],
      outputs: ['fix_result', 'files_changed'],
      failure_mode: 'AUTOFIX_FAILED',
    },
    {
      id: 'rollback_check',
      owner_agent: 'Scanner',
      requires_evidence: false,
      allowed_tools: ['git_status', 'git_diff'],
      outputs: ['rollback_safe'],
      failure_mode: 'ROLLBACK_CHECK_FAILED',
    },
    {
      id: 'pr_readiness',
      owner_agent: 'GitHubAgent',
      requires_evidence: true,
      allowed_tools: ['github_api_read', 'git_status', 'git_diff'],
      outputs: ['pr_ready_result'],
      failure_mode: 'PR_NOT_READY',
    },
    {
      id: 'ci_status_check',
      owner_agent: 'GitHubAgent',
      requires_evidence: true,
      allowed_tools: ['github_api_read'],
      outputs: ['ci_status'],
      failure_mode: 'CI_CHECK_FAILED',
    },
    {
      id: 'memory_record',
      owner_agent: 'Archivist',
      requires_evidence: true,
      allowed_tools: ['local_shell_readonly'],
      outputs: ['memory_entry'],
      failure_mode: 'MEMORY_RECORD_FAILED',
    },
    {
      id: 'conflict_resolution',
      owner_agent: 'Hermes',
      requires_evidence: true,
      allowed_tools: ['local_shell_readonly', 'git_status'],
      outputs: ['resolution', 'conflict_report'],
      failure_mode: 'CONFLICT_UNRESOLVED',
    },
    {
      id: 'anti_hallucination_check',
      owner_agent: 'Aegis',
      requires_evidence: true,
      allowed_tools: ['local_shell_readonly'],
      outputs: ['blocked_claims', 'ok'],
      failure_mode: 'HALLUCINATION_DETECTED',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// API / TOOL REGISTRY — 17 tools obrigatórias
// ═══════════════════════════════════════════════════════════════════

function loadApiRegistry() {
  return [
    {
      id: 'local_shell_readonly',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: false,
    },
    {
      id: 'git_status',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'git_diff',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'git_fetch',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: false,
    },
    {
      id: 'github_api_read',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'github_api_pr_create',
      allowed: true,
      write_capable: true,
      requires_authorization: true,
      forbidden_in_dry_run: true,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'github_api_merge_authorized_only',
      allowed: true,
      write_capable: true,
      requires_authorization: true,
      forbidden_in_dry_run: true,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'github_api_deploy_authorized_only',
      allowed: true,
      write_capable: true,
      requires_authorization: true,
      forbidden_in_dry_run: true,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'git_tag_authorized_only',
      allowed: true,
      write_capable: true,
      requires_authorization: true,
      forbidden_in_dry_run: true,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'stable_promotion_authorized_only',
      allowed: true,
      write_capable: true,
      requires_authorization: true,
      forbidden_in_dry_run: true,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'node_check',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: false,
    },
    {
      id: 'go_test',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'go_build',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: false,
    },
    {
      id: 'backend_health_probe',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'backend_run_live_probe',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'visual_lock_tool',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
    {
      id: 'frontend_guard_tool',
      allowed: true,
      write_capable: false,
      requires_authorization: false,
      forbidden_in_dry_run: false,
      output_must_be_cited_in_report: true,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// MEMORY POLICY
// ═══════════════════════════════════════════════════════════════════

function loadMemoryPolicy() {
  return {
    enabled: true,
    evidence_only: true,
    stale_context_blocked: true,
    current_scan_overrides_memory: true,
    evidence_overrides_agent_claim: true,
    pass_gold_requires_real_evidence: true,
    rules: [
      'memory_only_stores_real_evidence',
      'stale_memory_never_overrides_current_scan',
      'stale_memory_never_overrides_runtime_probe',
      'hypothesis_never_becomes_fact',
      'pass_gold_never_from_stale_memory',
      'go_core_evidence_overrides_backend_evidence',
      'agent_opinion_is_lowest_authority',
    ],
    authority_hierarchy: [
      'aegis_security_policy',
      'pass_gold_gate',
      'go_core_evidence',
      'runtime_probe_current',
      'git_diff_current',
      'scanner_current',
      'stale_memory',
      'agent_opinion',
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
// HERMES CONFIG
// ═══════════════════════════════════════════════════════════════════

function loadHermesConfig() {
  return {
    version: HERMES_VERSION,
    supervisor: 'hermes',
    enabled: true,
    agents_count: 11,
    skills_count: 17,
    apis_count: 17,
    rules: {
      no_hardcoded_pass_gold: true,
      no_hardcoded_deploy_allowed: true,
      no_hardcoded_promotion_allowed: true,
      evidence_only_from_go_core: true,
      backend_cannot_fabricate_evidence: true,
      memory_cannot_override_current_scan: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// MISSION CONTEXT
// ═══════════════════════════════════════════════════════════════════

function createHermesMissionContext() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const mission_id = `hermes_${ts}_${rand}`;
  return {
    mission_id,
    supervisor: 'hermes',
    enabled: true,
    version: HERMES_VERSION,
    agents: loadAgentRegistry(),
    skills: loadSkillRegistry(),
    apis: loadApiRegistry(),
    memory_policy: loadMemoryPolicy(),
    events: [],
    conflicts_detected: [],
    conflicts_resolved: [],
    hallucination_blocks: [],
    decisions: [],
    final_decision: 'PENDING',
    agent_outputs_validated: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EVENT RECORDING
// ═══════════════════════════════════════════════════════════════════

function recordHermesEvent(context, event) {
  if (!context || !event) return;
  context.events.push({
    timestamp: Date.now(),
    ...event,
  });
}

// ═══════════════════════════════════════════════════════════════════
// ANTI-HALLUCINATION: validateAgentOutput
// ═══════════════════════════════════════════════════════════════════

function validateAgentOutput(agentOutput, missionEvidence) {
  const errors = [];
  const warnings = [];
  const blocked_claims = [];

  if (!agentOutput || typeof agentOutput !== 'object') {
    return { ok: false, errors: ['agentOutput deve ser object'], warnings: [], blocked_claims: [] };
  }

  const ev = missionEvidence || {};

  // test_pass: requer exit_code ou log real
  if (agentOutput.test_pass === true) {
    const hasExitCode = ev.exit_code !== undefined && ev.exit_code !== null;
    const hasLog = typeof ev.log === 'string' && ev.log.length > 0;
    if (!hasExitCode && !hasLog) {
      errors.push('test_pass:true sem exit_code ou log — claim não verificável');
      blocked_claims.push('test_pass');
    }
  }

  // ci_green: requer GitHub API evidence ou gh evidence
  if (agentOutput.ci_green === true) {
    const hasGithubApi =
      ev.github_api_evidence === true ||
      (ev.github_api_evidence && typeof ev.github_api_evidence === 'object');
    const hasGhEvidence = ev.gh_evidence === true;
    if (!hasGithubApi && !hasGhEvidence) {
      errors.push('ci_green:true sem GitHub API ou gh evidence — claim não verificável');
      blocked_claims.push('ci_green');
    }
  }

  // backend_online: requer health probe
  if (agentOutput.backend_online === true) {
    const hasHealthProbe =
      ev.health_probe === true ||
      (ev.health_probe && typeof ev.health_probe === 'object' && ev.health_probe.ok !== false);
    if (!hasHealthProbe) {
      errors.push('backend_online:true sem health probe — claim não verificável');
      blocked_claims.push('backend_online');
    }
  }

  // file_changed: requer git diff
  if (agentOutput.file_changed === true) {
    const hasGitDiff = typeof ev.git_diff === 'string' && ev.git_diff.length > 0;
    if (!hasGitDiff) {
      errors.push('file_changed:true sem git diff — claim não verificável');
      blocked_claims.push('file_changed');
    }
  }

  // real_evidence: requer evidence_receipt.source === "go-core"
  if (agentOutput.real_evidence === true) {
    const receiptSource = ev.evidence_receipt?.source;
    if (receiptSource !== 'go-core') {
      errors.push(`real_evidence:true sem evidence_receipt.source=go-core (source="${receiptSource}") — claim bloqueada`);
      blocked_claims.push('real_evidence');
    }
  }

  // pass_gold: requer evidence real (go-core) E gates reais passados
  if (agentOutput.pass_gold === true) {
    const receiptSource = ev.evidence_receipt?.source;
    const hasRealEvidence = receiptSource === 'go-core';
    const gatesPass =
      ev.gates_pass === true ||
      (Array.isArray(ev.failed_gates) && ev.failed_gates.length === 0 && ev.gates_evaluated === true);
    if (!hasRealEvidence || !gatesPass) {
      const reasons = [];
      if (!hasRealEvidence) reasons.push(`evidence_receipt.source="${receiptSource}" ≠ go-core`);
      if (!gatesPass) reasons.push('gates_pass não confirmado com evidência real');
      errors.push(`pass_gold:true bloqueado: ${reasons.join(', ')}`);
      blocked_claims.push('pass_gold');
    }
  }

  // Ações de release sem autorização explícita
  for (const action of ['merge', 'deploy', 'tag', 'stable']) {
    if (agentOutput[action] === true) {
      const authorized = ev[`${action}_authorized`] === true;
      if (!authorized) {
        errors.push(`${action}:true sem autorização explícita — ação bloqueada`);
        if (!blocked_claims.includes('release_action')) {
          blocked_claims.push('release_action');
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    blocked_claims,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectAgentConflict(agentA, agentB, evidence) {
  const conflicts = [];
  const ev = evidence || {};
  const claimA = agentA?.claim || {};
  const claimB = agentB?.claim || {};

  // frontend patch sem visual auth
  const hasFrontendPatch =
    (agentA.id === 'PatchEngine' && claimA.frontend_patch === true) ||
    (agentB.id === 'PatchEngine' && claimB.frontend_patch === true);
  if (hasFrontendPatch && !ev.visual_auth) {
    conflicts.push({
      type: 'frontend_patch_no_visual_auth',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: 'PatchEngine propõe patch em frontend sem autorização visual',
    });
  }

  // backend_online claim vs health probe failure
  const hasOnlineClaim = claimA.backend_online === true || claimB.backend_online === true;
  const healthFailed = ev.health_probe === false || ev.health_probe_ok === false;
  if (hasOnlineClaim && healthFailed) {
    conflicts.push({
      type: 'backend_online_claim_vs_failed_probe',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: 'Agente afirma backend_online:true mas health probe falhou',
    });
  }

  // CI green claim sem CI status
  const hasCiClaim = claimA.ci_green === true || claimB.ci_green === true;
  const noCiStatus = !ev.ci_status && ev.github_api_evidence !== true;
  if (hasCiClaim && noCiStatus) {
    conflicts.push({
      type: 'ci_green_claim_no_ci_status',
      agents: [agentA.id, agentB.id],
      severity: 'high',
      detail: 'Agente afirma ci_green:true sem CI status evidence',
    });
  }

  // deploy_allowed:true — bloqueio crítico absoluto
  const hasDeployClaim =
    claimA.deploy_allowed === true ||
    claimB.deploy_allowed === true ||
    ev.deploy_allowed === true;
  if (hasDeployClaim) {
    conflicts.push({
      type: 'deploy_allowed_true',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: 'deploy_allowed:true detectado — bloqueio crítico absoluto',
    });
  }

  // memória antiga PASS vs BLOCKED_RUNTIME atual
  const hasStalePass = claimA.stale_pass === true || claimB.stale_pass === true;
  const isBlockedRuntime =
    ev.runtime_blocked === true || ev.recommendation === 'BLOCKED_RUNTIME';
  if (hasStalePass && isBlockedRuntime) {
    conflicts.push({
      type: 'stale_memory_pass_vs_blocked_runtime',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: 'Memória antiga diz PASS mas runtime atual está BLOCKED_RUNTIME',
    });
  }

  // PatchEngine fora de escopo
  const patcherOutOfScope =
    (agentA.id === 'PatchEngine' && Array.isArray(claimA.files_out_of_scope) && claimA.files_out_of_scope.length > 0) ||
    (agentB.id === 'PatchEngine' && Array.isArray(claimB.files_out_of_scope) && claimB.files_out_of_scope.length > 0);
  if (patcherOutOfScope) {
    const patchClaim = agentA.id === 'PatchEngine' ? claimA : claimB;
    conflicts.push({
      type: 'patch_engine_out_of_scope',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: `PatchEngine propõe arquivos fora de escopo: ${(patchClaim.files_out_of_scope || []).join(', ')}`,
    });
  }

  // GitHubAgent quer merge sem CI verde
  const ghWantsMerge =
    (agentA.id === 'GitHubAgent' && claimA.wants_merge === true) ||
    (agentB.id === 'GitHubAgent' && claimB.wants_merge === true);
  if (ghWantsMerge && !ev.ci_green) {
    conflicts.push({
      type: 'github_agent_merge_no_ci_green',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: 'GitHubAgent quer merge sem CI verde confirmado',
    });
  }

  // evidence_source não é go-core
  if (ev.evidence_source && ev.evidence_source !== 'go-core') {
    conflicts.push({
      type: 'evidence_source_not_go_core',
      agents: [agentA.id, agentB.id],
      severity: 'critical',
      detail: `evidence_source="${ev.evidence_source}" deve ser go-core`,
    });
  }

  if (conflicts.length === 0) return null;
  return conflicts.length === 1 ? conflicts[0] : conflicts;
}

// ═══════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION — conservador por definição
// ═══════════════════════════════════════════════════════════════════

function resolveAgentConflict(conflict) {
  if (!conflict) return { action: 'ALLOW', reason: 'no_conflict', resolutions: [], total_conflicts: 0 };

  const conflicts = Array.isArray(conflict) ? conflict : [conflict];
  const resolutions = [];

  for (const c of conflicts) {
    let action = 'BLOCK';
    let reason = 'unknown_conflict';
    let classification = 'BLOCKED_POLICY';

    switch (c.type) {
      case 'deploy_allowed_true':
        action         = 'BLOCK';
        reason         = 'deploy_allowed:true é bloqueio absoluto irrevogável';
        classification = 'BLOCKED_POLICY';
        break;
      case 'frontend_patch_no_visual_auth':
        action         = 'BLOCK';
        reason         = 'Patch frontend requer autorização visual explícita';
        classification = 'BLOCKED_VISUAL';
        break;
      case 'backend_online_claim_vs_failed_probe':
        action         = 'BLOCK';
        reason         = 'Health probe falhou — backend_online:true não verificável';
        classification = 'BLOCKED_RUNTIME';
        break;
      case 'ci_green_claim_no_ci_status':
        action         = 'BLOCK';
        reason         = 'CI status não confirmado por GitHub API — ci_green bloqueado';
        classification = 'BLOCKED_EVIDENCE';
        break;
      case 'stale_memory_pass_vs_blocked_runtime':
        action         = 'BLOCK';
        reason         = 'Runtime atual BLOCKED_RUNTIME vence memória antiga';
        classification = 'BLOCKED_RUNTIME';
        break;
      case 'patch_engine_out_of_scope':
        action         = 'BLOCK';
        reason         = 'PatchEngine fora de escopo — patch bloqueado pela política';
        classification = 'BLOCKED_POLICY';
        break;
      case 'github_agent_merge_no_ci_green':
        action         = 'BLOCK';
        reason         = 'Merge sem CI verde — bloqueado pela política';
        classification = 'BLOCKED_EVIDENCE';
        break;
      case 'evidence_source_not_go_core':
        action         = 'BLOCK';
        reason         = 'evidence_source deve ser go-core — evidência bloqueada';
        classification = 'BLOCKED_EVIDENCE';
        break;
      default:
        action         = 'BLOCK';
        reason         = `Conflito desconhecido: ${c.type} — bloqueio conservador`;
        classification = 'BLOCKED_POLICY';
    }

    resolutions.push({ conflict: c, action, reason, classification });
  }

  const primaryResolution = resolutions[0];
  return {
    action: 'BLOCK',
    reason: primaryResolution.reason,
    classification: primaryResolution.classification,
    resolutions,
    critical_count: resolutions.filter(r => r.conflict.severity === 'critical').length,
    total_conflicts: resolutions.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISION REPORT RENDERER
// ═══════════════════════════════════════════════════════════════════

function renderHermesSupervisionReport(context) {
  if (!context) return null;

  const evidEval = evaluateHermesEvidence(context);
  const graph    = renderEvidenceGraph(context);

  return {
    SUPERVISOR_ENABLED:            context.enabled,
    MISSION_ID:                    context.mission_id,
    AGENTS_REGISTERED:             context.agents.length,
    SKILLS_REGISTERED:             context.skills.length,
    APIS_REGISTERED:               context.apis.length,
    MEMORY_POLICY:                 context.memory_policy,
    AGENT_OUTPUTS_VALIDATED:       context.agent_outputs_validated,
    CONFLICTS_DETECTED:            context.conflicts_detected.length,
    CONFLICTS_RESOLVED:            context.conflicts_resolved.length,
    HALLUCINATION_BLOCKS:          context.hallucination_blocks.length,
    FINAL_SUPERVISOR_DECISION:     context.final_decision,
    RUNTIME_EVIDENCE:              context.runtime_evidence      || null,
    EVIDENCE_TRUST_SCORE:          evidEval.trust_score,
    EVIDENCE_SOURCES_PRESENT:      evidEval.sources_present,
    EVIDENCE_SOURCES_MISSING:      evidEval.sources_missing,
    EVIDENCE_VALIDATION_ERRORS:    evidEval.validation_errors,
    EVIDENCE_VALIDATION_WARNINGS:  evidEval.validation_warnings,
    EVIDENCE_GRAPH:                graph,
  };
}

// ═══════════════════════════════════════════════════════════════════
// V15.6 — RUNTIME EVIDENCE INTEGRATION
// ═══════════════════════════════════════════════════════════════════

function attachRuntimeEvidence(context, runtimeEvidence) {
  if (!context) return;
  context.runtime_evidence        = runtimeEvidence   || null;
  context.runtime_evidence_attached = true;
  context.runtime_evidence_at     = Date.now();
}

function evaluateHermesEvidence(context) {
  if (!context) {
    return {
      trust_score:          0,
      sources_present:      [],
      sources_missing:      [],
      validation_errors:    ['context is null'],
      validation_warnings:  [],
      final_recommendation: 'BLOCKED_EVIDENCE',
      deploy_allowed:       false,
    };
  }

  const ev  = context.runtime_evidence;
  const src = ev?.sources || {};

  const sources_present = Object.entries(src)
    .filter(([, v]) => v && v.evidence_present === true)
    .map(([k]) => k);
  const sources_missing = Object.entries(src)
    .filter(([, v]) => !v || !v.evidence_present)
    .map(([k]) => k);

  const goCore  = src.go_core  || {};
  const runtime = src.runtime  || {};
  const errors  = [];
  const warnings = [];

  if (!ev) {
    errors.push('runtime_evidence not attached to context');
  }
  if (ev && goCore.evidence_receipt_source && goCore.evidence_receipt_source !== 'go-core') {
    errors.push(`evidence_receipt.source="${goCore.evidence_receipt_source}" — must be go-core`);
  }
  if (ev && runtime.blocked_runtime) {
    warnings.push('runtime is BLOCKED_RUNTIME — backend not alive');
  }
  if (ev && ev.deploy_allowed === true) {
    errors.push('deploy_allowed:true in evidence — REGRA ABSOLUTA violation');
  }

  let score = 0;
  if (goCore.evidence_present)        score += 40;
  if (runtime.evidence_present)       score += 20;
  if (src.git?.evidence_present)      score += 15;
  if (src.tests?.evidence_present)    score += 10;
  if (src.visual?.evidence_present)   score += 10;
  if (src.security?.evidence_present) score +=  5;
  score -= errors.length * 10;
  const trust_score = Math.max(0, Math.min(100, score));

  let final_recommendation;
  if (ev?.deploy_allowed === true) {
    final_recommendation = 'BLOCKED_POLICY';
  } else if (!ev || runtime.blocked_runtime) {
    final_recommendation = 'BLOCKED_RUNTIME';
  } else if (errors.length > 0) {
    final_recommendation = 'BLOCKED_EVIDENCE';
  } else if (goCore.evidence_receipt_valid && sources_present.length >= 3) {
    final_recommendation = 'SUPERVISED_READY';
  } else {
    final_recommendation = 'BLOCKED_RUNTIME';
  }

  return {
    trust_score,
    sources_present,
    sources_missing,
    validation_errors:   errors,
    validation_warnings: warnings,
    final_recommendation,
    deploy_allowed:      false,
  };
}

function renderEvidenceGraph(context) {
  if (!context) return null;
  const ev = context.runtime_evidence;
  if (!ev) return null;
  const src = ev.sources || {};

  const nodes = Object.entries(src).map(([name, data]) => ({
    source:           name,
    evidence_present: data?.evidence_present || false,
    trust:            ev.trust?.[name] || 'unknown',
  }));

  const edges = [];
  if (src.go_core?.evidence_present) {
    edges.push({ from: 'go_core', to: 'PassGoldAuthority', type: 'authoritative_evidence' });
  }
  if (src.runtime?.evidence_present) {
    edges.push({ from: 'runtime', to: 'Hermes', type: 'runtime_probe_evidence' });
  }
  if (src.git?.evidence_present) {
    edges.push({ from: 'git', to: 'Scanner', type: 'git_diff_evidence' });
  }
  if (src.security?.evidence_present) {
    edges.push({ from: 'security', to: 'Aegis', type: 'security_scan_evidence' });
  }

  return {
    schema_version: 'v15.6',
    mission_id:     ev.mission_id || null,
    nodes,
    edges,
    deploy_allowed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRY VALIDATOR (usado em testes)
// ═══════════════════════════════════════════════════════════════════

function validateHermesRegistries() {
  const agents = loadAgentRegistry();
  const skills = loadSkillRegistry();
  const apis   = loadApiRegistry();
  const errors = [];

  if (agents.length !== 11) errors.push(`agent registry: ${agents.length} agents (esperado 11)`);
  if (skills.length !== 17) errors.push(`skill registry: ${skills.length} skills (esperado 17)`);
  if (apis.length   !== 17) errors.push(`api registry: ${apis.length} apis (esperado 17)`);

  const requiredAgents = [
    'PIHarness', 'Hermes', 'OpenClaw', 'Scanner', 'PatchEngine',
    'Aegis', 'GoCore', 'PassGoldAuthority', 'Archivist', 'GitHubAgent', 'ReleaseController',
  ];
  for (const id of requiredAgents) {
    if (!agents.find(a => a.id === id)) errors.push(`missing agent: ${id}`);
  }

  const agentFields = ['id', 'role', 'category', 'allowed_actions', 'forbidden_actions'];
  for (const agent of agents) {
    for (const field of agentFields) {
      if (!(field in agent)) errors.push(`agent ${agent.id}: missing field ${field}`);
    }
  }

  const requiredSkills = [
    'repo_scan', 'syntax_check', 'go_test', 'go_build', 'runtime_probe',
    'contract_validation', 'fake_evidence_scan', 'visual_lock', 'frontend_guard',
    'patch_plan', 'safe_autofix', 'rollback_check', 'pr_readiness',
    'ci_status_check', 'memory_record', 'conflict_resolution', 'anti_hallucination_check',
  ];
  for (const id of requiredSkills) {
    if (!skills.find(s => s.id === id)) errors.push(`missing skill: ${id}`);
  }

  const skillFields = ['id', 'owner_agent', 'requires_evidence', 'allowed_tools', 'outputs', 'failure_mode'];
  for (const skill of skills) {
    for (const field of skillFields) {
      if (!(field in skill)) errors.push(`skill ${skill.id}: missing field ${field}`);
    }
  }

  const writeCapableAuthorized = [
    'github_api_pr_create',
    'github_api_merge_authorized_only',
    'github_api_deploy_authorized_only',
    'git_tag_authorized_only',
    'stable_promotion_authorized_only',
  ];
  for (const id of writeCapableAuthorized) {
    const api = apis.find(a => a.id === id);
    if (!api) { errors.push(`missing api: ${id}`); continue; }
    if (!api.write_capable) errors.push(`${id}: write_capable deve ser true`);
    if (!api.requires_authorization) errors.push(`${id}: requires_authorization deve ser true`);
  }

  const apiFields = ['id', 'allowed', 'write_capable', 'requires_authorization', 'forbidden_in_dry_run', 'output_must_be_cited_in_report'];
  for (const api of apis) {
    for (const field of apiFields) {
      if (!(field in api)) errors.push(`api ${api.id}: missing field ${field}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export {
  createHermesMissionContext,
  loadHermesConfig,
  loadAgentRegistry,
  loadSkillRegistry,
  loadApiRegistry,
  loadMemoryPolicy,
  validateAgentOutput,
  detectAgentConflict,
  resolveAgentConflict,
  recordHermesEvent,
  renderHermesSupervisionReport,
  validateHermesRegistries,
  attachRuntimeEvidence,
  evaluateHermesEvidence,
  renderEvidenceGraph,
};
