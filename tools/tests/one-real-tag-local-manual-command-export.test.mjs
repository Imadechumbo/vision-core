#!/usr/bin/env node
/**
 * Tests — One Real Tag Local Manual Command Export V106.1
 */

import {
  buildOneRealTagLocalManualCommandExport,
  validateOneRealTagLocalManualCommandExport,
  renderOneRealTagLocalManualCommandExport,
  COMMAND_EXPORT_STATUSES,
} from '../one-real-tag-local-manual-command-export.mjs';

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

const GOOD_PACKET = {
  packet_ready:       true,
  packet_id:          'packet-id-test-001',
  packet_status:      'EXEC_PACKET_READY_FOR_HUMAN_EXECUTION',
  target_tag:         'v1.2.3',
  git_head:           'deadbeef1234567',
  tag_created:        false,
  git_push_performed: false,
  deploy_performed:   false,
  stable_promoted:    false,
  release_performed:  false,
};

console.log('\n=== one-real-tag-local-manual-command-export tests ===\n');

// missing packet
console.log('--- missing packet ---');
{
  const r1 = buildOneRealTagLocalManualCommandExport({ execution_packet: null });
  assert(r1.command_export_status === 'COMMAND_EXPORT_BLOCKED_PACKET', 'null packet → BLOCKED_PACKET');
  assert(r1.export_ready === false, 'export_ready false');
  assert(r1.tag_created === false, 'tag_created false');
}

// packet not ready
console.log('--- packet not ready ---');
{
  const r = buildOneRealTagLocalManualCommandExport({
    execution_packet: { packet_ready: false, target_tag: 'v1.0', git_head: 'abc' },
  });
  assert(r.command_export_status === 'COMMAND_EXPORT_BLOCKED_PACKET', 'not-ready packet → BLOCKED_PACKET');
}

// hash deterministic
console.log('--- hash deterministic ---');
{
  const r1 = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  const r2 = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(r1.command_hash === r2.command_hash, 'command_hash deterministic');
  assert(r1.export_hash === r2.export_hash, 'export_hash deterministic');
  assert(r1.command_export_id === r2.command_export_id, 'command_export_id deterministic');
}

// command changes hash
console.log('--- command changes hash ---');
{
  const r1 = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  const r2 = buildOneRealTagLocalManualCommandExport({
    execution_packet: { ...GOOD_PACKET, target_tag: 'v9.9.9' },
  });
  assert(r1.command_hash !== r2.command_hash, 'different tag → different command_hash');
  assert(r1.export_hash !== r2.export_hash, 'different tag → different export_hash');
}

// full export ready
console.log('--- full export ready ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(r.command_export_status === 'COMMAND_EXPORT_READY_FOR_HUMAN_COPY_PASTE', 'ready status');
  assert(r.export_ready === true, 'export_ready true');
  assert(r.schema_version === 'v106.1', 'schema version');
  assert(r.copy_paste_safe === true, 'copy_paste_safe true');
  assert(r.human_only === true, 'human_only true');
  assert(r.no_ci === true, 'no_ci true');
  assert(r.no_automation === true, 'no_automation true');
}

// preflight present
console.log('--- preflight present ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(typeof r.preflight_commands === 'string', 'preflight_commands is string');
  assert(r.preflight_commands.includes('git status'), 'preflight has git status');
  assert(r.preflight_commands.includes('git rev-parse'), 'preflight has rev-parse');
  assert(r.preflight_commands.includes('ls-remote'), 'preflight has ls-remote');
}

// execution present
console.log('--- execution present ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(typeof r.execution_commands === 'string', 'execution_commands is string');
  assert(r.execution_commands.includes('git tag -a'), 'exec has git tag');
  assert(r.execution_commands.includes('git push origin refs/tags/'), 'exec has push');
  assert(r.execution_commands.includes('PASS GOLD'), 'exec has PASS GOLD message');
}

// verification present
console.log('--- verification present ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(typeof r.verification_commands === 'string', 'verification_commands is string');
  assert(r.verification_commands.includes('git rev-parse'), 'verify has rev-parse');
  assert(r.verification_commands.includes('ls-remote'), 'verify has ls-remote');
  assert(r.verification_commands.includes('git status'), 'verify has status check');
}

// rollback present
console.log('--- rollback present ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(typeof r.rollback_commands === 'string', 'rollback_commands is string');
  assert(r.rollback_commands.includes('git tag -d'), 'rollback has tag delete');
  assert(r.rollback_commands.includes(':refs/tags/'), 'rollback has remote delete');
}

// receipt instructions present
console.log('--- receipt instructions present ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(typeof r.receipt_fill_instructions === 'string', 'receipt_fill_instructions is string');
  assert(r.receipt_fill_instructions.includes('executed_by'), 'receipt has executed_by');
  assert(r.receipt_fill_instructions.includes('executed_at'), 'receipt has executed_at');
  assert(r.receipt_fill_instructions.includes('local_tag_verified'), 'receipt has local_tag_verified');
}

// invariants
console.log('--- invariants ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  assert(r.tag_created === false, 'tag_created=false');
  assert(r.git_push_performed === false, 'git_push_performed=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.release_performed === false, 'release_performed=false');
}

// validate
console.log('--- validate ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  const v = validateOneRealTagLocalManualCommandExport(r);
  assert(v.valid === true, 'validate ready export');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildOneRealTagLocalManualCommandExport({ execution_packet: GOOD_PACKET });
  const txt = renderOneRealTagLocalManualCommandExport(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('COMMAND_EXPORT_READY'), 'render includes status');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(COMMAND_EXPORT_STATUSES.includes('COMMAND_EXPORT_READY_FOR_HUMAN_COPY_PASTE'), 'ready in exports');
  assert(COMMAND_EXPORT_STATUSES.includes('COMMAND_EXPORT_BLOCKED_PACKET'), 'blocked in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
