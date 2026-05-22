import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-branch-binder.mjs';

function validInput() {
  return {
    branch_binder_id: 'bb-v257',
    preflight_id: 'pf-v256',
    github_pr_safety_preflight_ready: true,
    source_branch: 'feat/v257-branch-binder',
    target_branch: 'main',
    base_commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    head_commit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES.includes('REAL_PR_BRANCH_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_BRANCH_BINDER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES.includes('REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT'));
    console.log('  PASS: has REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES.includes('REAL_PR_BRANCH_BINDER_FAIL'));
    console.log('  PASS: has REAL_PR_BRANCH_BINDER_FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES.includes('REAL_PR_BRANCH_BINDER_READY'));
    console.log('  PASS: has REAL_PR_BRANCH_BINDER_READY');
  },
  () => {
    assert.equal(typeof build, 'function');
    console.log('  PASS: build is function');
  },
  () => {
    assert.equal(typeof validate, 'function');
    console.log('  PASS: validate is function');
  },
  () => {
    assert.equal(typeof render, 'function');
    console.log('  PASS: render is function');
  },

  // --- blocked input ---
  () => {
    const r = build(null);
    assert.equal(r.real_pr_branch_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: null: all forbidden flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.real_pr_branch_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ branch_binder_id: 'a' });
    assert.ok(r.errors[0].includes('preflight_id'));
    console.log('  PASS: missing preflight_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ branch_binder_id: 'a', preflight_id: 'b' });
    assert.ok(r.errors[0].includes('source_branch'));
    console.log('  PASS: missing source_branch -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ branch_binder_id: 'a', preflight_id: 'b', source_branch: 's' });
    assert.ok(r.errors[0].includes('base_commit'));
    console.log('  PASS: missing base_commit -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ branch_binder_id: 'a', preflight_id: 'b', source_branch: 's', base_commit: 'a' });
    assert.ok(r.errors[0].includes('head_commit'));
    console.log('  PASS: missing head_commit -> BLOCKED_INPUT');
  },

  // --- blocked preflight ---
  () => {
    const input = validInput();
    input.github_pr_safety_preflight_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_branch_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT'));
    console.log('  PASS: preflight not ready -> BLOCKED_PREFLIGHT');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.source_branch = 'main';
    const r = build(input);
    assert.equal(r.real_pr_branch_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_FAIL'));
    console.log('  PASS: source_branch=main -> FAIL');
  },
  () => {
    const input = validInput();
    input.target_branch = 'develop';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_FAIL'));
    console.log('  PASS: target_branch!=main -> FAIL');
  },
  () => {
    const input = validInput();
    input.head_commit = input.base_commit;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_BRANCH_BINDER_FAIL'));
    console.log('  PASS: base=head -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_branch_binder_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v257.0');
    console.log('  PASS: valid -> REAL_PR_BRANCH_BINDER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.branch_binder_id);
    assert.ok(r.preflight_id);
    assert.equal(r.branch_binding_valid, true);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    console.log('  PASS: ready: real_pr_creation_allowed still false');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.branch_hash.length, 64);
    console.log('  PASS: ready: branch_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.branch_hash, r2.branch_hash);
    console.log('  PASS: ready: hash deterministic');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    assert.equal(v.errors.length, 0);
    console.log('  PASS: validate ready: valid=true');
  },
  () => {
    const r = build(null);
    const v = validate(r);
    assert.equal(v.valid, false);
    console.log('  PASS: validate blocked: valid=false');
  },

  // --- render ---
  () => {
    const r = render(build(validInput()));
    assert.equal(typeof r, 'string');
    assert.ok(r.includes('REAL_PR_BRANCH_BINDER_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const r = render(null);
    assert.equal(typeof r, 'string');
    console.log('  PASS: render null: returns string');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-pr-branch-binder tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 15],
    ['--- blocked preflight ---', 15, 16],
    ['--- fail ---', 16, 19],
    ['--- ready ---', 19, 24],
    ['--- validate ---', 24, 26],
    ['--- render ---', 26, 29],
    ['--- invariants false ---', 29, 31],
  ];
  let passed = 0;
  let failed = 0;
  for (const [label, start, end] of sections) {
    console.log(label);
    for (let i = start; i < end; i++) {
      try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
    }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
