#!/usr/bin/env node
/**
 * Tests — Hermes Hallucination Incident Memory V148.0
 */

import {
  recordHallucinationIncident,
  validateHallucinationIncident,
  renderHallucinationIncident,
  HALLUCINATION_INCIDENT_TYPES,
  HALLUCINATION_INCIDENT_STATUSES,
} from '../hermes-hallucination-incident-memory.mjs';

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

const BASE = {
  incident_id:   'inc-1',
  incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING',
  agent_name:    'Claude',
  claim_text:    'I created tools/foo.mjs',
  missing_proof: 'file_exists=false',
  local_reality_snapshot: { file_exists: false },
  recorded_at:   '2026-05-21T10:00:00.000Z',
};

console.log('\n=== hermes-hallucination-incident-memory tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = recordHallucinationIncident({});
  assert('no incident_id → recorded=false', r.hallucination_incident_recorded === false);
  assert('diagnostic_learning_allowed=true always', r.diagnostic_learning_allowed === true);
  assert('positive_learning_allowed=false always', r.positive_learning_allowed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = recordHallucinationIncident(null);
  assert('null → recorded=false', r.hallucination_incident_recorded === false);
}
{
  const r = recordHallucinationIncident({ incident_id: 'x', incident_type: 'UNKNOWN_TYPE' });
  assert('bad incident_type → recorded=false', r.hallucination_incident_recorded === false);
}

// --- first incident ---
console.log('--- first incident ---');
{
  const r = recordHallucinationIncident({ ...BASE });
  assert('first incident → HALLUCINATION_INCIDENT_RECORDED', r.hallucination_incident_status === 'HALLUCINATION_INCIDENT_RECORDED');
  assert('hallucination_incident_recorded=true', r.hallucination_incident_recorded === true);
  assert('schema_version=v148.0', r.schema_version === 'v148.0');
  assert('incident_id propagated', r.incident_id === 'inc-1');
  assert('incident_type propagated', r.incident_type === 'CLAIMED_FILE_CREATED_BUT_MISSING');
  assert('agent_name propagated', r.agent_name === 'Claude');
  assert('claim_text_hash is sha256', /^[a-f0-9]{64}$/.test(r.claim_text_hash));
  assert('recorded_at propagated', r.recorded_at === '2026-05-21T10:00:00.000Z');
  assert('repeat_incident_count=1', r.repeat_incident_count === 1);
  assert('trust_score_delta < 0', r.agent_trust_score_delta < 0);
  assert('recommended_guardrail set', typeof r.recommended_guardrail === 'string' && r.recommended_guardrail.length > 0);
  assert('human_review_required=false first time', r.human_review_required === false);
  assert('diagnostic_learning_allowed=true', r.diagnostic_learning_allowed === true);
  assert('positive_learning_allowed=false', r.positive_learning_allowed === false);
}

// --- repeat detection ---
console.log('--- repeat detection ---');
{
  const prior = [
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
  ];
  const r = recordHallucinationIncident({ ...BASE, prior_incidents: prior });
  assert('one prior → HALLUCINATION_REPEAT_DETECTED', r.hallucination_incident_status === 'HALLUCINATION_REPEAT_DETECTED');
  assert('repeat_incident_count=2', r.repeat_incident_count === 2);
  assert('human_review_required=false below threshold', r.human_review_required === false);
}

// --- escalation at threshold (3) ---
console.log('--- escalation ---');
{
  const prior = [
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
  ];
  const r = recordHallucinationIncident({ ...BASE, prior_incidents: prior });
  assert('2 priors + 1 new = 3 → HALLUCINATION_ESCALATION_REQUIRED', r.hallucination_incident_status === 'HALLUCINATION_ESCALATION_REQUIRED');
  assert('human_review_required=true', r.human_review_required === true);
  assert('repeat_incident_count=3', r.repeat_incident_count === 3);
}
{
  const prior = [
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
    { incident_type: 'CLAIMED_FILE_CREATED_BUT_MISSING', agent_name: 'Claude' },
  ];
  const r = recordHallucinationIncident({ ...BASE, prior_incidents: prior });
  assert('4+ → still ESCALATION_REQUIRED', r.hallucination_incident_status === 'HALLUCINATION_ESCALATION_REQUIRED');
  assert('human_review_required=true', r.human_review_required === true);
}

// --- different incident types don't count as same repeat ---
console.log('--- repeat isolation ---');
{
  const prior = [
    { incident_type: 'CLAIMED_COMMIT_BUT_HASH_MISSING', agent_name: 'Claude' },
    { incident_type: 'CLAIMED_PR_BUT_PR_MISSING',       agent_name: 'Claude' },
  ];
  const r = recordHallucinationIncident({ ...BASE, prior_incidents: prior });
  assert('different prior types → first incident', r.hallucination_incident_status === 'HALLUCINATION_INCIDENT_RECORDED');
  assert('repeat_incident_count=1 (own type)', r.repeat_incident_count === 1);
}

// --- all incident types have guardrails and delta ---
console.log('--- all incident types ---');
{
  for (const t of HALLUCINATION_INCIDENT_TYPES) {
    const r = recordHallucinationIncident({ incident_id: `i-${t}`, incident_type: t });
    assert(`${t} → recorded`, r.hallucination_incident_recorded === true);
    assert(`${t} → delta < 0`, r.agent_trust_score_delta < 0);
    assert(`${t} → guardrail set`, typeof r.recommended_guardrail === 'string');
  }
}

// --- PASS_GOLD_WITHOUT_RECEIPT has highest penalty ---
{
  const r1 = recordHallucinationIncident({ incident_id: 'i1', incident_type: 'CLAIMED_PASS_GOLD_WITHOUT_RECEIPT' });
  const r2 = recordHallucinationIncident({ incident_id: 'i2', incident_type: 'CLAIMED_SCRIPT_ADDED_BUT_MISSING' });
  assert('PASS_GOLD penalty worse than SCRIPT', r1.agent_trust_score_delta <= r2.agent_trust_score_delta);
}

// --- REGRA ABSOLUTA + learning invariants ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    recordHallucinationIncident({}),
    recordHallucinationIncident({ ...BASE }),
    recordHallucinationIncident({ ...BASE, prior_incidents: [{ incident_type: BASE.incident_type, agent_name: 'Claude' }, { incident_type: BASE.incident_type, agent_name: 'Claude' }] }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.hallucination_incident_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.hallucination_incident_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.hallucination_incident_status}]`, r.release_performed === false);
    assert(`positive_learning_allowed=false [${r.hallucination_incident_status}]`, r.positive_learning_allowed === false);
    assert(`diagnostic_learning_allowed=true [${r.hallucination_incident_status}]`, r.diagnostic_learning_allowed === true);
  }
}

// --- deterministic incident_hash ---
console.log('--- deterministic hash ---');
{
  const r1 = recordHallucinationIncident({ ...BASE });
  const r2 = recordHallucinationIncident({ ...BASE });
  assert('incident_hash deterministic', r1.incident_hash === r2.incident_hash);
  assert('incident_hash sha256', /^[a-f0-9]{64}$/.test(r1.incident_hash));
}

// --- recorded_at default ---
{
  const r = recordHallucinationIncident({ incident_id: 'x', incident_type: 'CLAIMED_APPLIED_BUT_DIFF_EMPTY' });
  assert('no recorded_at → auto ISO', typeof r.recorded_at === 'string' && r.recorded_at.length > 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = recordHallucinationIncident({ ...BASE });
  const v = validateHallucinationIncident(r);
  assert('validate recorded → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = recordHallucinationIncident({});
  const v = validateHallucinationIncident(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateHallucinationIncident(null).valid === false);
}
{
  const r = recordHallucinationIncident({ ...BASE });
  const tampered = { ...r, positive_learning_allowed: true };
  const v = validateHallucinationIncident(tampered);
  assert('positive_learning_allowed tampered → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = recordHallucinationIncident({ ...BASE });
  const s = renderHallucinationIncident(r);
  assert('render string', typeof s === 'string');
  assert('render shows HALLUCINATION_INCIDENT_RECORDED', s.includes('HALLUCINATION_INCIDENT_RECORDED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows diagnostic_learning_allowed', s.includes('diagnostic_learning_allowed:'));
  assert('render shows positive_learning_allowed', s.includes('positive_learning_allowed:'));
}
{
  assert('render null graceful', typeof renderHallucinationIncident(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('HALLUCINATION_INCIDENT_TYPES is array', Array.isArray(HALLUCINATION_INCIDENT_TYPES));
  assert('HALLUCINATION_INCIDENT_TYPES length=7', HALLUCINATION_INCIDENT_TYPES.length === 7);
  assert('HALLUCINATION_INCIDENT_STATUSES is array', Array.isArray(HALLUCINATION_INCIDENT_STATUSES));
  assert('HALLUCINATION_INCIDENT_STATUSES length=4', HALLUCINATION_INCIDENT_STATUSES.length === 4);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
