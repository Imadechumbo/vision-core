#!/usr/bin/env node
/**
 * Tests — Controlled Execution Command Diff Guard V157.1
 */

import { createHash } from 'crypto';
import {
  buildControlledExecutionCommandDiffGuard,
  validateControlledExecutionCommandDiffGuard,
  renderControlledExecutionCommandDiffGuard,
  DIFF_GUARD_STATUSES,
  FORBIDDEN_FILE_PATTERNS,
} from '../controlled-execution-command-diff-guard.mjs';

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

function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

const HASH = sha256('test-command');
const VALID_BASE = {
  guard_id:            'g1',
  command_hash:        HASH,
  sealed_command_hash: HASH,
  diff_files:          ['src/main.go', 'go.mod'],
  guarded_at:          '2026-05-21T22:00:00.000Z',
};

console.log('\n=== controlled-execution-command-diff-guard tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledExecutionCommandDiffGuard({});
  assert('no guard_id → BLOCKED_INPUT', r.diff_guard_status === 'DIFF_GUARD_BLOCKED_INPUT');
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledExecutionCommandDiffGuard({ guard_id: 'g1' });
  assert('guard_id but no command_hash → BLOCKED_INPUT', r.diff_guard_status === 'DIFF_GUARD_BLOCKED_INPUT');
}
{
  const r = buildControlledExecutionCommandDiffGuard(null);
  assert('null → BLOCKED_INPUT', r.diff_guard_status === 'DIFF_GUARD_BLOCKED_INPUT');
}

// --- hash mismatch ---
console.log('--- hash mismatch ---');
{
  const r = buildControlledExecutionCommandDiffGuard({
    guard_id: 'g2',
    command_hash: sha256('tampered-command'),
    sealed_command_hash: sha256('original-command'),
    diff_files: ['src/main.go'],
  });
  assert('different hashes → MISMATCH', r.diff_guard_status === 'DIFF_GUARD_MISMATCH');
  assert('mismatch: command_executed=false', r.command_executed === false);
  assert('mismatch: command_hash stored', r.command_hash === sha256('tampered-command'));
  assert('mismatch: sealed_command_hash stored', r.sealed_command_hash === sha256('original-command'));
}

// --- forbidden file ---
console.log('--- forbidden file ---');
const FORBIDDEN_CASES = [
  '.env',
  '.env.production',
  'config.key',
  'server.pem',
  'credentials.json',
  '.github/workflows/deploy.yml',
  '.github/workflows/release.yaml',
  'CLAUDE.md',
  'package-lock.json',
  'yarn.lock',
];
for (const f of FORBIDDEN_CASES) {
  const r = buildControlledExecutionCommandDiffGuard({
    guard_id: 'g3', command_hash: HASH, sealed_command_hash: HASH,
    diff_files: ['src/main.go', f],
  });
  assert(`forbidden file '${f}' → FORBIDDEN_FILE`, r.diff_guard_status === 'DIFF_GUARD_FORBIDDEN_FILE');
  assert(`forbidden: command_executed=false [${f}]`, r.command_executed === false);
  assert(`forbidden_files includes '${f}'`, r.forbidden_files.includes(f));
}

// --- guarded ---
console.log('--- guarded ---');
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  assert('valid params → DIFF_GUARD_GUARDED', r.diff_guard_status === 'DIFF_GUARD_GUARDED');
  assert('schema_version=v157.1', r.schema_version === 'v157.1');
  assert('guard_id propagated', r.guard_id === 'g1');
  assert('guard_id_hash sha256', /^[a-f0-9]{64}$/.test(r.guard_id_hash));
  assert('command_hash propagated', r.command_hash === HASH);
  assert('sealed_command_hash propagated', r.sealed_command_hash === HASH);
  assert('diff_files propagated', r.diff_files.length === 2);
  assert('diff_file_count=2', r.diff_file_count === 2);
  assert('forbidden_files=[]', r.forbidden_files.length === 0);
  assert('hash_verified=true', r.hash_verified === true);
  assert('guarded_at propagated', r.guarded_at === '2026-05-21T22:00:00.000Z');
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledExecutionCommandDiffGuard({
    guard_id: 'g4', command_hash: HASH, diff_files: ['src/main.go'],
  });
  assert('no sealed_hash → GUARDED with hash_verified=null', r.diff_guard_status === 'DIFF_GUARD_GUARDED');
  assert('hash_verified=null when no sealed_hash', r.hash_verified === null);
}
{
  const r = buildControlledExecutionCommandDiffGuard({
    guard_id: 'g5', command_hash: HASH,
  });
  assert('no diff_files → GUARDED with empty array', r.diff_guard_status === 'DIFF_GUARD_GUARDED');
  assert('diff_files=[] when omitted', r.diff_files.length === 0);
  assert('diff_file_count=0', r.diff_file_count === 0);
}

// --- guarded_at default ---
{
  const r = buildControlledExecutionCommandDiffGuard({ guard_id: 'gx', command_hash: HASH });
  assert('no guarded_at → auto ISO', typeof r.guarded_at === 'string' && r.guarded_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledExecutionCommandDiffGuard({}),
    buildControlledExecutionCommandDiffGuard({ ...VALID_BASE }),
    buildControlledExecutionCommandDiffGuard({ guard_id: 'gm', command_hash: sha256('x'), sealed_command_hash: sha256('y'), diff_files: [] }),
    buildControlledExecutionCommandDiffGuard({ guard_id: 'gf', command_hash: HASH, sealed_command_hash: HASH, diff_files: ['.env'] }),
  ];
  for (const r of cases) {
    assert(`command_executed=false [${r.diff_guard_status}]`, r.command_executed === false);
    assert(`execution_performed=false [${r.diff_guard_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.diff_guard_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.diff_guard_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.diff_guard_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  const v = validateControlledExecutionCommandDiffGuard(r);
  assert('validate GUARDED → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledExecutionCommandDiffGuard({});
  const v = validateControlledExecutionCommandDiffGuard(r);
  assert('validate BLOCKED → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledExecutionCommandDiffGuard(null).valid === false);
}
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  assert('command_executed tampered → invalid', validateControlledExecutionCommandDiffGuard({ ...r, command_executed: true }).valid === false);
}
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  assert('execution_performed tampered → invalid', validateControlledExecutionCommandDiffGuard({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  assert('stable_promoted tampered → invalid', validateControlledExecutionCommandDiffGuard({ ...r, stable_promoted: true }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledExecutionCommandDiffGuard({ ...VALID_BASE });
  const s = renderControlledExecutionCommandDiffGuard(r);
  assert('render string', typeof s === 'string');
  assert('render shows GUARDED', s.includes('DIFF_GUARD_GUARDED'));
  assert('render shows REGRA', s.includes('command_executed=false'));
  assert('render shows guard_id', s.includes('g1'));
}
{
  const r = buildControlledExecutionCommandDiffGuard({});
  const s = renderControlledExecutionCommandDiffGuard(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledExecutionCommandDiffGuard(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('DIFF_GUARD_STATUSES is array', Array.isArray(DIFF_GUARD_STATUSES));
  assert('DIFF_GUARD_STATUSES length=4', DIFF_GUARD_STATUSES.length === 4);
  assert('FORBIDDEN_FILE_PATTERNS is array', Array.isArray(FORBIDDEN_FILE_PATTERNS));
  assert('FORBIDDEN_FILE_PATTERNS length=9', FORBIDDEN_FILE_PATTERNS.length === 9);
  for (const s of [
    'DIFF_GUARD_BLOCKED_INPUT', 'DIFF_GUARD_MISMATCH',
    'DIFF_GUARD_FORBIDDEN_FILE', 'DIFF_GUARD_GUARDED',
  ]) {
    assert(`status present: ${s}`, DIFF_GUARD_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
