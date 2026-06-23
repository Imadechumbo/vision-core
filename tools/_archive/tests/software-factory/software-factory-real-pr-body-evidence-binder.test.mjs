import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-body-evidence-binder.mjs';

const EVIDENCE_RECEIPT = 'evidence-receipt-v256-abc123';
const TESTS_SUMMARY = 'All 27 tests passed: 0 failed';

function validPrBody() {
  return [
    '## Summary',
    'This PR implements V258 body evidence binder.',
    'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable',
    '',
    `Evidence receipt: ${EVIDENCE_RECEIPT}`,
    '',
    '## Tests',
    TESTS_SUMMARY,
  ].join('\n');
}

function validInput() {
  return {
    body_binder_id: 'bb-v258',
    branch_binder_id: 'branch-binder-v257',
    real_pr_branch_binder_ready: true,
    pr_title: 'feat(factory): add real PR body evidence binder V258',
    pr_body: validPrBody(),
    evidence_receipt: EVIDENCE_RECEIPT,
    tests_summary: TESTS_SUMMARY,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES.includes('REAL_PR_BODY_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_BODY_BINDER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES.includes('REAL_PR_BODY_BINDER_BLOCKED_BRANCH'));
    console.log('  PASS: has REAL_PR_BODY_BINDER_BLOCKED_BRANCH');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES.includes('REAL_PR_BODY_BINDER_FAIL'));
    console.log('  PASS: has REAL_PR_BODY_BINDER_FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES.includes('REAL_PR_BODY_BINDER_READY'));
    console.log('  PASS: has REAL_PR_BODY_BINDER_READY');
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
    assert.equal(r.real_pr_body_evidence_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_body_evidence_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ body_binder_id: 'a' });
    assert.ok(r.errors[0].includes('branch_binder_id'));
    console.log('  PASS: missing branch_binder_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ body_binder_id: 'a', branch_binder_id: 'b', pr_title: 't', pr_body: 'b', evidence_receipt: 'e' });
    assert.ok(r.errors[0].includes('tests_summary'));
    console.log('  PASS: missing tests_summary -> BLOCKED_INPUT');
  },

  // --- blocked branch ---
  () => {
    const input = validInput();
    input.real_pr_branch_binder_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_body_evidence_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_BLOCKED_BRANCH'));
    console.log('  PASS: branch binder not ready -> BLOCKED_BRANCH');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.pr_body = 'no regra absoluta here';
    const r = build(input);
    assert.equal(r.real_pr_body_evidence_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_FAIL'));
    assert.ok(r.errors[0].includes('REGRA ABSOLUTA'));
    console.log('  PASS: missing REGRA ABSOLUTA -> FAIL');
  },
  () => {
    const input = validInput();
    input.pr_body = validPrBody().replace(EVIDENCE_RECEIPT, 'no-ref-here');
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_FAIL'));
    assert.ok(r.errors[0].includes('evidence receipt'));
    console.log('  PASS: missing evidence receipt -> FAIL');
  },
  () => {
    const input = validInput();
    input.pr_body += '\nsecret_key=abc123';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_BODY_BINDER_FAIL'));
    assert.ok(r.errors[0].includes('forbidden content'));
    console.log('  PASS: contains secret -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_body_evidence_binder_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v258.0');
    console.log('  PASS: valid -> REAL_PR_BODY_BINDER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.body_binder_id);
    assert.ok(r.branch_binder_id);
    assert.equal(r.body_safe, true);
    assert.equal(r.evidence_bound, true);
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
    assert.equal(r.body_hash.length, 64);
    console.log('  PASS: ready: body_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.body_hash, r2.body_hash);
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
    assert.ok(r.includes('REAL_PR_BODY_BINDER_READY'));
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
  console.log('\n=== software-factory-real-pr-body-evidence-binder tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 13],
    ['--- blocked branch ---', 13, 14],
    ['--- fail ---', 14, 17],
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
