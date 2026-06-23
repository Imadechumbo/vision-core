#!/usr/bin/env node
/**
 * Tests — Hermes Similar Mission Classifier V142.1
 */

import {
  classifySimilarMission,
  validateSimilarMissionClassifier,
  renderSimilarMissionClassifier,
  CLASSIFIER_STATUSES,
} from '../hermes-similar-mission-classifier.mjs';

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

const HASH_A = 'd'.repeat(64);
const BASE_A = 'e'.repeat(64);

const FULL_MATCH = {
  mission_id:              'classifier-1',
  current_mission_type:    'feature',
  reference_mission_type:  'feature',
  current_changed_files:   ['src/a.ts', 'src/b.ts', 'src/c.ts'],
  reference_changed_files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
  current_agent_route:     'claude',
  reference_agent_route:   'claude',
  current_baseline_id:     BASE_A,
  reference_baseline_id:   BASE_A,
  current_error_signature: null,
  reference_error_signature: null,
  current_evidence_hash:   HASH_A,
  reference_evidence_hash: HASH_A,
  current_test_lane:       'quick',
  reference_test_lane:     'quick',
  classified_at:           '2026-05-20T12:00:00.000Z',
};

console.log('\n=== hermes-similar-mission-classifier tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = classifySimilarMission({ ...FULL_MATCH, mission_id: '' });
  assert('empty mission_id → CLASSIFIER_BLOCKED_INPUT', r.classifier_status === 'CLASSIFIER_BLOCKED_INPUT');
  assert('similarity_score=0', r.similarity_score === 0);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = classifySimilarMission({});
  assert('no params → CLASSIFIER_BLOCKED_INPUT', r.classifier_status === 'CLASSIFIER_BLOCKED_INPUT');
}

// --- high match ---
console.log('--- high match ---');
{
  const r = classifySimilarMission({ ...FULL_MATCH });
  // mission_type(3) + agent_route(2) + baseline(3) + test_lane(1) + files_overlap(2) + evidence_hash(3) = 14
  assert('full match → CLASSIFIER_MATCH_HIGH', r.classifier_status === 'CLASSIFIER_MATCH_HIGH');
  assert('score >= 10', r.similarity_score >= 10);
  assert('schema_version=v142.1', r.schema_version === 'v142.1');
  assert('mission_id propagated', r.mission_id === 'classifier-1');
  assert('classified_at propagated', r.classified_at === '2026-05-20T12:00:00.000Z');
}

// --- score signals ---
console.log('--- score signals ---');
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_mission_type: 'bug', reference_mission_type: 'bug',
  });
  assert('mission_type match → +3', r.score_breakdown.mission_type === 3);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_baseline_id: BASE_A, reference_baseline_id: BASE_A,
  });
  assert('baseline match → +3', r.score_breakdown.baseline_id === 3);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_evidence_hash: HASH_A, reference_evidence_hash: HASH_A,
  });
  assert('evidence_hash match → +3', r.score_breakdown.evidence_hash === 3);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_agent_route: 'local', reference_agent_route: 'local',
  });
  assert('agent_route match → +2', r.score_breakdown.agent_route === 2);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_error_signature: 'err-abc', reference_error_signature: 'err-abc',
  });
  assert('error_signature match → +2', r.score_breakdown.error_signature === 2);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_changed_files: ['a', 'b', 'c'], reference_changed_files: ['a', 'b', 'd'],
    // overlap = 2/3 > 0.5
  });
  assert('files overlap>50% → +2', r.score_breakdown.changed_files === 2);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_changed_files: ['a'], reference_changed_files: ['b'],
    // overlap = 0/1 = 0 → no score
  });
  assert('no file overlap → no changed_files score', !r.score_breakdown.changed_files);
}
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_test_lane: 'full', reference_test_lane: 'full',
  });
  assert('test_lane match → +1', r.score_breakdown.test_lane === 1);
}

// --- medium match ---
console.log('--- medium match ---');
{
  // baseline(3) + agent_route(2) = 5 < 6 → LOW
  // baseline(3) + agent_route(2) + test_lane(1) = 6 → MEDIUM
  const r = classifySimilarMission({
    mission_id: 'x',
    current_baseline_id: BASE_A, reference_baseline_id: BASE_A,
    current_agent_route: 'local', reference_agent_route: 'local',
    current_test_lane: 'quick', reference_test_lane: 'quick',
  });
  assert('score=6 → CLASSIFIER_MATCH_MEDIUM', r.classifier_status === 'CLASSIFIER_MATCH_MEDIUM');
}

// --- low match ---
console.log('--- low match ---');
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_agent_route: 'local', reference_agent_route: 'local',
    current_test_lane: 'quick', reference_test_lane: 'quick',
    // agent(2) + test_lane(1) = 3 → LOW
  });
  assert('score=3 → CLASSIFIER_MATCH_LOW', r.classifier_status === 'CLASSIFIER_MATCH_LOW');
}

// --- no match ---
console.log('--- no match ---');
{
  const r = classifySimilarMission({
    mission_id: 'x',
    current_mission_type: 'a', reference_mission_type: 'b',
    current_agent_route: 'local', reference_agent_route: 'premium',
  });
  assert('no shared signals → CLASSIFIER_NO_MATCH', r.classifier_status === 'CLASSIFIER_NO_MATCH');
  assert('score=0', r.similarity_score === 0);
}
{
  const r = classifySimilarMission({ mission_id: 'x' });
  assert('only mission_id → NO_MATCH', r.classifier_status === 'CLASSIFIER_NO_MATCH');
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    classifySimilarMission({ ...FULL_MATCH }),
    classifySimilarMission({ ...FULL_MATCH, mission_id: '' }),
    classifySimilarMission({ mission_id: 'x' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.classifier_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.classifier_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.classifier_status}]`, r.release_performed === false);
  }
}

// --- deterministic classifier_id ---
console.log('--- deterministic classifier_id ---');
{
  const r1 = classifySimilarMission({ ...FULL_MATCH });
  const r2 = classifySimilarMission({ ...FULL_MATCH });
  assert('classifier_id deterministic', r1.classifier_id === r2.classifier_id);
  assert('classifier_id sha256', /^[a-f0-9]{64}$/.test(r1.classifier_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = classifySimilarMission({ ...FULL_MATCH });
  const v = validateSimilarMissionClassifier(r);
  assert('validate high match → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = classifySimilarMission({ ...FULL_MATCH, mission_id: '' });
  const v = validateSimilarMissionClassifier(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateSimilarMissionClassifier(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = classifySimilarMission({ ...FULL_MATCH });
  const s = renderSimilarMissionClassifier(r);
  assert('render string', typeof s === 'string');
  assert('render shows HIGH', s.includes('CLASSIFIER_MATCH_HIGH'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = classifySimilarMission({ mission_id: 'x' });
  const s = renderSimilarMissionClassifier(r);
  assert('render NO_MATCH', s.includes('CLASSIFIER_NO_MATCH'));
}
{
  const s = renderSimilarMissionClassifier(null);
  assert('render null graceful', typeof s === 'string');
}

// --- statuses export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(CLASSIFIER_STATUSES));
  assert('length=5', CLASSIFIER_STATUSES.length === 5);
  for (const s of [
    'CLASSIFIER_BLOCKED_INPUT', 'CLASSIFIER_MATCH_HIGH',
    'CLASSIFIER_MATCH_MEDIUM', 'CLASSIFIER_MATCH_LOW', 'CLASSIFIER_NO_MATCH',
  ]) {
    assert(`${s} present`, CLASSIFIER_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
