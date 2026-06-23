import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-github-pr-safety-preflight.mjs';

function validInput() {
  return {
    preflight_id: 'pf-v256',
    command_contract_id: 'cc-v255',
    real_pr_command_contract_ready: true,
    repository: 'Imadechumbo/vision-core',
    source_branch: 'feat/v256-preflight',
    target_branch: 'main',
    safety_checks: [
      { check: 'repo_clean', passed: true },
      { check: 'branch_exists', passed: true },
      { check: 'source_not_main', passed: true },
      { check: 'target_is_main', passed: true },
      { check: 'no_forbidden_files', passed: true },
      { check: 'tests_defined', passed: true },
      { check: 'rollback_defined', passed: true },
      { check: 'no_deploy', passed: true },
      { check: 'no_release', passed: true },
      { check: 'no_tag', passed: true },
      { check: 'no_stable', passed: true },
      { check: 'no_secrets', passed: true },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES.includes('GITHUB_PR_PREFLIGHT_BLOCKED_INPUT'));
    console.log('  PASS: has GITHUB_PR_PREFLIGHT_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES.includes('GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND'));
    console.log('  PASS: has GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES.includes('GITHUB_PR_PREFLIGHT_FAIL'));
    console.log('  PASS: has GITHUB_PR_PREFLIGHT_FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES.includes('GITHUB_PR_PREFLIGHT_READY'));
    console.log('  PASS: has GITHUB_PR_PREFLIGHT_READY');
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
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].startsWith('GITHUB_PR_PREFLIGHT_BLOCKED_INPUT'));
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
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].startsWith('GITHUB_PR_PREFLIGHT_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ preflight_id: 'a' });
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].includes('command_contract_id'));
    console.log('  PASS: missing command_contract_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ preflight_id: 'a', command_contract_id: 'b' });
    assert.ok(r.errors[0].includes('repository'));
    console.log('  PASS: missing repository -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ preflight_id: 'a', command_contract_id: 'b', repository: 'r', source_branch: 's', target_branch: 't' });
    assert.ok(r.errors[0].includes('safety_checks'));
    console.log('  PASS: missing safety_checks -> BLOCKED_INPUT');
  },

  // --- blocked command ---
  () => {
    const input = validInput();
    input.real_pr_command_contract_ready = false;
    const r = build(input);
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].startsWith('GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND'));
    console.log('  PASS: command not ready -> BLOCKED_COMMAND');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.safety_checks = [];
    const r = build(input);
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].includes('missing safety_checks'));
    console.log('  PASS: empty checks -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    input.safety_checks[0].passed = false;
    const r = build(input);
    assert.equal(r.github_pr_safety_preflight_ready, false);
    assert.ok(r.errors[0].startsWith('GITHUB_PR_PREFLIGHT_FAIL'));
    console.log('  PASS: check failed -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.github_pr_safety_preflight_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v256.0');
    console.log('  PASS: valid -> GITHUB_PR_PREFLIGHT_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.preflight_id);
    assert.ok(r.command_contract_id);
    assert.equal(r.checks_total, 12);
    assert.equal(r.checks_passed, 12);
    console.log('  PASS: ready: all 12 checks passed');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    console.log('  PASS: ready: real_pr_creation_allowed still false');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.safety_hash.length, 64);
    console.log('  PASS: ready: safety_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.safety_hash, r2.safety_hash);
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
    assert.ok(r.includes('GITHUB_PR_PREFLIGHT_READY'));
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
  console.log('\n=== software-factory-github-pr-safety-preflight tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 14],
    ['--- blocked command ---', 14, 15],
    ['--- blocked input ---', 15, 16],
    ['--- fail ---', 16, 17],
    ['--- ready ---', 17, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 27],
    ['--- invariants false ---', 27, 29],
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
