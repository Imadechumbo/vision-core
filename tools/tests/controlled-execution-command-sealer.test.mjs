#!/usr/bin/env node
/**
 * Tests — Controlled Execution Command Sealer V157.0
 */

import {
  buildControlledExecutionCommandSealer,
  validateControlledExecutionCommandSealer,
  renderControlledExecutionCommandSealer,
  COMMAND_SEALER_STATUSES,
  FORBIDDEN_COMMAND_SCOPES,
} from '../controlled-execution-command-sealer.mjs';

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

const VALID_BASE = {
  sealer_id:            's1',
  command_text:         'git tag v1.33.0',
  command_type:         'CONTROLLED_RUNTIME_EXECUTION',
  command_scope:        'CONTROLLED_DRY_RUN',
  approval_gate_status: 'APPROVAL_GATE_ACTIVE',
  evidence_package_id:  'pkg-1',
  plan_id:              'plan-1',
  sealed_at:            '2026-05-21T22:00:00.000Z',
};

console.log('\n=== controlled-execution-command-sealer tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledExecutionCommandSealer({});
  assert('no sealer_id → BLOCKED_INPUT', r.command_sealer_status === 'COMMAND_SEALER_BLOCKED_INPUT');
  assert('command_sealed=true', r.command_sealed === true);
  assert('command_executed=false', r.command_executed === false);
  assert('forbidden_scope_enforced=true', r.forbidden_scope_enforced === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledExecutionCommandSealer({ sealer_id: 's1' });
  assert('sealer_id but no command_text → BLOCKED_INPUT', r.command_sealer_status === 'COMMAND_SEALER_BLOCKED_INPUT');
}
{
  const r = buildControlledExecutionCommandSealer(null);
  assert('null → BLOCKED_INPUT', r.command_sealer_status === 'COMMAND_SEALER_BLOCKED_INPUT');
}

// --- forbidden scope ---
console.log('--- forbidden scope ---');
for (const scope of ['REAL_DEPLOY', 'REAL_RELEASE', 'REAL_STABLE_PROMOTION', 'REAL_PRODUCTION_EXECUTE', 'REAL_TAG_PUSH']) {
  const r = buildControlledExecutionCommandSealer({
    ...VALID_BASE,
    command_scope: scope,
  });
  assert(`scope=${scope} → FORBIDDEN_SCOPE`, r.command_sealer_status === 'COMMAND_SEALER_FORBIDDEN_SCOPE');
  assert(`forbidden: command_sealed=true [${scope}]`, r.command_sealed === true);
  assert(`forbidden: command_executed=false [${scope}]`, r.command_executed === false);
}

// --- approval required ---
console.log('--- approval required ---');
{
  const r = buildControlledExecutionCommandSealer({
    ...VALID_BASE,
    approval_gate_status: 'APPROVAL_GATE_EXPIRED',
    approval_active: false,
  });
  assert('expired gate → APPROVAL_REQUIRED', r.command_sealer_status === 'COMMAND_SEALER_APPROVAL_REQUIRED');
  assert('approval_required: command_sealed=true', r.command_sealed === true);
  assert('approval_required: command_executed=false', r.command_executed === false);
}
{
  const r = buildControlledExecutionCommandSealer({
    ...VALID_BASE,
    approval_gate_status: undefined,
    approval_active: undefined,
  });
  assert('no approval → APPROVAL_REQUIRED', r.command_sealer_status === 'COMMAND_SEALER_APPROVAL_REQUIRED');
}
{
  const r = buildControlledExecutionCommandSealer({
    ...VALID_BASE,
    approval_gate_status: 'APPROVAL_GATE_REVOKED',
  });
  assert('REVOKED gate → APPROVAL_REQUIRED', r.command_sealer_status === 'COMMAND_SEALER_APPROVAL_REQUIRED');
}

// --- approval_active=true bypasses gate status ---
{
  const r = buildControlledExecutionCommandSealer({
    ...VALID_BASE,
    approval_gate_status: 'APPROVAL_GATE_EXPIRED',
    approval_active: true,
  });
  assert('approval_active=true overrides status → SEALED', r.command_sealer_status === 'COMMAND_SEALER_SEALED');
}

// --- sealed ---
console.log('--- sealed ---');
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('valid params → COMMAND_SEALER_SEALED', r.command_sealer_status === 'COMMAND_SEALER_SEALED');
  assert('schema_version=v157.0', r.schema_version === 'v157.0');
  assert('sealer_id propagated', r.sealer_id === 's1');
  assert('sealer_id_hash sha256', /^[a-f0-9]{64}$/.test(r.sealer_id_hash));
  assert('command_hash present', typeof r.command_hash === 'string' && r.command_hash.length === 64);
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('command_scope propagated', r.command_scope === 'CONTROLLED_DRY_RUN');
  assert('evidence_package_id propagated', r.evidence_package_id === 'pkg-1');
  assert('plan_id propagated', r.plan_id === 'plan-1');
  assert('approval_gate_status propagated', r.approval_gate_status === 'APPROVAL_GATE_ACTIVE');
  assert('sealed_at propagated', r.sealed_at === '2026-05-21T22:00:00.000Z');
  assert('command_sealed=true', r.command_sealed === true);
  assert('command_executed=false', r.command_executed === false);
  assert('forbidden_scope_enforced=true', r.forbidden_scope_enforced === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  assert('command_text not stored raw', !JSON.stringify(buildControlledExecutionCommandSealer({ ...VALID_BASE })).includes('git tag v1.33.0'));
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  const r2 = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('command_hash deterministic', r1.command_hash === r2.command_hash);
}
{
  const r1 = buildControlledExecutionCommandSealer({ ...VALID_BASE, sealer_id: 'a' });
  const r2 = buildControlledExecutionCommandSealer({ ...VALID_BASE, sealer_id: 'b' });
  assert('different sealer_id → different command_hash', r1.command_hash !== r2.command_hash);
}

// --- sealed_at default ---
{
  const r = buildControlledExecutionCommandSealer({
    sealer_id: 'sx', command_text: 'cmd', approval_gate_status: 'APPROVAL_GATE_ACTIVE',
  });
  assert('no sealed_at → auto ISO', typeof r.sealed_at === 'string' && r.sealed_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledExecutionCommandSealer({}),
    buildControlledExecutionCommandSealer({ ...VALID_BASE }),
    buildControlledExecutionCommandSealer({ ...VALID_BASE, command_scope: 'REAL_DEPLOY' }),
    buildControlledExecutionCommandSealer({ ...VALID_BASE, approval_gate_status: 'APPROVAL_GATE_REVOKED' }),
  ];
  for (const r of cases) {
    assert(`command_sealed=true [${r.command_sealer_status}]`, r.command_sealed === true);
    assert(`command_executed=false [${r.command_sealer_status}]`, r.command_executed === false);
    assert(`forbidden_scope_enforced=true [${r.command_sealer_status}]`, r.forbidden_scope_enforced === true);
    assert(`execution_performed=false [${r.command_sealer_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.command_sealer_status}]`, r.stable_promoted === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  const v = validateControlledExecutionCommandSealer(r);
  assert('validate SEALED → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledExecutionCommandSealer({});
  const v = validateControlledExecutionCommandSealer(r);
  assert('validate BLOCKED → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledExecutionCommandSealer(null).valid === false);
}
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('command_sealed tampered → invalid', validateControlledExecutionCommandSealer({ ...r, command_sealed: false }).valid === false);
}
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('command_executed tampered → invalid', validateControlledExecutionCommandSealer({ ...r, command_executed: true }).valid === false);
}
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('forbidden_scope_enforced tampered → invalid', validateControlledExecutionCommandSealer({ ...r, forbidden_scope_enforced: false }).valid === false);
}
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  assert('execution_performed tampered → invalid', validateControlledExecutionCommandSealer({ ...r, execution_performed: true }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledExecutionCommandSealer({ ...VALID_BASE });
  const s = renderControlledExecutionCommandSealer(r);
  assert('render string', typeof s === 'string');
  assert('render shows SEALED', s.includes('COMMAND_SEALER_SEALED'));
  assert('render shows REGRA', s.includes('command_sealed=true'));
  assert('render shows sealer_id', s.includes('s1'));
}
{
  const r = buildControlledExecutionCommandSealer({});
  const s = renderControlledExecutionCommandSealer(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledExecutionCommandSealer(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('COMMAND_SEALER_STATUSES is array', Array.isArray(COMMAND_SEALER_STATUSES));
  assert('COMMAND_SEALER_STATUSES length=4', COMMAND_SEALER_STATUSES.length === 4);
  assert('FORBIDDEN_COMMAND_SCOPES is array', Array.isArray(FORBIDDEN_COMMAND_SCOPES));
  assert('FORBIDDEN_COMMAND_SCOPES length=5', FORBIDDEN_COMMAND_SCOPES.length === 5);
  for (const s of [
    'COMMAND_SEALER_BLOCKED_INPUT', 'COMMAND_SEALER_FORBIDDEN_SCOPE',
    'COMMAND_SEALER_APPROVAL_REQUIRED', 'COMMAND_SEALER_SEALED',
  ]) {
    assert(`status present: ${s}`, COMMAND_SEALER_STATUSES.includes(s));
  }
  for (const f of ['REAL_DEPLOY', 'REAL_RELEASE', 'REAL_STABLE_PROMOTION', 'REAL_PRODUCTION_EXECUTE', 'REAL_TAG_PUSH']) {
    assert(`forbidden scope present: ${f}`, FORBIDDEN_COMMAND_SCOPES.includes(f));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
