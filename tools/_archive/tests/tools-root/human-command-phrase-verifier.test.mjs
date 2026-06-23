#!/usr/bin/env node
/**
 * Tests — Human Command Phrase Verifier V151.1
 */

import {
  buildHumanCommandPhraseVerifier,
  validateHumanCommandPhraseVerifier,
  renderHumanCommandPhraseVerifier,
  PHRASE_VERIFIER_STATUSES,
  REQUIRED_PHRASES,
} from '../human-command-phrase-verifier.mjs';

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

console.log('\n=== human-command-phrase-verifier tests ===\n');

// --- blocked empty ---
console.log('--- blocked empty ---');
{
  const r = buildHumanCommandPhraseVerifier({});
  assert('no verifier_id → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
  assert('phrase_verified=false', r.phrase_verified === false);
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildHumanCommandPhraseVerifier(null);
  assert('null → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
}
{
  const r = buildHumanCommandPhraseVerifier({ verifier_id: 'v1' });
  assert('no command_type → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
}
{
  const r = buildHumanCommandPhraseVerifier({ verifier_id: 'v1', command_type: 'UNKNOWN' });
  assert('unknown command_type → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v1',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
  });
  assert('no phrase → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v1',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: '   ',
  });
  assert('whitespace phrase → PHRASE_BLOCKED_EMPTY', r.phrase_verifier_status === 'PHRASE_BLOCKED_EMPTY');
}

// --- blocked mismatch ---
console.log('--- blocked mismatch ---');
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v2',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: 'wrong phrase',
  });
  assert('wrong phrase → PHRASE_BLOCKED_MISMATCH', r.phrase_verifier_status === 'PHRASE_BLOCKED_MISMATCH');
  assert('phrase_verified=false', r.phrase_verified === false);
  assert('supplied_phrase_hash present', /^[a-f0-9]{64}$/.test(r.supplied_phrase_hash));
  assert('raw phrase NOT in output', !('supplied_phrase' in r));
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v2',
    command_type: 'CONTROLLED_DEPLOY',
    supplied_phrase: 'execute controlled runtime now',
  });
  assert('wrong case → PHRASE_BLOCKED_MISMATCH', r.phrase_verifier_status === 'PHRASE_BLOCKED_MISMATCH');
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v2',
    command_type: 'CONTROLLED_STABLE_PROMOTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  assert('phrase for wrong type → PHRASE_BLOCKED_MISMATCH', r.phrase_verifier_status === 'PHRASE_BLOCKED_MISMATCH');
}

// --- phrase verified ---
console.log('--- phrase verified ---');
for (const [ct, phrase] of Object.entries(REQUIRED_PHRASES)) {
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: `v-${ct}`,
    command_type: ct,
    supplied_phrase: phrase,
    verified_at: '2026-05-21T17:00:00.000Z',
  });
  assert(`${ct} → PHRASE_VERIFIED`, r.phrase_verifier_status === 'PHRASE_VERIFIED');
  assert(`${ct} phrase_verified=true`, r.phrase_verified === true);
  assert(`${ct} supplied_phrase_hash sha256`, /^[a-f0-9]{64}$/.test(r.supplied_phrase_hash));
  assert(`${ct} raw phrase NOT in output`, !('supplied_phrase' in r));
  assert(`${ct} command_executed=false`, r.command_executed === false);
  assert(`${ct} execution_performed=false`, r.execution_performed === false);
  assert(`${ct} stable_promoted=false`, r.stable_promoted === false);
  assert(`${ct} deploy_performed=false`, r.deploy_performed === false);
  assert(`${ct} release_performed=false`, r.release_performed === false);
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v3',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
    verified_at: '2026-05-21T17:00:00.000Z',
  });
  assert('schema_version=v151.1', r.schema_version === 'v151.1');
  assert('verifier_id propagated', r.verifier_id === 'v3');
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('verified_at propagated', r.verified_at === '2026-05-21T17:00:00.000Z');
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildHumanCommandPhraseVerifier({
    verifier_id: 'v3',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  const r2 = buildHumanCommandPhraseVerifier({
    verifier_id: 'v3',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  assert('verifier_id_hash deterministic', r1.verifier_id_hash === r2.verifier_id_hash);
  assert('verifier_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.verifier_id_hash));
}
{
  const r1 = buildHumanCommandPhraseVerifier({ verifier_id: 'a', command_type: 'CONTROLLED_DEPLOY' });
  const r2 = buildHumanCommandPhraseVerifier({ verifier_id: 'b', command_type: 'CONTROLLED_DEPLOY' });
  assert('different verifier_id → different hash', r1.verifier_id_hash !== r2.verifier_id_hash);
}

// --- verified_at default ---
{
  const r = buildHumanCommandPhraseVerifier({});
  assert('no verified_at → auto ISO', typeof r.verified_at === 'string' && r.verified_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildHumanCommandPhraseVerifier({}),
    buildHumanCommandPhraseVerifier({ verifier_id: 'v4', command_type: 'CONTROLLED_DEPLOY', supplied_phrase: 'wrong' }),
    buildHumanCommandPhraseVerifier({ verifier_id: 'v5', command_type: 'CONTROLLED_DEPLOY', supplied_phrase: REQUIRED_PHRASES.CONTROLLED_DEPLOY }),
  ];
  for (const r of cases) {
    assert(`command_executed=false [${r.phrase_verifier_status}]`, r.command_executed === false);
    assert(`execution_performed=false [${r.phrase_verifier_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.phrase_verifier_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.phrase_verifier_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.phrase_verifier_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v6', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  const v = validateHumanCommandPhraseVerifier(r);
  assert('validate verified → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildHumanCommandPhraseVerifier({});
  const v = validateHumanCommandPhraseVerifier(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateHumanCommandPhraseVerifier(null).valid === false);
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v7', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  const tampered = { ...r, command_executed: true };
  assert('command_executed tampered → invalid', validateHumanCommandPhraseVerifier(tampered).valid === false);
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v8', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  const tampered = { ...r, execution_performed: true };
  assert('execution_performed tampered → invalid', validateHumanCommandPhraseVerifier(tampered).valid === false);
}
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v9', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  const tampered = { ...r, phrase_verified: false };
  assert('VERIFIED with phrase_verified=false → invalid', validateHumanCommandPhraseVerifier(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildHumanCommandPhraseVerifier({
    verifier_id: 'v10', command_type: 'CONTROLLED_DEPLOY',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_DEPLOY,
  });
  const s = renderHumanCommandPhraseVerifier(r);
  assert('render string', typeof s === 'string');
  assert('render shows PHRASE_VERIFIED', s.includes('PHRASE_VERIFIED'));
  assert('render shows REGRA', s.includes('command_executed=false'));
  assert('render shows verifier_id', s.includes('v10'));
  assert('render shows command_type', s.includes('CONTROLLED_DEPLOY'));
}
{
  const r = buildHumanCommandPhraseVerifier({});
  const s = renderHumanCommandPhraseVerifier(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderHumanCommandPhraseVerifier(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('PHRASE_VERIFIER_STATUSES is array', Array.isArray(PHRASE_VERIFIER_STATUSES));
  assert('PHRASE_VERIFIER_STATUSES length=3', PHRASE_VERIFIER_STATUSES.length === 3);
  assert('REQUIRED_PHRASES is object', typeof REQUIRED_PHRASES === 'object' && REQUIRED_PHRASES !== null);
  assert('REQUIRED_PHRASES has 5 entries', Object.keys(REQUIRED_PHRASES).length === 5);
  for (const ct of [
    'CONTROLLED_RUNTIME_EXECUTION',
    'CONTROLLED_STABLE_PROMOTION',
    'CONTROLLED_DEPLOY',
    'CONTROLLED_RELEASE',
    'CONTROLLED_ROLLBACK_DRILL',
  ]) {
    assert(`phrase exists for ${ct}`, typeof REQUIRED_PHRASES[ct] === 'string' && REQUIRED_PHRASES[ct].length > 0);
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
