#!/usr/bin/env node
/**
 * Tests — Anti-Hallucination Runtime Baseline V150.0
 */

import {
  buildAntiHallucinationBaseline,
  validateAntiHallucinationBaseline,
  renderAntiHallucinationBaseline,
  ANTI_HALLUCINATION_BASELINE_STATUSES,
  ANTI_HALLUCINATION_MODULES,
} from '../anti-hallucination-runtime-baseline.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const ALL_READY = {
  baseline_id:                          'v150.0-baseline',
  agent_claim_verification_ready:       true,
  filesystem_reality_check_ready:       true,
  git_diff_truth_binding_ready:         true,
  tool_execution_proof_ledger_ready:    true,
  hermes_hallucination_incident_memory_ready: true,
  agent_truth_score_gate_ready:         true,
  real_execution_controlled_gate_ready: true,
  dry_run_truth_report_ready:           true,
  hallucinated_claims_blocked:          true,
  unverified_agent_claims_blocked:      true,
  pass_gold_fake_blocked:               true,
  agent_claims_require_local_proof:     true,
  no_execution_without_truth:           true,
  no_learning_from_false_claims:        true,
  baselined_at:                         '2026-05-21T15:00:00.000Z',
};

console.log('\n=== anti-hallucination-runtime-baseline tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildAntiHallucinationBaseline({});
  assert('no baseline_id → BLOCKED', r.anti_hallucination_baseline_status === 'ANTI_HALLUCINATION_BASELINE_BLOCKED');
  assert('anti_hallucination_runtime_ready=false', r.anti_hallucination_runtime_ready === false);
  assert('verified_module_count=0', r.verified_module_count === 0);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildAntiHallucinationBaseline(null);
  assert('null → BLOCKED', r.anti_hallucination_baseline_status === 'ANTI_HALLUCINATION_BASELINE_BLOCKED');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  assert('all ready → ANTI_HALLUCINATION_BASELINE_READY', r.anti_hallucination_baseline_status === 'ANTI_HALLUCINATION_BASELINE_READY');
  assert('anti_hallucination_runtime_ready=true', r.anti_hallucination_runtime_ready === true);
  assert('schema_version=v150.0', r.schema_version === 'v150.0');
  assert('baseline_id propagated', r.baseline_id === 'v150.0-baseline');
  assert('baselined_at propagated', r.baselined_at === '2026-05-21T15:00:00.000Z');
  assert('verified_module_count=9', r.verified_module_count === 9);
  assert('verified_modules length=9', r.verified_modules.length === 9);
  assert('agent_claim_verification_ready=true', r.agent_claim_verification_ready === true);
  assert('filesystem_reality_check_ready=true', r.filesystem_reality_check_ready === true);
  assert('git_diff_truth_binding_ready=true', r.git_diff_truth_binding_ready === true);
  assert('tool_execution_proof_ledger_ready=true', r.tool_execution_proof_ledger_ready === true);
  assert('hermes_hallucination_incident_memory_ready=true', r.hermes_hallucination_incident_memory_ready === true);
  assert('agent_truth_score_gate_ready=true', r.agent_truth_score_gate_ready === true);
  assert('real_execution_controlled_gate_ready=true', r.real_execution_controlled_gate_ready === true);
  assert('dry_run_truth_report_ready=true', r.dry_run_truth_report_ready === true);
  assert('hallucinated_claims_blocked=true', r.hallucinated_claims_blocked === true);
  assert('unverified_agent_claims_blocked=true', r.unverified_agent_claims_blocked === true);
  assert('pass_gold_fake_blocked=true', r.pass_gold_fake_blocked === true);
  assert('agent_claims_require_local_proof=true', r.agent_claims_require_local_proof === true);
  assert('no_execution_without_truth=true', r.no_execution_without_truth === true);
  assert('no_learning_from_false_claims=true', r.no_learning_from_false_claims === true);
}

// --- partial: modules ok but invariants missing ---
console.log('--- partial ---');
{
  const r = buildAntiHallucinationBaseline({
    ...ALL_READY,
    hallucinated_claims_blocked: false,
    unverified_agent_claims_blocked: false,
  });
  assert('modules ok + invariants fail → PARTIAL', r.anti_hallucination_baseline_status === 'ANTI_HALLUCINATION_BASELINE_PARTIAL');
  assert('anti_hallucination_runtime_ready=false', r.anti_hallucination_runtime_ready === false);
}

// --- partial: some modules missing ---
{
  const r = buildAntiHallucinationBaseline({
    baseline_id: 'b2',
    agent_claim_verification_ready: true,
    filesystem_reality_check_ready: true,
    hallucinated_claims_blocked: true,
    unverified_agent_claims_blocked: true,
    pass_gold_fake_blocked: true,
    agent_claims_require_local_proof: true,
    no_execution_without_truth: true,
    no_learning_from_false_claims: true,
  });
  assert('partial modules → PARTIAL or BLOCKED', ['ANTI_HALLUCINATION_BASELINE_PARTIAL','ANTI_HALLUCINATION_BASELINE_BLOCKED'].includes(r.anti_hallucination_baseline_status));
}

// --- baseline self always counted ---
{
  const r = buildAntiHallucinationBaseline({
    baseline_id: 'b3',
    agent_claim_verification_ready: false,
    filesystem_reality_check_ready: false,
  });
  assert('self module always counted (min 1)', r.verified_module_count >= 1);
}

// --- deterministic baseline_id_hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildAntiHallucinationBaseline({ ...ALL_READY });
  const r2 = buildAntiHallucinationBaseline({ ...ALL_READY });
  assert('baseline_id_hash deterministic', r1.baseline_id_hash === r2.baseline_id_hash);
  assert('baseline_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.baseline_id_hash));
}
{
  const r1 = buildAntiHallucinationBaseline({ ...ALL_READY, baseline_id: 'a' });
  const r2 = buildAntiHallucinationBaseline({ ...ALL_READY, baseline_id: 'b' });
  assert('different baseline_id → different hash', r1.baseline_id_hash !== r2.baseline_id_hash);
}

// --- baselined_at default ---
{
  const r = buildAntiHallucinationBaseline({ baseline_id: 'bx' });
  assert('no baselined_at → auto ISO', typeof r.baselined_at === 'string' && r.baselined_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildAntiHallucinationBaseline({}),
    buildAntiHallucinationBaseline({ ...ALL_READY }),
    buildAntiHallucinationBaseline({ baseline_id: 'bx', agent_claim_verification_ready: true }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.anti_hallucination_baseline_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.anti_hallucination_baseline_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.anti_hallucination_baseline_status}]`, r.release_performed === false);
    assert(`unsafe_learning_blocked=true [${r.anti_hallucination_baseline_status}]`, r.unsafe_learning_blocked === true);
    assert(`positive_learning_requires_pass_gold=true [${r.anti_hallucination_baseline_status}]`, r.positive_learning_requires_pass_gold === true);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const v = validateAntiHallucinationBaseline(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildAntiHallucinationBaseline({});
  const v = validateAntiHallucinationBaseline(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateAntiHallucinationBaseline(null).valid === false);
}
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const tampered = { ...r, stable_promoted: true };
  assert('stable_promoted tampered → invalid', validateAntiHallucinationBaseline(tampered).valid === false);
}
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const tampered = { ...r, unsafe_learning_blocked: false };
  assert('unsafe_learning_blocked tampered → invalid', validateAntiHallucinationBaseline(tampered).valid === false);
}
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const tampered = { ...r, anti_hallucination_baseline_status: 'ANTI_HALLUCINATION_BASELINE_READY', verified_module_count: 5 };
  assert('READY with wrong module count → invalid', validateAntiHallucinationBaseline(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const s = renderAntiHallucinationBaseline(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('ANTI_HALLUCINATION_BASELINE_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows baseline_id', s.includes('v150.0-baseline'));
  assert('render shows hallucinated_claims_blocked', s.includes('hallucinated_claims_blocked:'));
  assert('render shows no_execution_without_truth', s.includes('no_execution_without_truth:'));
}
{
  assert('render null graceful', typeof renderAntiHallucinationBaseline(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('ANTI_HALLUCINATION_BASELINE_STATUSES is array', Array.isArray(ANTI_HALLUCINATION_BASELINE_STATUSES));
  assert('ANTI_HALLUCINATION_BASELINE_STATUSES length=3', ANTI_HALLUCINATION_BASELINE_STATUSES.length === 3);
  assert('ANTI_HALLUCINATION_MODULES is array', Array.isArray(ANTI_HALLUCINATION_MODULES));
  assert('ANTI_HALLUCINATION_MODULES length=9', ANTI_HALLUCINATION_MODULES.length === 9);
  for (const m of [
    'agent-claim-verification-gate',
    'filesystem-reality-check',
    'git-diff-truth-binding',
    'tool-execution-proof-ledger',
    'hermes-hallucination-incident-memory',
    'agent-truth-score-gate',
    'real-execution-controlled-gate',
    'real-execution-dry-run-proof-report',
    'anti-hallucination-runtime-baseline',
  ]) {
    assert(`module present: ${m}`, ANTI_HALLUCINATION_MODULES.includes(m));
  }
}

// --- --json CLI output ---
console.log('--- CLI self-run ---');
{
  const r = buildAntiHallucinationBaseline({ ...ALL_READY });
  const s = renderAntiHallucinationBaseline(r);
  assert('CLI render has READY', s.includes('ANTI_HALLUCINATION_BASELINE_READY'));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
