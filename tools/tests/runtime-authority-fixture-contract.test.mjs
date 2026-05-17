#!/usr/bin/env node
/**
 * Runtime Authority Fixture Contract — Unit Tests V32.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  validateAuthorityFixtureContract,
  buildDrillAuthorityFixture,
  AUTH_FIXTURE_STATUSES,
} from '../runtime-authority-fixture-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-authority-fixture-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const VALID_OPTIONS = {
  contract_id:     'auth-test-001',
  reviewer:        'test_reviewer',
  review_decision: 'approved',
  scope:           'candidate_drill',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(AUTH_FIXTURE_STATUSES),                                      '[A-01] statuses is array');
assert(AUTH_FIXTURE_STATUSES.length === 5,                                        '[A-02] 5 statuses');
assert(AUTH_FIXTURE_STATUSES.includes('AUTH_FIXTURE_BLOCKED_MISSING'),            '[A-03] BLOCKED_MISSING present');
assert(AUTH_FIXTURE_STATUSES.includes('AUTH_FIXTURE_BLOCKED_DECISION'),           '[A-04] BLOCKED_DECISION present');
assert(AUTH_FIXTURE_STATUSES.includes('AUTH_FIXTURE_BLOCKED_SCOPE'),              '[A-05] BLOCKED_SCOPE present');
assert(AUTH_FIXTURE_STATUSES.includes('AUTH_FIXTURE_BLOCKED_TEMPORAL'),           '[A-06] BLOCKED_TEMPORAL present');
assert(AUTH_FIXTURE_STATUSES.includes('AUTH_FIXTURE_READY'),                      '[A-07] AUTH_FIXTURE_READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const missing  = validateAuthorityFixtureContract({});
const ready    = validateAuthorityFixtureContract(VALID_OPTIONS);
assert(missing.deploy_allowed        === false, '[B-01] deploy=false (blocked)');
assert(missing.promotion_allowed     === false, '[B-02] promotion=false (blocked)');
assert(missing.stable_allowed        === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed          === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed       === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed          === false, '[B-06] stable=false (READY)');
assert(ready.can_create_evidence     === false, '[B-07] can_create_evidence=false always');
assert(ready.can_override_go_core    === false, '[B-08] can_override_go_core=false always');
assert(missing.can_create_evidence   === false, '[B-09] can_create_evidence=false (blocked)');
assert(missing.can_override_go_core  === false, '[B-10] can_override_go_core=false (blocked)');

// ─── Suite C: Missing blocked ─────────────────────────────────────
console.log('\n[Suite C] Missing blocked');
assert(missing.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_MISSING', '[C-01] no opts → BLOCKED_MISSING');
assert(missing.authority_valid          === false,                           '[C-02] authority_valid=false');

const noContract = validateAuthorityFixtureContract({ reviewer: 'r', review_decision: 'approved', scope: 'drill' });
assert(noContract.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_MISSING', '[C-03] no contract_id → BLOCKED_MISSING');

const noReviewer = validateAuthorityFixtureContract({ contract_id: 'c1', review_decision: 'approved', scope: 'drill' });
assert(noReviewer.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_MISSING', '[C-04] no reviewer → BLOCKED_MISSING');

// ─── Suite D: Decision blocked ────────────────────────────────────
console.log('\n[Suite D] Decision blocked');
const rejected = validateAuthorityFixtureContract({ ...VALID_OPTIONS, review_decision: 'rejected' });
assert(rejected.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_DECISION', '[D-01] rejected → BLOCKED_DECISION');

const pending = validateAuthorityFixtureContract({ ...VALID_OPTIONS, review_decision: 'pending' });
assert(pending.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_DECISION', '[D-02] pending → BLOCKED_DECISION');

const nullDecision = validateAuthorityFixtureContract({ ...VALID_OPTIONS, review_decision: null });
assert(nullDecision.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_DECISION', '[D-03] null decision → BLOCKED_DECISION');

// ─── Suite E: Scope blocked ───────────────────────────────────────
console.log('\n[Suite E] Scope blocked');
const badScope = validateAuthorityFixtureContract({ ...VALID_OPTIONS, scope: 'production' });
assert(badScope.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_SCOPE', '[E-01] production scope → BLOCKED_SCOPE');

const noScope = validateAuthorityFixtureContract({ ...VALID_OPTIONS, scope: null });
assert(noScope.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_SCOPE', '[E-02] null scope → BLOCKED_SCOPE');

const deployScope = validateAuthorityFixtureContract({ ...VALID_OPTIONS, scope: 'deploy' });
assert(deployScope.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_SCOPE', '[E-03] deploy scope → BLOCKED_SCOPE');

// ─── Suite F: Temporal blocked ────────────────────────────────────
console.log('\n[Suite F] Temporal blocked');
const expired = validateAuthorityFixtureContract({ ...VALID_OPTIONS, temporal_valid: false });
assert(expired.authority_fixture_status === 'AUTH_FIXTURE_BLOCKED_TEMPORAL', '[F-01] expired → BLOCKED_TEMPORAL');
assert(expired.blocking_reason          === 'authority_fixture_expired',     '[F-02] correct reason');

// ─── Suite G: Full valid → AUTH_FIXTURE_READY ─────────────────────
console.log('\n[Suite G] Full valid');
assert(ready.authority_fixture_status === 'AUTH_FIXTURE_READY',   '[G-01] status=AUTH_FIXTURE_READY');
assert(ready.authority_valid          === true,                    '[G-02] authority_valid=true');
assert(ready.contract_id              === 'auth-test-001',         '[G-03] contract_id echoed');
assert(ready.reviewer                 === 'test_reviewer',         '[G-04] reviewer echoed');
assert(ready.review_decision          === 'approved',              '[G-05] review_decision=approved');
assert(ready.scope                    === 'candidate_drill',       '[G-06] scope echoed');
assert(ready.temporal_valid           === true,                    '[G-07] temporal_valid=true');
assert(ready.blocking_reason          === null,                    '[G-08] blocking_reason=null');
assert(ready.schema_version           === 'v32.1',                 '[G-09] schema=v32.1');

// Valid scopes
for (const scope of ['drill', 'test', 'local', 'candidate_drill', 'pass_gold_drill']) {
  const r = validateAuthorityFixtureContract({ ...VALID_OPTIONS, scope });
  assert(r.authority_fixture_status === 'AUTH_FIXTURE_READY', `[G-10] scope=${scope} → READY`);
}

// ─── Suite H: buildDrillAuthorityFixture ──────────────────────────
console.log('\n[Suite H] Build fixture');
const built = buildDrillAuthorityFixture();
assert(built.authority_fixture_status === 'AUTH_FIXTURE_READY', '[H-01] build → AUTH_FIXTURE_READY');
assert(built.authority_valid          === true,                  '[H-02] authority_valid=true');
assert(built.can_create_evidence      === false,                 '[H-03] can_create_evidence=false');
assert(built.can_override_go_core     === false,                 '[H-04] can_override_go_core=false');
assert(built.scope                    === 'candidate_drill',     '[H-05] default scope=candidate_drill');
assert(built.reviewer                 === 'drill_local',         '[H-06] default reviewer=drill_local');

const builtOverride = buildDrillAuthorityFixture({ scope: 'pass_gold_drill' });
assert(builtOverride.scope === 'pass_gold_drill', '[H-07] scope override works');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                '[I-01] no args → exit 1');

const cliBuild = runCLI(['--build-fixture']);
assert(cliBuild.exitCode === 0,                                  '[I-02] --build-fixture → exit 0');
assert(cliBuild.stdout.includes('AUTH_FIXTURE_READY'),           '[I-03] stdout AUTH_FIXTURE_READY');
assert(cliBuild.stdout.includes('can_create_evidence'),          '[I-04] stdout shows can_create_evidence');

const cliJson = runCLI(['--build-fixture', '--json']);
assert(cliJson.exitCode === 0,                                   '[I-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                          '[I-06] JSON parseable');
assert(parsed && parsed.can_create_evidence  === false,          '[I-07] JSON can_create_evidence=false');
assert(parsed && parsed.can_override_go_core === false,          '[I-08] JSON can_override_go_core=false');
assert(parsed && parsed.deploy_allowed       === false,          '[I-09] JSON deploy=false');
assert(parsed && parsed.promotion_allowed    === false,          '[I-10] JSON promotion=false');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(ready.schema_version   === 'v32.1', '[J-01] schema=v32.1 (READY)');
assert(missing.schema_version === 'v32.1', '[J-02] schema=v32.1 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-authority-fixture-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
