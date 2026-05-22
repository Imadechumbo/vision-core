import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-product-dashboard-data-model.mjs';

function validEntity(name, type, hashChar) {
  return { entity_name: name, entity_type: type, schema_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    data_model_id: 'dm-v286',
    dashboard_contract_id: 'dc-v285',
    product_dashboard_contract_ready: true,
    entities: [
      validEntity('mission_entity', 'mission', 'a'),
      validEntity('project_entity', 'project', 'b'),
      validEntity('policy_entity', 'policy', 'c'),
      validEntity('evidence_entity', 'evidence', 'd'),
      validEntity('audit_entity', 'audit', 'e'),
    ],
    required_entities: ['mission', 'project', 'policy', 'evidence', 'audit'],
    data_model_level: 'metadata-only',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES.includes('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES.includes('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'));
    console.log('  PASS: has BLOCKED_CONTRACT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES.includes('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES.includes('PRODUCT_DASHBOARD_DATA_MODEL_READY'));
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
    assert.equal(r.product_dashboard_data_model_ready, false);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('data_model_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked contract ---
  () => {
    const input = validInput();
    input.product_dashboard_contract_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'));
    console.log('  PASS: contract not ready -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    delete input.dashboard_contract_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'));
    console.log('  PASS: missing dashboard_contract_id -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.data_model_level = 'production';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'));
    console.log('  PASS: invalid data_model_level -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.entities = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'));
    console.log('  PASS: empty entities -> BLOCKED_CONTRACT');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.entities = [{ entity_type: 'mission', schema_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'));
    assert.ok(r.errors[0].includes('entity_name'));
    console.log('  PASS: missing entity_name -> FAIL');
  },
  () => {
    const input = validInput();
    input.entities = [{ entity_name: 'test', entity_type: 'invalid', schema_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'));
    assert.ok(r.errors[0].includes('entity_type'));
    console.log('  PASS: invalid entity_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.entities = [{ entity_name: 'test', entity_type: 'mission', schema_hash: 'short' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'));
    assert.ok(r.errors[0].includes('schema_hash'));
    console.log('  PASS: short schema_hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.required_entities = ['mission'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'));
    assert.ok(r.errors[0].includes('missing required entities'));
    console.log('  PASS: missing required entities -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.product_dashboard_data_model_ready, true);
    assert.equal(r.entities_count, 5);
    assert.equal(r.required_entities_count, 5);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.data_model_hash);
    assert.equal(r.data_model_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.data_model_hash, r2.data_model_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    console.log('  PASS: ready: dashboard not enabled/deployed');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    console.log('  PASS: ready: runtime execution still blocked');
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
    assert.ok(r.includes('PRODUCT_DASHBOARD_DATA_MODEL_READY'));
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
    assert.ok(r.includes('data_model_hash'));
    console.log('  PASS: render: contains data_model_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-product-dashboard-data-model tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked contract ---', 10, 14],
    ['--- fail ---', 14, 18],
    ['--- ready ---', 18, 23],
    ['--- validate ---', 23, 25],
    ['--- render ---', 25, 29],
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
