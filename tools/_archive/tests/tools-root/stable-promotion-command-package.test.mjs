#!/usr/bin/env node
/**
 * Tests — Stable Promotion Command Package V117.0
 */

import {
  buildStablePromotionCommandPackage,
  validateStablePromotionCommandPackage,
  renderStablePromotionCommandPackage,
  STABLE_COMMAND_PACKAGE_STATUSES,
  FORBIDDEN_COMMANDS,
} from '../stable-promotion-command-package.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_BINDING = { binding_ready: true, binding_id: 'binding-001' };
const GOOD_PARAMS = {
  stable_promotion_approval_binding: GOOD_BINDING,
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
  git_head:           'cafecafe1234567',
  rollback_anchor_id: 'rollback-001',
};

console.log('\n=== stable-promotion-command-package tests ===\n');

console.log('--- missing binding ---');
{
  const r = buildStablePromotionCommandPackage({ ...GOOD_PARAMS, stable_promotion_approval_binding: null });
  assert(r.package_status === 'COMMAND_PACKAGE_BLOCKED_BINDING', 'null binding → BLOCKED_BINDING');
  assert(r.package_ready === false, 'package_ready false');
}

console.log('--- binding not ready ---');
{
  const r = buildStablePromotionCommandPackage({ ...GOOD_PARAMS, stable_promotion_approval_binding: { binding_ready: false } });
  assert(r.package_status === 'COMMAND_PACKAGE_BLOCKED_BINDING', 'not-ready → BLOCKED_BINDING');
}

console.log('--- command strings present ---');
{
  const r = buildStablePromotionCommandPackage(GOOD_PARAMS);
  assert(r.package_status === 'COMMAND_PACKAGE_READY', 'ready status');
  assert(Array.isArray(r.preflight_commands), 'preflight_commands array');
  assert(r.preflight_commands.length > 0, 'preflight_commands not empty');
  assert(Array.isArray(r.future_promotion_commands), 'future_promotion_commands array');
  assert(r.future_promotion_commands.length > 0, 'future_promotion_commands not empty');
  assert(r.future_promotion_commands.some(c => c.includes('git branch')), 'promotion command includes git branch');
  assert(r.future_promotion_commands.some(c => c.includes('git push')), 'promotion command includes git push');
}

console.log('--- rollback commands present ---');
{
  const r = buildStablePromotionCommandPackage(GOOD_PARAMS);
  assert(Array.isArray(r.rollback_commands), 'rollback_commands array');
  assert(r.rollback_commands.length > 0, 'rollback_commands not empty');
  assert(r.rollback_commands.some(c => c.includes('rollback-001')), 'rollback anchor in rollback cmd');
}

console.log('--- forbidden commands present ---');
{
  const r = buildStablePromotionCommandPackage(GOOD_PARAMS);
  assert(Array.isArray(r.forbidden_commands), 'forbidden_commands array');
  assert(r.forbidden_commands.includes('deploy'), 'deploy forbidden');
  assert(r.forbidden_commands.includes('release'), 'release forbidden');
}

console.log('--- stable_promotion_allowed=false ---');
{
  assert(buildStablePromotionCommandPackage(GOOD_PARAMS).stable_promotion_allowed === false, 'stable_promotion_allowed=false');
  assert(buildStablePromotionCommandPackage({ ...GOOD_PARAMS, stable_promotion_approval_binding: null }).stable_promotion_allowed === false, 'blocked: false');
}

console.log('--- stable_promoted=false ---');
{ assert(buildStablePromotionCommandPackage(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false'); }

console.log('--- git_push_performed=false ---');
{ assert(buildStablePromotionCommandPackage(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false'); }

console.log('--- deploy_performed=false ---');
{ assert(buildStablePromotionCommandPackage(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false'); }

console.log('--- release_performed=false ---');
{ assert(buildStablePromotionCommandPackage(GOOD_PARAMS).release_performed === false, 'release_performed=false'); }

console.log('--- human_must_execute_manually=true ---');
{ assert(buildStablePromotionCommandPackage(GOOD_PARAMS).human_must_execute_manually === true, 'human_must_execute_manually=true'); }

console.log('--- validate ---');
{
  const r = buildStablePromotionCommandPackage(GOOD_PARAMS);
  const v = validateStablePromotionCommandPackage(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- render ready ---');
{
  const txt = renderStablePromotionCommandPackage(buildStablePromotionCommandPackage(GOOD_PARAMS));
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION COMMAND PACKAGE'), 'render title');
}

console.log('--- render blocked ---');
{
  const txt = renderStablePromotionCommandPackage(buildStablePromotionCommandPackage({ ...GOOD_PARAMS, stable_promotion_approval_binding: null }));
  assert(txt.includes('COMMAND PACKAGE BLOCKED'), 'render blocked');
}

console.log('--- statuses + forbidden exports ---');
{
  assert(STABLE_COMMAND_PACKAGE_STATUSES.includes('COMMAND_PACKAGE_READY'), 'ready in statuses');
  assert(FORBIDDEN_COMMANDS.includes('deploy'), 'deploy in forbidden export');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
