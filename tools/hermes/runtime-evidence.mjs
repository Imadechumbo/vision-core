#!/usr/bin/env node
/**
 * Hermes Runtime Evidence Builder — V15.6
 *
 * Coleta, normaliza e valida evidência de runtime de múltiplas fontes.
 *
 * REGRA ABSOLUTA: evidence_receipt só pode vir do Go Core.
 * Backend não pode fabricar evidence.
 * Memória não pode override runtime/git/go_core.
 * deploy_allowed é sempre false.
 */

const SCHEMA_VERSION = 'v15.6';

// ═══════════════════════════════════════════════════════════════════
// TRUST CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SOURCE_TRUST = {
  go_core_evidence_receipt: 'authoritative',
  runtime_probe_actual:     'high',
  github_api_ci:            'high',
  git_diff_current:         'high',
  local_test_exit_code:     'medium',
  scanner_current_state:    'medium',
  backend_claim:            'low',
  memory_snapshot:          'lowest',
  agent_claim:              'lowest',
};

const TRUST_PRIORITY = {
  authoritative: 9,
  high:          7,
  medium:        5,
  low:           2,
  lowest:        1,
};

// ═══════════════════════════════════════════════════════════════════
// CREATE RUNTIME EVIDENCE
// ═══════════════════════════════════════════════════════════════════

function createRuntimeEvidence(missionId = null) {
  return {
    schema_version: SCHEMA_VERSION,
    created_at:     Date.now(),
    mission_id:     missionId,
    sources: {
      git: {
        branch:               null,
        head_sha:             null,
        base_sha:             null,
        diff_files:           [],
        diff_stat_available:  false,
        forbidden_scope_clean: null,
        evidence_present:     false,
      },
      ci: {
        source:          'unknown',
        status:          null,
        success_count:   0,
        failure_count:   0,
        pending_count:   0,
        evidence_present: false,
      },
      runtime: {
        runtime_probe_enabled:  false,
        runtime_probe_pass:     false,
        runtime_probe_status:   'not_probed',
        recommendation:         null,
        blocked_runtime:        true,
        evidence_present:       false,
      },
      backend: {
        backend_alive:                false,
        backend_stub:                 true,
        backend_has_mission_id:       false,
        backend_has_evidence_receipt: false,
        evidence_present:             false,
      },
      go_core: {
        go_core_compiled:        false,
        go_tests_pass:           false,
        evidence_receipt_source: null,
        evidence_receipt_valid:  false,
        mission_id_present:      false,
        evidence_present:        false,
      },
      tests: {
        syntax_pass:      null,
        test_suite_pass:  null,
        test_total:       null,
        test_failed:      null,
        exit_code:        null,
        evidence_present: false,
      },
      visual: {
        visual_gold_harness_lock: null,
        frontend_visual_lock:     null,
        sddf_front_guard:         null,
        visual_patch_authorized:  false, // never true — REGRA ABSOLUTA
        evidence_present:         false,
      },
      security: {
        fake_evidence_scan_clean:   null,
        hardcoded_pass_gold_absent: null,
        hardcoded_deploy_absent:    null,
        forbidden_runtime_absent:   null,
        evidence_present:           false,
      },
    },
    trust: {
      go_core:       'authoritative',
      runtime_probe: 'high',
      ci_api:        'high',
      git_diff:      'high',
      local_test:    'medium',
      backend_claim: 'low',
      memory:        'lowest',
    },
    facts:          [],
    claims:         [],
    blocked_claims: [],
    conflicts:      [],
    summary:        {},
  };
}

// ═══════════════════════════════════════════════════════════════════
// NORMALIZE EVIDENCE SOURCE
// ═══════════════════════════════════════════════════════════════════

function normalizeEvidenceSource(source) {
  if (!source) return null;
  const s = String(source).toLowerCase().trim();
  if (s === 'go-core' || s === 'go_core' || s === 'gocore') return 'go-core';
  if (s === 'backend' || s === 'evr_backend' || s === 'backend-derived') return 'backend';
  if (s === 'github_api' || s === 'github-api')  return 'github_api';
  if (s === 'gh' || s === 'gh_cli')              return 'gh';
  if (s === 'ui' || s === 'manual')              return 'ui';
  if (s === 'git_diff' || s === 'git-diff')      return 'git_diff';
  if (s === 'memory' || s === 'stale_memory')    return 'memory';
  if (s === 'runtime_probe' || s === 'runtime-probe') return 'runtime_probe_actual';
  if (s === 'agent')                             return 'agent';
  return s;
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIFY EVIDENCE TRUST
// ═══════════════════════════════════════════════════════════════════

function classifyEvidenceTrust(source) {
  const norm = normalizeEvidenceSource(source);
  switch (norm) {
    case 'go-core':              return SOURCE_TRUST.go_core_evidence_receipt; // authoritative
    case 'runtime_probe_actual': return SOURCE_TRUST.runtime_probe_actual;     // high
    case 'github_api':           return SOURCE_TRUST.github_api_ci;            // high
    case 'gh':                   return SOURCE_TRUST.github_api_ci;            // high
    case 'git_diff':             return SOURCE_TRUST.git_diff_current;         // high
    case 'scanner':              return SOURCE_TRUST.scanner_current_state;    // medium
    case 'backend':              return SOURCE_TRUST.backend_claim;            // low
    case 'memory':               return SOURCE_TRUST.memory_snapshot;          // lowest
    case 'agent':                return SOURCE_TRUST.agent_claim;              // lowest
    default:                     return SOURCE_TRUST.agent_claim;              // lowest
  }
}

// ═══════════════════════════════════════════════════════════════════
// COLLECT RUNTIME EVIDENCE FROM PI HARNESS STATE
// ═══════════════════════════════════════════════════════════════════

function collectRuntimeEvidence(state, missionId = null) {
  const ev = createRuntimeEvidence(missionId || state?.goRuntimeMissionId || null);
  if (!state) return ev;

  // --- git source ---
  ev.sources.git.branch               = state.branch               || null;
  ev.sources.git.head_sha             = state.gitHead              || null;
  ev.sources.git.diff_files           = state.forbiddenDiffFiles   || [];
  ev.sources.git.diff_stat_available  = Array.isArray(state.forbiddenDiffFiles);
  ev.sources.git.forbidden_scope_clean = typeof state.forbiddenDiffAbsent === 'boolean'
    ? state.forbiddenDiffAbsent : null;
  ev.sources.git.evidence_present     = !!(state.branch || state.gitHead);

  // --- ci source --- (harness does not call GitHub API directly; mark unknown)
  ev.sources.ci.source          = 'unknown';
  ev.sources.ci.status          = null;
  ev.sources.ci.evidence_present = false;

  // --- runtime source ---
  ev.sources.runtime.runtime_probe_enabled = state.runtimeProbeEnabled || false;
  ev.sources.runtime.runtime_probe_pass    = state.runtimeProbePass    || false;
  ev.sources.runtime.runtime_probe_status  = state.backendHealthStatus || 'not_probed';
  ev.sources.runtime.recommendation        = state.recommendation      || null;
  ev.sources.runtime.blocked_runtime       = !(state.backendAlive === true);
  ev.sources.runtime.evidence_present      = state.runtimeProbeEnabled === true;

  // --- backend source ---
  ev.sources.backend.backend_alive                = state.backendAlive                || false;
  ev.sources.backend.backend_stub                 = state.backendStub !== false;
  ev.sources.backend.backend_has_mission_id       = state.backendHasMissionId         || false;
  ev.sources.backend.backend_has_evidence_receipt = state.backendHasEvidenceReceipt   || false;
  ev.sources.backend.evidence_present             = state.backendAlive === true;

  // --- go_core source ---
  const goEvSrc = state.goRuntimeEvidenceSource || state.evidenceSource || null;
  ev.sources.go_core.go_core_compiled        = state.goCoreCompiled   || false;
  ev.sources.go_core.go_tests_pass           = state.goCoreTestPass   || false;
  ev.sources.go_core.evidence_receipt_source = goEvSrc;
  ev.sources.go_core.evidence_receipt_valid  = goEvSrc === 'go-core';
  ev.sources.go_core.mission_id_present      = !!(state.goRuntimeMissionId);
  ev.sources.go_core.evidence_present        =
    state.goCoreCompiled === true && state.goCoreTestPass === true;

  // --- tests source ---
  ev.sources.tests.syntax_pass      = typeof state.syntaxOk === 'boolean' ? state.syntaxOk : null;
  ev.sources.tests.test_suite_pass  = null; // not tracked in harness state directly
  ev.sources.tests.test_total       = null;
  ev.sources.tests.test_failed      = null;
  ev.sources.tests.exit_code        = null;
  ev.sources.tests.evidence_present = typeof state.syntaxOk === 'boolean';

  // --- visual source ---
  ev.sources.visual.visual_gold_harness_lock = typeof state.visualGoldLockPass === 'boolean'
    ? state.visualGoldLockPass : null;
  ev.sources.visual.frontend_visual_lock     = typeof state.frontendVisualPass === 'boolean'
    ? state.frontendVisualPass : null;
  ev.sources.visual.sddf_front_guard         = typeof state.guardOk === 'boolean'
    ? state.guardOk : null;
  ev.sources.visual.visual_patch_authorized  = false; // NEVER true
  ev.sources.visual.evidence_present         = typeof state.visualGoldLockPass === 'boolean';

  // --- security source ---
  ev.sources.security.fake_evidence_scan_clean   = typeof state.fakeEvidenceAbsent === 'boolean'
    ? state.fakeEvidenceAbsent : null;
  ev.sources.security.hardcoded_pass_gold_absent = true; // enforced by design
  ev.sources.security.hardcoded_deploy_absent    = true; // enforced by design
  ev.sources.security.forbidden_runtime_absent   = typeof state.forbiddenDiffAbsent === 'boolean'
    ? state.forbiddenDiffAbsent : null;
  ev.sources.security.evidence_present           = typeof state.fakeEvidenceAbsent === 'boolean';

  // --- build facts ---
  if (goEvSrc === 'go-core') {
    ev.facts.push({ type: 'go_core_evidence_present', value: 'go-core', trust: 'authoritative' });
  }
  if (state.backendAlive === false) {
    ev.facts.push({ type: 'runtime_offline', value: true, trust: 'high' });
  }
  if (state.fakeEvidenceAbsent === true) {
    ev.facts.push({ type: 'fake_evidence_absent', value: true, trust: 'high' });
  }
  if (state.syntaxOk === true) {
    ev.facts.push({ type: 'syntax_ok', value: true, trust: 'medium' });
  }
  if (state.visualGoldLockPass === true && state.frontendVisualPass === true) {
    ev.facts.push({ type: 'visual_locks_pass', value: true, trust: 'medium' });
  }

  return ev;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATE RUNTIME EVIDENCE
// ═══════════════════════════════════════════════════════════════════

function validateRuntimeEvidence(evidence) {
  const errors         = [];
  const warnings       = [];
  const blocked_claims = [];

  if (!evidence || typeof evidence !== 'object') {
    return {
      ok: false,
      errors: ['evidence must be an object'],
      warnings: [],
      blocked_claims: [],
      trust_score: 0,
      final_recommendation: 'BLOCKED_EVIDENCE',
    };
  }

  const src     = evidence.sources || {};
  const goCore  = src.go_core  || {};
  const runtime = src.runtime  || {};
  const backend = src.backend  || {};
  const ci      = src.ci       || {};
  const tests   = src.tests    || {};

  // Rule 1: evidence_receipt.source must be go-core for real evidence
  if (goCore.evidence_receipt_source && goCore.evidence_receipt_source !== 'go-core') {
    errors.push(`evidence_receipt.source="${goCore.evidence_receipt_source}" must be "go-core"`);
    blocked_claims.push('real_evidence');
  }

  // Rule 2: backend cannot claim real evidence without Go Core
  if (backend.backend_has_evidence_receipt && !goCore.evidence_receipt_valid) {
    errors.push('backend claims evidence_receipt but Go Core evidence not valid — backend cannot fabricate evidence');
    blocked_claims.push('backend_evidence');
  }

  // Rule 3: runtime_probe_pass requires backend_alive + mission_id + evidence_receipt
  if (runtime.runtime_probe_pass === true) {
    if (!backend.backend_alive) {
      errors.push('runtime_probe_pass:true without backend_alive — not verifiable');
      blocked_claims.push('runtime_probe_pass');
    }
    if (!backend.backend_has_mission_id) {
      errors.push('runtime_probe_pass:true without mission_id — not verifiable');
      blocked_claims.push('runtime_probe_pass');
    }
    if (!backend.backend_has_evidence_receipt) {
      errors.push('runtime_probe_pass:true without evidence_receipt — not verifiable');
      blocked_claims.push('runtime_probe_pass');
    }
  }

  // Rule 4: CI success without evidence_present
  if (ci.status === 'success' && !ci.evidence_present) {
    errors.push('ci.status=success without evidence_present — not verifiable');
    blocked_claims.push('ci_green');
  }

  // Rule 5: test_suite_pass without exit_code/test_total
  if (tests.test_suite_pass === true) {
    const hasEvidence = tests.exit_code !== null || tests.test_total !== null;
    if (!hasEvidence) {
      errors.push('test_suite_pass:true without exit_code or test_total — not verifiable');
      blocked_claims.push('test_suite_pass');
    }
  }

  // Rule 6: deploy_allowed must always be false — absolute block
  if (evidence.deploy_allowed === true) {
    errors.push('deploy_allowed:true is an absolute block — V15.6 REGRA ABSOLUTA');
    blocked_claims.push('deploy_allowed');
  }

  // Rule 7: pass_gold_candidate without Go Core evidence
  if (evidence.pass_gold_candidate === true) {
    if (!goCore.evidence_receipt_valid) {
      errors.push('pass_gold_candidate:true without Go Core evidence_receipt — not verifiable');
      blocked_claims.push('pass_gold_candidate');
    }
  }

  // Rule 8: memory PASS contradicting BLOCKED_RUNTIME
  if (evidence.stale_memory_pass === true && runtime.blocked_runtime === true) {
    errors.push('stale_memory_pass:true but runtime is BLOCKED_RUNTIME — memory cannot override runtime');
    blocked_claims.push('stale_memory_pass');
  }

  // Rule 9: agent claim contradicting evidence
  if (evidence.agent_claims && typeof evidence.agent_claims === 'object') {
    const ac = evidence.agent_claims;
    if (ac.backend_online === true && !backend.backend_alive) {
      errors.push('agent claims backend_online:true but backend_alive=false — hallucination blocked');
      blocked_claims.push('agent_backend_online');
    }
    if (ac.ci_green === true && ci.source === 'unknown') {
      errors.push('agent claims ci_green:true without ci evidence — hallucination blocked');
      blocked_claims.push('agent_ci_green');
    }
  }

  // Compute trust score
  let score = 0;
  if (goCore.evidence_present)          score += 40; // authoritative source
  if (runtime.evidence_present)         score += 20; // high trust
  if (src.git?.evidence_present)        score += 15; // high trust
  if (src.tests?.evidence_present)      score += 10; // medium trust
  if (src.visual?.evidence_present)     score += 10; // medium trust
  if (src.security?.evidence_present)   score +=  5; // present
  score -= errors.length * 10;                        // penalty per error
  const trust_score = Math.max(0, Math.min(100, score));

  // Sources present/missing
  const sources_present = Object.entries(src)
    .filter(([, v]) => v && v.evidence_present === true)
    .map(([k]) => k);

  // Final recommendation
  let final_recommendation;
  if (blocked_claims.includes('deploy_allowed')) {
    final_recommendation = 'BLOCKED_POLICY';
  } else if (runtime.blocked_runtime) {
    final_recommendation = 'BLOCKED_RUNTIME';
  } else if (
    blocked_claims.includes('real_evidence') ||
    blocked_claims.includes('backend_evidence') ||
    blocked_claims.includes('pass_gold_candidate')
  ) {
    final_recommendation = 'BLOCKED_EVIDENCE';
  } else if (errors.length > 0) {
    final_recommendation = 'BLOCKED_EVIDENCE';
  } else if (goCore.evidence_receipt_valid && sources_present.length >= 3) {
    // SUPERVISED_READY — verified, but never promotes/deploys on its own
    final_recommendation = 'SUPERVISED_READY';
  } else {
    final_recommendation = 'BLOCKED_RUNTIME';
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    blocked_claims: [...new Set(blocked_claims)],
    trust_score,
    final_recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MERGE EVIDENCE SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════

function mergeEvidenceSnapshots(snapshotA, snapshotB) {
  if (!snapshotA) return snapshotB;
  if (!snapshotB) return snapshotA;

  // Current scan (snapshotB) always overrides stale memory (snapshotA)
  const merged = {
    ...snapshotA,
    ...snapshotB,
    schema_version: SCHEMA_VERSION,
    merged:         true,
    merged_at:      Date.now(),
    sources:        {},
    facts:          [...(snapshotA.facts          || []), ...(snapshotB.facts          || [])],
    claims:         [...(snapshotA.claims         || []), ...(snapshotB.claims         || [])],
    blocked_claims: [...new Set([...(snapshotA.blocked_claims || []), ...(snapshotB.blocked_claims || [])])],
    conflicts:      [...(snapshotA.conflicts      || []), ...(snapshotB.conflicts      || [])],
  };

  // Merge sources: B's evidence_present=true always wins
  const allSources = new Set([
    ...Object.keys(snapshotA.sources || {}),
    ...Object.keys(snapshotB.sources || {}),
  ]);
  for (const s of allSources) {
    const a = snapshotA.sources?.[s] || {};
    const b = snapshotB.sources?.[s] || {};
    merged.sources[s] = b.evidence_present ? { ...a, ...b } : { ...b, ...a };
  }

  return merged;
}

// ═══════════════════════════════════════════════════════════════════
// RENDER RUNTIME EVIDENCE SUMMARY
// ═══════════════════════════════════════════════════════════════════

function renderRuntimeEvidenceSummary(evidence) {
  if (!evidence) return null;
  const src = evidence.sources || {};

  const sources_present = Object.entries(src)
    .filter(([, v]) => v && v.evidence_present === true)
    .map(([k]) => k);
  const sources_missing = Object.entries(src)
    .filter(([, v]) => !v || !v.evidence_present)
    .map(([k]) => k);

  return {
    schema_version:          evidence.schema_version || SCHEMA_VERSION,
    mission_id:              evidence.mission_id     || null,
    sources_present,
    sources_missing,
    trust:                   evidence.trust          || {},
    facts_count:             (evidence.facts || []).length,
    blocked_claims_count:    (evidence.blocked_claims || []).length,
    go_core_evidence_valid:  src.go_core?.evidence_receipt_valid || false,
    runtime_blocked:         src.runtime?.blocked_runtime !== false,
    deploy_allowed:          false, // ALWAYS false — REGRA ABSOLUTA
  };
}

export {
  createRuntimeEvidence,
  collectRuntimeEvidence,
  normalizeEvidenceSource,
  classifyEvidenceTrust,
  validateRuntimeEvidence,
  mergeEvidenceSnapshots,
  renderRuntimeEvidenceSummary,
};
