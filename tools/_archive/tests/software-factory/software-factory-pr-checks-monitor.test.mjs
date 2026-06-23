import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-checks-monitor.mjs';

function validInput() {
  return {
    checks_monitor_id: 'cm-v262',
    pr_number: 462,
    checks: {
      'syntax-check': { status: 'pass' },
      'unit-tests': { status: 'pass' },
      'pass-gold': { status: 'pass' },
      'build': { status: 'pass' },
      'security-review': { status: 'pass' },
      'forbidden-flags': { status: 'pass' },
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES.includes('PR_CHECKS_MONITOR_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES.includes('PR_CHECKS_MONITOR_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES.includes('PR_CHECKS_MONITOR_READY'));
    console.log('  PASS: has READY');
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
    assert.equal(r.pr_checks_monitor_ready, false);
    assert.ok(r.errors[0].startsWith('PR_CHECKS_MONITOR_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('checks_monitor_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ checks_monitor_id: 'a' });
    assert.ok(r.errors[0].includes('pr_number'));
    console.log('  PASS: missing pr_number -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ checks_monitor_id: 'a', pr_number: 1 });
    assert.ok(r.errors[0].includes('checks object'));
    console.log('  PASS: missing checks -> BLOCKED_INPUT');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.checks['syntax-check'] = { status: 'fail' };
    const r = build(input);
    assert.equal(r.pr_checks_monitor_ready, false);
    assert.ok(r.errors[0].startsWith('PR_CHECKS_MONITOR_DENIED'));
    assert.ok(r.failed_checks.includes('syntax-check'));
    console.log('  PASS: syntax-check fail -> DENIED');
  },
  () => {
    const input = validInput();
    input.checks['unit-tests'] = { status: 'pending' };
    const r = build(input);
    assert.ok(r.errors[0].includes('unit-tests'));
    console.log('  PASS: unit-tests pending -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.checks['pass-gold'];
    const r = build(input);
    assert.ok(r.errors[0].includes('pass-gold'));
    console.log('  PASS: missing pass-gold -> DENIED');
  },
  () => {
    const input = validInput();
    input.checks['build'] = { status: 'error' };
    const r = build(input);
    assert.ok(r.errors[0].includes('build'));
    console.log('  PASS: build error -> DENIED');
  },
  () => {
    const input = validInput();
    input.checks['security-review'] = { status: 'fail' };
    const r = build(input);
    assert.ok(r.errors[0].includes('security-review'));
    console.log('  PASS: security-review fail -> DENIED');
  },
  () => {
    const input = validInput();
    input.checks['forbidden-flags'] = { status: 'fail' };
    const r = build(input);
    assert.ok(r.errors[0].includes('forbidden-flags'));
    console.log('  PASS: forbidden-flags fail -> DENIED');
  },
  () => {
    const input = validInput();
    input.checks['syntax-check'] = null;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PR_CHECKS_MONITOR_DENIED'));
    console.log('  PASS: null check -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.pr_checks_monitor_ready, true);
    assert.equal(r.all_checks_pass, true);
    assert.equal(r.failed_checks.length, 0);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    console.log('  PASS: ready: real_pr_creation_allowed false');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
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
    assert.ok(r.includes('PR_CHECKS_MONITOR_READY'));
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
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('all_checks_pass'));
    console.log('  PASS: render: contains all_checks_pass');
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
  console.log('\n=== software-factory-pr-checks-monitor tests ===\n');
  const sections = [
    ['--- exports ---', 0, 7],
    ['--- blocked input ---', 7, 11],
    ['--- denied ---', 11, 18],
    ['--- ready ---', 18, 20],
    ['--- validate ---', 20, 22],
    ['--- render ---', 22, 26],
    ['--- invariants false ---', 26, 28],
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
