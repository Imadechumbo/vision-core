#!/usr/bin/env node
/**
 * Hermes Decision Matrix — V15.7
 * Runtime Evidence Decision Matrix + Release Readiness Gate
 *
 * REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não stable.
 * deploy_allowed=false, promotion_allowed=false, stable_allowed=false sempre.
 * release_candidate é classificação teórica — não executa ação automaticamente.
 */

const SCHEMA_VERSION = 'v15.7';

// ═══════════════════════════════════════════════════════════════════
// BLOCKING REASONS CATALOG
// ═══════════════════════════════════════════════════════════════════

const BLOCKING_REASONS_CATALOG = {
  runtime_not_ready:             { severity: 'critical', gate: 'runtime',  message: 'Runtime not ready — backend offline or probe failed',          remediation: 'Start backend and run --runtime-probe' },
  backend_offline:               { severity: 'critical', gate: 'runtime',  message: 'Backend is offline',                                           remediation: 'Start local backend on configured port' },
  backend_stub:                  { severity: 'high',     gate: 'runtime',  message: 'Backend is stub — not real Go Core execution',                 remediation: 'Use real Go Core binary; backend_stub must be false' },
  mission_id_missing:            { severity: 'critical', gate: 'runtime',  message: 'Mission ID not present in backend response',                   remediation: 'Run real Go Core to generate mission_id' },
  evidence_receipt_missing:      { severity: 'critical', gate: 'evidence', message: 'Evidence receipt not present',                                 remediation: 'Run Go Core — it is the only valid evidence source' },
  evidence_receipt_not_go_core:  { severity: 'critical', gate: 'evidence', message: 'evidence_receipt.source is not "go-core"',                     remediation: 'Reject backend-derived evidence; use Go Core only' },
  go_core_evidence_missing:      { severity: 'critical', gate: 'go_core',  message: 'Go Core evidence receipt is absent or invalid',                remediation: 'Compile and run Go Core binary; ensure evidence_receipt in response' },
  ci_not_verified:               { severity: 'high',     gate: 'ci',       message: 'CI status not verified via GitHub API',                        remediation: 'Check remote CI status; all checks must be success' },
  tests_not_verified:            { severity: 'high',     gate: 'tests',    message: 'Local test suite not verified or failing',                     remediation: 'Run node tools/tests/pi-harness.test.mjs — 0 failures required' },
  visual_lock_missing:           { severity: 'high',     gate: 'scope',    message: 'Visual lock check not passed',                                 remediation: 'Run visual-gold-harness-lock.mjs and frontend-visual-lock.mjs' },
  frontend_guard_missing:        { severity: 'high',     gate: 'scope',    message: 'Frontend guard check not passed',                              remediation: 'Run sddf-front-guard.mjs' },
  fake_evidence_detected:        { severity: 'critical', gate: 'policy',   message: 'Fake evidence pattern detected in codebase',                   remediation: 'Remove all makeFakeEvidence/makeBackendReceipt/fallbackReceipt patterns' },
  forbidden_scope_changed:       { severity: 'critical', gate: 'scope',    message: 'Forbidden scope files changed (frontend/backend/go-core)',      remediation: 'Revert changes to forbidden scope files' },
  hardcoded_pass_gold_detected:  { severity: 'critical', gate: 'policy',   message: 'Hardcoded PASS GOLD / deploy_allowed=true detected',           remediation: 'Remove hardcoded values — must come from Go Core runtime' },
  deploy_policy_violation:       { severity: 'critical', gate: 'policy',   message: 'deploy_allowed=true violates absolute policy',                 remediation: 'deploy_allowed must always be false' },
  promotion_policy_violation:    { severity: 'critical', gate: 'policy',   message: 'promotion_allowed=true violates absolute policy',              remediation: 'promotion_allowed must always be false without explicit gate' },
  stable_policy_violation:       { severity: 'critical', gate: 'policy',   message: 'stable_allowed=true violates absolute policy',                 remediation: 'stable_allowed must always be false without explicit gate' },
  release_authorization_missing: { severity: 'medium',   gate: 'policy',   message: 'Release authorization not present',                           remediation: 'Obtain explicit release/deploy/tag/stable authorization' },
  pass_gold_not_real:            { severity: 'critical', gate: 'go_core',  message: 'pass_gold_candidate=true without real Go Core evidence',       remediation: 'Run Go Core with real binary; evidence_receipt.source must be go-core' },
  memory_conflict:               { severity: 'high',     gate: 'evidence', message: 'Stale memory contradicts current runtime state',               remediation: 'Current scan/evidence overrides stale memory' },
  agent_claim_without_evidence:  { severity: 'high',     gate: 'evidence', message: 'Agent claim not backed by verifiable evidence',                remediation: 'Block the claim; require evidence before accepting' },
};

// ═══════════════════════════════════════════════════════════════════
// CREATE DECISION MATRIX
// ═══════════════════════════════════════════════════════════════════

function createDecisionMatrix() {
  return {
    schema_version:   SCHEMA_VERSION,
    created_at:       Date.now(),
    decision_state:   'BLOCKED_RUNTIME',
    release_readiness: {
      ready:  false,
      level:  'blocked',
      reason: 'runtime_not_ready',
    },
    gates: {
      runtime:  { pass: false, evidence_present: false, blocker: 'backend_offline' },
      evidence: { pass: false, evidence_present: false, blocker: 'evidence_receipt_missing' },
      go_core:  { pass: false, evidence_present: false, blocker: 'go_core_evidence_missing' },
      ci:       { pass: false, evidence_present: false, blocker: 'ci_not_verified' },
      tests:    { pass: false, evidence_present: false, blocker: 'tests_not_verified' },
      security: { pass: false, evidence_present: false, blocker: null },
      scope:    { pass: false, evidence_present: false, blocker: 'visual_lock_missing' },
      policy:   { pass: true,  evidence_present: true,  blocker: null },
    },
    blocking_reasons:   [],
    required_evidence:  [],
    safe_next_actions:  [],
    release_candidate:  false,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
    release_allowed:    false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// NORMALIZE BLOCKING REASON
// ═══════════════════════════════════════════════════════════════════

function normalizeBlockingReason(reason) {
  const id = (typeof reason === 'string') ? reason.trim().toLowerCase().replace(/\s+/g, '_') : 'unknown';
  const catalog = BLOCKING_REASONS_CATALOG[id];
  if (catalog) {
    return { id, ...catalog };
  }
  return {
    id,
    severity:    'medium',
    gate:        'policy',
    message:     `Unknown blocking reason: ${id}`,
    remediation: 'Inspect mission state and evidence for root cause',
  };
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE REQUIRED EVIDENCE CHECKLIST
// ═══════════════════════════════════════════════════════════════════

function deriveRequiredEvidenceChecklist(runtimeEvidence, hermesContext) {
  const src  = runtimeEvidence?.sources || {};
  const ctx  = hermesContext            || {};
  const ev   = runtimeEvidence          || {};

  const goCore  = src.go_core  || {};
  const runtime = src.runtime  || {};
  const backend = src.backend  || {};
  const tests   = src.tests    || {};
  const visual  = src.visual   || {};
  const git     = src.git      || {};
  const security = src.security || {};

  return [
    {
      id:                  'git_head_current',
      required:            true,
      present:             !!(git.head_sha),
      source:              'git_diff',
      trust:               'high',
      blocking_if_missing: false,
    },
    {
      id:                  'diff_scope_clean',
      required:            true,
      present:             git.forbidden_scope_clean === true,
      source:              'git_diff',
      trust:               'high',
      blocking_if_missing: true,
    },
    {
      id:                  'visual_locks_pass',
      required:            true,
      present:             visual.visual_gold_harness_lock === true && visual.frontend_visual_lock === true,
      source:              'scanner_current_state',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'frontend_guard_pass',
      required:            true,
      present:             visual.sddf_front_guard === true,
      source:              'scanner_current_state',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'syntax_pass',
      required:            true,
      present:             tests.syntax_pass === true,
      source:              'local_test_exit_code',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'test_suite_pass',
      required:            true,
      present:             tests.test_suite_pass === true || (tests.exit_code === 0),
      source:              'local_test_exit_code',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'go_test_pass',
      required:            true,
      present:             goCore.go_tests_pass === true,
      source:              'go_core_evidence_receipt',
      trust:               'authoritative',
      blocking_if_missing: true,
    },
    {
      id:                  'go_build_pass',
      required:            true,
      present:             goCore.go_core_compiled === true,
      source:              'go_core_evidence_receipt',
      trust:               'authoritative',
      blocking_if_missing: true,
    },
    {
      id:                  'fake_evidence_scan_clean',
      required:            true,
      present:             security.fake_evidence_scan_clean === true,
      source:              'scanner_current_state',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'hardcoded_pass_gold_absent',
      required:            true,
      present:             security.hardcoded_pass_gold_absent === true,
      source:              'scanner_current_state',
      trust:               'medium',
      blocking_if_missing: true,
    },
    {
      id:                  'backend_alive',
      required:            true,
      present:             backend.backend_alive === true,
      source:              'runtime_probe_actual',
      trust:               'high',
      blocking_if_missing: true,
    },
    {
      id:                  'backend_not_stub',
      required:            true,
      present:             backend.backend_stub === false,
      source:              'runtime_probe_actual',
      trust:               'high',
      blocking_if_missing: true,
    },
    {
      id:                  'mission_id_present',
      required:            true,
      present:             goCore.mission_id_present === true || backend.backend_has_mission_id === true,
      source:              'runtime_probe_actual',
      trust:               'high',
      blocking_if_missing: true,
    },
    {
      id:                  'evidence_receipt_present',
      required:            true,
      present:             backend.backend_has_evidence_receipt === true || goCore.evidence_present === true,
      source:              'go_core_evidence_receipt',
      trust:               'authoritative',
      blocking_if_missing: true,
    },
    {
      id:                  'evidence_receipt_source_go_core',
      required:            true,
      present:             goCore.evidence_receipt_source === 'go-core' && goCore.evidence_receipt_valid === true,
      source:              'go_core_evidence_receipt',
      trust:               'authoritative',
      blocking_if_missing: true,
    },
    {
      id:                  'runtime_probe_pass',
      required:            true,
      present:             runtime.runtime_probe_pass === true && !runtime.blocked_runtime,
      source:              'runtime_probe_actual',
      trust:               'high',
      blocking_if_missing: true,
    },
    {
      id:                  'ci_success',
      required:            true,
      present:             false, // CI checked externally via GitHub API — harness cannot verify
      source:              'github_api_ci',
      trust:               'high',
      blocking_if_missing: false, // warning, not hard block at harness level
    },
    {
      id:                  'pass_gold_real',
      required:            true,
      present:             goCore.evidence_receipt_valid === true && backend.backend_alive === true && !runtime.blocked_runtime,
      source:              'go_core_evidence_receipt',
      trust:               'authoritative',
      blocking_if_missing: true,
    },
    {
      id:                  'release_authorization_present',
      required:            true,
      present:             false, // always false — explicit human authorization required
      source:              'agent_claim',
      trust:               'lowest',
      blocking_if_missing: false, // blocks deploy/promotion/stable, but not SUPERVISED_READY
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// EVALUATE DECISION MATRIX
// ═══════════════════════════════════════════════════════════════════

function evaluateDecisionMatrix(runtimeEvidence, hermesContext) {
  const matrix  = createDecisionMatrix();
  const src     = runtimeEvidence?.sources || {};
  const goCore  = src.go_core  || {};
  const runtime = src.runtime  || {};
  const backend = src.backend  || {};
  const tests   = src.tests    || {};
  const visual  = src.visual   || {};
  const security = src.security || {};
  const git     = src.git      || {};

  const blockingReasons = [];

  // ── policy gate (checked first — absolute blocks)
  const policyViolations = [];
  if (runtimeEvidence?.deploy_allowed === true) {
    policyViolations.push('deploy_policy_violation');
    blockingReasons.push(normalizeBlockingReason('deploy_policy_violation'));
  }
  if (runtimeEvidence?.promotion_allowed === true) {
    policyViolations.push('promotion_policy_violation');
    blockingReasons.push(normalizeBlockingReason('promotion_policy_violation'));
  }
  if (runtimeEvidence?.stable_allowed === true) {
    policyViolations.push('stable_policy_violation');
    blockingReasons.push(normalizeBlockingReason('stable_policy_violation'));
  }
  if (security.fake_evidence_scan_clean === false) {
    policyViolations.push('fake_evidence_detected');
    blockingReasons.push(normalizeBlockingReason('fake_evidence_detected'));
  }
  if (security.hardcoded_pass_gold_absent === false) {
    policyViolations.push('hardcoded_pass_gold_detected');
    blockingReasons.push(normalizeBlockingReason('hardcoded_pass_gold_detected'));
  }
  if (git.forbidden_scope_clean === false) {
    policyViolations.push('forbidden_scope_changed');
    blockingReasons.push(normalizeBlockingReason('forbidden_scope_changed'));
  }

  matrix.gates.policy.pass             = policyViolations.length === 0;
  matrix.gates.policy.evidence_present = true;
  matrix.gates.policy.blocker          = policyViolations[0] || null;

  if (policyViolations.length > 0) {
    matrix.decision_state              = 'BLOCKED_POLICY';
    matrix.blocking_reasons            = blockingReasons;
    matrix.required_evidence           = deriveRequiredEvidenceChecklist(runtimeEvidence, hermesContext);
    matrix.safe_next_actions           = deriveSafeNextActions(matrix);
    matrix.release_readiness.ready     = false;
    matrix.release_readiness.level     = 'blocked';
    matrix.release_readiness.reason    = policyViolations[0];
    return matrix;
  }

  // ── runtime gate
  const runtimeBlocked = runtime.blocked_runtime !== false;
  matrix.gates.runtime.pass             = !runtimeBlocked && runtime.runtime_probe_pass === true;
  matrix.gates.runtime.evidence_present = runtime.evidence_present === true;
  matrix.gates.runtime.blocker          = runtimeBlocked ? 'backend_offline' : (runtime.runtime_probe_pass ? null : 'runtime_not_ready');

  if (runtimeBlocked) {
    blockingReasons.push(normalizeBlockingReason('backend_offline'));
  } else if (!runtime.runtime_probe_pass) {
    blockingReasons.push(normalizeBlockingReason('runtime_not_ready'));
  }
  if (!backend.backend_has_mission_id && !goCore.mission_id_present) {
    blockingReasons.push(normalizeBlockingReason('mission_id_missing'));
  }

  // ── go_core gate
  const goCoreValid = goCore.evidence_receipt_valid === true && goCore.evidence_present === true;
  matrix.gates.go_core.pass             = goCoreValid;
  matrix.gates.go_core.evidence_present = goCore.evidence_present === true;
  matrix.gates.go_core.blocker          = goCoreValid ? null : 'go_core_evidence_missing';

  if (!goCoreValid) {
    if (goCore.evidence_receipt_source && goCore.evidence_receipt_source !== 'go-core') {
      blockingReasons.push(normalizeBlockingReason('evidence_receipt_not_go_core'));
    } else {
      blockingReasons.push(normalizeBlockingReason('go_core_evidence_missing'));
    }
    if (!backend.backend_has_evidence_receipt && !goCore.evidence_present) {
      blockingReasons.push(normalizeBlockingReason('evidence_receipt_missing'));
    }
  }

  // ── evidence gate
  const evidenceValid = goCoreValid && !runtimeBlocked && backend.backend_stub !== true;
  matrix.gates.evidence.pass             = evidenceValid;
  matrix.gates.evidence.evidence_present = goCore.evidence_present === true;
  matrix.gates.evidence.blocker          = evidenceValid ? null : 'evidence_receipt_missing';

  // ── tests gate
  const testsPass = tests.syntax_pass === true && (tests.test_suite_pass === true || tests.exit_code === 0);
  matrix.gates.tests.pass             = testsPass;
  matrix.gates.tests.evidence_present = tests.evidence_present === true;
  matrix.gates.tests.blocker          = testsPass ? null : 'tests_not_verified';

  if (!testsPass) {
    blockingReasons.push(normalizeBlockingReason('tests_not_verified'));
  }

  // ── security gate
  const securityPass = security.fake_evidence_scan_clean !== false &&
    security.hardcoded_pass_gold_absent !== false &&
    security.hardcoded_deploy_absent !== false;
  matrix.gates.security.pass             = securityPass;
  matrix.gates.security.evidence_present = security.evidence_present === true;
  matrix.gates.security.blocker          = securityPass ? null : 'fake_evidence_detected';

  // ── scope gate
  const scopePass =
    (visual.visual_gold_harness_lock !== false) &&
    (visual.frontend_visual_lock !== false) &&
    (visual.sddf_front_guard !== false) &&
    git.forbidden_scope_clean !== false;
  matrix.gates.scope.pass             = scopePass;
  matrix.gates.scope.evidence_present = visual.evidence_present === true || git.evidence_present === true;
  matrix.gates.scope.blocker          = scopePass ? null : 'visual_lock_missing';

  if (!scopePass) {
    blockingReasons.push(normalizeBlockingReason('visual_lock_missing'));
  }

  // ── ci gate (always not verified at harness level — external CI only)
  matrix.gates.ci.pass             = false; // harness cannot verify CI
  matrix.gates.ci.evidence_present = false;
  matrix.gates.ci.blocker          = 'ci_not_verified';

  // ── determine decision state
  if (runtimeBlocked || !backend.backend_alive) {
    matrix.decision_state = 'BLOCKED_RUNTIME';
  } else if (!goCoreValid || !evidenceValid) {
    matrix.decision_state = 'BLOCKED_EVIDENCE';
  } else if (
    goCoreValid && !runtimeBlocked &&
    testsPass && securityPass && scopePass &&
    backend.backend_alive && !backend.backend_stub &&
    goCore.go_tests_pass && goCore.go_core_compiled
  ) {
    // SUPERVISED_READY — all local gates pass, but no CI verification + no authorization
    matrix.decision_state = 'SUPERVISED_READY';
    matrix.release_readiness.ready  = false; // still needs authorization
    matrix.release_readiness.level  = 'supervised';
    matrix.release_readiness.reason = 'release_authorization_missing';
    blockingReasons.push(normalizeBlockingReason('release_authorization_missing'));
    blockingReasons.push(normalizeBlockingReason('ci_not_verified'));
  } else {
    matrix.decision_state = 'BLOCKED_EVIDENCE';
  }

  matrix.blocking_reasons   = blockingReasons;
  matrix.required_evidence  = deriveRequiredEvidenceChecklist(runtimeEvidence, hermesContext);
  matrix.safe_next_actions  = deriveSafeNextActions(matrix);

  // deploy/promotion/stable always false — REGRA ABSOLUTA
  matrix.deploy_allowed     = false;
  matrix.promotion_allowed  = false;
  matrix.stable_allowed     = false;
  matrix.release_allowed    = false;
  matrix.release_candidate  = false;

  return matrix;
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE SAFE NEXT ACTIONS
// ═══════════════════════════════════════════════════════════════════

function deriveSafeNextActions(matrix) {
  const state = matrix.decision_state || 'BLOCKED_RUNTIME';

  const actionsMap = {
    BLOCKED_RUNTIME: [
      { id: 'start_backend_locally',          label: 'Start backend locally on configured port', safe: true, write_capable: false, requires_authorization: false },
      { id: 'run_runtime_probe',              label: 'Run pi-harness with --runtime-probe flag',  safe: true, write_capable: false, requires_authorization: false },
      { id: 'collect_go_core_evidence_receipt', label: 'Run Go Core binary to collect evidence receipt', safe: true, write_capable: false, requires_authorization: false },
      { id: 'verify_mission_id',              label: 'Verify backend returns valid mission_id',   safe: true, write_capable: false, requires_authorization: false },
    ],
    BLOCKED_EVIDENCE: [
      { id: 'inspect_evidence_graph',         label: 'Inspect evidence graph for missing sources', safe: true, write_capable: false, requires_authorization: false },
      { id: 'verify_go_core_receipt_source',  label: 'Verify evidence_receipt.source === "go-core"', safe: true, write_capable: false, requires_authorization: false },
      { id: 'rerun_pi_harness_json',          label: 'Rerun pi-harness --json and inspect fields', safe: true, write_capable: false, requires_authorization: false },
      { id: 'compare_runtime_vs_memory',      label: 'Compare current runtime state vs stale memory', safe: true, write_capable: false, requires_authorization: false },
    ],
    BLOCKED_POLICY: [
      { id: 'remove_policy_violation',        label: 'Remove policy violation (deploy_allowed/fake evidence)', safe: true, write_capable: false, requires_authorization: false },
      { id: 'inspect_forbidden_scope',        label: 'Inspect forbidden scope for unauthorized changes', safe: true, write_capable: false, requires_authorization: false },
      { id: 'remove_fake_evidence',           label: 'Remove fake evidence patterns from codebase', safe: true, write_capable: false, requires_authorization: false },
      { id: 'rerun_security_scan',            label: 'Rerun fake evidence scan and scope check', safe: true, write_capable: false, requires_authorization: false },
    ],
    SUPERVISED_READY: [
      { id: 'request_release_authorization',  label: 'Request explicit release authorization from owner', safe: true, write_capable: false, requires_authorization: true },
      { id: 'run_review_gate',               label: 'Run PR review gate before any merge', safe: true, write_capable: false, requires_authorization: false },
      { id: 'verify_ci_remote',              label: 'Verify remote CI status via GitHub API', safe: true, write_capable: false, requires_authorization: false },
      { id: 'prepare_manual_release_plan',   label: 'Prepare manual release plan for human approval', safe: true, write_capable: false, requires_authorization: true },
    ],
    RELEASE_CANDIDATE: [
      { id: 'request_explicit_deploy_authorization',   label: 'Request explicit deploy authorization', safe: true, write_capable: false, requires_authorization: true },
      { id: 'request_tag_authorization',              label: 'Request tag creation authorization', safe: true, write_capable: false, requires_authorization: true },
      { id: 'request_stable_promotion_authorization', label: 'Request stable promotion authorization', safe: true, write_capable: false, requires_authorization: true },
      { id: 'do_not_deploy_automatically',            label: 'Do NOT deploy automatically — authorization required', safe: true, write_capable: false, requires_authorization: true },
    ],
  };

  return actionsMap[state] || actionsMap['BLOCKED_RUNTIME'];
}

// ═══════════════════════════════════════════════════════════════════
// EVALUATE RELEASE READINESS
// ═══════════════════════════════════════════════════════════════════

function evaluateReleaseReadiness(matrix, runtimeEvidence, hermesContext) {
  const src      = runtimeEvidence?.sources || {};
  const goCore   = src.go_core  || {};
  const runtime  = src.runtime  || {};
  const backend  = src.backend  || {};
  const tests    = src.tests    || {};
  const visual   = src.visual   || {};
  const security = src.security || {};

  const state    = matrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockers = (matrix?.blocking_reasons || []).filter(r => r.severity === 'critical');
  const warnings = (matrix?.blocking_reasons || []).filter(r => r.severity !== 'critical');

  // Compute score 0–100
  let score = 0;

  // policy violation forces score = 0
  const hasPolicyViolation = blockers.some(b =>
    ['deploy_policy_violation','promotion_policy_violation','stable_policy_violation','fake_evidence_detected','hardcoded_pass_gold_detected'].includes(b.id)
  );
  if (hasPolicyViolation) {
    score = 0;
  } else {
    if (goCore.evidence_present && goCore.evidence_receipt_valid) score += 35;
    if (!runtime.blocked_runtime && runtime.runtime_probe_pass)   score += 20;
    if (tests.syntax_pass)                                        score += 10;
    if (tests.test_suite_pass || tests.exit_code === 0)           score += 10;
    if (visual.evidence_present)                                  score += 10;
    if (security.evidence_present)                                score +=  5;
    if (goCore.go_tests_pass)                                     score +=  5;
    if (goCore.go_core_compiled)                                  score +=  5;
    // deduct per critical blocker
    score -= blockers.filter(b => !['release_authorization_missing','ci_not_verified'].includes(b.id)).length * 10;
    score  = Math.max(0, Math.min(100, score));
  }

  // determine level
  let level = 'blocked';
  let ready = false;

  if (state === 'SUPERVISED_READY') {
    level = 'supervised';
  } else if (state === 'RELEASE_CANDIDATE') {
    level = 'candidate';
    // even RELEASE_CANDIDATE is not "ready" without authorization
    ready = false;
  }

  // missing = checklist items not present + critical
  const checklist = matrix?.required_evidence || [];
  const missing   = checklist
    .filter(item => !item.present && item.blocking_if_missing)
    .map(item => item.id);

  return {
    ready,
    level,
    state,
    score,
    missing,
    blockers:              blockers.map(b => b.id),
    warnings:              warnings.map(b => b.id),
    required_authorization: ['release_authorization', 'deploy_authorization', 'tag_authorization', 'stable_promotion_authorization'],
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// RENDER DECISION MATRIX SUMMARY
// ═══════════════════════════════════════════════════════════════════

function renderDecisionMatrixSummary(matrix) {
  if (!matrix) return null;
  return {
    schema_version:     matrix.schema_version || SCHEMA_VERSION,
    decision_state:     matrix.decision_state,
    release_candidate:  matrix.release_candidate,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
    release_allowed:    false,
    gates_pass:         Object.entries(matrix.gates || {}).filter(([,g]) => g.pass).map(([k]) => k),
    gates_blocked:      Object.entries(matrix.gates || {}).filter(([,g]) => !g.pass).map(([k]) => k),
    blocking_count:     (matrix.blocking_reasons || []).length,
    critical_count:     (matrix.blocking_reasons || []).filter(r => r.severity === 'critical').length,
    note:               'classification only — no deploy performed — explicit authorization required',
  };
}

// ═══════════════════════════════════════════════════════════════════
// RENDER RELEASE READINESS GATE
// ═══════════════════════════════════════════════════════════════════

function renderReleaseReadinessGate(readiness) {
  if (!readiness) return null;
  return {
    ready:                  readiness.ready,
    level:                  readiness.level,
    state:                  readiness.state,
    score:                  readiness.score,
    deploy_allowed:         false,
    promotion_allowed:      false,
    stable_allowed:         false,
    required_authorization: readiness.required_authorization || [],
    missing_count:          (readiness.missing || []).length,
    blocker_count:          (readiness.blockers || []).length,
    note:                   'explicit authorization required for any release action',
  };
}

export {
  createDecisionMatrix,
  evaluateDecisionMatrix,
  evaluateReleaseReadiness,
  normalizeBlockingReason,
  deriveRequiredEvidenceChecklist,
  deriveSafeNextActions,
  renderDecisionMatrixSummary,
  renderReleaseReadinessGate,
};
