#!/usr/bin/env node
/**
 * Tests — One Real Tag Final Execution Packet V106.0
 */

import {
  buildOneRealTagFinalExecutionPacket,
  validateOneRealTagFinalExecutionPacket,
  renderOneRealTagFinalExecutionPacket,
  EXEC_PACKET_STATUSES,
} from '../one-real-tag-final-execution-packet.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const MOCK_BASELINE = {
  human_exec_readiness_ready:       true,
  human_exec_readiness_baseline_id: 'baseline-v105-mock',
  human_exec_readiness_status:      'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION',
  ready_for_manual_tag_execution:   true,
  actual_real_tag_created:          false,
  actual_git_push_performed:        false,
  stable_promoted:                  false,
};

const GOOD_PARAMS = {
  human_exec_readiness_baseline: MOCK_BASELINE,
  target_tag:          'v106.0',
  git_head:            'abc1234def567',
  evidence_receipt_id: 'receipt-001',
  evidence_source:     'go-core',
  rollback_anchor_id:  'rollback-001',
  command_seal_id:     'seal-001',
  receipt_template_id: 'template-001',
};

console.log('\n=== one-real-tag-final-execution-packet tests ===\n');

// missing baseline
console.log('--- missing baseline ---');
{
  const r = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, human_exec_readiness_baseline: null });
  assert(r.packet_status === 'EXEC_PACKET_BLOCKED_BASELINE', 'null baseline → BLOCKED_BASELINE');
  assert(r.packet_ready === false, 'packet_ready false');
  assert(r.tag_created === false, 'tag_created false');
}

// baseline not ready
console.log('--- baseline not ready ---');
{
  const r = buildOneRealTagFinalExecutionPacket({
    ...GOOD_PARAMS,
    human_exec_readiness_baseline: { human_exec_readiness_ready: false },
  });
  assert(r.packet_status === 'EXEC_PACKET_BLOCKED_BASELINE', 'not-ready baseline → BLOCKED_BASELINE');
}

// bad tag
console.log('--- bad tag ---');
{
  const r1 = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, target_tag: 'release-1.0' });
  assert(r1.packet_status === 'EXEC_PACKET_BLOCKED_TAG', 'no-v prefix → BLOCKED_TAG');

  const r2 = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, target_tag: null });
  assert(r2.packet_status === 'EXEC_PACKET_BLOCKED_TAG', 'null tag → BLOCKED_TAG');
}

// missing head
console.log('--- missing head ---');
{
  const r = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, git_head: '' });
  assert(r.packet_status === 'EXEC_PACKET_BLOCKED_HEAD', 'empty head → BLOCKED_HEAD');
}

// backend evidence blocked
console.log('--- backend evidence blocked ---');
{
  const r1 = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, evidence_source: 'backend' });
  assert(r1.packet_status === 'EXEC_PACKET_BLOCKED_EVIDENCE', 'backend source → BLOCKED_EVIDENCE');

  const r2 = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, evidence_receipt_id: null });
  assert(r2.packet_status === 'EXEC_PACKET_BLOCKED_EVIDENCE', 'null receipt_id → BLOCKED_EVIDENCE');
}

// missing rollback
console.log('--- missing rollback ---');
{
  const r = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, rollback_anchor_id: null });
  assert(r.packet_status === 'EXEC_PACKET_BLOCKED_ROLLBACK', 'null rollback → BLOCKED_ROLLBACK');
}

// missing command seal
console.log('--- missing command seal ---');
{
  const r = buildOneRealTagFinalExecutionPacket({ ...GOOD_PARAMS, command_seal_id: null });
  assert(r.packet_status === 'EXEC_PACKET_BLOCKED_COMMAND_SEAL', 'null seal → BLOCKED_COMMAND_SEAL');
}

// full packet ready
console.log('--- full packet ready ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(r.packet_status === 'EXEC_PACKET_READY_FOR_HUMAN_EXECUTION', 'ready status');
  assert(r.packet_ready === true, 'packet_ready true');
  assert(typeof r.packet_id === 'string' && r.packet_id.length > 0, 'packet_id present');
  assert(r.schema_version === 'v106.0', 'schema version');
  assert(r.target_tag === 'v106.0', 'target_tag preserved');
  assert(r.git_head === 'abc1234def567', 'git_head preserved');
  assert(r.evidence_source === 'go-core', 'evidence_source go-core');
}

// command block present
console.log('--- command block present ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(typeof r.exact_manual_command_block === 'string', 'exact_manual_command_block is string');
  assert(r.exact_manual_command_block.includes('git tag -a'), 'contains git tag command');
  assert(r.exact_manual_command_block.includes('git push origin refs/tags/'), 'contains push command');
}

// verification block present
console.log('--- verification block present ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(typeof r.verification_command_block === 'string', 'verification_command_block is string');
  assert(r.verification_command_block.includes('git rev-parse'), 'contains rev-parse');
  assert(r.verification_command_block.includes('ls-remote'), 'contains ls-remote');
}

// rollback block present
console.log('--- rollback block present ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(typeof r.rollback_command_block === 'string', 'rollback_command_block is string');
  assert(r.rollback_command_block.includes('git tag -d'), 'contains tag delete');
  assert(r.rollback_command_block.includes(':refs/tags/'), 'contains remote delete');
}

// forbidden actions present
console.log('--- forbidden actions present ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(Array.isArray(r.forbidden_actions), 'forbidden_actions is array');
  assert(r.forbidden_actions.includes('deploy'), 'deploy forbidden');
  assert(r.forbidden_actions.includes('stable_promotion'), 'stable_promotion forbidden');
  assert(r.forbidden_actions.includes('release'), 'release forbidden');
  assert(r.forbidden_actions.includes('go_core_receipt_override'), 'go_core_receipt_override forbidden');
}

// invariants
console.log('--- invariants ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(r.tag_created === false, 'tag_created=false');
  assert(r.git_push_performed === false, 'git_push_performed=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.release_performed === false, 'release_performed=false');
  assert(r.human_must_execute_manually === true, 'human_must_execute_manually=true');
  assert(r.local_interactive_only === true, 'local_interactive_only=true');
  assert(r.ci_blocked === true, 'ci_blocked=true');
}

// validate
console.log('--- validate ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  const v = validateOneRealTagFinalExecutionPacket(r);
  assert(v.valid === true, 'validate ready packet');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  const txt = renderOneRealTagFinalExecutionPacket(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('EXEC_PACKET_READY'), 'render includes status');
}

// packet_id deterministic
console.log('--- packet_id deterministic ---');
{
  const r1 = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  const r2 = buildOneRealTagFinalExecutionPacket(GOOD_PARAMS);
  assert(r1.packet_id === r2.packet_id, 'packet_id deterministic');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(EXEC_PACKET_STATUSES.includes('EXEC_PACKET_READY_FOR_HUMAN_EXECUTION'), 'ready status in exports');
  assert(EXEC_PACKET_STATUSES.includes('EXEC_PACKET_BLOCKED_BASELINE'), 'blocked status in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
