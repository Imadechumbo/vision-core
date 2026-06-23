#!/usr/bin/env node
/**
 * Tests — Stable Promotion Final Command Seal V122.1
 */

import {
  sealStablePromotionFinalCommands,
  validateStablePromotionFinalCommandSeal,
  renderStablePromotionFinalCommandSeal,
  COMMAND_SEAL_STATUSES,
} from '../stable-promotion-final-command-seal.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_SNAPSHOT = {
  snapshot_ready:    true,
  snapshot_id:       'snapshot-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  all_gates_passed:  true,
};

const GOOD_PACKAGE = {
  package_ready:             true,
  package_id:                'pkg-001',
  preflight_commands:        ['git fetch origin', 'git status'],
  future_promotion_commands: ['git branch -f stable v1.0.0', 'git push origin stable'],
  verification_commands:     ['git log origin/stable --oneline -3'],
  rollback_commands:         ['git branch -f stable rollback', 'git push origin stable'],
  forbidden_commands:        ['deploy', 'release'],
};

const GOOD_PARAMS = {
  stable_promotion_preflight_snapshot: GOOD_SNAPSHOT,
  stable_promotion_command_package:    GOOD_PACKAGE,
};

console.log('\n=== stable-promotion-final-command-seal tests ===\n');

console.log('--- null snapshot ---');
{
  const r = sealStablePromotionFinalCommands({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.seal_status === 'COMMAND_SEAL_BLOCKED_SNAPSHOT', 'null snapshot → BLOCKED_SNAPSHOT');
  assert(r.seal_ready === false, 'seal_ready false');
}

console.log('--- snapshot not ready ---');
{
  const r = sealStablePromotionFinalCommands({
    stable_promotion_preflight_snapshot: { snapshot_ready: false },
    stable_promotion_command_package:    GOOD_PACKAGE,
  });
  assert(r.seal_status === 'COMMAND_SEAL_BLOCKED_SNAPSHOT', 'not-ready snapshot → BLOCKED_SNAPSHOT');
}

console.log('--- null package ---');
{
  const r = sealStablePromotionFinalCommands({ stable_promotion_preflight_snapshot: GOOD_SNAPSHOT });
  assert(r.seal_status === 'COMMAND_SEAL_BLOCKED_PACKAGE', 'null package → BLOCKED_PACKAGE');
  assert(r.seal_ready === false, 'seal_ready false');
}

console.log('--- package not ready ---');
{
  const r = sealStablePromotionFinalCommands({
    stable_promotion_preflight_snapshot: GOOD_SNAPSHOT,
    stable_promotion_command_package:    { package_ready: false },
  });
  assert(r.seal_status === 'COMMAND_SEAL_BLOCKED_PACKAGE', 'not-ready package → BLOCKED_PACKAGE');
}

console.log('--- seal ready ---');
{
  const r = sealStablePromotionFinalCommands(GOOD_PARAMS);
  assert(r.seal_status === 'COMMAND_SEAL_READY', 'ready status');
  assert(r.seal_ready === true, 'seal_ready true');
  assert(r.snapshot_id === 'snapshot-001', 'snapshot_id propagated');
  assert(r.package_id === 'pkg-001', 'package_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.all_gates_passed === true, 'all_gates_passed propagated');
  assert(typeof r.seal_id === 'string' && r.seal_id.length === 64, 'seal_id sha256');
  assert(typeof r.commands_seal_hash === 'string' && r.commands_seal_hash.length === 64, 'commands_seal_hash sha256');
  assert(r.schema_version === 'v122.1', 'schema version');
}

console.log('--- sealed command arrays ---');
{
  const r = sealStablePromotionFinalCommands(GOOD_PARAMS);
  assert(Array.isArray(r.sealed_preflight), 'sealed_preflight array');
  assert(r.sealed_preflight.length === 2, 'preflight count');
  assert(Array.isArray(r.sealed_promotion), 'sealed_promotion array');
  assert(r.sealed_promotion.length === 2, 'promotion count');
  assert(Array.isArray(r.sealed_verification), 'sealed_verification array');
  assert(Array.isArray(r.sealed_rollback), 'sealed_rollback array');
  assert(Array.isArray(r.sealed_forbidden), 'sealed_forbidden array');
  assert(r.sealed_forbidden.includes('deploy'), 'deploy in forbidden');
  assert(r.sealed_forbidden.includes('release'), 'release in forbidden');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = sealStablePromotionFinalCommands({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = sealStablePromotionFinalCommands(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(sealStablePromotionFinalCommands(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(sealStablePromotionFinalCommands(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(sealStablePromotionFinalCommands(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(sealStablePromotionFinalCommands(GOOD_PARAMS).release_performed === false, 'release_performed=false');
}

console.log('--- seal_executes_nothing=true ---');
{
  const r1 = sealStablePromotionFinalCommands({});
  assert(r1.seal_executes_nothing === true, 'blocked: true');
  const r2 = sealStablePromotionFinalCommands(GOOD_PARAMS);
  assert(r2.seal_executes_nothing === true, 'ready: true');
}

console.log('--- sealed_commands_are_future_human_only=true ---');
{
  assert(sealStablePromotionFinalCommands(GOOD_PARAMS).sealed_commands_are_future_human_only === true, 'future_human_only=true');
}

console.log('--- validate ---');
{
  const r = sealStablePromotionFinalCommands(GOOD_PARAMS);
  const v = validateStablePromotionFinalCommandSeal(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionFinalCommandSeal(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = sealStablePromotionFinalCommands(GOOD_PARAMS);
  const txt = renderStablePromotionFinalCommandSeal(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION FINAL COMMAND SEAL'), 'render title');
  assert(txt.includes('SEALED PROMOTION'), 'promotion section');
  assert(txt.includes('SEALED FORBIDDEN'), 'forbidden section');
  assert(txt.includes('seal_executes_nothing:'), 'invariant in output');
  assert(txt.includes('sealed_commands_are_future_human_only:'), 'future human field in output');
}

console.log('--- render blocked ---');
{
  const r = sealStablePromotionFinalCommands({});
  const txt = renderStablePromotionFinalCommandSeal(r);
  assert(txt.includes('COMMAND SEAL BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_READY'), 'ready in statuses');
  assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_BLOCKED_SNAPSHOT'), 'snapshot blocked in statuses');
  assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_BLOCKED_PACKAGE'), 'package blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
