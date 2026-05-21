#!/usr/bin/env node
/**
 * Tests — Filesystem Reality Check V146.1
 */

import {
  runFilesystemRealityCheck,
  validateFilesystemRealityCheck,
  renderFilesystemRealityCheck,
  FILESYSTEM_REALITY_STATUSES,
} from '../filesystem-reality-check.mjs';

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

const FULL = {
  check_id:                 'chk-1',
  local_repo_path:          'C:/repo/vision-core',
  expected_paths:           ['tools/foo.mjs', 'tools/bar.mjs'],
  package_scripts_required: ['test:foo'],
  syntax_entries_required:  ['tools/foo.mjs'],
  file_exists_map:          { 'tools/foo.mjs': true, 'tools/bar.mjs': true },
  package_scripts_present:  ['test:foo'],
  syntax_entries_present:   ['tools/foo.mjs'],
  checked_at:               '2026-05-21T10:00:00.000Z',
};

console.log('\n=== filesystem-reality-check tests ===\n');

// --- blocked path ---
console.log('--- blocked path ---');
{
  const r = runFilesystemRealityCheck({});
  assert('no check_id → FS_REALITY_BLOCKED_PATH', r.fs_reality_status === 'FS_REALITY_BLOCKED_PATH');
  assert('fs_reality_ready=false', r.fs_reality_ready === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = runFilesystemRealityCheck(null);
  assert('null → BLOCKED_PATH', r.fs_reality_status === 'FS_REALITY_BLOCKED_PATH');
}
{
  const r = runFilesystemRealityCheck({ check_id: 'x' });
  assert('no repo path → BLOCKED_PATH', r.fs_reality_status === 'FS_REALITY_BLOCKED_PATH');
}

// --- missing expected file ---
console.log('--- missing expected file ---');
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    file_exists_map: { 'tools/foo.mjs': true, 'tools/bar.mjs': false },
  });
  assert('missing file → FS_REALITY_MISSING_EXPECTED_FILE', r.fs_reality_status === 'FS_REALITY_MISSING_EXPECTED_FILE');
  assert('missing_expected_files has bar.mjs', r.missing_expected_files.includes('tools/bar.mjs'));
  assert('fs_reality_ready=false', r.fs_reality_ready === false);
}
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    expected_paths: ['tools/missing.mjs'],
    file_exists_map: {},
  });
  assert('unknown file → MISSING_EXPECTED_FILE', r.fs_reality_status === 'FS_REALITY_MISSING_EXPECTED_FILE');
}

// --- missing package script ---
console.log('--- missing package script ---');
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    package_scripts_present: [],
  });
  assert('missing script → FS_REALITY_MISSING_PACKAGE_SCRIPT', r.fs_reality_status === 'FS_REALITY_MISSING_PACKAGE_SCRIPT');
  assert('missing_package_scripts has test:foo', r.missing_package_scripts.includes('test:foo'));
  assert('fs_reality_ready=false', r.fs_reality_ready === false);
}
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    package_scripts_required: ['test:a', 'test:b'],
    package_scripts_present:  ['test:a'],
  });
  assert('partial scripts → MISSING_PACKAGE_SCRIPT', r.fs_reality_status === 'FS_REALITY_MISSING_PACKAGE_SCRIPT');
  assert('missing_package_scripts has test:b', r.missing_package_scripts.includes('test:b'));
}

// --- missing syntax entry ---
console.log('--- missing syntax entry ---');
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    syntax_entries_present: [],
  });
  assert('missing syntax → FS_REALITY_MISSING_SYNTAX_ENTRY', r.fs_reality_status === 'FS_REALITY_MISSING_SYNTAX_ENTRY');
  assert('missing_syntax_entries has tools/foo.mjs', r.missing_syntax_entries.includes('tools/foo.mjs'));
}
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    syntax_entries_required: ['a', 'b'],
    syntax_entries_present:  ['a'],
  });
  assert('partial syntax entries → MISSING_SYNTAX_ENTRY', r.fs_reality_status === 'FS_REALITY_MISSING_SYNTAX_ENTRY');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = runFilesystemRealityCheck({ ...FULL });
  assert('all present → FS_REALITY_READY', r.fs_reality_status === 'FS_REALITY_READY');
  assert('fs_reality_ready=true', r.fs_reality_ready === true);
  assert('schema_version=v146.1', r.schema_version === 'v146.1');
  assert('check_id propagated', r.check_id === 'chk-1');
  assert('local_repo_path propagated', r.local_repo_path === 'C:/repo/vision-core');
  assert('checked_at propagated', r.checked_at === '2026-05-21T10:00:00.000Z');
  assert('verified_file_count=2', r.verified_file_count === 2);
  assert('file_count=2', r.file_count === 2);
  assert('local_repo_path_confirmed=true', r.local_repo_path_confirmed === true);
  assert('missing_expected_files empty', r.missing_expected_files.length === 0);
  assert('missing_package_scripts empty', r.missing_package_scripts.length === 0);
  assert('missing_syntax_entries empty', r.missing_syntax_entries.length === 0);
}

// --- file hash/size passthrough ---
console.log('--- file hash/size ---');
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    file_hash_map: { 'tools/foo.mjs': 'abc123', 'tools/bar.mjs': 'def456' },
    file_size_map: { 'tools/foo.mjs': 1024,     'tools/bar.mjs': 512 },
  });
  assert('ready with hashes', r.fs_reality_status === 'FS_REALITY_READY');
  assert('file_hashes present', typeof r.file_hashes === 'object');
  assert('file_sizes present', typeof r.file_sizes === 'object');
}

// --- unexpected files ---
console.log('--- unexpected files ---');
{
  const r = runFilesystemRealityCheck({
    ...FULL,
    unexpected_paths: ['deploy.sh', 'secret.env'],
    file_exists_map: { 'tools/foo.mjs': true, 'tools/bar.mjs': true, 'deploy.sh': true, 'secret.env': false },
  });
  assert('unexpected file tracked', r.present_unexpected_files.includes('deploy.sh'));
  assert('absent unexpected not listed', !r.present_unexpected_files.includes('secret.env'));
  assert('still ready', r.fs_reality_status === 'FS_REALITY_READY');
}

// --- no required lists → ready with no path checks ---
console.log('--- minimal params ---');
{
  const r = runFilesystemRealityCheck({
    check_id: 'min-1',
    local_repo_path: '/repo',
  });
  assert('no required paths → FS_REALITY_READY', r.fs_reality_status === 'FS_REALITY_READY');
}

// --- checked_at default ---
{
  const r = runFilesystemRealityCheck({ check_id: 'x', local_repo_path: '/r', checked_at: undefined });
  assert('no checked_at → auto ISO string', typeof r.checked_at === 'string' && r.checked_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    runFilesystemRealityCheck({}),
    runFilesystemRealityCheck({ ...FULL }),
    runFilesystemRealityCheck({ ...FULL, file_exists_map: { 'tools/foo.mjs': false, 'tools/bar.mjs': true } }),
    runFilesystemRealityCheck({ ...FULL, package_scripts_present: [] }),
    runFilesystemRealityCheck({ ...FULL, syntax_entries_present: [] }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.fs_reality_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.fs_reality_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.fs_reality_status}]`, r.release_performed === false);
  }
}

// --- deterministic check_id_hash ---
console.log('--- deterministic ID ---');
{
  const r1 = runFilesystemRealityCheck({ ...FULL });
  const r2 = runFilesystemRealityCheck({ ...FULL });
  assert('check_id_hash deterministic', r1.check_id_hash === r2.check_id_hash);
  assert('check_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.check_id_hash));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = runFilesystemRealityCheck({ ...FULL });
  const v = validateFilesystemRealityCheck(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = runFilesystemRealityCheck({});
  const v = validateFilesystemRealityCheck(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  const v = validateFilesystemRealityCheck(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = runFilesystemRealityCheck({ ...FULL });
  const s = renderFilesystemRealityCheck(r);
  assert('render string', typeof s === 'string');
  assert('render shows FS_REALITY_READY', s.includes('FS_REALITY_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows check_id', s.includes('chk-1'));
}
{
  const r = runFilesystemRealityCheck({});
  const s = renderFilesystemRealityCheck(r);
  assert('render blocked', s.includes('FS_REALITY_BLOCKED_PATH'));
}
{
  assert('render null graceful', typeof renderFilesystemRealityCheck(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('FILESYSTEM_REALITY_STATUSES is array', Array.isArray(FILESYSTEM_REALITY_STATUSES));
  assert('FILESYSTEM_REALITY_STATUSES length=5', FILESYSTEM_REALITY_STATUSES.length === 5);
  for (const s of [
    'FS_REALITY_BLOCKED_PATH',
    'FS_REALITY_MISSING_EXPECTED_FILE',
    'FS_REALITY_MISSING_PACKAGE_SCRIPT',
    'FS_REALITY_MISSING_SYNTAX_ENTRY',
    'FS_REALITY_READY',
  ]) {
    assert(`status present: ${s}`, FILESYSTEM_REALITY_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
