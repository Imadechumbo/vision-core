#!/usr/bin/env node
/**
 * Tests — Git Diff Truth Binding V147.0
 */

import {
  bindGitDiffTruth,
  validateGitDiffTruthBinding,
  renderGitDiffTruthBinding,
  DIFF_TRUTH_STATUSES,
} from '../git-diff-truth-binding.mjs';

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

console.log('\n=== git-diff-truth-binding tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = bindGitDiffTruth({});
  assert('no binding_id → DIFF_TRUTH_BLOCKED_EMPTY_DIFF', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_EMPTY_DIFF');
  assert('diff_matches_claim=false', r.diff_matches_claim === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = bindGitDiffTruth(null);
  assert('null → DIFF_TRUTH_BLOCKED_EMPTY_DIFF', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_EMPTY_DIFF');
}

// --- empty diff ---
console.log('--- empty diff ---');
{
  const r = bindGitDiffTruth({
    binding_id: 'b1',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status: [],
    actual_diff_stat: 'empty',
  });
  assert('empty diff → DIFF_TRUTH_BLOCKED_EMPTY_DIFF', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_EMPTY_DIFF');
  assert('diff_matches_claim=false', r.diff_matches_claim === false);
  assert('missing_claimed_files populated', r.missing_claimed_files.includes('tools/foo.mjs'));
}
{
  const r = bindGitDiffTruth({
    binding_id: 'b2',
    actual_name_status: [],
  });
  assert('empty actual_name_status → BLOCKED_EMPTY_DIFF', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_EMPTY_DIFF');
}
{
  const r = bindGitDiffTruth({
    binding_id: 'b3',
    actual_name_status: [],
    actual_diff_stat: '',
  });
  assert('empty diff_stat string → BLOCKED_EMPTY_DIFF', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_EMPTY_DIFF');
}

// --- forbidden file ---
console.log('--- forbidden file ---');
{
  const r = bindGitDiffTruth({
    binding_id: 'b-ff-1',
    claimed_changed_files: ['tools/foo.mjs', 'deploy.sh'],
    actual_name_status: ['tools/foo.mjs', 'deploy.sh'],
  });
  assert('deploy.sh → DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE');
  assert('forbidden_file_touched=true', r.forbidden_file_touched === true);
  assert('touched_forbidden_files has deploy.sh', r.touched_forbidden_files.includes('deploy.sh'));
}
{
  const r = bindGitDiffTruth({
    binding_id: 'b-ff-2',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status: ['tools/foo.mjs', '.env'],
  });
  assert('.env → BLOCKED_FORBIDDEN_FILE', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE');
}
{
  const r = bindGitDiffTruth({
    binding_id: 'b-ff-3',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status: ['tools/foo.mjs', 'danger.sh'],
    forbidden_files: ['danger.sh'],
  });
  assert('custom forbidden file → BLOCKED_FORBIDDEN_FILE', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE');
}

// --- claimed file not in diff (mismatch) ---
console.log('--- mismatch ---');
{
  const r = bindGitDiffTruth({
    binding_id: 'b-mm-1',
    claimed_changed_files: ['tools/foo.mjs', 'tools/bar.mjs'],
    actual_name_status: ['tools/foo.mjs'],
  });
  assert('claimed file missing → DIFF_TRUTH_MISMATCH', r.truth_binding_status === 'DIFF_TRUTH_MISMATCH');
  assert('diff_matches_claim=false', r.diff_matches_claim === false);
  assert('missing_claimed_files has bar.mjs', r.missing_claimed_files.includes('tools/bar.mjs'));
}

// --- scope violation ---
console.log('--- scope violation ---');
{
  const r = bindGitDiffTruth({
    binding_id: 'b-sv-1',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status: ['tools/foo.mjs', 'tools/unexpected.mjs'],
    expected_scope: 'tools-only',
    allowed_files: ['tools/foo.mjs'],
  });
  assert('unexpected file → DIFF_TRUTH_BLOCKED_SCOPE', r.truth_binding_status === 'DIFF_TRUTH_BLOCKED_SCOPE');
  assert('scope_valid=false', r.scope_valid === false);
  assert('unexpected_changed_files has unexpected.mjs', r.unexpected_changed_files.includes('tools/unexpected.mjs'));
}
{
  // no expected_scope → no scope check
  const r = bindGitDiffTruth({
    binding_id: 'b-sv-2',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status: ['tools/foo.mjs', 'tools/extra.mjs'],
    allowed_files: ['tools/foo.mjs'],
  });
  assert('no expected_scope → no scope check → DIFF_TRUTH_BOUND', r.truth_binding_status === 'DIFF_TRUTH_BOUND');
}

// --- bound (happy path) ---
console.log('--- bound ---');
{
  const r = bindGitDiffTruth({
    binding_id:            'b-bound-1',
    claimed_changed_files: ['tools/foo.mjs', 'tools/bar.mjs'],
    actual_name_status:    ['tools/foo.mjs', 'tools/bar.mjs'],
    branch_name:           'feat/v147-test',
    base_ref:              'main',
    head_ref:              'feat/v147-test',
    bound_at:              '2026-05-21T12:00:00.000Z',
  });
  assert('matching diff → DIFF_TRUTH_BOUND', r.truth_binding_status === 'DIFF_TRUTH_BOUND');
  assert('diff_matches_claim=true', r.diff_matches_claim === true);
  assert('scope_valid=true', r.scope_valid === true);
  assert('forbidden_file_touched=false', r.forbidden_file_touched === false);
  assert('schema_version=v147.0', r.schema_version === 'v147.0');
  assert('binding_id propagated', r.binding_id === 'b-bound-1');
  assert('branch_name propagated', r.branch_name === 'feat/v147-test');
  assert('bound_at propagated', r.bound_at === '2026-05-21T12:00:00.000Z');
  assert('verified_changed_files present', Array.isArray(r.verified_changed_files));
  assert('actual_file_count=2', r.actual_file_count === 2);
}
{
  // diff has more than claimed — that's OK if no scope enforcement
  const r = bindGitDiffTruth({
    binding_id:            'b-bound-2',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status:    ['tools/foo.mjs', 'package.json'],
  });
  assert('superset diff without scope → DIFF_TRUTH_BOUND', r.truth_binding_status === 'DIFF_TRUTH_BOUND');
}

// --- allowed scope passes ---
console.log('--- allowed scope ---');
{
  const r = bindGitDiffTruth({
    binding_id:            'b-scope-ok',
    claimed_changed_files: ['tools/foo.mjs'],
    actual_name_status:    ['tools/foo.mjs', 'tools/bar.mjs'],
    expected_scope:        'tools',
    allowed_files:         ['tools/foo.mjs', 'tools/bar.mjs'],
  });
  assert('all files in allowed → DIFF_TRUTH_BOUND', r.truth_binding_status === 'DIFF_TRUTH_BOUND');
  assert('scope_valid=true', r.scope_valid === true);
}

// --- diff_stat non-empty counts as diff ---
console.log('--- diff_stat ---');
{
  const r = bindGitDiffTruth({
    binding_id:            'b-stat-1',
    claimed_changed_files: [],
    actual_name_status:    [],
    actual_diff_stat:      '3 files changed, 42 insertions',
  });
  assert('diff_stat non-empty → not empty diff → DIFF_TRUTH_BOUND', r.truth_binding_status === 'DIFF_TRUTH_BOUND');
}

// --- bound_at default ---
{
  const r = bindGitDiffTruth({
    binding_id: 'b-time',
    actual_name_status: ['f.mjs'],
    claimed_changed_files: ['f.mjs'],
  });
  assert('no bound_at → auto ISO', typeof r.bound_at === 'string' && r.bound_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    bindGitDiffTruth({}),
    bindGitDiffTruth({ binding_id: 'x', actual_name_status: [], actual_diff_stat: 'empty' }),
    bindGitDiffTruth({ binding_id: 'x', actual_name_status: ['tools/foo.mjs', 'deploy.sh'], claimed_changed_files: ['tools/foo.mjs'] }),
    bindGitDiffTruth({ binding_id: 'x', claimed_changed_files: ['f'], actual_name_status: ['f'] }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.truth_binding_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.truth_binding_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.truth_binding_status}]`, r.release_performed === false);
  }
}

// --- deterministic ID ---
console.log('--- deterministic ID ---');
{
  const p = { binding_id: 'det', claimed_changed_files: ['f'], actual_name_status: ['f'], branch_name: 'main' };
  const r1 = bindGitDiffTruth(p);
  const r2 = bindGitDiffTruth(p);
  assert('truth_binding_id deterministic', r1.truth_binding_id === r2.truth_binding_id);
  assert('truth_binding_id sha256', /^[a-f0-9]{64}$/.test(r1.truth_binding_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = bindGitDiffTruth({ binding_id: 'b', claimed_changed_files: ['f'], actual_name_status: ['f'] });
  const v = validateGitDiffTruthBinding(r);
  assert('validate bound → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = bindGitDiffTruth({});
  const v = validateGitDiffTruthBinding(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateGitDiffTruthBinding(null).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = bindGitDiffTruth({ binding_id: 'b', claimed_changed_files: ['f'], actual_name_status: ['f'] });
  const s = renderGitDiffTruthBinding(r);
  assert('render string', typeof s === 'string');
  assert('render shows DIFF_TRUTH_BOUND', s.includes('DIFF_TRUTH_BOUND'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = bindGitDiffTruth({});
  assert('render blocked shows status', renderGitDiffTruthBinding(r).includes('DIFF_TRUTH_BLOCKED'));
}
{
  assert('render null graceful', typeof renderGitDiffTruthBinding(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('DIFF_TRUTH_STATUSES is array', Array.isArray(DIFF_TRUTH_STATUSES));
  assert('DIFF_TRUTH_STATUSES length=5', DIFF_TRUTH_STATUSES.length === 5);
  for (const s of [
    'DIFF_TRUTH_BLOCKED_EMPTY_DIFF', 'DIFF_TRUTH_BLOCKED_SCOPE',
    'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE', 'DIFF_TRUTH_MISMATCH', 'DIFF_TRUTH_BOUND',
  ]) {
    assert(`status present: ${s}`, DIFF_TRUTH_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
