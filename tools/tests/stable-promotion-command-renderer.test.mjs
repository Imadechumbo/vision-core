#!/usr/bin/env node
/**
 * Tests — Stable Promotion Command Renderer V117.1
 */

import {
  renderStablePromotionCommandBlock,
  validateStablePromotionCommandBlock,
  renderStablePromotionHumanInstructions,
  COMMAND_RENDER_STATUSES,
} from '../stable-promotion-command-renderer.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_PACKAGE = {
  package_ready:             true,
  package_id:                'pkg-001',
  target_stable_ref:         'stable',
  target_tag:                'v1.0.0',
  preflight_commands:        ['git fetch origin', 'git status'],
  future_promotion_commands: ['git branch -f stable v1.0.0', 'git push origin stable'],
  verification_commands:     ['git log origin/stable --oneline -3'],
  rollback_commands:         ['git branch -f stable rollback-001', 'git push origin stable'],
  forbidden_commands:        ['deploy', 'release'],
};

console.log('\n=== stable-promotion-command-renderer tests ===\n');

console.log('--- null package ---');
{
  const r = renderStablePromotionCommandBlock({});
  assert(r.render_status === 'COMMAND_RENDER_BLOCKED_PACKAGE', 'null pkg → BLOCKED_PACKAGE');
  assert(r.render_ready === false, 'render_ready false');
}

console.log('--- package not ready ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: { package_ready: false } });
  assert(r.render_status === 'COMMAND_RENDER_BLOCKED_PACKAGE', 'not-ready → BLOCKED_PACKAGE');
}

console.log('--- ready block ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.render_status === 'COMMAND_RENDER_READY', 'ready status');
  assert(r.render_ready === true, 'render_ready true');
  assert(r.package_id === 'pkg-001', 'package_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(Array.isArray(r.rendered_preflight), 'rendered_preflight array');
  assert(r.rendered_preflight.length === 2, 'preflight count');
  assert(Array.isArray(r.rendered_promotion), 'rendered_promotion array');
  assert(r.rendered_promotion.length === 2, 'promotion count');
  assert(Array.isArray(r.rendered_verification), 'rendered_verification array');
  assert(Array.isArray(r.rendered_rollback), 'rendered_rollback array');
  assert(Array.isArray(r.rendered_forbidden), 'rendered_forbidden array');
  assert(r.rendered_forbidden.includes('deploy'), 'deploy in forbidden');
  assert(typeof r.command_block_id === 'string' && r.command_block_id.length === 64, 'command_block_id sha256');
  assert(r.schema_version === 'v117.1', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = renderStablePromotionCommandBlock({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- copy_paste_safe=true ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.copy_paste_safe === true, 'copy_paste_safe=true');
}

console.log('--- human_only=true ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.human_only === true, 'human_only=true');
}

console.log('--- no_ci=true ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.no_ci === true, 'no_ci=true');
}

console.log('--- no_automation=true ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  assert(r.no_automation === true, 'no_automation=true');
}

console.log('--- validate ready ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  const v = validateStablePromotionCommandBlock(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate blocked ---');
{
  const r = renderStablePromotionCommandBlock({});
  const v = validateStablePromotionCommandBlock(r);
  assert(v.valid === true, 'blocked block validates ok');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionCommandBlock(null);
  assert(v.valid === false, 'null → invalid');
  assert(v.errors.length > 0, 'has errors');
}

console.log('--- human instructions ready ---');
{
  const r = renderStablePromotionCommandBlock({ stable_promotion_command_package: GOOD_PACKAGE });
  const txt = renderStablePromotionHumanInstructions(r);
  assert(typeof txt === 'string', 'instructions string');
  assert(txt.includes('STABLE PROMOTION HUMAN INSTRUCTIONS'), 'title present');
  assert(txt.includes('PREFLIGHT'), 'preflight section');
  assert(txt.includes('STABLE PROMOTION COMMANDS'), 'promotion section');
  assert(txt.includes('VERIFICATION'), 'verification section');
  assert(txt.includes('ROLLBACK'), 'rollback section');
  assert(txt.includes('FORBIDDEN'), 'forbidden section');
  assert(txt.includes('stable_promotion_allowed:  false'), 'invariant in output');
  assert(txt.includes('stable_promoted:           false'), 'promoted in output');
  assert(txt.includes('human_only:                true'), 'human_only in output');
}

console.log('--- human instructions blocked ---');
{
  const r = renderStablePromotionCommandBlock({});
  const txt = renderStablePromotionHumanInstructions(r);
  assert(txt.includes('COMMAND RENDER BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(COMMAND_RENDER_STATUSES.includes('COMMAND_RENDER_READY'), 'ready in statuses');
  assert(COMMAND_RENDER_STATUSES.includes('COMMAND_RENDER_BLOCKED_PACKAGE'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
