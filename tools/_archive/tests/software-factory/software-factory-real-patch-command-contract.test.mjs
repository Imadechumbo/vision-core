import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-command-contract.mjs';

function validInput() {
  return {
    patch_command_id: 'pc-v265',
    controlled_real_pr_execution_phase_gate_ready: true,
    explicit_v265_command: true,
    requested_by: 'vision-core',
    patch_reason: 'Implement V265 real patch command contract',
    patch_scope: 'software-factory modules only',
    target_files: [
      'tools/software-factory/software-factory-real-patch-command-contract.mjs',
      'tools/tests/software-factory/software-factory-real-patch-command-contract.test.mjs',
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES.includes('REAL_PATCH_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES.includes('REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES.includes('REAL_PATCH_COMMAND_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES.includes('REAL_PATCH_COMMAND_READY'));
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
    assert.equal(r.real_patch_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('patch_command_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    delete input.controlled_real_pr_execution_phase_gate_ready;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },
  () => {
    const input = validInput();
    input.controlled_real_pr_execution_phase_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate false -> BLOCKED_PHASE_GATE');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.explicit_v265_command = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_COMMAND_DENIED'));
    console.log('  PASS: explicit_v265_command=false -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.explicit_v265_command;
    const r = build(input);
    assert.ok(r.errors[0].includes('explicit_v265_command'));
    console.log('  PASS: missing explicit_v265_command -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.requested_by;
    const r = build(input);
    assert.ok(r.errors[0].includes('requested_by'));
    console.log('  PASS: missing requested_by -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.patch_reason;
    const r = build(input);
    assert.ok(r.errors[0].includes('patch_reason'));
    console.log('  PASS: missing patch_reason -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.patch_scope;
    const r = build(input);
    assert.ok(r.errors[0].includes('patch_scope'));
    console.log('  PASS: missing patch_scope -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.target_files;
    const r = build(input);
    assert.ok(r.errors[0].includes('target_files'));
    console.log('  PASS: missing target_files -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_files = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('target_files'));
    console.log('  PASS: empty target_files -> DENIED');
  },

  // --- forbidden files ---
  () => {
    const input = validInput();
    input.target_files = ['.env'];
    const r = build(input);
    assert.ok(r.errors[0].includes('.env'));
    console.log('  PASS: .env target -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_files = ['.github/workflows/deploy.yml'];
    const r = build(input);
    assert.ok(r.errors[0].includes('.github/workflows'));
    console.log('  PASS: workflow target -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_files = ['secrets/keys.json'];
    const r = build(input);
    assert.ok(r.errors[0].includes('secrets'));
    console.log('  PASS: secrets target -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_files = ['deploy/prod.yaml'];
    const r = build(input);
    assert.ok(r.errors[0].includes('deploy'));
    console.log('  PASS: deploy target -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_files = ['production/config.json'];
    const r = build(input);
    assert.ok(r.errors[0].includes('production'));
    console.log('  PASS: production target -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_command_contract_ready, true);
    assert.equal(r.explicit_command_received, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.patch_command_id);
    assert.equal(r.target_files_count, 2);
    assert.ok(r.command_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.command_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.command_hash, r2.command_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    console.log('  PASS: ready: patch execution still blocked');
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
    assert.ok(r.includes('REAL_PATCH_COMMAND_READY'));
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
    assert.ok(r.includes('command_hash'));
    console.log('  PASS: render: contains command_hash');
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
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-patch-command-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked phase gate ---', 10, 12],
    ['--- denied ---', 12, 19],
    ['--- forbidden files ---', 19, 24],
    ['--- ready ---', 24, 29],
    ['--- validate ---', 29, 31],
    ['--- render ---', 31, 35],
    ['--- invariants false ---', 35, 37],
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
