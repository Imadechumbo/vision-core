#!/usr/bin/env node
/**
 * Release Intent Authority Binding — Unit Tests V41.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  bindReleaseIntentToAuthority,
  validateReleaseIntentAuthorityBinding,
  renderReleaseIntentAuthorityBinding,
  INTENT_AUTHORITY_BINDING_STATUSES,
} from '../release-intent-authority-binding.mjs';
import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
} from '../supervised-release-intent-contract.mjs';
import { validateAuthorityFixtureContract } from '../runtime-authority-fixture-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-intent-authority-binding.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS = '2026-05-17T12:00:00.000Z';

function makeValidIntent(overrides = {}) {
  const raw = createSupervisedReleaseIntent({
    intent_id:             'intent-v411-test',
    requested_by:          'test-operator-411',
    requested_action:      'supervised_release_candidate',
    target_version:        'v41.1',
    target_branch:         'main',
    git_head:              'abc1234test411',
    runtime_candidate_id:  'candidate-v411-test',
    evidence_package_id:   'pkg-v411-test',
    evidence_receipt_id:   'receipt-v411-test',
    evidence_source:       'go-core',
    authority_contract_id: 'authority-v411-test',
    expires_at:            '2030-01-01T00:00:00.000Z',
    ...overrides,
  });
  return validateSupervisedReleaseIntent({ ...raw, ...overrides }, { _mock_now: TS });
}

function makeValidAuthority(overrides = {}) {
  return validateAuthorityFixtureContract({
    contract_id:          'authority-v411-test',
    reviewer:             'test-reviewer-411',
    review_decision:      'approved',
    scope:                'local',
    temporal_valid:       true,
    authority_sufficient: true,
    ...overrides,
  });
}

// Pre-compute shared results
const validIntent    = makeValidIntent();
const validAuthority = makeValidAuthority();
const fixture        = bindReleaseIntentToAuthority({ fixture_mode: true });
const readyBinding   = bindReleaseIntentToAuthority({ intent: validIntent, authority_contract: validAuthority });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(INTENT_AUTHORITY_BINDING_STATUSES),                                    '[A-01] statuses is array');
assert(INTENT_AUTHORITY_BINDING_STATUSES.length === 6,                                      '[A-02] 6 statuses');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_BLOCKED_INTENT'),       '[A-03] BLOCKED_INTENT');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_BLOCKED_CONTRACT'),     '[A-04] BLOCKED_CONTRACT');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_BLOCKED_SCOPE'),        '[A-05] BLOCKED_SCOPE');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_BLOCKED_TEMPORAL'),     '[A-06] BLOCKED_TEMPORAL');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE'), '[A-07] BLOCKED_EVIDENCE_OVERRIDE');
assert(INTENT_AUTHORITY_BINDING_STATUSES.includes('INTENT_AUTHORITY_READY'),                '[A-08] READY');

// ─── Suite B: Default (no intent, no contract) ────────────────────
console.log('\n[Suite B] Default blocked intent');
const noInput = bindReleaseIntentToAuthority();
assert(noInput.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_INTENT', '[B-01] no input → BLOCKED_INTENT');
assert(noInput.intent_authority_binding_ready  === false,                             '[B-02] ready=false');
assert(noInput.blocking_reason                 === 'intent_not_valid',               '[B-03] blocking=intent_not_valid');

// ─── Suite C: Blocked intent ──────────────────────────────────────
console.log('\n[Suite C] Blocked intent');
const nullIntent = bindReleaseIntentToAuthority({ intent: null, authority_contract: validAuthority });
assert(nullIntent.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_INTENT', '[C-01] null intent → BLOCKED_INTENT');
const invalidIntent = bindReleaseIntentToAuthority({ intent: { release_intent_valid: false }, authority_contract: validAuthority });
assert(invalidIntent.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_INTENT', '[C-02] invalid intent → BLOCKED_INTENT');
const stringIntent = bindReleaseIntentToAuthority({ intent: 'bad', authority_contract: validAuthority });
assert(stringIntent.intent_authority_binding_status  === 'INTENT_AUTHORITY_BLOCKED_INTENT', '[C-03] string intent → BLOCKED_INTENT');
assert(nullIntent.deploy_allowed   === false, '[C-04] deploy=false (blocked intent)');
assert(nullIntent.promotion_allowed === false, '[C-05] promotion=false (blocked intent)');

// ─── Suite D: Blocked contract ────────────────────────────────────
console.log('\n[Suite D] Blocked contract');
const noContract = bindReleaseIntentToAuthority({ intent: validIntent, authority_contract: null });
assert(noContract.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_CONTRACT', '[D-01] null contract → BLOCKED_CONTRACT');
assert(noContract.blocking_reason                 === 'authority_contract_not_valid',     '[D-02] blocking=authority_contract_not_valid');
const invalidContract = bindReleaseIntentToAuthority({ intent: validIntent, authority_contract: { authority_valid: false } });
assert(invalidContract.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_CONTRACT', '[D-03] invalid contract → BLOCKED_CONTRACT');
assert(noContract.deploy_allowed   === false, '[D-04] deploy=false (blocked contract)');
assert(noContract.can_create_evidence === false, '[D-05] can_create_evidence=false (blocked contract)');

// ─── Suite E: Blocked scope ───────────────────────────────────────
console.log('\n[Suite E] Blocked scope');
const badScope = bindReleaseIntentToAuthority({
  intent: validIntent,
  authority_contract: { authority_valid: true, scope: 'production_deploy', temporal_valid: true, can_create_evidence: false, can_override_go_core: false },
});
assert(badScope.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_SCOPE',    '[E-01] bad scope → BLOCKED_SCOPE');
assert(badScope.blocking_reason.includes('invalid_scope_for_release'),                   '[E-02] blocking includes invalid_scope_for_release');
assert(badScope.authority_scope_valid           === false,                               '[E-03] authority_scope_valid=false');
const nullScope = bindReleaseIntentToAuthority({
  intent: validIntent,
  authority_contract: { authority_valid: true, scope: null, temporal_valid: true, can_create_evidence: false, can_override_go_core: false },
});
assert(nullScope.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_SCOPE',   '[E-04] null scope → BLOCKED_SCOPE');
assert(badScope.deploy_allowed === false,                                                 '[E-05] deploy=false (blocked scope)');

// ─── Suite F: Blocked temporal ────────────────────────────────────
console.log('\n[Suite F] Blocked temporal');
const expiredAuth = bindReleaseIntentToAuthority({
  intent: validIntent,
  authority_contract: { authority_valid: true, scope: 'local', temporal_valid: false, can_create_evidence: false, can_override_go_core: false },
});
assert(expiredAuth.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_TEMPORAL', '[F-01] expired auth → BLOCKED_TEMPORAL');
assert(expiredAuth.blocking_reason                 === 'authority_temporal_invalid',        '[F-02] blocking=authority_temporal_invalid');
assert(expiredAuth.authority_temporal_valid        === false,                              '[F-03] temporal_valid=false');
assert(expiredAuth.deploy_allowed                  === false,                              '[F-04] deploy=false');
assert(expiredAuth.can_execute_deploy              === false,                              '[F-05] can_execute_deploy=false');

// ─── Suite G: Blocked evidence override ──────────────────────────
console.log('\n[Suite G] Blocked evidence override');
const canCreateEvidence = bindReleaseIntentToAuthority({
  intent: validIntent,
  authority_contract: { authority_valid: true, scope: 'local', temporal_valid: true, can_create_evidence: true, can_override_go_core: false },
});
assert(canCreateEvidence.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', '[G-01] can_create_evidence=true → BLOCKED_EVIDENCE_OVERRIDE');
assert(canCreateEvidence.blocking_reason === 'authority_claims_evidence_override',                         '[G-02] blocking=authority_claims_evidence_override');
const canOverrideGo = bindReleaseIntentToAuthority({
  intent: validIntent,
  authority_contract: { authority_valid: true, scope: 'local', temporal_valid: true, can_create_evidence: false, can_override_go_core: true },
});
assert(canOverrideGo.intent_authority_binding_status === 'INTENT_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE',    '[G-03] can_override_go_core=true → BLOCKED_EVIDENCE_OVERRIDE');
assert(canCreateEvidence.can_create_evidence === false,                                                    '[G-04] can_create_evidence=false (blocked)');
assert(canCreateEvidence.deploy_allowed      === false,                                                    '[G-05] deploy=false (blocked)');

// ─── Suite H: Ready binding ───────────────────────────────────────
console.log('\n[Suite H] Ready binding');
assert(readyBinding.intent_authority_binding_status  === 'INTENT_AUTHORITY_READY',    '[H-01] status=INTENT_AUTHORITY_READY');
assert(readyBinding.intent_authority_binding_ready   === true,                        '[H-02] ready=true');
assert(typeof readyBinding.binding_id                === 'string',                    '[H-03] binding_id is string');
assert(readyBinding.binding_id.startsWith('binding_'),                                '[H-04] binding_id starts binding_');
assert(readyBinding.intent_id                        === 'intent-v411-test',          '[H-05] intent_id echoed');
assert(readyBinding.authority_contract_id            === 'authority-v411-test',       '[H-06] authority_contract_id echoed');
assert(readyBinding.authority_valid                  === true,                        '[H-07] authority_valid=true');
assert(readyBinding.authority_scope_valid            === true,                        '[H-08] authority_scope_valid=true');
assert(readyBinding.authority_temporal_valid         === true,                        '[H-09] authority_temporal_valid=true');
assert(readyBinding.authority_can_review_release     === true,                        '[H-10] authority_can_review_release=true');
assert(readyBinding.blocking_reason                  === null,                        '[H-11] blocking_reason=null');
assert(readyBinding.schema_version                   === 'v41.1',                     '[H-12] schema_version=v41.1');
// Binding ID deterministic
const readyBinding2 = bindReleaseIntentToAuthority({ intent: validIntent, authority_contract: validAuthority });
assert(readyBinding.binding_id === readyBinding2.binding_id,                          '[H-13] binding_id deterministic');
// Custom binding_id
const customBound = bindReleaseIntentToAuthority({ intent: validIntent, authority_contract: validAuthority, binding_id: 'my-binding-id' });
assert(customBound.binding_id === 'my-binding-id',                                    '[H-14] custom binding_id preserved');

// ─── Suite I: Invariants across all states ────────────────────────
console.log('\n[Suite I] Invariants');
for (const [label, result] of [
  ['no_input', noInput], ['blocked_intent', nullIntent], ['blocked_contract', noContract],
  ['blocked_scope', badScope], ['blocked_temporal', expiredAuth], ['blocked_evidence', canCreateEvidence],
  ['ready', readyBinding], ['fixture', fixture],
]) {
  assert(result.can_create_evidence   === false, `[I] can_create_evidence=false (${label})`);
  assert(result.can_override_go_core  === false, `[I] can_override_go_core=false (${label})`);
  assert(result.can_execute_deploy    === false, `[I] can_execute_deploy=false (${label})`);
  assert(result.can_create_tag        === false, `[I] can_create_tag=false (${label})`);
  assert(result.can_promote_stable    === false, `[I] can_promote_stable=false (${label})`);
  assert(result.deploy_allowed        === false, `[I] deploy_allowed=false (${label})`);
  assert(result.promotion_allowed     === false, `[I] promotion_allowed=false (${label})`);
  assert(result.stable_allowed        === false, `[I] stable_allowed=false (${label})`);
  assert(result.tag_allowed           === false, `[I] tag_allowed=false (${label})`);
}

// ─── Suite J: Fixture mode ────────────────────────────────────────
console.log('\n[Suite J] Fixture mode');
assert(fixture.intent_authority_binding_status === 'INTENT_AUTHORITY_READY', '[J-01] fixture → READY');
assert(fixture.intent_authority_binding_ready  === true,                     '[J-02] ready=true');
assert(fixture.authority_valid                 === true,                     '[J-03] authority_valid=true');
assert(fixture.authority_scope_valid           === true,                     '[J-04] authority_scope_valid=true');
assert(fixture.authority_temporal_valid        === true,                     '[J-05] authority_temporal_valid=true');
assert(fixture.authority_can_review_release    === true,                     '[J-06] authority_can_review_release=true');
assert(typeof fixture.binding_id               === 'string',                 '[J-07] binding_id string');
assert(fixture.intent_id                       === 'fixture-intent-411',     '[J-08] fixture intent_id');

// ─── Suite K: validateReleaseIntentAuthorityBinding ───────────────
console.log('\n[Suite K] validateReleaseIntentAuthorityBinding');
assert(validateReleaseIntentAuthorityBinding(readyBinding)  === true,  '[K-01] valid binding → true');
assert(validateReleaseIntentAuthorityBinding(fixture)       === true,  '[K-02] fixture binding → true');
assert(validateReleaseIntentAuthorityBinding(null)          === false, '[K-03] null → false');
assert(validateReleaseIntentAuthorityBinding(undefined)     === false, '[K-04] undefined → false');
assert(validateReleaseIntentAuthorityBinding({})            === false, '[K-05] empty obj → false');
assert(validateReleaseIntentAuthorityBinding({ schema_version: 'v41.1', can_create_evidence: true })  === false, '[K-06] can_create_evidence=true → false');
assert(validateReleaseIntentAuthorityBinding({ schema_version: 'v41.1', can_create_evidence: false, can_override_go_core: true }) === false, '[K-07] can_override_go_core=true → false');
assert(validateReleaseIntentAuthorityBinding(noInput)       === true,  '[K-08] blocked-state struct valid');

// ─── Suite L: renderReleaseIntentAuthorityBinding ─────────────────
console.log('\n[Suite L] renderReleaseIntentAuthorityBinding');
const rendered = renderReleaseIntentAuthorityBinding(readyBinding);
assert(typeof rendered     === 'string',                         '[L-01] returns string');
assert(rendered.includes('INTENT_AUTHORITY_READY'),             '[L-02] includes status');
assert(rendered.includes('can_create_evidence'),                '[L-03] includes can_create_evidence');
assert(rendered.includes('deploy_allowed'),                     '[L-04] includes deploy_allowed');
assert(rendered.includes('authority_can_review_release'),       '[L-05] includes authority_can_review_release');
assert(renderReleaseIntentAuthorityBinding(null) === 'No result provided.', '[L-06] null → fallback');

// ─── Suite M: CLI ─────────────────────────────────────────────────
console.log('\n[Suite M] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                         '[M-01] default → exit 1');
assert(cliDefault.stdout.includes('INTENT_AUTHORITY_BLOCKED_INTENT'),    '[M-02] stdout BLOCKED_INTENT');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                        '[M-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('INTENT_AUTHORITY_READY'),             '[M-04] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                          '[M-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                 '[M-06] JSON parseable');
assert(parsed && parsed.intent_authority_binding_ready === true,        '[M-07] JSON ready=true');
assert(parsed && parsed.can_create_evidence  === false,                 '[M-08] JSON can_create_evidence=false');
assert(parsed && parsed.can_override_go_core === false,                 '[M-09] JSON can_override_go_core=false');
assert(parsed && parsed.can_execute_deploy   === false,                 '[M-10] JSON can_execute_deploy=false');
assert(parsed && parsed.can_create_tag       === false,                 '[M-11] JSON can_create_tag=false');
assert(parsed && parsed.can_promote_stable   === false,                 '[M-12] JSON can_promote_stable=false');
assert(parsed && parsed.deploy_allowed       === false,                 '[M-13] JSON deploy=false');
assert(parsed && parsed.promotion_allowed    === false,                 '[M-14] JSON promotion=false');
assert(parsed && parsed.stable_allowed       === false,                 '[M-15] JSON stable=false');
assert(parsed && parsed.tag_allowed          === false,                 '[M-16] JSON tag=false');
assert(parsed && parsed.schema_version       === 'v41.1',               '[M-17] JSON schema=v41.1');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-intent-authority-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
